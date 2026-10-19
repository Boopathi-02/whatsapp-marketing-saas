import { Router } from 'express';
import { CampaignController } from './campaign.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireWorkspace } from '../../middleware/workspace.js';

export const campaignRouter = Router({ mergeParams: true });

// All routes require authentication and valid workspace membership
campaignRouter.use(requireAuth);

// List campaigns (Viewer+)
campaignRouter.get('/', requireWorkspace('viewer'), CampaignController.listCampaigns);

// Create campaign (Admin+)
campaignRouter.post('/', requireWorkspace('admin'), CampaignController.createCampaign);

// Get campaign by ID (Viewer+)
campaignRouter.get('/:campaignId', requireWorkspace('viewer'), CampaignController.getCampaign);

// Dispatch/Trigger campaign (Admin+)
campaignRouter.post('/:campaignId/dispatch', requireWorkspace('admin'), CampaignController.dispatchCampaign);

// Cancel campaign (Admin+)
campaignRouter.post('/:campaignId/cancel', requireWorkspace('admin'), CampaignController.cancelCampaign);
