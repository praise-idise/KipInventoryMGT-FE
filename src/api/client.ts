import type { ApiResponse, PaginatedApiResponse, ApiError } from "./types";
import {
  ACCESS_TOKEN_KEY,
  clearAuthSession,
  getAuthUser,
  setAccessToken,
  setAuthSession,
} from "@/auth/session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
let refreshPromise: Promise<boolean> | null = null;

function normalizePaginatedResponse<T>(
  response: PaginatedApiResponse<T>,
): PaginatedApiResponse<T> {
  const pagination = response.pagination;

  if (!pagination) {
    return response;
  }

  return {
    ...response,
    pagination: {
      ...pagination,
      pageNumber: pagination.pageNumber ?? pagination.currentPage ?? 1,
    },
  };
}

function buildHeaders(idempotencyKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;
  return headers;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? (JSON.parse(text) as T | ApiError) : null;

  if (!res.ok) throw body as ApiError;
  return body as T;
}

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/Auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        clearAuthSession();
        return false;
      }

      const response = await parseResponse<
        ApiResponse<{
          token?: string | null;
          userId?: string | null;
          email?: string | null;
          roles?: string[] | null;
        }>
      >(res);

      const token = response.data?.token;
      if (!token) {
        clearAuthSession();
        return false;
      }

      const existingUser = getAuthUser();
      if (response.data.userId && response.data.email) {
        setAuthSession(token, {
          userId: response.data.userId,
          email: response.data.email,
          roles: response.data.roles ?? [],
        });
      } else if (existingUser) {
        setAuthSession(token, existingUser);
      } else {
        setAccessToken(token);
      }

      return true;
    } catch {
      clearAuthSession();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function requestWithRetry<T>(
  path: string,
  init: RequestInit,
  retryOn401 = true,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
  });

  if (res.status === 401 && retryOn401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return requestWithRetry<T>(
        path,
        { ...init, headers: buildHeaders() },
        false,
      );
    }
  }

  return parseResponse<T>(res);
}

async function requestByUrlWithRetry<T>(
  url: string,
  init: RequestInit,
  retryOn401 = true,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
  });

  if (res.status === 401 && retryOn401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return requestByUrlWithRetry<T>(
        url,
        { ...init, headers: buildHeaders() },
        false,
      );
    }
  }

  return parseResponse<T>(res);
}

export const apiClient = {
  async get<T>(path: string): Promise<ApiResponse<T>> {
    return requestWithRetry<ApiResponse<T>>(path, {
      method: "GET",
      headers: buildHeaders(),
    });
  },

  async getPaginated<T>(
    path: string,
    params?: Record<string, string | number>,
  ): Promise<PaginatedApiResponse<T>> {
    const url = new URL(`${API_BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) =>
        url.searchParams.set(k, String(v)),
      );
    }

    const response = await requestByUrlWithRetry<PaginatedApiResponse<T>>(
      url.toString(),
      {
        method: "GET",
        headers: buildHeaders(),
      },
    );

    return normalizePaginatedResponse(response);
  },

  async post<T>(
    path: string,
    body: unknown,
    idempotencyKey?: string,
  ): Promise<ApiResponse<T>> {
    return requestWithRetry<ApiResponse<T>>(path, {
      method: "POST",
      headers: buildHeaders(idempotencyKey),
      body: JSON.stringify(body),
    });
  },

  async put<T>(
    path: string,
    body: unknown,
    idempotencyKey?: string,
  ): Promise<ApiResponse<T>> {
    return requestWithRetry<ApiResponse<T>>(path, {
      method: "PUT",
      headers: buildHeaders(idempotencyKey),
      body: JSON.stringify(body),
    });
  },

  async patch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return requestWithRetry<ApiResponse<T>>(path, {
      method: "PATCH",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  },

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return requestWithRetry<ApiResponse<T>>(path, {
      method: "DELETE",
      headers: buildHeaders(),
    });
  },
};
