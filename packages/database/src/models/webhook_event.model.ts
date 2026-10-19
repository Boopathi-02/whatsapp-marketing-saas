import { Schema, model, Document, Types } from 'mongoose';

export interface IWebhookEvent extends Document {
  _id: Types.ObjectId;
  workspaceId?: Types.ObjectId | null;
  providerEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  processed: boolean;
  status: 'pending' | 'processed' | 'failed' | 'ignored';
  attempts: number;
  lastError?: string | null;
  processedAt?: Date | null;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true,
    },
    providerEventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed', 'ignored'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id ?? '');
        if (ret.workspaceId) {
          ret.workspaceId = String(ret.workspaceId);
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

WebhookEventSchema.index({ workspaceId: 1, receivedAt: -1 });

export const WebhookEventModel = model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
