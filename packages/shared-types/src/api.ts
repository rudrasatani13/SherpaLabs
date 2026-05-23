import type { JsonValue } from './common';

export interface ApiPagination {
  readonly limit: number;
  readonly offset: number;
  readonly total?: number;
  readonly nextCursor?: string;
}

export interface ApiResponseMeta {
  readonly requestId?: string;
  readonly pagination?: ApiPagination;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: JsonValue;
}

export interface ApiSuccessResponse<T> {
  readonly ok: true;
  readonly data: T;
  readonly meta?: ApiResponseMeta;
}

export interface ApiErrorResponse {
  readonly ok: false;
  readonly error: ApiError;
  readonly meta?: ApiResponseMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
