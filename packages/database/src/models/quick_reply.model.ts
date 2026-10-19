import { Schema, model, Document, Types } from 'mongoose';

export interface IQuickReply extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  shortcut: string;
  title: string;
  body: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuickReplySchema = new Schema<IQuickReply>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    shortcut: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as Types.ObjectId).toString();
        ret.workspaceId = (ret.workspaceId as Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index ensuring shortcut is unique per workspace
QuickReplySchema.index({ workspaceId: 1, shortcut: 1 }, { unique: true });

export const QuickReplyModel = model<IQuickReply>('QuickReply', QuickReplySchema);
