import { Request, Response, NextFunction } from 'express';
import { WorkspaceRole } from '@whatsapp-saas/contracts';
import { WorkspaceRepository, isValidObjectId } from '@whatsapp-saas/database';
import { AppError } from '../utils/errors.js';
import { ErrorCode } from '@whatsapp-saas/contracts';

const ROLE_RANKS: Record<WorkspaceRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

/**
 * Middleware ensuring strict multi-tenant isolation:
 * 1. Confirms authenticated user context exists.
 * 2. Extracts and validates target workspace ID.
 * 3. Verifies workspace exists and is active.
 * 4. Verifies active membership of the user in the workspace.
 * 5. Enforces minimum role requirement.
 * 6. Populates req.workspace and req.membership with verified records.
 */
export function requireWorkspace(minRole: WorkspaceRole = 'viewer') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required before workspace authorization.', 401, ErrorCode.UNAUTHORIZED);
      }

      // Resolve workspace ID from route parameter, header, query, or body
      const rawWorkspaceId =
        req.params.workspaceId ||
        (req.headers['x-workspace-id'] as string) ||
        (req.query.workspaceId as string) ||
        (req.body && req.body.workspaceId);

      if (!rawWorkspaceId || typeof rawWorkspaceId !== 'string') {
        throw new AppError('Workspace identification is required.', 400, ErrorCode.BAD_REQUEST);
      }

      const workspaceId = rawWorkspaceId.trim();
      if (!isValidObjectId(workspaceId)) {
        throw new AppError('Invalid workspace ID format.', 400, ErrorCode.BAD_REQUEST);
      }

      // Verify workspace existence and status
      const workspace = await WorkspaceRepository.findById(workspaceId);
      if (!workspace || workspace.status === 'archived') {
        throw new AppError('Workspace not found or archived.', 404, ErrorCode.NOT_FOUND);
      }

      // Verify membership
      const membership = await WorkspaceRepository.getMembership(workspaceId, req.user.id);
      if (!membership || membership.status !== 'active') {
        throw new AppError('You do not have authorized membership in this workspace.', 403, ErrorCode.FORBIDDEN);
      }

      // Enforce role hierarchy
      const userRank = ROLE_RANKS[membership.role as WorkspaceRole] || 0;
      const requiredRank = ROLE_RANKS[minRole] || 0;

      if (userRank < requiredRank) {
        throw new AppError(
          `Insufficient permissions. Required role: ${minRole}, current role: ${membership.role}.`,
          403,
          ErrorCode.FORBIDDEN
        );
      }

      req.workspace = workspace;
      req.membership = {
        id: membership._id.toString(),
        workspaceId: workspaceId,
        userId: req.user.id,
        role: membership.role as WorkspaceRole,
        status: membership.status,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
