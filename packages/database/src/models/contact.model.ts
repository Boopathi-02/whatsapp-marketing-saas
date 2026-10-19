import { Schema, model, Document, Types } from 'mongoose';
import { ContactOptInStatus } from '@whatsapp-saas/domain';

export interface IContact extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  phoneNumber: string;
  displayName?: string;
  email?: string | null;
  tags: string[];
  customFields?: Record<string, string | number | boolean>;
  source: 'manual' | 'csv_import' | 'webhook' | 'api';
  consentStatus: ContactOptInStatus;
  consentSource?: string | null;
  consentTimestamp?: Date | null;
  isSuppressed: boolean;
  suppressedAt?: Date | null;
  suppressionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    customFields: {
      type: Schema.Types.Mixed,
      default: {},
    },
    source: {
      type: String,
      enum: ['manual', 'csv_import', 'webhook', 'api'],
      default: 'manual',
    },
    consentStatus: {
      type: String,
      enum: Object.values(ContactOptInStatus),
      default: ContactOptInStatus.PENDING,
      index: true,
    },
    consentSource: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    consentTimestamp: {
      type: Date,
      default: null,
    },
    isSuppressed: {
      type: Boolean,
      default: false,
      index: true,
    },
    suppressedAt: {
      type: Date,
      default: null,
    },
    suppressionReason: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
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
        return ret;
      },
    },
  }
);

// Strict compound unique index: phone number must be unique within a workspace
ContactSchema.index({ workspaceId: 1, phoneNumber: 1 }, { unique: true });
ContactSchema.index({ workspaceId: 1, isSuppressed: 1 });
ContactSchema.index({ workspaceId: 1, consentStatus: 1 });
ContactSchema.index({ workspaceId: 1, tags: 1 });
ContactSchema.index({ workspaceId: 1, createdAt: -1 });

export const ContactModel = model<IContact>('Contact', ContactSchema);
