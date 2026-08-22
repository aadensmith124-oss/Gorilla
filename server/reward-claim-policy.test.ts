import assert from "node:assert/strict";
import test from "node:test";
import { CLAIM_LIMIT_PER_HOUR, getClaimAccess, remainingClaimSlots } from "./reward-claim-policy";

const now = new Date("2026-08-21T12:00:00.000Z");

test("claims require a linked store account", () => {
  assert.deepEqual(
    getClaimAccess({ isLinked: false, hasRequiredName: true, suspendedUntil: null, now }),
    { allowed: false, reason: "unlinked" },
  );
});

test("claims block inactive display names and active suspensions", () => {
  assert.deepEqual(
    getClaimAccess({ isLinked: true, hasRequiredName: false, suspendedUntil: null, now }),
    { allowed: false, reason: "inactive_name" },
  );
  assert.deepEqual(
    getClaimAccess({
      isLinked: true,
      hasRequiredName: true,
      suspendedUntil: new Date("2026-08-21T12:01:00.000Z"),
      now,
    }),
    { allowed: false, reason: "suspended" },
  );
});

test("claims allow only one code per UTC hour", () => {
  assert.equal(remainingClaimSlots(0), CLAIM_LIMIT_PER_HOUR);
  assert.equal(remainingClaimSlots(CLAIM_LIMIT_PER_HOUR), 0);
  assert.equal(remainingClaimSlots(CLAIM_LIMIT_PER_HOUR + 1), 0);
});