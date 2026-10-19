import { Router } from 'express';
import { WhatsAppController } from './whatsapp.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireWorkspace } from '../../middleware/workspace.js';

export const whatsAppRouter = Router({ mergeParams: true });

// All routes require authentication and valid workspace membership
whatsAppRouter.use(requireAuth);

// List connected accounts (Viewer+)
whatsAppRouter.get('/', requireWorkspace('viewer'), WhatsAppController.listAccounts);

// Get Meta Embedded Signup v4 public configuration (Viewer+)
whatsAppRouter.get('/config', requireWorkspace('viewer'), WhatsAppController.getEmbeddedSignupConfig);

// Generate CSRF-protected Onboarding Session with state token (Admin+)
whatsAppRouter.post('/onboarding/session', requireWorkspace('admin'), WhatsAppController.createOnboardingSession);

// Complete Embedded Signup v4 code exchange (Admin+)
whatsAppRouter.post('/embedded-signup', requireWorkspace('admin'), WhatsAppController.completeEmbeddedSignup);

// Connect new WABA via direct credentials (Admin+)
whatsAppRouter.post('/', requireWorkspace('admin'), WhatsAppController.connectAccount);

// Get specific account (Viewer+)
whatsAppRouter.get('/:accountId', requireWorkspace('viewer'), WhatsAppController.getAccount);

// Get connection health report across 5 dimensions (Viewer+)
whatsAppRouter.get('/:accountId/health', requireWorkspace('viewer'), WhatsAppController.getAccountHealth);

// Synchronize metadata from Meta Graph API (Admin+)
whatsAppRouter.post('/:accountId/sync', requireWorkspace('admin'), WhatsAppController.syncAccount);

// Disconnect account (Admin+)
whatsAppRouter.post('/:accountId/disconnect', requireWorkspace('admin'), WhatsAppController.disconnectAccount);

// Get business profile (Viewer+)
whatsAppRouter.get('/:accountId/profile', requireWorkspace('viewer'), WhatsAppController.getBusinessProfile);

// Update business profile (Admin+)
whatsAppRouter.patch('/:accountId/profile', requireWorkspace('admin'), WhatsAppController.updateBusinessProfile);

// Permanently delete account (Admin+)
whatsAppRouter.delete('/:accountId', requireWorkspace('admin'), WhatsAppController.deleteAccount);
