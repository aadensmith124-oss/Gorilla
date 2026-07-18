const TELEGRAM_API = (token: string) => `https://api.telegram.org/bot${token}`;

export async function sendMessage(chatId: string | number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`${TELEGRAM_API(token)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch(() => {});
}

export async function getChatInfo(chatId: string | number): Promise<{ firstName: string; lastName?: string; username?: string } | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${TELEGRAM_API(token)}/getChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
    });
    const data = await res.json();
    if (!data.ok) return null;
    return {
      firstName: data.result.first_name ?? "",
      lastName: data.result.last_name,
      username: data.result.username,
    };
  } catch {
    return null;
  }
}

/**
 * Check whether a user (by their numeric chat ID) is a member of a group/channel.
 * Returns true if they are a creator, admin, member, or restricted member.
 * Returns false if they have left or been kicked, or on any error.
 */
export async function checkGroupMembership(groupChatId: string, userChatId: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return true;
  const uid = Number(userChatId);
  if (!uid) return false; // empty string or non-numeric → reject immediately
  console.log(`[TG join-gate] checking uid=${uid} against groupChatId="${groupChatId}"`);
  try {
    const res = await fetch(`${TELEGRAM_API(token)}/getChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: groupChatId, user_id: uid }),
    });
    const data = await res.json();
    console.log(`[TG join-gate] response ok=${data.ok} status=${data.result?.status ?? "–"} err=${data.description ?? "–"}`);

    if (!data.ok) {
      // If the error is about the chat itself (bad ID, bot not in group, no permission)
      // rather than the user's membership — log a clear warning but don't block the user,
      // because the gate is misconfigured, not the user's fault.
      const errCode: number = data.error_code ?? 0;
      const desc: string   = data.description ?? "";
      const isChatError = errCode === 400 || errCode === 403 ||
                          desc.includes("chat not found") ||
                          desc.includes("bot is not a member") ||
                          desc.includes("need administrator rights") ||
                          desc.includes("CHAT_ID_INVALID");
      if (isChatError) {
        console.warn(`[TG join-gate] ⚠️  Bot cannot check this group (${desc}). Gate skipped — fix TELEGRAM_GROUP_CHAT_ID to a numeric chat ID and ensure the bot is an admin.`);
        return true; // misconfiguration → don't punish users
      }
      return false; // some other API error → deny
    }

    const status: string = data.result?.status ?? "left";
    const isMember = ["creator", "administrator", "member", "restricted"].includes(status);
    console.log(`[TG join-gate] uid=${uid} status="${status}" → isMember=${isMember}`);
    return isMember;
  } catch (e) {
    console.error("[TG join-gate] exception:", e);
    return false;
  }
}

export async function getBotUsername(): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${TELEGRAM_API(token)}/getMe`);
    const data = await res.json();
    if (!data.ok) return null;
    return data.result.username as string;
  } catch {
    return null;
  }
}

export function usdCentsToStars(cents: number): number {
  return Math.max(1, Math.round(cents / 2));
}

export async function createStarsInvoiceLink(
  title: string,
  description: string,
  payload: string,
  amountCents: number
): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const stars = usdCentsToStars(amountCents);
  const res = await fetch(`${TELEGRAM_API(token)}/createInvoiceLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      description,
      payload,
      currency: "XTR",
      prices: [{ label: "Total", amount: stars }],
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);
  return data.result as string;
}

export async function answerPreCheckoutQuery(
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`${TELEGRAM_API(token)}/answerPreCheckoutQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      ...(ok ? {} : { error_message: errorMessage ?? "Payment could not be processed" }),
    }),
  });
}

export async function setupTelegramWebhook(webhookUrl: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("Telegram: TELEGRAM_BOT_TOKEN not set — skipping webhook registration");
    return;
  }
  try {
    const res = await fetch(`${TELEGRAM_API(token)}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "pre_checkout_query"] }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log("Telegram: webhook registered →", webhookUrl);
    } else {
      console.warn("Telegram: webhook setup failed:", data.description);
    }

    // Register bot commands so they appear in the menu
    await fetch(`${TELEGRAM_API(token)}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "link",     description: "Link your account — /link email password" },
          { command: "balance",  description: "Check your balance & reward status" },
          { command: "referral", description: "Get your referral link & count" },
        ],
      }),
    }).catch(() => {});
  } catch (e) {
    console.warn("Telegram: webhook setup error:", e);
  }
}
