---
name: Vercel TypeScript path mappings
description: Vercel native TypeScript functions do not resolve the project's tsconfig path aliases.
---

Keep imports reachable from Vercel API function entrypoints relative rather than using the project's `@shared` alias. The client may continue using Vite aliases because Vite resolves those during the frontend build.

**Why:** Vercel's Node.js TypeScript runtime supports entrypoint TypeScript but does not support TypeScript path mappings; local esbuild can resolve them and hide the deployment failure.

**How to apply:** When adding server imports used by `api/*.ts`, use relative imports into shared code and bundle-test every Vercel function entrypoint.