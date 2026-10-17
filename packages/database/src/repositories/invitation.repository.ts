import mongoose, { Types } from 'mongoose';
import { WorkspaceInvitationModel, IWorkspaceInvitation } from '../models/workspace_invitation.model.js';
import { WorkspaceMemberModel } from '../models/workspace_member.model.js';
import { UserModel } from '../models/user.model.js';
import { WorkspaceRole } from '@whatsapp-saas/contracts';

export interface CreateInvitationData {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  tokenHash: string;
  expiresAt: Date;
}

export class InvitationRepository {
  static async create(data: CreateInvitationData): Promise<IWorkspaceInvitation> {
    const invitation = new WorkspaceInvitationModel({
      workspaceId: new Types.ObjectId(data.workspaceId),
      email: data.email.toLowerCase().trim(),
      role: data.role,
      invitedBy: new Types.ObjectId(data.invitedBy),
      tokenHash: data.tokenHash,
      status: 'pending',
      expiresAt: data.expiresAt,
    });
    await invitation.save();
    return invitation.toJSON() as IWorkspaceInvitation;
  }

  static async findByTokenHash(tokenHash: string): Promise<IWorkspaceInvitation | null> {
    const inv = await WorkspaceInvitationModel.findOne({ tokenHash });
    return inv ? (inv.toJSON() as IWorkspaceInvitation) : null;
  }

  static async findPendingByEmailAndWorkspace(
    email: string,
    workspaceId: string
  ): Promise<IWorkspaceInvitation | null> {
    if (!Types.ObjectId.isValid(workspaceId)) return null;

    const inv = await WorkspaceInvitationModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      email: email.toLowerCase().trim(),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
    return inv ? (inv.toJSON() as IWorkspaceInvitation) : null;
  }

  static async getPendingByWorkspace(workspaceId: string): Promise<IWorkspaceInvitation[]> {
    if (!Types.ObjectId.isValid(workspaceId)) return [];

    const invitations = await WorkspaceInvitationModel.find({
      workspaceId: new Types.ObjectId(workspaceId),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).lean();

    return invitations.map((inv) => ({
      id: inv._id.toString(),
      workspaceId: inv.workspaceId.toString(),
      email: inv.email,
      role: inv.role as WorkspaceRole,
      invitedBy: inv.invitedBy.toString(),
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    })) as unknown as IWorkspaceInvitation[];
  }

  /**
   * Accepts invitation and adds user as a member.
   */
  static async accept(
    invitationId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string; workspaceId?: string }> {
    if (!Types.ObjectId.isValid(invitationId) || !Types.ObjectId.isValid(userId)) {
      return { success: false, error: 'Invalid invitation or user ID' };
    }

    const invObjectId = new Types.ObjectId(invitationId);
    const userObjectId = new Types.ObjectId(userId);

    const inv = await WorkspaceInvitationModel.findById(invObjectId);
    if (!inv) {
      return { success: false, error: 'INVITATION_INVALID' };
    }

    if (inv.status !== 'pending') {
      return { success: false, error: 'INVITATION_INVALID' };
    }

    if (inv.expiresAt < new Date()) {
      inv.status = 'expired';
      await inv.save();
      return { success: false, error: 'INVITATION_EXPIRED' };
    }

    // Verify user email matches invitation email
    const user = await UserModel.findById(userObjectId);
    if (!user || user.email.toLowerCase() !== inv.email.toLowerCase()) {
      return { success: false, error: 'Invitation email does not match authenticated user' };
    }

    // Try transaction first
    const session = await mongoose.startSession().catch(() => null);

    if (session) {
      try {
        session.startTransaction();

        inv.status = 'accepted';
        inv.acceptedAt = new Date();
        await inv.save({ session });

        await WorkspaceMemberModel.findOneAndUpdate(
          { workspaceId: inv.workspaceId, userId: userObjectId },
          {
            $setOnInsert: {
              workspaceId: inv.workspaceId,
              userId: userObjectId,
              role: inv.role,
              status: 'active',
              invitedBy: inv.invitedBy,
              joinedAt: new Date(),
            },
          },
          { upsert: true, session }
        );

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      } finally {
        await session.endSession();
      }
    } else {
      // Sequential fallback
      inv.status = 'accepted';
      inv.acceptedAt = new Date();
      await inv.save();

      await WorkspaceMemberModel.findOneAndUpdate(
        { workspaceId: inv.workspaceId, userId: userObjectId },
        {
          $setOnInsert: {
            workspaceId: inv.workspaceId,
            userId: userObjectId,
            role: inv.role,
            status: 'active',
            invitedBy: inv.invitedBy,
            joinedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    return { success: true, workspaceId: inv.workspaceId.toString() };
  }

  /**
   * Rejects an invitation.
   */
  static async reject(invitationId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(invitationId)) return false;

    const result = await WorkspaceInvitationModel.updateOne(
      { _id: new Types.ObjectId(invitationId), status: 'pending' },
      { $set: { status: 'rejected', rejectedAt: new Date() } }
    );

    return result.modifiedCount > 0;
  }
}
