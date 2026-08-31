import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Replit exposes DATABASE_URL, while Vercel Postgres integrations commonly
// expose POSTGRES_URL or POSTGRES_PRISMA_URL. Prefer the project-standard name
// but allow the hosted-Postgres names so the same build can run in either
// environment.
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!databaseUrl) {
  throw new Error(
    "A PostgreSQL connection string is required. Set DATABASE_URL in the Vercel project environment variables.",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });
