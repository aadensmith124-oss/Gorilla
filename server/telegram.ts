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
  try {
    const res = await fetch(`${TELEGRAM_API(token)}/getChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: groupChatId, user_id: userChatId }),
    });
    const data = await res.json();
    if (!data.ok) return false;
    const status: string = data.result?.status ?? "left";
    return ["creator", "administrator", "member", "restricted"].includes(status);
  } catch {
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
  } catch (e) {
    console.warn("Telegram: webhook setup error:", e);
  }
}
