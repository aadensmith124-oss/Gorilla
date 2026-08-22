---
name: Standalone Telegram hosting
description: Constraints for running the Telegram polling bot outside the web application
---

The Telegram bot can run as an independent Node process, but it must not import the web server entrypoint. Shared modules used by the bot should remain side-effect free, especially logging and database initialization.

**Why:** Importing the web entrypoint from a standalone bot starts Express and creates the wrong process shape for a self-hosted worker.

**How to apply:** Keep bot startup in its own entrypoint and ensure only one polling process uses a given Telegram bot token; concurrent Replit and external instances cause polling conflicts.