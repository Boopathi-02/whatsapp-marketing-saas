import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);
router.get('/me', requireAuth, AuthController.getMe);
router.post('/verify-email', authRateLimiter, AuthController.verifyEmail);
router.post('/forgot-password', authRateLimiter, AuthController.forgotPassword);
router.post('/reset-password', authRateLimiter, AuthController.resetPassword);

export const authRouter = router;
