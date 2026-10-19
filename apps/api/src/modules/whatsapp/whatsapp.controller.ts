import { Request, Response, NextFunction } from 'express';
import { whatsAppService } from './whatsapp.service.js';
import {
  ConnectWhatsAppAccountSchema,
  EmbeddedSignupCompletionSchema,
  UpdateBusinessProfileSchema,
} from '@whatsapp-saas/contracts';
import { sendSuccess } from '../../utils/response.js';

export class WhatsAppController {
  static async getEmbeddedSignupConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = whatsAppService.getEmbeddedSignupConfig();
      sendSuccess(res, config, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async createOnboardingSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const userId = req.user!.id;
      const session = await whatsAppService.createOnboardingSession(workspaceId, userId);
      sendSuccess(res, session, 201, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async completeEmbeddedSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const validated = EmbeddedSignupCompletionSchema.parse(req.body);
      const account = await whatsAppService.completeEmbeddedSignup(workspaceId, validated);
      sendSuccess(res, account, 201, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async listAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const accounts = await whatsAppService.listAccounts(workspaceId);
      sendSuccess(res, accounts, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async getAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const accountId = req.params.accountId as string;
      const account = await whatsAppService.getAccount(workspaceId, accountId);
      sendSuccess(res, account, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async connectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const validated = ConnectWhatsAppAccountSchema.parse(req.body);
      const account = await whatsAppService.connectAccount(workspaceId, validated);
      sendSuccess(res, account, 201, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async syncAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const accountId = req.params.accountId as string;
      const result = await whatsAppService.syncAccount(workspaceId, accountId);
      sendSuccess(res, result, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async disconnectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const accountId = req.params.accountId as string;
      const account = await whatsAppService.disconnectAccount(workspaceId, accountId);
      sendSuccess(res, account, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const accountId = req.params.accountId as string;
      await whatsAppService.deleteAccount(workspaceId, accountId);
      sendSuccess(res, { deleted: true }, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async getBusinessProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const accountId = req.params.accountId as string;
      const profile = await whatsAppService.getBusinessProfile(workspaceId, accountId);
      sendSuccess(res, profile, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async updateBusinessProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const accountId = req.params.accountId as string;
      const validated = UpdateBusinessProfileSchema.parse(req.body);
      const result = await whatsAppService.updateBusinessProfile(workspaceId, accountId, validated);
      sendSuccess(res, result, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async getAccountHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const accountId = req.params.accountId as string;
      const health = await whatsAppService.getAccountHealth(workspaceId, accountId);
      sendSuccess(res, health, 200, req.id);
    } catch (error) {
      next(error);
    }
  }
}
