import { Schema, model, Document, Types } from 'mongoose';
import { MessageStatus } from '@whatsapp-saas/domain';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  conversationId: Types.ObjectId;
  contactId: Types.ObjectId;
  direction: 'inbound' | 'outbound';
  type: string;
  content?: string;
  mediaUrl?: string;
  status: MessageStatus;
  metaMessageId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    type: {
      type: String,
      default: 'text',
      trim: true,
    },
    content: {
      type: String,
      trim: true,
    },
    mediaUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.ACCEPTED,
      index: true,
    },
    metaMessageId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as Types.ObjectId).toString();
        ret.workspaceId = (ret.workspaceId as Types.ObjectId).toString();
        ret.conversationId = (ret.conversationId as Types.ObjectId).toString();
        ret.contactId = (ret.contactId as Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

MessageSchema.index({ conversationId: 1, timestamp: -1 });

export const MessageModel = model<IMessage>('Message', MessageSchema);
