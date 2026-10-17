import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiErrorResponse, ErrorCode } from '@whatsapp-saas/contracts';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = String(req.id || 'unknown');

  // 1. Handled Operational Errors
  if (err instanceof AppError) {
    const responsePayload: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && err.details.length > 0 ? { details: err.details } : {}),
      },
      requestId,
    };

    logger.warn({
      err: {
        message: err.message,
        code: err.code,
        details: err.details,
      },
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: err.statusCode,
    }, 'Operational error encountered');

    res.status(err.statusCode).json(responsePayload);
    return;
  }

  // 2. Zod Validation Errors
  if (err instanceof ZodError) {
    const details = err.errors.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    const responsePayload: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'The request payload is invalid',
        details,
      },
      requestId,
    };

    logger.warn({
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: 422,
      validationIssues: details,
    }, 'Request validation failed');

    res.status(422).json(responsePayload);
    return;
  }

  // 3. JSON Syntax Errors (Malformed Body)
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    const responsePayload: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.BAD_REQUEST,
        message: 'Malformed JSON payload in request body',
      },
      requestId,
    };

    logger.warn({
      requestId,
      method: req.method,
      url: req.originalUrl,
    }, 'Malformed JSON payload');

    res.status(400).json(responsePayload);
    return;
  }

  // 4. Unhandled / Unexpected Errors
  logger.error({
    err: {
      message: err.message,
      name: err.name,
      stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
    },
    requestId,
    method: req.method,
    url: req.originalUrl,
  }, 'Unhandled internal server error');

  const responsePayload: ApiErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message:
        env.NODE_ENV === 'production'
          ? 'An internal server error occurred'
          : err.message || 'An internal server error occurred',
    },
    requestId,
  };

  res.status(500).json(responsePayload);
}
