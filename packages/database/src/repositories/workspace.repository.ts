import mongoose, { Types } from 'mongoose';
import { WorkspaceModel, IWorkspace, WorkspaceStatus, WorkspaceDocument } from '../models/workspace.model.js';
import { WorkspaceMemberModel, IWorkspaceMember } from '../models/workspace_member.model.js';
import { UserModel } from '../models/user.model.js';
import { WorkspaceRole } from '@whatsapp-saas/contracts';

export interface CreateWorkspaceData {
  name: string;
  slug: string;
  ownerId: string;
}

export interface WorkspaceWithRole extends IWorkspace {
  id: string;
  role: WorkspaceRole;
}

export interface PopulatedMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: string;
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

export class WorkspaceRepository {
  /**
   * Creates a workspace and creates the owner's membership atomically.
   */
  static async create(data: CreateWorkspaceData): Promise<IWorkspace> {
    const ownerObjectId = new Types.ObjectId(data.ownerId);

    // Check if MongoDB replica set / transactions are supported
    const session = await mongoose.startSession().catch(() => null);
    let workspaceDoc: WorkspaceDocument | null = null;

    if (session) {
      try {
        session.startTransaction();
        const [ws] = await WorkspaceModel.create(
          [
            {
              name: data.name.trim(),
              slug: data.slug.toLowerCase().trim(),
              ownerId: ownerObjectId,
              status: 'active',
            },
          ],
          { session }
        );

        await WorkspaceMemberModel.create(
          [
            {
              workspaceId: ws._id,
              userId: ownerObjectId,
              role: 'owner',
              status: 'active',
              joinedAt: new Date(),
            },
          ],
          { session }
        );

        await session.commitTransaction();
        workspaceDoc = ws;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        await session.endSession();
      }
    } else {
      // Standalone fallback: sequential with compensation rollback on error
      const ws = await WorkspaceModel.create({
        name: data.name.trim(),
        slug: data.slug.toLowerCase().trim(),
        ownerId: ownerObjectId,
        status: 'active',
      });

      try {
        await WorkspaceMemberModel.create({
          workspaceId: ws._id,
          userId: ownerObjectId,
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
        });
        workspaceDoc = ws;
      } catch (memberErr) {
        // Rollback workspace creation
        await WorkspaceModel.findByIdAndDelete(ws._id);
        throw memberErr;
      }
    }

    if (!workspaceDoc) {
      throw new Error('Failed to create workspace document');
    }

    return workspaceDoc.toJSON() as unknown as IWorkspace;
  }

