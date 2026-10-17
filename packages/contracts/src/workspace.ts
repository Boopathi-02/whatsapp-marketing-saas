import { z } from 'zod';

export const WorkspaceRoleEnum = z.enum(['owner', 'admin', 'member', 'viewer']);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleEnum>;

export const WorkspaceContextSchema = z.object({
  workspaceId: z.string().min(1),
  tenantId: z.string().min(1),
  role: WorkspaceRoleEnum,
});
export type WorkspaceContext = z.infer<typeof WorkspaceContextSchema>;

export const WorkspaceDto = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  ownerUserId: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.enum(['active', 'suspended']),
  role: WorkspaceRoleEnum.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkspaceDto = z.infer<typeof WorkspaceDto>;

export const WorkspaceMembershipDto = z.object({
  workspace: WorkspaceDto,
  role: WorkspaceRoleEnum,
  status: z.enum(['active', 'invited', 'suspended']),
  joinedAt: z.string(),
});
export type WorkspaceMembershipDto = z.infer<typeof WorkspaceMembershipDto>;

export const CreateWorkspaceRequestSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters').max(60),
});
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;

export const UpdateWorkspaceRequestSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters').max(60),
});
export type UpdateWorkspaceRequest = z.infer<typeof UpdateWorkspaceRequestSchema>;

export const InviteMemberRequestSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  role: z.enum(['admin', 'member', 'viewer']),
});
export type InviteMemberRequest = z.infer<typeof InviteMemberRequestSchema>;

export const UpdateMemberRoleRequestSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});
export type UpdateMemberRoleRequest = z.infer<typeof UpdateMemberRoleRequestSchema>;

export const TransferOwnershipRequestSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
});
export type TransferOwnershipRequest = z.infer<typeof TransferOwnershipRequestSchema>;

export const WorkspaceMemberDtoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    displayName: z.string(),
  }),
  role: WorkspaceRoleEnum,
  status: z.enum(['active', 'invited', 'suspended']),
  invitedAt: z.string().nullable().optional(),
  joinedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type WorkspaceMemberDto = z.infer<typeof WorkspaceMemberDtoSchema>;

export const WorkspaceInvitationDtoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
  expiresAt: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected', 'revoked']),
  invitedBy: z.string(),
  createdAt: z.string(),
});
export type WorkspaceInvitationDto = z.infer<typeof WorkspaceInvitationDtoSchema>;
