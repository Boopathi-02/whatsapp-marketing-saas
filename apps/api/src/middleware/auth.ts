import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';
import { UserRepository } from '@whatsapp-saas/database';
import { ErrorCode } from '@whatsapp-saas/contracts';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing Bearer token.', 401, ErrorCode.UNAUTHORIZED);
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new AppError('Authentication required. Missing token.', 401, ErrorCode.UNAUTHORIZED);
    }

    const payload = JwtUtil.verifyAccessToken(token);

    const user = await UserRepository.findById(payload.sub);
    if (!user) {
      throw new AppError('User account associated with token no longer exists.', 401, ErrorCode.UNAUTHORIZED);
    }

    if (user.accountStatus === 'suspended') {
      throw new AppError('Account is suspended. Please contact support.', 403, ErrorCode.FORBIDDEN);
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
    };

    next();
  } catch (error) {
    next(error);
  }
}
