import { z } from 'zod';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVITATION_INVALID: 'INVITATION_INVALID',
  LAST_OWNER_CANNOT_BE_REMOVED: 'LAST_OWNER_CANNOT_BE_REMOVED',
  CANNOT_TRANSFER_TO_SELF: 'CANNOT_TRANSFER_TO_SELF',
  MEMBER_ALREADY_EXISTS: 'MEMBER_ALREADY_EXISTS',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  SUBSCRIPTION_INACTIVE: 'SUBSCRIPTION_INACTIVE',
  ENTITLEMENT_EXCEEDED: 'ENTITLEMENT_EXCEEDED',
  PAYMENT_PROVIDER_NOT_CONFIGURED: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  requestId: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export const ApiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(ApiErrorDetailSchema).optional(),
  }),
  requestId: z.string(),
});
