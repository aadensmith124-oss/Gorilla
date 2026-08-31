import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";

const ENVELOPE_PREFIX = "beastcc-enc-v1";
const DERIVATION_SALT = "beastcc-project-data-encryption-v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;

function encryptionKey(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret || secret.trim().length < 16) {
    throw new Error("APP_ENCRYPTION_KEY must be configured with a strong secret");
  }

  return scryptSync(secret, DERIVATION_SALT, KEY_BYTES);
}

export function isEncryptedBuffer(value: Buffer): boolean {
  return value.subarray(0, ENVELOPE_PREFIX.length).toString("utf8") === ENVELOPE_PREFIX;
}

export function encryptBuffer(plaintext: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([
    Buffer.from(`${ENVELOPE_PREFIX}\n`, "utf8"),
    iv,
    authTag,
    ciphertext,
  ]);
}

export function decryptBuffer(envelope: Buffer): Buffer {
  const prefix = Buffer.from(`${ENVELOPE_PREFIX}\n`, "utf8");
  if (!envelope.subarray(0, prefix.length).equals(prefix)) {
    throw new Error("Unsupported or unencrypted data envelope");
  }

  const payload = envelope.subarray(prefix.length);
  if (payload.length < IV_BYTES + AUTH_TAG_BYTES) {
    throw new Error("Encrypted data envelope is truncated");
  }

  const iv = payload.subarray(0, IV_BYTES);
  const authTag = payload.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = payload.subarray(IV_BYTES + AUTH_TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptText(plaintext: string): string {
  return encryptBuffer(Buffer.from(plaintext, "utf8")).toString("base64");
}

export function decryptText(encodedEnvelope: string): string {
  return decryptBuffer(Buffer.from(encodedEnvelope, "base64")).toString("utf8");
}

export function encryptionKeyFingerprint(): string {
  return createHash("sha256").update(encryptionKey()).digest("hex").slice(0, 16);
}