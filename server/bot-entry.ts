import { pool } from "./db";
import { startTelegramBot } from "./telegram";
import { log } from "./logger";

async function main() {
  const bot = startTelegramBot();

  if (bot === null) {
    console.error("[telegram] Bot did not start. Set TELEGRAM_BOT_TOKEN.");
    await pool.end();
    process.exit(1);
    return;
  }

  const runningBot = bot as NonNullable<typeof bot>;
  log("Standalone Telegram bot process started", "telegram");

  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`Received ${signal}; stopping Telegram bot`, "telegram");
    runningBot.stop();
    await pool.end();
    process.exit(0);
  }

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch(async (error) => {
  console.error("[telegram] Standalone bot failed:", error);
  await pool.end();
  process.exit(1);
});