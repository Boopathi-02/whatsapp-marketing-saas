import { Schema, model, Document, Types } from 'mongoose';
import { WorkspaceRole } from '@whatsapp-saas/contracts';

export type MembershipStatus = 'active' | 'suspended';

export interface IWorkspaceMember {
  _id: Types.ObjectId;
  id?: string;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  role: WorkspaceRole;
  status: MembershipStatus;
  invitedBy?: Types.ObjectId | null;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceMemberDocument = Document<Types.ObjectId, Record<string, unknown>, IWorkspaceMember> & IWorkspaceMember;

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id ?? '');
        ret.workspaceId = String(ret.workspaceId ?? '');
        ret.userId = String(ret.userId ?? '');
        if (ret.invitedBy) {
          ret.invitedBy = String(ret.invitedBy);
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Enforce strictly one membership per user per workspace
WorkspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
WorkspaceMemberSchema.index({ userId: 1, status: 1 });
WorkspaceMemberSchema.index({ workspaceId: 1, role: 1 });

export const WorkspaceMemberModel = model<IWorkspaceMember>('WorkspaceMember', WorkspaceMemberSchema);
