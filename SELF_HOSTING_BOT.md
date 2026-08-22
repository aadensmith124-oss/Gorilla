# Running the Telegram bot on your own server

This project includes a standalone bot process. It does not start the Express website or Vite frontend.

## Requirements

- Node.js 20 or newer
- npm
- A PostgreSQL database reachable from your server
- The Telegram bot token from BotFather
- The bot added to the configured Telegram group/channel, with permission to check members

The bot stores members, referrals, drops, claims, and suspensions in PostgreSQL. To preserve existing data, use the same database that the website uses. If you use a different database, the bot will start with a separate empty bot dataset.

## Install

Copy the project to the server, then run:

```bash
npm ci
npm run build:bot
```

## Environment variables

Set these in the server's process manager or environment. Do not commit them to a file in the repository.

```bash
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
TELEGRAM_BOT_TOKEN=replace-with-your-botfather-token
Telegram_group_id=-1001234567890
TELEGRAM_ADMIN_IDS=8929265717
```

`DATABASE_URL` must point to a PostgreSQL database accessible from the server. `Telegram_group_id` is the numeric Telegram group or channel ID used by the membership gate. Add the bot to that group before starting it.

## Start

For a direct test:

```bash
npm run start:bot
```

For 24/7 operation, use a process manager such as systemd, Docker, or PM2. Example with systemd:

Create `/etc/systemd/system/telegram-drops-bot.service`:

```ini
[Unit]
Description=Telegram Drops Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/telegram-drops-bot
Environment=NODE_ENV=production
EnvironmentFile=/etc/telegram-drops-bot.env
ExecStart=/usr/bin/npm run start:bot
Restart=always
RestartSec=5
User=telegrambot

[Install]
WantedBy=multi-user.target
```

Create `/etc/telegram-drops-bot.env` with mode `600`:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
TELEGRAM_BOT_TOKEN=replace-with-your-botfather-token
Telegram_group_id=-1001234567890
TELEGRAM_ADMIN_IDS=8929265717
```

Then enable it:

```bash
sudo chmod 600 /etc/telegram-drops-bot.env
sudo systemctl daemon-reload
sudo systemctl enable --now telegram-drops-bot
sudo systemctl status telegram-drops-bot
sudo journalctl -u telegram-drops-bot -f
```

## Updating the bot

```bash
git pull
npm ci
npm run build:bot
sudo systemctl restart telegram-drops-bot
```

Only run one polling instance for this bot token. Running the bot simultaneously on Replit and your own server causes Telegram polling conflicts. Stop the Replit production bot before starting this one.