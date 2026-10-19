import { Request, Response, NextFunction } from 'express';
import { conversationService } from './conversation.service.js';
import {
  SendMessageSchema,
  ListConversationsQuerySchema,
} from '@whatsapp-saas/contracts';
import { sendSuccess } from '../../utils/response.js';

export class ConversationController {
  static async listConversations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const query = ListConversationsQuerySchema.parse(req.query);
      const result = await conversationService.listConversations(workspaceId, query);
      sendSuccess(res, result, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async getConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const conversationId = req.params.conversationId as string;
      const conversation = await conversationService.getConversation(workspaceId, conversationId);
      sendSuccess(res, conversation, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async listMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const conversationId = req.params.conversationId as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const result = await conversationService.listMessages(workspaceId, conversationId, page, limit);
      sendSuccess(res, result, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async sendMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const conversationId = req.params.conversationId as string;
      const validated = SendMessageSchema.parse(req.body);
      const message = await conversationService.sendMessage(workspaceId, conversationId, validated);
      sendSuccess(res, message, 201, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const conversationId = req.params.conversationId as string;
      await conversationService.markAsRead(workspaceId, conversationId);
      sendSuccess(res, { success: true }, 200, req.id);
    } catch (error) {
      next(error);
    }
  }
}