  static async findById(id: string): Promise<IWorkspace | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const ws = await WorkspaceModel.findById(id);
    return ws ? (ws.toJSON() as IWorkspace) : null;
  }

  static async findBySlug(slug: string): Promise<IWorkspace | null> {
    const ws = await WorkspaceModel.findOne({ slug: slug.toLowerCase().trim() });
    return ws ? (ws.toJSON() as IWorkspace) : null;
  }

  static async update(id: string, updates: Partial<{ name: string; status: WorkspaceStatus }>): Promise<IWorkspace | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const ws = await WorkspaceModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );
    return ws ? (ws.toJSON() as IWorkspace) : null;
  }

  /**
   * Retrieves all workspaces where the given user is an active member.
   */
  static async getUserWorkspaces(userId: string): Promise<WorkspaceWithRole[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    const userObjectId = new Types.ObjectId(userId);

    const memberships = await WorkspaceMemberModel.find({
      userId: userObjectId,
      status: 'active',
    }).lean();

    if (memberships.length === 0) return [];

    const workspaceIds = memberships.map((m) => m.workspaceId);
    const workspaces = await WorkspaceModel.find({
      _id: { $in: workspaceIds },
      status: { $ne: 'archived' },
    }).lean();

    const roleMap = new Map<string, WorkspaceRole>();
    for (const m of memberships) {
      roleMap.set(m.workspaceId.toString(), m.role as WorkspaceRole);
    }

    return workspaces.map((ws) => {
      const id = ws._id.toString();
      return {
        id,
        name: ws.name,
        slug: ws.slug,
        ownerId: ws.ownerId.toString(),
        status: ws.status as WorkspaceStatus,
        role: roleMap.get(id) || 'viewer',
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      } as unknown as WorkspaceWithRole;
    });
  }

  /**
   * Get active membership for a user in a specific workspace.
   */
  static async getMembership(workspaceId: string, userId: string): Promise<IWorkspaceMember | null> {
    if (!Types.ObjectId.isValid(workspaceId) || !Types.ObjectId.isValid(userId)) return null;

    const member = await WorkspaceMemberModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
      status: 'active',
    });

    return member ? (member.toJSON() as IWorkspaceMember) : null;
  }

  /**
   * Lists all members of a workspace with user details.
   */
  static async getWorkspaceMembers(workspaceId: string): Promise<PopulatedMember[]> {
    if (!Types.ObjectId.isValid(workspaceId)) return [];

    const members = await WorkspaceMemberModel.find({
      workspaceId: new Types.ObjectId(workspaceId),
      status: 'active',
    }).lean();

    const userIds = members.map((m) => m.userId);
    const users = await UserModel.find({ _id: { $in: userIds } }).lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return members.map((m) => {
      const u = userMap.get(m.userId.toString());
      return {
        id: m._id.toString(),
        workspaceId: m.workspaceId.toString(),
        userId: m.userId.toString(),
        role: m.role as WorkspaceRole,
        status: m.status,
        joinedAt: m.joinedAt,
        user: {
          id: m.userId.toString(),
          email: u?.email || 'unknown',
          displayName: u?.displayName || 'Unknown User',
        },
      };
    });
  }

  /**
   * Updates a member's role with protection against modifying the last owner.
   */
  static async updateMemberRole(
    workspaceId: string,
    memberUserId: string,
    newRole: WorkspaceRole
  ): Promise<{ success: boolean; error?: string; member?: IWorkspaceMember }> {
    if (!Types.ObjectId.isValid(workspaceId) || !Types.ObjectId.isValid(memberUserId)) {
      return { success: false, error: 'Invalid workspace or user ID' };
    }

    const wsObjectId = new Types.ObjectId(workspaceId);
    const userObjectId = new Types.ObjectId(memberUserId);

    const existingMember = await WorkspaceMemberModel.findOne({
      workspaceId: wsObjectId,
      userId: userObjectId,
      status: 'active',
    });

    if (!existingMember) {
      return { success: false, error: 'Member not found in workspace' };
    }

    // If demoting from owner to another role, check if there are other active owners
    if (existingMember.role === 'owner' && newRole !== 'owner') {
      const ownerCount = await WorkspaceMemberModel.countDocuments({
        workspaceId: wsObjectId,
        role: 'owner',
        status: 'active',
      });

      if (ownerCount <= 1) {
        return { success: false, error: 'LAST_OWNER_CANNOT_BE_REMOVED' };
      }
    }

    existingMember.role = newRole;
    await existingMember.save();

    return {
      success: true,
      member: existingMember.toJSON() as IWorkspaceMember,
    };
  }

  /**
   * Removes a member from a workspace with protection for the last owner.
   */
  static async removeMember(
    workspaceId: string,
    memberUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!Types.ObjectId.isValid(workspaceId) || !Types.ObjectId.isValid(memberUserId)) {
      return { success: false, error: 'Invalid workspace or user ID' };
    }

    const wsObjectId = new Types.ObjectId(workspaceId);
    const userObjectId = new Types.ObjectId(memberUserId);

    const member = await WorkspaceMemberModel.findOne({
      workspaceId: wsObjectId,
      userId: userObjectId,
      status: 'active',
    });

    if (!member) {
      return { success: false, error: 'Member not found in workspace' };
    }

    if (member.role === 'owner') {
      const ownerCount = await WorkspaceMemberModel.countDocuments({
        workspaceId: wsObjectId,
        role: 'owner',
        status: 'active',
      });

      if (ownerCount <= 1) {
        return { success: false, error: 'LAST_OWNER_CANNOT_BE_REMOVED' };
      }
    }

    await WorkspaceMemberModel.deleteOne({ _id: member._id });
    return { success: true };
  }

  /**
   * Transfers ownership to another active member.
   * Atomically sets Workspace.ownerId and promotes new owner while demoting current owner to admin.
   */
  static async transferOwnership(
    workspaceId: string,
    currentOwnerId: string,
    newOwnerId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!Types.ObjectId.isValid(workspaceId) || !Types.ObjectId.isValid(currentOwnerId) || !Types.ObjectId.isValid(newOwnerId)) {
      return { success: false, error: 'Invalid ID supplied' };
    }

    if (currentOwnerId === newOwnerId) {
      return { success: false, error: 'CANNOT_TRANSFER_TO_SELF' };
    }

    const wsObjectId = new Types.ObjectId(workspaceId);
    const currentOwnerObjectId = new Types.ObjectId(currentOwnerId);
    const newOwnerObjectId = new Types.ObjectId(newOwnerId);

    // Verify target user is an active member
    const targetMember = await WorkspaceMemberModel.findOne({
      workspaceId: wsObjectId,
      userId: newOwnerObjectId,
      status: 'active',
    });

    if (!targetMember) {
      return { success: false, error: 'Target user is not an active member of this workspace' };
    }

    // Try transaction first
    const session = await mongoose.startSession().catch(() => null);

    if (session) {
      try {
        session.startTransaction();

        // 1. Update workspace owner
        await WorkspaceModel.updateOne(
          { _id: wsObjectId },
          { $set: { ownerId: newOwnerObjectId } },
          { session }
        );

        // 2. Promote target member to owner
        await WorkspaceMemberModel.updateOne(
          { workspaceId: wsObjectId, userId: newOwnerObjectId },
          { $set: { role: 'owner' } },
          { session }
        );

        // 3. Demote current owner to admin
        await WorkspaceMemberModel.updateOne(
          { workspaceId: wsObjectId, userId: currentOwnerObjectId },
          { $set: { role: 'admin' } },
          { session }
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
      await WorkspaceModel.updateOne({ _id: wsObjectId }, { $set: { ownerId: newOwnerObjectId } });
      await WorkspaceMemberModel.updateOne({ workspaceId: wsObjectId, userId: newOwnerObjectId }, { $set: { role: 'owner' } });
      await WorkspaceMemberModel.updateOne({ workspaceId: wsObjectId, userId: currentOwnerObjectId }, { $set: { role: 'admin' } });
    }

    return { success: true };
  }
}
