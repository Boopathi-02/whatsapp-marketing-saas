import { Schema, model, Document, Types } from 'mongoose';
import { TemplateCategory, TemplateStatus } from '@whatsapp-saas/domain';

export interface ITemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface IMessageTemplate extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  metaTemplateId?: string;
  name: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  components: ITemplateComponent[];
  createdAt: Date;
  updatedAt: Date;
}

const TemplateComponentSchema = new Schema<ITemplateComponent>(
  {
    type: {
      type: String,
      enum: ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'],
      required: true,
    },
    format: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'],
    },
    text: {
      type: String,
      maxlength: 1024,
    },
    buttons: [
      {
        type: { type: String, required: true },
        text: { type: String, required: true },
        url: { type: String },
        phone_number: { type: String },
      },
    ],
  },
  { _id: false }
);

const MessageTemplateSchema = new Schema<IMessageTemplate>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    metaTemplateId: {
      type: String,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(TemplateCategory),
      required: true,
      default: TemplateCategory.MARKETING,
    },
    language: {
      type: String,
      required: true,
      trim: true,
      default: 'en_US',
    },
    status: {
      type: String,
      enum: Object.values(TemplateStatus),
      required: true,
      default: TemplateStatus.DRAFT,
      index: true,
    },
    components: {
      type: [TemplateComponentSchema],
      required: true,
      default: [],
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

// Compound unique index ensuring template names are unique per workspace + language
MessageTemplateSchema.index(
  { workspaceId: 1, name: 1, language: 1 },
  { unique: true }
);

export const MessageTemplateModel = model<IMessageTemplate>(
  'MessageTemplate',
  MessageTemplateSchema
);
