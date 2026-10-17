import { Schema, model, Types, HydratedDocument } from 'mongoose';

export type WorkspaceStatus = 'active' | 'suspended' | 'archived';

export interface IWorkspace {
  _id: Types.ObjectId;
  id?: string;
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  status: WorkspaceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceDocument = HydratedDocument<IWorkspace>;

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id ?? '');
        ret.ownerId = String(ret.ownerId ?? '');
        delete ret.__v;
        return ret;
      },
    },
  }
);

WorkspaceSchema.index({ ownerId: 1, status: 1 });

export const WorkspaceModel = model<IWorkspace>('Workspace', WorkspaceSchema);
