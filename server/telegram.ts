const TELEGRAM_API = (token: string) => `https://api.telegram.org/bot${token}`;

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
