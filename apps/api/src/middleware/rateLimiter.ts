import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ErrorCode } from '@whatsapp-saas/contracts';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 100 : 20, // 20 attempts per 15 minutes in prod, higher in test
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Too many authentication attempts. Please try again later.',
    },
    requestId: 'rate-limit-hit',
  },
  skip: () => env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT !== 'true',
});
