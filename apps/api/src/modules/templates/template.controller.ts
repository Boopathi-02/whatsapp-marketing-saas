import { Request, Response, NextFunction } from 'express';
import { templateService } from './template.service.js';
import {
  CreateTemplateSchema,
  ListTemplatesQuerySchema,
} from '@whatsapp-saas/contracts';
import { sendSuccess } from '../../utils/response.js';

export class TemplateController {
  static async createTemplate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const validated = CreateTemplateSchema.parse(req.body);
      const template = await templateService.createTemplate(workspaceId, validated);
      sendSuccess(res, template, 201, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async syncTemplates(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const result = await templateService.syncTemplates(workspaceId);
      sendSuccess(res, result, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async listTemplates(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const query = ListTemplatesQuerySchema.parse(req.query);
      const result = await templateService.listTemplates(workspaceId, query);
      sendSuccess(res, result, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async getTemplate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const templateId = req.params.templateId as string;
      const template = await templateService.getTemplate(workspaceId, templateId);
      sendSuccess(res, template, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async deleteTemplate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const templateId = req.params.templateId as string;
      await templateService.deleteTemplate(workspaceId, templateId);
      sendSuccess(res, { deleted: true }, 200, req.id);
    } catch (error) {
      next(error);
    }
  }
}
