import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { decryptBuffer } from "../server/data-encryption";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error("Usage: npm run decrypt:file -- input-file.enc output-file");
}

const plaintext = decryptBuffer(await readFile(inputPath));
await writeFile(path.resolve(outputPath), plaintext, { mode: 0o600 });
console.log(`Decrypted file written to ${path.resolve(outputPath)}`);