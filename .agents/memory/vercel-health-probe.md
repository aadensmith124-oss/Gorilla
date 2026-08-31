---
name: Vercel health probe behavior
description: The dedicated Vercel health function is not exposed by the local Express/Vite development workflow.
---

Use the dedicated health endpoint to verify Vercel routing only after publishing. In the local Replit preview, the same path may be handled by the SPA fallback and return HTML rather than the probe JSON; test a real application API route locally for handler validation.

**Why:** The Vercel `api/health.ts` function is a deployment entrypoint, while local development routes requests through the Express/Vite server.

**How to apply:** Treat local HTML from `/api/health` as expected unless the local Vercel bundle is being exercised directly. In production, require HTTP 200 JSON with `ok: true` and `service: "api"`.