export type ValueOf<T extends Record<string, string>> = T[keyof T];

export const PURCHASE_ORDER_STATUS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "PendingApproval",
  CHANGES_REQUESTED: "ChangesRequested",
  APPROVED: "Approved",
  PARTIALLY_RECEIVED: "PartiallyReceived",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
} as const;

export type PurchaseOrderStatus = ValueOf<typeof PURCHASE_ORDER_STATUS>;

export const TRANSFER_REQUEST_STATUS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "PendingApproval",
  CHANGES_REQUESTED: "ChangesRequested",
  APPROVED: "Approved",
  IN_TRANSIT: "InTransit",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export type TransferRequestStatus = ValueOf<typeof TRANSFER_REQUEST_STATUS>;

export const STOCK_ADJUSTMENT_STATUS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "PendingApproval",
  CHANGES_REQUESTED: "ChangesRequested",
  APPROVED: "Approved",
  APPLIED: "Applied",
  CANCELLED: "Cancelled",
} as const;

export type StockAdjustmentStatus = ValueOf<typeof STOCK_ADJUSTMENT_STATUS>;

export const OPENING_BALANCE_STATUS = {
  APPLIED: "Applied",
} as const;

export type OpeningBalanceStatus = ValueOf<typeof OPENING_BALANCE_STATUS>;

export const ADJUSTMENT_REASON = {
  COUNT_CORRECTION: "CountCorrection",
  DAMAGE: "Damage",
  EXPIRY: "Expiry",
  LOSS: "Loss",
  FOUND_STOCK: "FoundStock",
  WRITE_OFF: "WriteOff",
} as const;

export type AdjustmentReason = ValueOf<typeof ADJUSTMENT_REASON>;

export const STOCK_ISSUE_REASON = {
  SAMPLE: "Sample",
  INTERNAL_USE: "InternalUse",
  DAMAGE_DISPOSAL: "DamageDisposal",
  WRITE_OFF: "WriteOff",
  OTHER: "Other",
} as const;

export type StockIssueReason = ValueOf<typeof STOCK_ISSUE_REASON>;

export const APPROVAL_DOCUMENT_TYPE = {
  PURCHASE_ORDER: "PurchaseOrder",
  STOCK_ADJUSTMENT: "StockAdjustment",
  TRANSFER_REQUEST: "TransferRequest",
} as const;

export type ApprovalDocumentType = ValueOf<typeof APPROVAL_DOCUMENT_TYPE>;

export const APPROVAL_DECISION_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  CHANGES_REQUESTED: "ChangesRequested",
  CANCELLED: "Cancelled",
} as const;

export type ApprovalDecisionStatus = ValueOf<typeof APPROVAL_DECISION_STATUS>;
