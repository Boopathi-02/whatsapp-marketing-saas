import { Request, Response, NextFunction } from 'express';
import { contactService } from './contact.service.js';
import {
  CreateContactSchema,
  UpdateContactSchema,
  ContactQuerySchema,
  ToggleSuppressionSchema,
} from '@whatsapp-saas/contracts';
import { sendSuccess } from '../../utils/response.js';

export class ContactController {
  static async listContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const query = ContactQuerySchema.parse(req.query);
      const result = await contactService.listContacts(workspaceId, query);
      sendSuccess(res, result, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async getContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const contactId = req.params.contactId as string;
      const contact = await contactService.getContact(workspaceId, contactId);
      sendSuccess(res, contact, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async createContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const validated = CreateContactSchema.parse(req.body);
      const contact = await contactService.createContact(workspaceId, validated);
      sendSuccess(res, contact, 201, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const contactId = req.params.contactId as string;
      const validated = UpdateContactSchema.parse(req.body);
      const contact = await contactService.updateContact(workspaceId, contactId, validated);
      sendSuccess(res, contact, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async toggleSuppression(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const contactId = req.params.contactId as string;
      const validated = ToggleSuppressionSchema.parse(req.body);
      const contact = await contactService.toggleSuppression(workspaceId, contactId, validated);
      sendSuccess(res, contact, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async deleteContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const contactId = req.params.contactId as string;
      await contactService.deleteContact(workspaceId, contactId);
      sendSuccess(res, { deleted: true }, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async importContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const { csvContent, rows } = req.body;
      const result = await contactService.importContacts(workspaceId, { csvContent, rows });
      sendSuccess(res, result, 200, req.id);
    } catch (error) {
      next(error);
    }
  }

  static async exportContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspace!._id.toString();
      const query = ContactQuerySchema.parse(req.query);
      const csv = await contactService.exportContactsCsv(workspaceId, {
        tag: query.tag,
        consentStatus: query.consentStatus,
        isSuppressed: query.isSuppressed,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
}
