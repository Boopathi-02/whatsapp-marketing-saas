import { ErrorCode, ErrorCodeType, ApiErrorDetail } from '@whatsapp-saas/contracts';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCodeType;
  public readonly details?: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCodeType = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: ApiErrorDetail[],
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  public static badRequest(message: string, details?: ApiErrorDetail[]): AppError {
    return new AppError(message, 400, ErrorCode.BAD_REQUEST, details);
  }

  public static validation(message = 'The request payload is invalid', details?: ApiErrorDetail[]): AppError {
    return new AppError(message, 422, ErrorCode.VALIDATION_ERROR, details);
  }

  public static notFound(message = 'Resource not found'): AppError {
    return new AppError(message, 404, ErrorCode.NOT_FOUND);
  }

  public static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(message, 401, ErrorCode.UNAUTHORIZED);
  }

  public static forbidden(message = 'Insufficient permissions'): AppError {
    return new AppError(message, 403, ErrorCode.FORBIDDEN);
  }

  public static databaseUnavailable(message = 'Database service is temporarily unavailable'): AppError {
    return new AppError(message, 503, ErrorCode.DATABASE_UNAVAILABLE);
  }
}
