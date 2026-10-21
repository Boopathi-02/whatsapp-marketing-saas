import { Request, Response, NextFunction } from 'express';
import { whatsAppService } from './whatsapp.service.js';
import {
  ConnectWhatsAppAccountSchema,
  EmbeddedSignupCompletionSchema,
  UpdateBusinessProfileSchema,
  AddPhoneNumberSchema,
  BlockUsersSchema,
  ListBlockedUsersQuerySchema,
} from '@whatsapp-saas/contracts';
import { whatsAppChannelService } from './whatsapp-channel.service.js';
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
      const result = await whatsAppService.updateBusinessProfile(workspaceId, accountId, validated, req.user!.id);
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

  static async listPhoneNumbers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await whatsAppChannelService.listWabaPhoneNumbers(req.workspace!._id.toString(), req.params.accountId as string);
      sendSuccess(res, data, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async addPhoneNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phoneNumberId } = AddPhoneNumberSchema.parse(req.body);
      const data = await whatsAppChannelService.addPhoneNumber(
        req.workspace!._id.toString(),
        req.params.accountId as string,
        phoneNumberId,
        req.user!.id
      );
      sendSuccess(res, data, 201, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async reconnectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await whatsAppChannelService.reconnectAccount(
        req.workspace!._id.toString(),
        req.params.accountId as string,
        req.user!.id
      );
      sendSuccess(res, data, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async listBlockedUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListBlockedUsersQuerySchema.parse(req.query);
      const data = await whatsAppChannelService.listBlockedUsers(
        req.workspace!._id.toString(),
        req.params.accountId as string,
        query
      );
      sendSuccess(res, data, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async blockUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { users } = BlockUsersSchema.parse(req.body);
      const data = await whatsAppChannelService.blockUsers(
        req.workspace!._id.toString(),
        req.params.accountId as string,
        users,
        req.user!.id
      );
      sendSuccess(res, data, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async unblockUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { users } = BlockUsersSchema.parse(req.body);
      const data = await whatsAppChannelService.unblockUsers(
        req.workspace!._id.toString(),
        req.params.accountId as string,
        users,
        req.user!.id
      );
      sendSuccess(res, data, 200, req.id);
    } catch (error) {
      next(error);
    }
  }
}
