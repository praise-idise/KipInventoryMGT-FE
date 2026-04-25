import { apiClient } from "@/api/client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string | null;
  refreshToken: string;
  expiresAt: string;
  userId?: string | null;
  email?: string | null;
  roles?: string[] | null;
}

export async function login(payload: LoginRequest) {
  return apiClient.post<LoginResponse>("/Auth/login", payload);
}

export async function logout() {
  return apiClient.post<null>("/Auth/logout", {});
}
