import { createHash, randomBytes } from "node:crypto";
import { pool } from "./db.js";

const DEFAULT_REFERRAL_CREDIT_CENTS = 500;
const LINK_TOKEN_TTL_MS = 10 * 60 * 1000;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const TELEGRAM_REFERRAL_CREDIT_CENTS = positiveInteger(
  process.env.TELEGRAM_REFERRAL_CREDIT_CENTS,
  DEFAULT_REFERRAL_CREDIT_CENTS,
);

export const TELEGRAM_GROUP_ID =
  process.env.TELEGRAM_GROUP_ID || process.env.Telegram_group_id || "";

export const TELEGRAM_JOIN_URL =
  process.env.TELEGRAM_JOIN_URL || "https://t.me/+4mXj61Q-goYwNWU9";

export function formatCredit(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * This is deliberately safe to call from both the web app and the standalone
 * bot. It only adds Telegram-specific tables/columns and is idempotent for
 * Supabase and Vercel cold starts.
 */
export async function ensureTelegramReferralSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_members (
      chat_id TEXT PRIMARY KEY,
      telegram_username TEXT,
      name_active BOOLEAN NOT NULL DEFAULT FALSE,
      pending_referrer_chat_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE telegram_chat_members
    ADD COLUMN IF NOT EXISTS pending_referrer_chat_id TEXT
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_referrals (
      id BIGSERIAL PRIMARY KEY,
      referrer_chat_id TEXT NOT NULL,
      referred_chat_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_referral_bonuses (
      id BIGSERIAL PRIMARY KEY,
      referrer_chat_id TEXT NOT NULL,
      referral_id BIGINT NOT NULL UNIQUE REFERENCES telegram_chat_referrals(id),
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_store_links (
      chat_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_link_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_referral_credits (
      id BIGSERIAL PRIMARY KEY,
      referral_id BIGINT NOT NULL UNIQUE REFERENCES telegram_chat_referrals(id),
      referrer_chat_id TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount > 0),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'credited')),
      user_id INTEGER REFERENCES users(id),
      transaction_id INTEGER REFERENCES transactions(id),
      credited_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS telegram_referral_credits_pending_idx
      ON telegram_referral_credits (referrer_chat_id, status)
  `);
}

export async function createTelegramLinkToken(userId: number) {
  const token = randomBytes(18).toString("base64url");
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);

  await pool.query("DELETE FROM telegram_link_tokens WHERE expires_at <= NOW() OR used_at IS NOT NULL");
  await pool.query(
    `INSERT INTO telegram_link_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [hashToken(token), userId, expiresAt],
  );

  return { token, expiresAt };
}

type CreditResult = {
  creditedCount: number;
  amountCents: number;
};

async function creditPendingRewards(
  client: { query: (text: string, values?: unknown[]) => Promise<any> },
  chatId: string,
  userId: number,
): Promise<CreditResult> {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`telegram-rewards:${chatId}`]);
  const pending = await client.query(
    `SELECT id, amount
       FROM telegram_referral_credits
      WHERE referrer_chat_id = $1 AND status = 'pending'
      ORDER BY id
      FOR UPDATE`,
    [chatId],
  );

  let amountCents = 0;
  for (const reward of pending.rows) {
    const amount = Number(reward.amount);
    const updatedUser = await client.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
      [amount, userId],
    );
    if (!updatedUser.rows[0]) continue;

    const transaction = await client.query(
      `INSERT INTO transactions (user_id, amount, type, description, payment_method)
       VALUES ($1, $2, 'referral_reward', $3, 'Telegram')
       RETURNING id`,
      [userId, amount, "Telegram referral reward"],
    );
    await client.query(
      `UPDATE telegram_referral_credits
          SET status = 'credited', user_id = $1, transaction_id = $2, credited_at = NOW()
        WHERE id = $3`,
      [userId, transaction.rows[0].id, reward.id],
    );
    amountCents += amount;
  }

  return { creditedCount: pending.rows.length, amountCents };
}

