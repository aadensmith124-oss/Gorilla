import assert from "node:assert/strict";
import test from "node:test";
import { parseLicenseKeyFile } from "./license-key-file";

test("parses one license key from every non-empty line", () => {
  assert.deepEqual(
    parseLicenseKeyFile("AAAA-BBBB-CCCC\n\nDDDD-EEEE-FFFF\n"),
    ["AAAA-BBBB-CCCC", "DDDD-EEEE-FFFF"],
  );
});

test("rejects payment-card-like lines from license key uploads", () => {
  assert.throws(
    () => parseLicenseKeyFile("4111111111111111|12/30|123"),
    /payment-card data/,
  );
});