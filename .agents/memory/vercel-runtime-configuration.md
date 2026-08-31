---
name: Vercel runtime configuration
description: Vercel function runtime and Node version behavior for this project
---

Use Vercel's managed Node runtime for TypeScript functions; do not set
`runtime: "nodejs20.x"` in `vercel.json`. Pin the build/runtime Node version
through the package `engines` field and Vercel project settings instead.

**Why:** Vercel rejected `nodejs20.x` as an invalid function runtime
identifier. Its build service also reports that Node 20 deployments will be
deprecated after October 1, 2026, so Node 24 is the safe current target.

**How to apply:** When deploying this project to Vercel, leave the
function-level runtime unset and keep the package and project Node version
aligned with the currently supported Vercel version.

Vercel does not inherit Replit's runtime-managed `DATABASE_URL`. Production
must define its own complete PostgreSQL connection string, and the database
host must be reachable from Vercel.

**Why:** A deployment can build successfully but fail on its first API request
when the Vercel function starts without database configuration.

**How to apply:** Configure `DATABASE_URL` (or the supported hosted-Postgres
equivalent) in Vercel Project Settings for each deployed environment, then
redeploy.

For Supabase on Vercel, prefer the Session Pooler connection over the direct
`db.<project-ref>.supabase.co` endpoint.

**Why:** The direct Supabase hostname may fail DNS resolution from a Vercel
function even when the connection string and credentials are otherwise valid.

**How to apply:** Copy the Session mode URL from Supabase's Connect dialog,
URL-encode the password, and save the complete URL as the Vercel production
database variable.