import assert from "node:assert/strict";
import test from "node:test";
import { CLAIM_LIMIT_PER_WINDOW, getClaimAccess, remainingClaimSlots } from "./reward-claim-policy";

const now = new Date("2026-08-21T12:00:00.000Z");

test("drop claims do not require a store account", () => {
  assert.deepEqual(
    getClaimAccess({ hasRequiredName: true, suspendedUntil: null, now }),
    { allowed: true },
  );
  assert.deepEqual(
    getClaimAccess({ hasRequiredName: false, suspendedUntil: null, now }),
    { allowed: false, reason: "inactive_name" },
  );
});

test("license-key claims honor suspensions and the 24-hour limit", () => {
  assert.deepEqual(
    getClaimAccess({
      hasRequiredName: true,
      suspendedUntil: new Date("2026-08-21T12:01:00.000Z"),
      now,
    }),
    { allowed: false, reason: "suspended" },
  );
  assert.equal(remainingClaimSlots(0), CLAIM_LIMIT_PER_WINDOW);
  assert.equal(remainingClaimSlots(CLAIM_LIMIT_PER_WINDOW), 0);
});