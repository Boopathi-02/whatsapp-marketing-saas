import { Types } from 'mongoose';
import { QuickReplyModel, IQuickReply } from '../models/quick_reply.model.js';

export interface CreateQuickReplyData {
  workspaceId: string;
  shortcut: string;
  title: string;
  body: string;
  category?: string;
}

export class QuickReplyRepository {
  static async create(data: CreateQuickReplyData): Promise<IQuickReply> {
    return QuickReplyModel.create({
      workspaceId: new Types.ObjectId(data.workspaceId),
      shortcut: data.shortcut.trim().toLowerCase(),
      title: data.title.trim(),
      body: data.body.trim(),
      category: data.category?.trim(),
    });
  }

  static async findById(workspaceId: string, id: string): Promise<IQuickReply | null> {
    return QuickReplyModel.findOne({
      _id: new Types.ObjectId(id),
      workspaceId: new Types.ObjectId(workspaceId),
    });
  }

  static async findByShortcut(
    workspaceId: string,
    shortcut: string
  ): Promise<IQuickReply | null> {
    return QuickReplyModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      shortcut: shortcut.trim().toLowerCase(),
    });
  }

  static async listByWorkspace(workspaceId: string): Promise<IQuickReply[]> {
    return QuickReplyModel.find({
      workspaceId: new Types.ObjectId(workspaceId),
    }).sort({ shortcut: 1 });
  }

  static async update(
    workspaceId: string,
    id: string,
    data: Partial<CreateQuickReplyData>
  ): Promise<IQuickReply | null> {
    const update: Record<string, unknown> = {};
    if (data.shortcut) update.shortcut = data.shortcut.trim().toLowerCase();
    if (data.title) update.title = data.title.trim();
    if (data.body) update.body = data.body.trim();
    if (data.category !== undefined) update.category = data.category.trim();

    return QuickReplyModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        workspaceId: new Types.ObjectId(workspaceId),
      },
      { $set: update },
      { new: true }
    );
  }

  static async delete(workspaceId: string, id: string): Promise<boolean> {
    const res = await QuickReplyModel.deleteOne({
      _id: new Types.ObjectId(id),
      workspaceId: new Types.ObjectId(workspaceId),
    });
    return res.deletedCount > 0;
  }
}
