import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { encryptBuffer } from "../server/data-encryption";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be configured before creating a backup");
}

const requestedPath = process.argv[2];
const outputPath = requestedPath
  ? path.resolve(requestedPath)
  : path.resolve("backups", `project-${new Date().toISOString().replace(/[:.]/g, "-")}.sql.enc`);

const chunks: Buffer[] = [];
const dump = spawn("pg_dump", [databaseUrl, "--no-owner", "--no-acl"], {
  stdio: ["ignore", "pipe", "pipe"],
});
let errorOutput = "";

dump.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
dump.stderr.on("data", (chunk: Buffer) => {
  errorOutput += chunk.toString("utf8");
});

dump.on("error", (error) => {
  console.error(`Could not start pg_dump: ${error.message}`);
  process.exitCode = 1;
});

dump.on("close", async (code) => {
  if (code !== 0) {
    console.error(`pg_dump failed${errorOutput ? `: ${errorOutput.trim()}` : ""}`);
    process.exitCode = 1;
    return;
  }

  try {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, encryptBuffer(Buffer.concat(chunks)), { mode: 0o600 });
    console.log(`Encrypted database backup written to ${outputPath}`);
  } catch (error: any) {
    console.error(`Could not write encrypted backup: ${error.message}`);
    process.exitCode = 1;
  }
});