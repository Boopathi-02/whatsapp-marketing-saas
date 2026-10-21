import { Router } from 'express';
import { BillingController } from './billing.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireWorkspace } from '../../middleware/workspace.js';
import { webhookRateLimiter } from '../../middleware/rateLimiter.js';

// Mounted at /workspaces/:workspaceId/billing
export const billingRouter = Router({ mergeParams: true });
billingRouter.use(requireAuth);

// Subscription state is needed by every role to gate UI; financial data is admin+.
billingRouter.get('/subscription', requireWorkspace('viewer'), BillingController.subscription);
billingRouter.get('/entitlements', requireWorkspace('viewer'), BillingController.entitlements);
billingRouter.get('/plans', requireWorkspace('viewer'), BillingController.plans);
billingRouter.post('/subscription/checkout', requireWorkspace('owner'), BillingController.checkout);
billingRouter.post('/subscription/cancel', requireWorkspace('owner'), BillingController.cancel);

billingRouter.get('/wallet', requireWorkspace('admin'), BillingController.wallet);
billingRouter.get('/wallet/transactions', requireWorkspace('admin'), BillingController.transactions);
billingRouter.get('/wallet/top-ups', requireWorkspace('admin'), BillingController.topUps);
billingRouter.post('/wallet/top-ups', requireWorkspace('admin'), BillingController.createTopUp);
billingRouter.get('/wallet/top-ups/:paymentId', requireWorkspace('admin'), BillingController.getTopUp);
billingRouter.post('/wallet/adjustments', requireWorkspace('owner'), BillingController.adjust);
billingRouter.get('/wallet/reconciliation', requireWorkspace('owner'), BillingController.reconcile);

// Mounted at /webhooks/payments (public; HMAC-authenticated)
export const paymentWebhookRouter = Router();
paymentWebhookRouter.post('/', webhookRateLimiter, BillingController.paymentCallback);
