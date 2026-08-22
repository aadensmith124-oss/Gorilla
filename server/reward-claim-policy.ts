export const CLAIM_LIMIT_PER_WINDOW = 1;

export type ClaimAccess =
  | { allowed: true }
  | { allowed: false; reason: "unlinked" | "inactive_name" | "suspended" };

export function getClaimAccess(input: {
  hasRequiredName: boolean;
  suspendedUntil: Date | null;
  now?: Date;
}): ClaimAccess {
  const now = input.now ?? new Date();
  if (input.suspendedUntil && input.suspendedUntil > now) {
    return { allowed: false, reason: "suspended" };
  }
  if (!input.hasRequiredName) return { allowed: false, reason: "inactive_name" };
  return { allowed: true };
}

export function remainingClaimSlots(used: number): number {
  return Math.max(0, CLAIM_LIMIT_PER_WINDOW - used);
}