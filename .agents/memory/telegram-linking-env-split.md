---
name: Telegram account linking across dev/prod DB split
description: Why the bot's /link "no account found" happens and the token-based fix that spans both databases
---

# Telegram linking must not query the DB directly

The Telegram bot is a long-running process started inside the **development** environment, so its `pool` points at the **development** database. Users who sign up on the **published** site are written to the **production** database (Replit gives every app two separate DBs). A `/link email` handler that queries `pool` directly can therefore never find production users — it reports "no account found."

**Fix (in place):** the site issues a one-time link token (`/api/telegram/link-token` POST, stored in `telegram_link_tokens`, 1h expiry). The bot redeems it by HTTP `GET ${SITE_URL}/api/telegram/link-token/:token` against the **live production** site (`SITE_URL`, default `https://unitedcards.cc`), which reads the correct DB and returns the user id. The bot then writes the `telegram_chat_id` to its own pool. The redeem endpoint deletes the token immediately (single use).

**Why:** cross-environment lookups only work through the live site's API, not a shared DB handle. Any future feature where the bot needs site-account data must call the live API, not `pool`, or it will silently only see dev accounts.

**How to apply:** if a Telegram (or other externally-hosted long-running worker) feature reports missing users/data that clearly exist on the live site, suspect the dev/prod DB split first. Route the lookup through the production HTTP API. The `409 Conflict: terminated by other getUpdates` bot log is the tell that a prod bot instance is also polling the same token — confirming two environments are live at once.
