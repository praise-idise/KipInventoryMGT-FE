import type { BillingAccessState } from "@/services/billing.service";

export const BILLING_MUTATION_BLOCKED_STATES = [
  "ReadOnly",
  "Locked",
] as const satisfies readonly BillingAccessState[];

let currentBillingState: BillingAccessState | null = null;
const listeners = new Set<() => void>();

export function isBillingMutationBlocked(state: BillingAccessState | null) {
  return (
    state !== null &&
    BILLING_MUTATION_BLOCKED_STATES.includes(
      state as (typeof BILLING_MUTATION_BLOCKED_STATES)[number],
    )
  );
}

export function getBillingAccessState() {
  return currentBillingState;
}

export function setBillingAccessState(state: BillingAccessState | null) {
  if (currentBillingState === state) return;
  currentBillingState = state;
  listeners.forEach((listener) => listener());
}

export function subscribeToBillingAccess(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
