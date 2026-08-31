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