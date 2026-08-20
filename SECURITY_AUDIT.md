# Security hardening review

## Completed protections

- Production startup now requires `SESSION_SECRET`; development uses a new ephemeral secret only when that variable is absent.
- Sessions are `HttpOnly`, `SameSite=Lax`, secure in production, limited to one day, renewed on activity, destroyed on logout, and regenerated after login.
- New registrations cannot assign themselves a privileged role. Legacy auto-promotion code and default admin/demo account seeding have been removed.
- Every `/api/admin/*` route now passes a centralized server-side administrator check and administrative write actions are logged without request bodies.
- Authenticated state-changing browser requests require a same-origin `Origin` or `Referer`, providing CSRF protection for the cookie-based session flow.
- Login, registration, and password-change routes are rate-limited; login failures use a single non-enumerating error message.
- Passwords must be at least 12 characters for new registrations and password changes. Password hashes, legacy login codes, and SMTP passwords are stripped from all JSON responses.
- Production enables a restrictive Content Security Policy and additional browser security headers. API logs record only method, redacted path, status, and duration—not response data.
- Image uploads accept only verified PNG, JPEG, or WebP content below 4 MB, with server-generated filenames and safe serving headers.
- The test-order route is unavailable in production. Default admin seeding and the email-bomb feature have been removed.
- Vulnerable direct and transitive dependencies were upgraded or pinned, including Drizzle, Vite, PostCSS, ws, ip-address, picomatch, and Rollup. The unused Nodemailer dependency was removed.

## Verification

- Type check and production build pass.
- Security scans are rerun after dependency updates.
- The development workflow is restarted after the changes.

## Operational follow-up

- Existing SMTP credentials may remain in the settings database from before this change. They are no longer returned by the API and the mail-bomb feature was removed. If SMTP is restored for a legitimate transactional-email feature, store the credential in deployment secrets rather than application settings.
- Existing user passwords are not forcibly reset. Administrators should notify users about the stronger password policy and require a reset if compromise is suspected.
- Production database cleanup is intentionally out of scope for this code change; no production VOUCH codes or user data were deleted.