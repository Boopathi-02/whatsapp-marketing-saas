import { Router } from 'express';
import { WebhookController } from './webhook.controller.js';
import { webhookRateLimiter } from '../../middleware/rateLimiter.js';

export const webhookRouter = Router();

// Public Meta webhook endpoints with rate limiting
webhookRouter.get('/whatsapp', webhookRateLimiter, WebhookController.handleVerification);
webhookRouter.post('/whatsapp', webhookRateLimiter, WebhookController.handleWebhook);

