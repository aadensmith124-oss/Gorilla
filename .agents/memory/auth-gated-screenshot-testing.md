---
name: Auth-gated screenshot testing
description: Login page requires solving a captcha, which blocks automated screenshot-based verification of any page behind auth.
---

The sign-in form requires a captcha answer. The `screenshot` tool (app_preview) cannot fill forms or solve captchas, so it can never get past `/login` to visually verify pages that require an authenticated session (e.g. `/deposit`, `/profile`, `/cart`).

**Why:** Attempted to screenshot `/deposit` after a redesign; it always renders the sign-in screen instead, even though a test user was registered via curl (curl's session cookie isn't shared with the screenshot tool's browser).

**How to apply:** For UI changes behind auth, verify via `tsc --noEmit`, code review, and workflow logs (confirm the relevant API routes respond 200 with expected data) rather than relying on a screenshot. Only use screenshots for public/unauthenticated routes.
