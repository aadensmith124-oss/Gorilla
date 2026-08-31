---
name: Data protection boundary
description: What the project's encryption protects and what it cannot hide
---

The project protects database storage through the managed PostgreSQL provider and protects dumps/exports with application-controlled AES-256-GCM using a separately managed encryption key. The live app is not zero-knowledge: it must decrypt values it displays, delivers, or processes.

**Why:** A running website or Telegram bot cannot use data that even its own server process cannot decrypt. Claiming that all live data is invisible would be misleading and would break core workflows.

**How to apply:** Keep APP_ENCRYPTION_KEY out of Git and archives, encrypt every manually created dump/export before storage or transfer, and describe admin/server visibility accurately.