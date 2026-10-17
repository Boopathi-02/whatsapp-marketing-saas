import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  VerifyEmailRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  ApiSuccessResponse,
} from '@whatsapp-saas/contracts';
import { env } from '../../config/env.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

function setRefreshTokenCookie(res: Response, token: string): void {
  const maxAge = env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000;
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `${env.API_PREFIX}/auth`,
    maxAge,
    domain: env.COOKIE_DOMAIN || undefined,
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `${env.API_PREFIX}/auth`,
    domain: env.COOKIE_DOMAIN || undefined,
  });
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RegisterRequestSchema.parse(req.body);
      const meta = {
        userAgent: req.headers['user-agent'] as string,
        ipAddress: req.ip,
      };

      const result = await AuthService.register(validated, meta);
      setRefreshTokenCookie(res, result.refreshToken);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = LoginRequestSchema.parse(req.body);
      const meta = {
        userAgent: req.headers['user-agent'] as string,
        ipAddress: req.ip,
      };

      const result = await AuthService.login(validated, meta);
      setRefreshTokenCookie(res, result.refreshToken);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Allow reading token from HttpOnly cookie OR request body
      const rawRefreshToken =
        (req.cookies && req.cookies[REFRESH_COOKIE_NAME]) ||
        (req.body && req.body.refreshToken);

      const meta = {
        userAgent: req.headers['user-agent'] as string,
        ipAddress: req.ip,
      };

      const result = await AuthService.refresh(rawRefreshToken, meta);
      setRefreshTokenCookie(res, result.refreshToken);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      clearRefreshTokenCookie(res);
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken =
        (req.cookies && req.cookies[REFRESH_COOKIE_NAME]) ||
        (req.body && req.body.refreshToken);

      await AuthService.logout(rawRefreshToken);
      clearRefreshTokenCookie(res);

      const response: ApiSuccessResponse<{ message: string }> = {
        success: true,
        data: { message: 'Logged out successfully.' },
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await AuthService.getMe(userId);

      const response: ApiSuccessResponse<typeof user> = {
        success: true,
        data: user,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = VerifyEmailRequestSchema.parse(req.body);
      const result = await AuthService.verifyEmail(validated.token);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = ForgotPasswordRequestSchema.parse(req.body);
      const result = await AuthService.forgotPassword(validated.email);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = ResetPasswordRequestSchema.parse(req.body);
      const result = await AuthService.resetPassword(validated);
      clearRefreshTokenCookie(res);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
