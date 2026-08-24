import { apiClient } from "@/api/client";

export type BillingAccessState = "Trialing" | "Active" | "PastDue" | "ReadOnly" | "Locked";

export interface PlanItem {
  planId: string;
  tier: "Growth" | "Business" | "Enterprise";
  name: string;
  monthlyPriceNaira: number;
  maxWarehouses?: number | null;
  maxUsers?: number | null;
  hasApprovalWorkflows: boolean;
  hasReports: boolean;
  hasWhatsAppAlerts: boolean;
  hasBarcodeScanning: boolean;
  hasStockIntegrityReport: boolean;
  hasEinvoicing: boolean;
  hasWaybillOcr: boolean;
  hasAiBriefing: boolean;
  hasAccountingExport: boolean;
  hasApi: boolean;
}

export interface BillingCurrent {
  state: BillingAccessState;
  plan?: PlanItem | null;
  trialEndsAt?: string | null;
  readOnlyUntil?: string | null;
  currentPeriodEnd?: string | null;
  usage: {
    warehouses: number;
    users: number;
  };
}

export async function fetchBillingCurrent() {
  const response = await apiClient.get<BillingCurrent>("/Billing/current");
  return response.data;
}

export async function fetchPlans() {
  const response = await apiClient.get<PlanItem[]>("/Billing/plans");
  return response.data ?? [];
}

export async function subscribeToPlan(tier: PlanItem["tier"]) {
  return apiClient.post<{ authorizationUrl: string; reference: string }>(
    "/Billing/subscribe",
    { tier },
  );
}

export async function cancelSubscription() {
  return apiClient.post<null>("/Billing/cancel", {});
}
