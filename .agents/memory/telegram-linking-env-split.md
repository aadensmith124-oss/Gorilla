---
name: Same-container workers must call localhost, not the public domain
description: Why the Telegram bot's site calls must target localhost, plus the dev/prod DB split behind "no account found"
---

# Same-container workers call localhost, never the public URL

**Rule:** when a long-running worker that shares the app's container (Telegram bot, cron, webhook handler) needs to hit an app HTTP endpoint, call `http://localhost:<PORT>`, deriving the port from the same env the server listens on — never the public deployed domain.

**Why:** the development container cannot make outbound HTTPS to the deployed domain — such fetches fail with `fetch failed` / `Could not resolve host`, surfacing to users as "could not reach the site." The worker and the Express server run in the same process/container, so localhost always reaches the server bound to whichever database that environment uses.

**How to apply:** "could not reach the site" / `fetch failed` in a bot or worker log is this trap. Also keep the localhost port in lockstep with the server's listen port (a hard-coded port breaks any non-default `PORT` deployment).

## Related: dev/prod DB split behind Telegram "no account found"
Replit gives the app two separate databases (development and production). The Telegram bot is intentionally **production-only**: the development workflow must not start it, while the published always-running deployment must. This ensures the bot's localhost lookup always reaches the production database, where live account-link tokens are created.

**Why:** starting the bot in both environments creates Telegram `getUpdates` 409 polling conflicts and allows the dev bot to receive a command for a production token that does not exist in its DB, producing a false "invalid token" message. A web deployment hosting a long-polling bot must be always-running rather than autoscaled.

**How to apply:** keep the development startup path bot-free; use an always-running published deployment to host the production bot. Republish after any bot changes. The live site's verified production URL is the source of truth for user-facing links; do not use a desired or legacy custom domain unless it is confirmed active.

**Security note for one-time link tokens:** consume them atomically (single `DELETE ... RETURNING`), not SELECT-then-DELETE, or concurrent requests can both claim the same token and link multiple chats. Return only the minimum the worker needs (no email/balance/PII), and redact the token-bearing path + response from request logging.

**Unrelated red herring:** `409 Conflict: terminated by other getUpdates` just means a second bot instance (e.g. the published one) is also polling the same Telegram token; only one instance receives updates at a time. Harmless, not a linking bug.
