import {
  TemplateRepository,
  WhatsAppAccountRepository,
  IMessageTemplate,
} from '@whatsapp-saas/database';
import {
  CreateTemplateRequest,
  TemplateDto,
  ListTemplatesQuery,
} from '@whatsapp-saas/contracts';
import {
  MetaWhatsAppCloudAdapter,
  WhatsAppAdapter,
  MockWhatsAppAdapter,
} from '@whatsapp-saas/whatsapp-adapter';
import { TemplateStatus, WhatsAppAccountStatus } from '@whatsapp-saas/domain';
import { env } from '../../config/env.js';
import { decryptCredential } from '../../utils/crypto.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from '@whatsapp-saas/contracts';
import { logger } from '../../utils/logger.js';

export class TemplateService {
  private adapter: WhatsAppAdapter;

  constructor(customAdapter?: WhatsAppAdapter) {
    if (customAdapter) {
      this.adapter = customAdapter;
    } else if (env.NODE_ENV === 'test') {
      this.adapter = new MockWhatsAppAdapter();
    } else {
      this.adapter = new MetaWhatsAppCloudAdapter({
        graphApiVersion: env.META_GRAPH_API_VERSION,
      });
    }
  }

  /**
   * Creates a message template on Meta WhatsApp Business Platform and persists in DB.
   */
  async createTemplate(
    workspaceId: string,
    req: CreateTemplateRequest
  ): Promise<TemplateDto> {
    // 1. Check for existing template with same name and language in workspace
    const existing = await TemplateRepository.findByNameAndLanguage(
      workspaceId,
      req.name,
      req.language
    );
    if (existing) {
      throw new AppError(
        `A template with name "${req.name}" and language "${req.language}" already exists.`,
        409,
        ErrorCode.CONFLICT
      );
    }

    // 2. Fetch connected WhatsApp Account for workspace to get WABA ID and token
    const accounts = await WhatsAppAccountRepository.findByWorkspace(workspaceId);
    const connectedAccount = accounts.find(
      (a) => a.status === WhatsAppAccountStatus.CONNECTED
    );

    if (!connectedAccount) {
      throw new AppError(
        'A connected WhatsApp Business Account is required to create templates.',
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    let accessToken: string;
    try {
      accessToken = decryptCredential(connectedAccount.accessTokenEncrypted);
    } catch {
      throw new AppError(
        'Failed to decrypt stored credentials for WhatsApp Account.',
        500,
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }

    // 3. Submit template to Meta WhatsApp Business API
    let metaResult;
    try {
      metaResult = await this.adapter.createTemplate(
        connectedAccount.wabaId,
        accessToken,
        {
          name: req.name,
          category: req.category,
          language: req.language,
          components: req.components,
        }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message, name: req.name }, 'Failed to create template with Meta');
      throw new AppError(
        `Meta template submission error: ${message}`,
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    // 4. Save template in local database
    let initialStatus: TemplateStatus = TemplateStatus.PENDING;
    if (metaResult.status === 'APPROVED') {
      initialStatus = TemplateStatus.APPROVED;
    }

    const template = await TemplateRepository.create({
      workspaceId,
      name: req.name,
      category: req.category,
      language: req.language,
      components: req.components,
      metaTemplateId: metaResult.id,
      status: initialStatus,
    });

    return this.toDto(template);
  }

  /**
   * Synchronize templates from Meta Graph API.
   */
  async syncTemplates(
    workspaceId: string
  ): Promise<{ syncedCount: number; templates: TemplateDto[] }> {
    const accounts = await WhatsAppAccountRepository.findByWorkspace(workspaceId);
    const connectedAccount = accounts.find(
      (a) => a.status === WhatsAppAccountStatus.CONNECTED
    );

    if (!connectedAccount) {
      throw new AppError(
        'No connected WhatsApp Business Account found to synchronize templates.',
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    let accessToken: string;
    try {
      accessToken = decryptCredential(connectedAccount.accessTokenEncrypted);
    } catch {
      throw new AppError(
        'Failed to decrypt stored credentials.',
        500,
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }

    let metaTemplates;
    try {
      metaTemplates = await this.adapter.fetchTemplates(
        connectedAccount.wabaId,
        accessToken
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, 'Failed to fetch templates from Meta');
      throw new AppError(`Meta API sync error: ${message}`, 400, ErrorCode.BAD_REQUEST);
    }

    const savedTemplates: TemplateDto[] = [];
    for (const mt of metaTemplates) {
      const t = await TemplateRepository.upsertFromMeta(workspaceId, mt);
      savedTemplates.push(this.toDto(t));
    }

    return {
      syncedCount: savedTemplates.length,
      templates: savedTemplates,
    };
  }

  /**
   * List templates for workspace with pagination and filters.
   */
  async listTemplates(
    workspaceId: string,
    query: ListTemplatesQuery
  ): Promise<{ items: TemplateDto[]; total: number; page: number; limit: number }> {
    const { templates, total } = await TemplateRepository.listByWorkspace(
      workspaceId,
      query
    );

    return {
      items: templates.map((t) => this.toDto(t)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Get template by ID with tenant isolation.
   */
  async getTemplate(workspaceId: string, templateId: string): Promise<TemplateDto> {
    const template = await TemplateRepository.findById(workspaceId, templateId);
    if (!template) {
      throw new AppError('Template not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }
    return this.toDto(template);
  }

  /**
   * Delete a template from Meta and local DB.
   */
  async deleteTemplate(workspaceId: string, templateId: string): Promise<void> {
    const template = await TemplateRepository.findById(workspaceId, templateId);
    if (!template) {
      throw new AppError('Template not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }

    // Try deleting from Meta if account connected
    const accounts = await WhatsAppAccountRepository.findByWorkspace(workspaceId);
    const connectedAccount = accounts.find(
      (a) => a.status === WhatsAppAccountStatus.CONNECTED
    );

    if (connectedAccount) {
      try {
        const accessToken = decryptCredential(connectedAccount.accessTokenEncrypted);
        await this.adapter.deleteTemplate(
          connectedAccount.wabaId,
          accessToken,
          template.name
        );
      } catch (err: unknown) {
        logger.warn(
          { err: String(err), templateName: template.name },
          'Failed to delete template from Meta, deleting locally anyway'
        );
      }
    }

    await TemplateRepository.delete(workspaceId, templateId);
  }

  private toDto(t: IMessageTemplate): TemplateDto {
    const doc = t.toJSON() as { id?: string; workspaceId?: string };
    return {
      id: doc.id || t._id.toString(),
      workspaceId: doc.workspaceId || t.workspaceId.toString(),
      metaTemplateId: t.metaTemplateId,
      name: t.name,
      category: t.category,
      language: t.language,
      status: t.status,
      components: t.components,
      createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: t.updatedAt ? t.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const templateService = new TemplateService();
