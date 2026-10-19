import { Schema, model, Document, Types } from 'mongoose';
import { MessageStatus } from '@whatsapp-saas/domain';

export interface ICampaignRecipient extends Document {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  contactId: Types.ObjectId;
  phoneNumber: string;
  status: MessageStatus;
  metaMessageId?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignRecipientSchema = new Schema<ICampaignRecipient>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
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
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.QUEUED,
      index: true,
    },
    metaMessageId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as Types.ObjectId).toString();
        ret.campaignId = (ret.campaignId as Types.ObjectId).toString();
        ret.workspaceId = (ret.workspaceId as Types.ObjectId).toString();
        ret.contactId = (ret.contactId as Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index ensuring idempotency per campaign recipient
CampaignRecipientSchema.index(
  { campaignId: 1, phoneNumber: 1 },
  { unique: true }
);

export const CampaignRecipientModel = model<ICampaignRecipient>(
  'CampaignRecipient',
  CampaignRecipientSchema
);
