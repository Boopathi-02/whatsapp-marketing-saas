import { Request, Response, NextFunction } from 'express';
import { campaignService } from './campaign.service.js';
import {
  CreateCampaignSchema,
  ListCampaignsQuerySchema,
} from '@whatsapp-saas/contracts';
import { sendSuccess } from '../../utils/response.js';

export class CampaignController {
  static async createCampaign(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const validated = CreateCampaignSchema.parse(req.body);
      const campaign = await campaignService.createCampaign(workspaceId, validated);
      sendSuccess(res, campaign, 201, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async listCampaigns(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const query = ListCampaignsQuerySchema.parse(req.query);
      const result = await campaignService.listCampaigns(workspaceId, query);
      sendSuccess(res, result, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async getCampaign(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const campaignId = req.params.campaignId as string;
      const campaign = await campaignService.getCampaign(workspaceId, campaignId);
      sendSuccess(res, campaign, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async dispatchCampaign(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const campaignId = req.params.campaignId as string;
      const campaign = await campaignService.dispatchCampaign(workspaceId, campaignId);
      sendSuccess(res, campaign, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async cancelCampaign(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const campaignId = req.params.campaignId as string;
      const campaign = await campaignService.cancelCampaign(workspaceId, campaignId);
      sendSuccess(res, campaign, 200, req.id);
    } catch (error) {
      next(error);
    }
  }
}
