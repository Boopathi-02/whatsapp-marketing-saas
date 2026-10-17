import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errors.js';
import { ErrorCode } from '@whatsapp-saas/contracts';

export interface JwtAccessTokenPayload {
  sub: string;       // User ID
  email: string;
  displayName: string;
  jti?: string;
}

export class JwtUtil {
  /**
   * Signs a short-lived access token.
   */
  static signAccessToken(payload: JwtAccessTokenPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as unknown as NonNullable<SignOptions['expiresIn']>,
      algorithm: 'HS256',
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
  }

  /**
   * Verifies and decodes an access token.
   */
  static verifyAccessToken(token: string): JwtAccessTokenPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET, {
        algorithms: ['HS256'],
      }) as JwtAccessTokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError('Access token has expired', 401, ErrorCode.TOKEN_EXPIRED);
      }
      throw new AppError('Invalid access token', 401, ErrorCode.UNAUTHORIZED);
    }
  }
}
