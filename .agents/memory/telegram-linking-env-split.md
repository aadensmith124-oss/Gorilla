---
name: Same-container workers must call localhost, not the public domain
description: Why the Telegram bot's site calls must target localhost, plus the dev/prod DB split behind "no account found"
---

# Same-container workers call localhost, never the public URL

**Rule:** when a long-running worker that shares the app's container (Telegram bot, cron, webhook handler) needs to hit an app HTTP endpoint, call `http://localhost:<PORT>`, deriving the port from the same env the server listens on — never the public deployed domain.

**Why:** the development container cannot make outbound HTTPS to the deployed domain — such fetches fail with `fetch failed` / `Could not resolve host`, surfacing to users as "could not reach the site." The worker and the Express server run in the same process/container, so localhost always reaches the server bound to whichever database that environment uses.

**How to apply:** "could not reach the site" / `fetch failed` in a bot or worker log is this trap. Also keep the localhost port in lockstep with the server's listen port (a hard-coded port breaks any non-default `PORT` deployment).

## Related: dev/prod DB split behind Telegram "no account found"
Replit gives the app two separate databases (development and production). The bot only runs in one environment at a time, so localhost resolves to that environment's DB: dev bot → dev DB, published bot → prod DB. Consequence: linking works within whichever environment is actively running the bot; it does NOT bridge accounts across environments. Users who signed up on the published site can only be linked by a bot instance running in production. True cross-environment linking needs a separate mechanism (run the bot in the deployment, or a dedicated internal prod endpoint).

**Security note for one-time link tokens:** consume them atomically (single `DELETE ... RETURNING`), not SELECT-then-DELETE, or concurrent requests can both claim the same token and link multiple chats. Return only the minimum the worker needs (no email/balance/PII), and redact the token-bearing path + response from request logging.

**Unrelated red herring:** `409 Conflict: terminated by other getUpdates` just means a second bot instance (e.g. the published one) is also polling the same Telegram token; only one instance receives updates at a time. Harmless, not a linking bug.
