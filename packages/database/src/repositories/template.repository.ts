import { Types } from 'mongoose';
import {
  MessageTemplateModel,
  IMessageTemplate,
  ITemplateComponent,
} from '../models/template.model.js';
import { TemplateCategory, TemplateStatus } from '@whatsapp-saas/domain';

export interface CreateTemplateData {
  workspaceId: string;
  name: string;
  category: TemplateCategory;
  language: string;
  components: ITemplateComponent[];
  metaTemplateId?: string;
  status?: TemplateStatus;
}

export interface ListTemplatesOptions {
  page: number;
  limit: number;
  category?: TemplateCategory;
  status?: TemplateStatus;
  search?: string;
}

export class TemplateRepository {
  static async create(data: CreateTemplateData): Promise<IMessageTemplate> {
    return MessageTemplateModel.create({
      workspaceId: new Types.ObjectId(data.workspaceId),
      name: data.name.trim(),
      category: data.category,
      language: data.language.trim(),
      components: data.components,
      metaTemplateId: data.metaTemplateId,
      status: data.status || TemplateStatus.PENDING,
    });
  }

  static async findById(
    workspaceId: string,
    templateId: string
  ): Promise<IMessageTemplate | null> {
    return MessageTemplateModel.findOne({
      _id: new Types.ObjectId(templateId),
      workspaceId: new Types.ObjectId(workspaceId),
    });
  }

  static async findByNameAndLanguage(
    workspaceId: string,
    name: string,
    language: string
  ): Promise<IMessageTemplate | null> {
    return MessageTemplateModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      name: name.trim(),
      language: language.trim(),
    });
  }

  static async findByMetaTemplateId(metaTemplateId: string): Promise<IMessageTemplate | null> {
    return MessageTemplateModel.findOne({ metaTemplateId: metaTemplateId.trim() });
  }

  static async listByWorkspace(
    workspaceId: string,
    options: ListTemplatesOptions
  ): Promise<{ templates: IMessageTemplate[]; total: number }> {
    const filter: Record<string, unknown> = {
      workspaceId: new Types.ObjectId(workspaceId),
    };

    if (options.category) {
      filter.category = options.category;
    }
    if (options.status) {
      filter.status = options.status;
    }
    if (options.search) {
      filter.name = { $regex: options.search.trim(), $options: 'i' };
    }

    const skip = (options.page - 1) * options.limit;

    const [templates, total] = await Promise.all([
      MessageTemplateModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit),
      MessageTemplateModel.countDocuments(filter),
    ]);

    return { templates, total };
  }

  static async updateStatus(
    workspaceId: string,
    templateId: string,
    status: TemplateStatus,
    metaTemplateId?: string
  ): Promise<IMessageTemplate | null> {
    const update: Record<string, unknown> = { status };
    if (metaTemplateId) {
      update.metaTemplateId = metaTemplateId;
    }

    return MessageTemplateModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(templateId),
        workspaceId: new Types.ObjectId(workspaceId),
      },
      { $set: update },
      { new: true }
    );
  }

  static async delete(workspaceId: string, templateId: string): Promise<boolean> {
    const res = await MessageTemplateModel.deleteOne({
      _id: new Types.ObjectId(templateId),
      workspaceId: new Types.ObjectId(workspaceId),
    });
    return res.deletedCount > 0;
  }

  static async upsertFromMeta(
    workspaceId: string,
    metaData: {
      id: string;
      name: string;
      status: string;
      category: TemplateCategory;
      language: string;
    }
  ): Promise<IMessageTemplate> {
    let status: TemplateStatus = TemplateStatus.PENDING;
    const s = metaData.status.toUpperCase();
    if (s === 'APPROVED') status = TemplateStatus.APPROVED;
    else if (s === 'REJECTED') status = TemplateStatus.REJECTED;
    else if (s === 'PAUSED') status = TemplateStatus.PAUSED;

    return MessageTemplateModel.findOneAndUpdate(
      {
        workspaceId: new Types.ObjectId(workspaceId),
        name: metaData.name,
        language: metaData.language || 'en_US',
      },
      {
        $set: {
          metaTemplateId: metaData.id,
          category: metaData.category,
          status,
        },
        $setOnInsert: {
          components: [{ type: 'BODY', text: `Template: ${metaData.name}` }],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}
