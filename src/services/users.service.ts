import { apiClient } from "@/api/client";
import type { AppRole } from "@/auth/roles";

export interface UserListItem {
  userId: string;
  email?: string | null;
  userName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isEmailConfirmed: boolean;
  isActive: boolean;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
  roles: AppRole[];
}

export async function fetchUsers(args: {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
}) {
  const { pageNumber, pageSize, searchTerm } = args;

  const params: Record<string, string | number> = {
    pageNumber,
    pageSize,
  };

  if (searchTerm.trim()) {
    params.searchTerm = searchTerm;
  }

  return apiClient.getPaginated<UserListItem>("/Users", params);
}

export async function revokeUserSessions(userId: string) {
  return apiClient.post<null>(
    `/Auth/revoke-sessions/${encodeURIComponent(userId)}`,
    {},
  );
}

export async function deactivateUser(userId: string) {
  return apiClient.post<UserListItem>(
    `/Users/${encodeURIComponent(userId)}/deactivate`,
    {},
  );
}

export async function activateUser(userId: string) {
  return apiClient.post<UserListItem>(
    `/Users/${encodeURIComponent(userId)}/activate`,
    {},
  );
}

export async function updateUserRoles(userId: string, roles: AppRole[]) {
  return apiClient.put<UserListItem>(
    `/Users/${encodeURIComponent(userId)}/roles`,
    { roles },
  );
}
