export const APP_ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
  PROCUREMENT_OFFICER: "PROCUREMENT_OFFICER",
  WAREHOUSE_OFFICER: "WAREHOUSE_OFFICER",
  APPROVER: "APPROVER",
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export function hasRole(
  roles: readonly AppRole[] | undefined,
  ...requiredRoles: readonly AppRole[]
) {
  if (!roles?.length) return false;
  return requiredRoles.some((role) => roles.includes(role));
}
