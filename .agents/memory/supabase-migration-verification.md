---
name: Supabase migration verification
description: Supabase REST is useful for table reads, while DDL requires the active Supabase MCP migration tool.
---

Supabase’s connected REST API cannot create tables or run DDL; use the active Supabase MCP `applyMigration` tool for schema migrations. That tool can report an output security-scan failure after the migration has already committed.

**Why:** Retrying a migration after that warning can create confusing duplicate attempts or migration-name conflicts.

**How to apply:** Always verify `listMigrations` and `listTables` after an `applyMigration` warning before retrying.