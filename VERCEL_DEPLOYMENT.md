# Vercel deployment

This project is configured as a Vite frontend with Express API routes running
as Vercel Node.js functions.

## Vercel project settings

Use the repository root as the project root. `vercel.json` supplies the
following settings automatically:

- Build command: `npm run build:vercel`
- Output directory: `dist/public`
- Node.js version: 24.x via the package engine requirement
- API entrypoints: `api/index.ts` and `api/[...path].ts`

Do not set the output directory to `dist` or `client/dist`.

## Environment variables

Add these variables to the Vercel project for every environment that should
serve the application:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Vercel Supabase integrations may expose this as `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL`, or `POSTGRES_PRISMA_URL`; the app accepts those names as fallbacks. |
| `SESSION_SECRET` | Yes | Persistent session-cookie signing secret |
| `APP_ENCRYPTION_KEY` | Yes | Encryption for protected application data |
| `NOWPAYMENTS_API_KEY` | For crypto payments | NOWPayments API access |
| `NOWPAYMENTS_IPN_SECRET` | For crypto payments | NOWPayments webhook verification |

Optional integrations use `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_IDS`, and `Telegram_group_id`.

Keep the same `DATABASE_URL`, `SESSION_SECRET`, and `APP_ENCRYPTION_KEY`
across production deploys. Changing them can invalidate sessions or make
previously encrypted data unreadable.

## Database setup

Before the first production request, point `DATABASE_URL` at the production
PostgreSQL database and run:

```bash
npm run db:push
```

The Vercel function creates the PostgreSQL session table on its first cold
start. It does not run schema migrations during the frontend build.

## NOWPayments webhook

Configure the NOWPayments IPN callback URL to:

```text
https://<your-vercel-domain>/api/webhooks/nowpayments
```

The callback must use the same `NOWPAYMENTS_IPN_SECRET` configured in Vercel.

## Important runtime difference

Vercel functions are short-lived and can run on multiple instances. The
serverless adapter disables the background cleanup, payment polling, and
Telegram polling loops. Configure payment providers to send webhooks; run the
Telegram bot and any periodic jobs from a separate persistent process.