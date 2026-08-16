---
name: Storage interface removal pitfall
description: Removing methods from IStorage with Python slice cuts can silently drop the interface's closing brace, causing an esbuild syntax error at build time.
---

When removing a trailing block of methods from the `IStorage` interface in `server/storage.ts` using Python line-slice deletion, the closing `}` of the interface is easy to accidentally remove along with the methods. This produces no TypeScript error in dev (tsx runs fine) but fails the production esbuild with:

> Unexpected "{" at server/storage.ts:<line>

**Why:** tsx transpiles on the fly and is more forgiving; esbuild is strict. The missing `}` leaves the interface unclosed, so the next `export class` statement is parsed inside the interface body, which is invalid.

**How to apply:** After any bulk removal from `server/storage.ts`, always verify line at the boundary between the interface and the class — confirm `}` closes the interface before `export class DatabaseStorage`.
