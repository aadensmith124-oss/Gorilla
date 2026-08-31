import assert from "node:assert/strict";
import test from "node:test";
import { decryptBuffer, decryptText, encryptBuffer, encryptText, isEncryptedBuffer } from "./data-encryption";

test("encrypts and decrypts text with authenticated encryption", () => {
  process.env.APP_ENCRYPTION_KEY = "test-only-key-that-is-long-enough";
  const encrypted = encryptText("private project export");
  assert.notEqual(encrypted, "private project export");
  assert.equal(decryptText(encrypted), "private project export");
});

test("encrypts and decrypts binary data", () => {
  process.env.APP_ENCRYPTION_KEY = "test-only-key-that-is-long-enough";
  const input = Buffer.from([0, 1, 2, 255]);
  const encrypted = encryptBuffer(input);
  assert.equal(isEncryptedBuffer(encrypted), true);
  assert.deepEqual(decryptBuffer(encrypted), input);
});

test("rejects tampered encrypted data", () => {
  process.env.APP_ENCRYPTION_KEY = "test-only-key-that-is-long-enough";
  const encrypted = encryptBuffer(Buffer.from("protected"));
  encrypted[encrypted.length - 1] ^= 1;
  assert.throws(() => decryptBuffer(encrypted));
});