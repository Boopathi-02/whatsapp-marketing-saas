import { Schema, model, Document, Types } from 'mongoose';
import { WorkspaceRole } from '@whatsapp-saas/contracts';

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked';

export interface IWorkspaceInvitation {
  _id: Types.ObjectId;
  id?: string;
  workspaceId: Types.ObjectId;
  email: string;
  role: WorkspaceRole;
  invitedBy: Types.ObjectId;
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceInvitationDocument = Document<Types.ObjectId, Record<string, unknown>, IWorkspaceInvitation> & IWorkspaceInvitation;

const WorkspaceInvitationSchema = new Schema<IWorkspaceInvitation>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired', 'revoked'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id ?? '');
        ret.workspaceId = String(ret.workspaceId ?? '');
        ret.invitedBy = ret.invitedBy ? String(ret.invitedBy) : undefined;
        delete ret.__v;
        delete ret.tokenHash; // Never expose token hash
        return ret;
      },
    },
  }
);

WorkspaceInvitationSchema.index({ workspaceId: 1, email: 1, status: 1 });

export const WorkspaceInvitationModel = model<IWorkspaceInvitation>('WorkspaceInvitation', WorkspaceInvitationSchema);
