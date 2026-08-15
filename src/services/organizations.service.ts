import { apiClient } from "@/api/client";

export interface Organization {
  organizationId: string;
  name: string;
  createdAt: string;
}

export interface OrganizationInvitation {
  organizationInvitationId: string;
  email: string;
  role: string;
  status: "Pending" | "Accepted" | "Revoked";
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export async function fetchCurrentOrganization() {
  const response = await apiClient.get<Organization>("/Organizations/current");
  return response.data;
}

export async function updateOrganization(values: { name: string }) {
  return apiClient.patch<Organization>("/Organizations/current", values);
}

export async function inviteMember(values: { email: string; role: string }) {
  return apiClient.post<OrganizationInvitation>("/Organizations/invitations", values);
}

export async function fetchInvitations(args: { pageNumber: number; pageSize: number }) {
  return apiClient.getPaginated<OrganizationInvitation>("/Organizations/invitations", args);
}

export async function revokeInvitation(invitationId: string) {
  return apiClient.post<OrganizationInvitation>(
    `/Organizations/invitations/${invitationId}/revoke`,
    {},
  );
}

export async function acceptInvitation(token: string) {
  return apiClient.post<{ organizationId: string; organizationName: string }>(
    "/Organizations/invitations/accept",
    { token },
  );
}
