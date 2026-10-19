import { Request, Response, NextFunction } from 'express';
import { quickReplyService } from './quick-reply.service.js';
import {
  CreateQuickReplySchema,
  UpdateQuickReplySchema,
} from '@whatsapp-saas/contracts';
import { sendSuccess } from '../../utils/response.js';

export class QuickReplyController {
  static async listQuickReplies(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const items = await quickReplyService.listQuickReplies(workspaceId);
      sendSuccess(res, items, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async getQuickReply(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const id = req.params.id as string;
      const item = await quickReplyService.getQuickReply(workspaceId, id);
      sendSuccess(res, item, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async createQuickReply(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const validated = CreateQuickReplySchema.parse(req.body);
      const item = await quickReplyService.createQuickReply(workspaceId, validated);
      sendSuccess(res, item, 201, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async updateQuickReply(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const id = req.params.id as string;
      const validated = UpdateQuickReplySchema.parse(req.body);
      const item = await quickReplyService.updateQuickReply(workspaceId, id, validated);
      sendSuccess(res, item, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async deleteQuickReply(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const id = req.params.id as string;
      await quickReplyService.deleteQuickReply(workspaceId, id);
      sendSuccess(res, { deleted: true }, 200, req.id);
    } catch (error) {
      next(error);
    }
  }
}
