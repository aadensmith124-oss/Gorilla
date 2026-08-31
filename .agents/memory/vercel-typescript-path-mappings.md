---
name: Vercel TypeScript and ESM imports
description: Vercel native TypeScript functions need deployment-safe imports for aliases and Node ESM resolution.
---

Keep imports reachable from Vercel API function entrypoints relative rather than using the project's `@shared` alias, and include explicit `.js` extensions on relative imports in the serverless ESM graph. The client may continue using Vite aliases because Vite resolves those during the frontend build.

**Why:** Vercel's Node.js TypeScript runtime supports entrypoint TypeScript but does not support TypeScript path mappings, and its generated ESM preserves extensionless relative imports that Node cannot resolve. Local esbuild can resolve both and hide the deployment failure.

**How to apply:** When adding server imports used by `api/*.ts`, use relative `.js` imports into shared code and bundle-test every Vercel function entrypoint.