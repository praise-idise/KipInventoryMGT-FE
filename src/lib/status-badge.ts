const badgeToneClassMap = {
  neutral: "border-border bg-muted text-muted-foreground",
  warning:
    "border-warning/45 bg-warning/35 text-warning-foreground dark:border-warning/60 dark:bg-warning/55 dark:text-warning-foreground",
  success: "border-success/20 bg-success/10 text-success",
  info: "border-primary/20 bg-primary/10 text-primary",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
} as const;

const statusBadgeClassMap: Record<string, string> = {
  draft: badgeToneClassMap.neutral,
  pending: badgeToneClassMap.warning,
  pendingapproval: badgeToneClassMap.warning,
  approved: badgeToneClassMap.success,
  partiallyreceived: badgeToneClassMap.info,
  intransit: badgeToneClassMap.info,
  received: badgeToneClassMap.success,
  completed: badgeToneClassMap.success,
  applied: badgeToneClassMap.success,
  changesrequested: badgeToneClassMap.danger,
  rejected: badgeToneClassMap.danger,
  cancelled: badgeToneClassMap.danger,
  active: badgeToneClassMap.success,
  inactive: badgeToneClassMap.danger,
  verified: badgeToneClassMap.success,
  unverified: badgeToneClassMap.warning,
};

function normalizeStatusKey(status: string) {
  return status.replace(/[^a-zA-Z]/g, "").toLowerCase();
}

export function formatStatusLabel(status: string) {
  return status
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}

export function getStatusBadgeClassName(status: string) {
  return (
    statusBadgeClassMap[normalizeStatusKey(status)] ?? statusBadgeClassMap.draft
  );
}
