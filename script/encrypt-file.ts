import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { encryptBuffer } from "../server/data-encryption";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error("Usage: npm run encrypt:file -- input-file output-file.enc");
}

const encrypted = encryptBuffer(await readFile(inputPath));
await writeFile(path.resolve(outputPath), encrypted, { mode: 0o600 });
console.log(`Encrypted file written to ${path.resolve(outputPath)}`);