import { Schema, model, Document, Types } from 'mongoose';
import { QualityRating, WhatsAppAccountStatus } from '@whatsapp-saas/domain';

export interface IWhatsAppAccount extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  displayName: string;
  qualityRating: QualityRating;
  status: WhatsAppAccountStatus;
  accessTokenEncrypted: string;
  metadata?: Record<string, unknown>;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppAccountSchema = new Schema<IWhatsAppAccount>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    wabaId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    phoneNumberId: {
      type: String,
      required: true,
      trim: true,
    },
    displayPhoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    qualityRating: {
      type: String,
      enum: Object.values(QualityRating),
      default: QualityRating.UNKNOWN,
    },
    status: {
      type: String,
      enum: Object.values(WhatsAppAccountStatus),
      default: WhatsAppAccountStatus.CONNECTED,
    },
    accessTokenEncrypted: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastSyncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id ?? '');
        ret.workspaceId = String(ret.workspaceId ?? '');
        delete ret._id;
        delete ret.__v;
        delete ret.accessTokenEncrypted; // NEVER expose encrypted tokens to API responses
        return ret;
      },
    },
  }
);

// Compound unique index ensuring one phone number account registration per workspace
WhatsAppAccountSchema.index({ workspaceId: 1, phoneNumberId: 1 }, { unique: true });
WhatsAppAccountSchema.index({ workspaceId: 1, status: 1 });

// Critical Multi-Tenant Protection: Prevent the same phone number from being active in multiple workspaces
WhatsAppAccountSchema.index(
  { phoneNumberId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: WhatsAppAccountStatus.CONNECTED },
  }
);

export const WhatsAppAccountModel = model<IWhatsAppAccount>('WhatsAppAccount', WhatsAppAccountSchema);
