import { Schema, model, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  contactId: Types.ObjectId;
  phoneNumber: string;
  contactName?: string;
  lastMessage?: string;
  lastMessageTimestamp?: Date;
  unreadCount: number;
  status: 'open' | 'closed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    lastMessage: {
      type: String,
      trim: true,
    },
    lastMessageTimestamp: {
      type: Date,
      index: true,
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'archived'],
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as Types.ObjectId).toString();
        ret.workspaceId = (ret.workspaceId as Types.ObjectId).toString();
        ret.contactId = (ret.contactId as Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index ensuring one thread per workspace + contact
ConversationSchema.index(
  { workspaceId: 1, contactId: 1 },
  { unique: true }
);

ConversationSchema.index({ workspaceId: 1, lastMessageTimestamp: -1 });

export const ConversationModel = model<IConversation>('Conversation', ConversationSchema);
