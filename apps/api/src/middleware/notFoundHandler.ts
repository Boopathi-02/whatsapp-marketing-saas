import { Request, Response } from 'express';
import { ApiErrorResponse, ErrorCode } from '@whatsapp-saas/contracts';

export function notFoundHandlerMiddleware(req: Request, res: Response): void {
  const requestId = String(req.id || 'unknown');
  const responsePayload: ApiErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    },
    requestId,
  };

  res.status(404).json(responsePayload);
}
