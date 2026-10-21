import crypto from 'node:crypto';
import {
  WorkspaceRepository,
  InvitationRepository,
  UserRepository,
} from '@whatsapp-saas/database';
import {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  TransferOwnershipRequest,
  WorkspaceRole,
  ErrorCode,
} from '@whatsapp-saas/contracts';
import { SecurityUtil } from '../../utils/security.js';
import { emailService } from '../../utils/email.js';
import { AppError } from '../../utils/errors.js';
import { BillingService } from '../billing/billing.service.js';

export class WorkspaceService {
  private static generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30);
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${base || 'workspace'}-${suffix}`;
  }

  static async createWorkspace(userId: string, data: CreateWorkspaceRequest) {
    const slug = this.generateSlug(data.name);
    const workspace = await WorkspaceRepository.create({
      name: data.name.trim(),
      slug,
      ownerId: userId,
    });
    await BillingService.startTrialSafely(workspace._id.toString());

    return {
      id: workspace._id.toString(),
      name: workspace.name,
      slug: workspace.slug,
      ownerId: workspace.ownerId.toString(),
      status: workspace.status,
      role: 'owner' as WorkspaceRole,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }

  static async listUserWorkspaces(userId: string) {
    const workspaces = await WorkspaceRepository.getUserWorkspaces(userId);
    return workspaces.map(ws => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      ownerId: ws.ownerId,
      status: ws.status,
      role: ws.role,
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
    }));
  }

  static async getWorkspaceDetails(workspaceId: string) {
    const ws = await WorkspaceRepository.findById(workspaceId);
    if (!ws) {
      throw new AppError('Workspace not found.', 404, ErrorCode.NOT_FOUND);
    }
    return {
      id: ws._id.toString(),
      name: ws.name,
      slug: ws.slug,
      ownerId: ws.ownerId.toString(),
      status: ws.status,
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
    };
  }

  static async updateWorkspace(workspaceId: string, data: UpdateWorkspaceRequest) {
    const ws = await WorkspaceRepository.update(workspaceId, {
      ...(data.name ? { name: data.name.trim() } : {}),
    });

    if (!ws) {
      throw new AppError('Workspace not found.', 404, ErrorCode.NOT_FOUND);
    }

    return {
      id: ws._id.toString(),
      name: ws.name,
      slug: ws.slug,
      ownerId: ws.ownerId.toString(),
      status: ws.status,
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
    };
  }

  static async listMembers(workspaceId: string) {
    const members = await WorkspaceRepository.getWorkspaceMembers(workspaceId);
    return members.map(m => ({
      id: m.id,
      workspaceId: m.workspaceId,
      userId: m.userId,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt.toISOString(),
      user: m.user,
    }));
  }

  static async inviteMember(
    workspaceId: string,
    inviterId: string,
    data: InviteMemberRequest
  ) {
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if target user already exists and is already a member
    const targetUser = await UserRepository.findByEmail(normalizedEmail);
    if (targetUser) {
      const existingMembership = await WorkspaceRepository.getMembership(
        workspaceId,
        targetUser._id.toString()
      );
      if (existingMembership) {
        throw new AppError(
          'This user is already an active member of the workspace.',
          409,
          ErrorCode.MEMBER_ALREADY_EXISTS
        );
      }
    }

    // Check if pending invitation already exists
    const pending = await InvitationRepository.findPendingByEmailAndWorkspace(
      normalizedEmail,
      workspaceId
    );
    if (pending) {
      throw new AppError(
        'An active invitation is already pending for this email address.',
        409,
        ErrorCode.INVITATION_INVALID
      );
    }

    const ws = await WorkspaceRepository.findById(workspaceId);
    if (!ws) {
      throw new AppError('Workspace not found.', 404, ErrorCode.NOT_FOUND);
    }

    const inviter = await UserRepository.findById(inviterId);
    const inviterName = inviter ? inviter.displayName : 'A team member';

    const rawToken = SecurityUtil.generateRandomToken(32);
    const tokenHash = SecurityUtil.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await InvitationRepository.create({
      workspaceId,
      email: normalizedEmail,
      role: data.role,
      invitedBy: inviterId,
      tokenHash,
      expiresAt,
    });

    await emailService.sendWorkspaceInvitationEmail(
      normalizedEmail,
      rawToken,
      ws.name,
      inviterName
    );

    return {
      id: invitation._id.toString(),
      workspaceId,
      email: normalizedEmail,
      role: data.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      inviteToken: rawToken, // Provided in development response for easy acceptance
    };
  }

  static async acceptInvitation(userId: string, rawToken: string) {
    const tokenHash = SecurityUtil.hashToken(rawToken);
    const invitation = await InvitationRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new AppError('Invalid invitation token.', 400, ErrorCode.INVITATION_INVALID);
    }

    const result = await InvitationRepository.accept(invitation._id.toString(), userId);
    if (!result.success) {
      if (result.error === 'INVITATION_EXPIRED') {
        throw new AppError('This invitation has expired.', 400, ErrorCode.INVITATION_EXPIRED);
      }
      throw new AppError(result.error || 'Failed to accept invitation.', 400, ErrorCode.INVITATION_INVALID);
    }

    return {
      workspaceId: result.workspaceId,
      message: 'Invitation accepted successfully.',
    };
  }

  static async rejectInvitation(rawToken: string) {
    const tokenHash = SecurityUtil.hashToken(rawToken);
    const invitation = await InvitationRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new AppError('Invalid invitation token.', 400, ErrorCode.INVITATION_INVALID);
    }

    const ok = await InvitationRepository.reject(invitation._id.toString());
    if (!ok) {
      throw new AppError('Failed to reject invitation.', 400, ErrorCode.INVITATION_INVALID);
    }

    return { message: 'Invitation rejected.' };
  }

  static async updateMemberRole(
    workspaceId: string,
    callerRole: WorkspaceRole,
    memberUserId: string,
    data: UpdateMemberRoleRequest
  ) {
    // Admins cannot assign admin role
    if (callerRole === 'admin' && data.role === 'admin') {
      throw new AppError(
        'Only workspace owners can promote or assign administrator roles.',
        403,
        ErrorCode.FORBIDDEN
      );
    }

    const result = await WorkspaceRepository.updateMemberRole(workspaceId, memberUserId, data.role);
    if (!result.success) {
      if (result.error === 'LAST_OWNER_CANNOT_BE_REMOVED') {
        throw new AppError(
          'Cannot demote the last remaining owner of the workspace.',
          400,
          ErrorCode.LAST_OWNER_CANNOT_BE_REMOVED
        );
      }
      throw new AppError(result.error || 'Failed to update member role.', 400, ErrorCode.BAD_REQUEST);
    }

    return {
      member: result.member,
      message: 'Member role updated successfully.',
    };
  }

  static async removeMember(
    workspaceId: string,
    _callerRole: WorkspaceRole,
    memberUserId: string
  ) {
    const result = await WorkspaceRepository.removeMember(workspaceId, memberUserId);
    if (!result.success) {
      if (result.error === 'LAST_OWNER_CANNOT_BE_REMOVED') {
        throw new AppError(
          'Cannot remove the last remaining owner of the workspace.',
          400,
          ErrorCode.LAST_OWNER_CANNOT_BE_REMOVED
        );
      }
      throw new AppError(result.error || 'Failed to remove member.', 400, ErrorCode.BAD_REQUEST);
    }

    return { message: 'Member removed from workspace.' };
  }

  static async transferOwnership(
    workspaceId: string,
    currentOwnerId: string,
    data: TransferOwnershipRequest
  ) {
    const result = await WorkspaceRepository.transferOwnership(
      workspaceId,
      currentOwnerId,
      data.targetUserId
    );

    if (!result.success) {
      if (result.error === 'CANNOT_TRANSFER_TO_SELF') {
        throw new AppError(
          'Cannot transfer ownership to yourself.',
          400,
          ErrorCode.CANNOT_TRANSFER_TO_SELF
        );
      }
      throw new AppError(result.error || 'Failed to transfer ownership.', 400, ErrorCode.BAD_REQUEST);
    }

    return { message: 'Workspace ownership transferred successfully.' };
  }
}
