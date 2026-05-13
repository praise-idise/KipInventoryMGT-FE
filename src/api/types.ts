/** Standard envelope for all non-paginated API responses. */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

/** Pagination metadata returned alongside list responses. */
export interface Pagination {
  currentPage?: number;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

/** Standard envelope for paginated list responses. */
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

/** Shape of error responses from the API. */
export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  /** Field-level validation errors keyed by property name. */
  errors?: Record<string, string[]>;
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "success" in error &&
    (error as ApiError).success === false
  );
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    isApiError(error) &&
    typeof error.message === "string" &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}
