import { Response } from 'express';
import { ApiSuccessResponse } from '@whatsapp-saas/contracts';

/**
 * Sends a standardized success JSON response adhering to ApiSuccessResponse envelope.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  requestId?: string | unknown
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    requestId: requestId ? String(requestId) : '',
  };
  res.status(statusCode).json(response);
}
