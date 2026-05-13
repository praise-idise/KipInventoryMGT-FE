import { apiClient } from "@/api/client";
import type { AppRole } from "@/auth/roles";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationStatus {
  cooldownSeconds: number;
  nextAllowedAt: string;
}

export interface LoginResponse {
  token?: string | null;
  refreshToken: string;
  expiresAt: string;
  userId?: string | null;
  email?: string | null;
  roles?: AppRole[] | null;
}

export async function login(payload: LoginRequest) {
  return apiClient.post<LoginResponse>("/Auth/login", payload);
}

export async function signup(payload: SignupRequest) {
  return apiClient.post<null>("/Auth/signup", payload);
}

export async function logout() {
  return apiClient.post<null>("/Auth/logout", {});
}

export async function forgotPassword(payload: ForgotPasswordRequest) {
  return apiClient.post<null>("/Auth/forgot-password", payload);
}

export async function resetPassword(payload: ResetPasswordRequest) {
  return apiClient.post<null>("/Auth/reset-password", payload);
}

export async function changePassword(payload: ChangePasswordRequest) {
  return apiClient.post<null>("/Auth/change-password", payload);
}

export async function resendVerification(payload: ResendVerificationRequest) {
  return apiClient.post<ResendVerificationStatus>(
    "/Auth/resend-verification",
    payload,
  );
}

export async function verifyEmail(email: string, token: string) {
  const params = new URLSearchParams({ email, token });
  return apiClient.get<null>(`/Auth/verify-email?${params.toString()}`);
}
