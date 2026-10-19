import { Types } from 'mongoose';
import { ConversationModel, IConversation } from '../models/conversation.model.js';
import { MessageModel, IMessage } from '../models/message.model.js';
import { MessageStatus } from '@whatsapp-saas/domain';

export interface ListConversationsOptions {
  page: number;
  limit: number;
  unreadOnly?: boolean;
  search?: string;
}

export class ConversationRepository {
  static async findOrCreateConversation(
    workspaceId: string,
    contactId: string,
    phoneNumber: string,
    contactName?: string
  ): Promise<IConversation> {
    const workspaceObjectId = new Types.ObjectId(workspaceId);
    const contactObjectId = new Types.ObjectId(contactId);

    const update: Record<string, unknown> = {
      phoneNumber: phoneNumber.trim(),
    };
    if (contactName) {
      update.contactName = contactName.trim();
    }

    return ConversationModel.findOneAndUpdate(
      {
        workspaceId: workspaceObjectId,
        contactId: contactObjectId,
      },
      {
        $set: update,
        $setOnInsert: {
          unreadCount: 0,
          status: 'open',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  static async findById(
    workspaceId: string,
    conversationId: string
  ): Promise<IConversation | null> {
    return ConversationModel.findOne({
      _id: new Types.ObjectId(conversationId),
      workspaceId: new Types.ObjectId(workspaceId),
    });
  }

  static async listByWorkspace(
    workspaceId: string,
    options: ListConversationsOptions
  ): Promise<{ conversations: IConversation[]; total: number }> {
    const filter: Record<string, unknown> = {
      workspaceId: new Types.ObjectId(workspaceId),
    };

    if (options.unreadOnly) {
      filter.unreadCount = { $gt: 0 };
    }
    if (options.search) {
      const q = options.search.trim();
      filter.$or = [
        { phoneNumber: { $regex: q, $options: 'i' } },
        { contactName: { $regex: q, $options: 'i' } },
        { lastMessage: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (options.page - 1) * options.limit;

    const [conversations, total] = await Promise.all([
      ConversationModel.find(filter)
        .sort({ lastMessageTimestamp: -1, updatedAt: -1 })
        .skip(skip)
        .limit(options.limit),
      ConversationModel.countDocuments(filter),
    ]);

    return { conversations, total };
  }

  static async addMessage(data: {
    workspaceId: string;
    conversationId: string;
    contactId: string;
    direction: 'inbound' | 'outbound';
    type: string;
    content?: string;
    mediaUrl?: string;
    status?: MessageStatus;
    metaMessageId?: string;
    timestamp?: Date;
  }): Promise<IMessage> {
    const workspaceObjectId = new Types.ObjectId(data.workspaceId);
    const conversationObjectId = new Types.ObjectId(data.conversationId);
    const contactObjectId = new Types.ObjectId(data.contactId);
    const ts = data.timestamp || new Date();

    const message = await MessageModel.create({
      workspaceId: workspaceObjectId,
      conversationId: conversationObjectId,
      contactId: contactObjectId,
      direction: data.direction,
      type: data.type,
      content: data.content,
      mediaUrl: data.mediaUrl,
      status: data.status || (data.direction === 'inbound' ? MessageStatus.DELIVERED : MessageStatus.ACCEPTED),
      metaMessageId: data.metaMessageId,
      timestamp: ts,
    });

    // Update conversation lastMessage & unread count if inbound
    const conversationUpdate: Record<string, unknown> = {
      lastMessage: data.content || `[${data.type.toUpperCase()}]`,
      lastMessageTimestamp: ts,
    };
    if (data.direction === 'inbound') {
      await ConversationModel.updateOne(
        { _id: conversationObjectId },
        {
          $set: conversationUpdate,
          $inc: { unreadCount: 1 },
        }
      );
    } else {
      await ConversationModel.updateOne(
        { _id: conversationObjectId },
        { $set: conversationUpdate }
      );
    }

    return message;
  }

  static async listMessages(
    workspaceId: string,
    conversationId: string,
    options: { page: number; limit: number }
  ): Promise<{ messages: IMessage[]; total: number }> {
    const filter = {
      workspaceId: new Types.ObjectId(workspaceId),
      conversationId: new Types.ObjectId(conversationId),
    };

    const skip = (options.page - 1) * options.limit;

    const [messages, total] = await Promise.all([
      MessageModel.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(options.limit),
      MessageModel.countDocuments(filter),
    ]);

    return { messages: messages.reverse(), total };
  }

  static async markAsRead(workspaceId: string, conversationId: string): Promise<void> {
    await ConversationModel.updateOne(
      {
        _id: new Types.ObjectId(conversationId),
        workspaceId: new Types.ObjectId(workspaceId),
      },
      { $set: { unreadCount: 0 } }
    );
  }

  static async updateMessageStatus(
    metaMessageId: string,
    status: MessageStatus
  ): Promise<IMessage | null> {
    return MessageModel.findOneAndUpdate(
      { metaMessageId },
      { $set: { status } },
      { new: true }
    );
  }
}
