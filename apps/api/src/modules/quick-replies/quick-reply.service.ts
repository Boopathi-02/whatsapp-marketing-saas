import {
  QuickReplyRepository,
  IQuickReply,
} from '@whatsapp-saas/database';
import {
  CreateQuickReplyRequest,
  UpdateQuickReplyRequest,
  QuickReplyDto,
} from '@whatsapp-saas/contracts';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from '@whatsapp-saas/contracts';

export class QuickReplyService {
  async createQuickReply(
    workspaceId: string,
    req: CreateQuickReplyRequest
  ): Promise<QuickReplyDto> {
    const existing = await QuickReplyRepository.findByShortcut(
      workspaceId,
      req.shortcut
    );
    if (existing) {
      throw new AppError(
        `Shortcut "${req.shortcut}" already exists in this workspace.`,
        409,
        ErrorCode.CONFLICT
      );
    }

    const item = await QuickReplyRepository.create({
      workspaceId,
      shortcut: req.shortcut,
      title: req.title,
      body: req.body,
      category: req.category,
    });

    return this.toDto(item);
  }

  async listQuickReplies(workspaceId: string): Promise<QuickReplyDto[]> {
    const items = await QuickReplyRepository.listByWorkspace(workspaceId);
    return items.map((i) => this.toDto(i));
  }

  async getQuickReply(workspaceId: string, id: string): Promise<QuickReplyDto> {
    const item = await QuickReplyRepository.findById(workspaceId, id);
    if (!item) {
      throw new AppError('Quick reply not found in workspace.', 404, ErrorCode.NOT_FOUND);
    }
    return this.toDto(item);
  }

  async updateQuickReply(
    workspaceId: string,
    id: string,
    req: UpdateQuickReplyRequest
  ): Promise<QuickReplyDto> {
    const item = await QuickReplyRepository.findById(workspaceId, id);
    if (!item) {
      throw new AppError('Quick reply not found in workspace.', 404, ErrorCode.NOT_FOUND);
    }

    if (req.shortcut && req.shortcut !== item.shortcut) {
      const existing = await QuickReplyRepository.findByShortcut(
        workspaceId,
        req.shortcut
      );
      if (existing) {
        throw new AppError(
          `Shortcut "${req.shortcut}" already in use.`,
          409,
          ErrorCode.CONFLICT
        );
      }
    }

    const updated = await QuickReplyRepository.update(workspaceId, id, req);
    return this.toDto(updated!);
  }

  async deleteQuickReply(workspaceId: string, id: string): Promise<void> {
    const item = await QuickReplyRepository.findById(workspaceId, id);
    if (!item) {
      throw new AppError('Quick reply not found in workspace.', 404, ErrorCode.NOT_FOUND);
    }
    await QuickReplyRepository.delete(workspaceId, id);
  }

  private toDto(item: IQuickReply): QuickReplyDto {
    const doc = item.toJSON() as { id?: string; workspaceId?: string };
    return {
      id: doc.id || item._id.toString(),
      workspaceId: doc.workspaceId || item.workspaceId.toString(),
      shortcut: item.shortcut,
      title: item.title,
      body: item.body,
      category: item.category,
      createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const quickReplyService = new QuickReplyService();
