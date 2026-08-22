---
name: Telegram production-only runtime
description: Telegram polling and bot commands run only from the published production process, not the development preview.
---

The Telegram bot intentionally stays disabled in the development workflow and starts from the published production process. Changes to commands, secrets, or bot menus are not visible to Telegram until the published app is restarted or republished.

**Why:** Keeping polling production-only prevents development and production bots from competing for Telegram updates and avoids cross-environment database writes.

**How to apply:** Validate code in the preview, then restart or republish the production app and confirm the production log reports Telegram long polling started.