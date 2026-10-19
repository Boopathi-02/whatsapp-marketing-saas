import { Schema, model, Document, Types } from 'mongoose';
import { CampaignStatus } from '@whatsapp-saas/domain';

export interface ICampaign extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  name: string;
  templateId: Types.ObjectId;
  whatsAppAccountId: Types.ObjectId;
  status: CampaignStatus;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  tagFilter?: string[];
  scheduledAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'MessageTemplate',
      required: true,
      index: true,
    },
    whatsAppAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'WhatsAppAccount',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.DRAFT,
      index: true,
    },
    recipientCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    readCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tagFilter: {
      type: [String],
      default: [],
    },
    scheduledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as Types.ObjectId).toString();
        ret.workspaceId = (ret.workspaceId as Types.ObjectId).toString();
        ret.templateId = (ret.templateId as Types.ObjectId).toString();
        ret.whatsAppAccountId = (ret.whatsAppAccountId as Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

CampaignSchema.index({ workspaceId: 1, createdAt: -1 });
CampaignSchema.index({ workspaceId: 1, status: 1 });

export const CampaignModel = model<ICampaign>('Campaign', CampaignSchema);