export async function linkTelegramChat(
  chatId: string,
  token: string,
  telegramUsername: string | null,
) {
  const normalizedToken = token.trim();
  if (!normalizedToken || normalizedToken.length > 128) {
    return { ok: false as const, reason: "invalid_token" as const };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tokenResult = await client.query(
      `SELECT user_id
         FROM telegram_link_tokens
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > NOW()
        FOR UPDATE`,
      [hashToken(normalizedToken)],
    );
    const tokenRow = tokenResult.rows[0];
    if (!tokenRow) {
      await client.query("ROLLBACK");
      return { ok: false as const, reason: "invalid_token" as const };
    }

    const existingChat = await client.query(
      "SELECT user_id FROM telegram_store_links WHERE chat_id = $1 FOR UPDATE",
      [chatId],
    );
    if (existingChat.rows[0] && Number(existingChat.rows[0].user_id) !== Number(tokenRow.user_id)) {
      await client.query("ROLLBACK");
      return { ok: false as const, reason: "chat_already_linked" as const };
    }

    const existingUser = await client.query(
      "SELECT chat_id FROM telegram_store_links WHERE user_id = $1 FOR UPDATE",
      [tokenRow.user_id],
    );
    if (existingUser.rows[0] && existingUser.rows[0].chat_id !== chatId) {
      await client.query("ROLLBACK");
      return { ok: false as const, reason: "account_already_linked" as const };
    }

    await client.query(
      `INSERT INTO telegram_store_links (chat_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (chat_id) DO UPDATE SET user_id = EXCLUDED.user_id, linked_at = NOW()`,
      [chatId, tokenRow.user_id],
    );
    await client.query(
      "UPDATE telegram_chat_members SET telegram_username = $1 WHERE chat_id = $2",
      [telegramUsername, chatId],
    );
    await client.query(
      "UPDATE telegram_link_tokens SET used_at = NOW() WHERE token_hash = $1",
      [hashToken(normalizedToken)],
    );

    const credits = await creditPendingRewards(client, chatId, Number(tokenRow.user_id));
    await client.query("COMMIT");
    return {
      ok: true as const,
      userId: Number(tokenRow.user_id),
      ...credits,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function creditReferral(
  referralId: number,
  referrerChatId: string,
) {
  await pool.query(
    `INSERT INTO telegram_referral_credits
      (referral_id, referrer_chat_id, amount)
     VALUES ($1, $2, $3)
     ON CONFLICT (referral_id) DO NOTHING`,
    [referralId, referrerChatId, TELEGRAM_REFERRAL_CREDIT_CENTS],
  );

  const link = await pool.query(
    "SELECT user_id FROM telegram_store_links WHERE chat_id = $1",
    [referrerChatId],
  );
  if (!link.rows[0]) {
    return { creditedCount: 0, amountCents: 0, linked: false };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await creditPendingRewards(client, referrerChatId, Number(link.rows[0].user_id));
    await client.query("COMMIT");
    return { ...result, linked: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getTelegramLinkStatus(userId: number) {
  const result = await pool.query(
    `SELECT l.chat_id,
            COUNT(c.id) FILTER (WHERE c.status = 'pending')::int AS pending_count,
            COUNT(c.id) FILTER (WHERE c.status = 'credited')::int AS credited_count,
            COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'pending'), 0)::int AS pending_amount,
            COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'credited'), 0)::int AS credited_amount
       FROM telegram_store_links l
       LEFT JOIN telegram_referral_credits c ON c.referrer_chat_id = l.chat_id
      WHERE l.user_id = $1
      GROUP BY l.chat_id`,
    [userId],
  );
  const row = result.rows[0];
  return {
    linked: Boolean(row),
    chatId: row?.chat_id ?? null,
    pendingCount: Number(row?.pending_count ?? 0),
    creditedCount: Number(row?.credited_count ?? 0),
    pendingAmount: Number(row?.pending_amount ?? 0),
    creditedAmount: Number(row?.credited_amount ?? 0),
    rewardAmount: TELEGRAM_REFERRAL_CREDIT_CENTS,
  };
}