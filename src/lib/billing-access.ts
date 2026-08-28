import { BILLING_ACCESS_STATE, type BillingAccessState } from "@/lib/domain-values";

export const BILLING_MUTATION_BLOCKED_STATES = [
  BILLING_ACCESS_STATE.READ_ONLY,
  BILLING_ACCESS_STATE.LOCKED,
] as const satisfies readonly BillingAccessState[];

let currentBillingState: BillingAccessState | null = null;
const listeners = new Set<() => void>();

export function isBillingMutationBlocked(state: BillingAccessState | null) {
  return BILLING_MUTATION_BLOCKED_STATES.some((blocked) => blocked === state);
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
