---
name: Replit preview proxy
description: Replit's development preview is proxied and sends forwarded client IP headers.
---

Set Express to trust one proxy in both development previews and production.

**Why:** The preview proxy supplies `X-Forwarded-For`; without a trusted proxy, `express-rate-limit` raises a validation error on login-related requests, which can surface as an HTTP error.

**How to apply:** Keep the trust-proxy configuration enabled before authentication and rate-limited endpoints receive requests.