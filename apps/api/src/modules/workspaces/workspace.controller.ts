import { Request, Response, NextFunction } from 'express';
import { WorkspaceService } from './workspace.service.js';
import {
  CreateWorkspaceRequestSchema,
  UpdateWorkspaceRequestSchema,
  InviteMemberRequestSchema,
  UpdateMemberRoleRequestSchema,
  TransferOwnershipRequestSchema,
  ApiSuccessResponse,
} from '@whatsapp-saas/contracts';

export class WorkspaceController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateWorkspaceRequestSchema.parse(req.body);
      const result = await WorkspaceService.createWorkspace(req.user!.id, validated);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await WorkspaceService.listUserWorkspaces(req.user!.id);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = String(req.params.workspaceId);
      const result = await WorkspaceService.getWorkspaceDetails(workspaceId);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = String(req.params.workspaceId);
      const validated = UpdateWorkspaceRequestSchema.parse(req.body);
      const result = await WorkspaceService.updateWorkspace(workspaceId, validated);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = String(req.params.workspaceId);
      const result = await WorkspaceService.listMembers(workspaceId);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = String(req.params.workspaceId);
      const validated = InviteMemberRequestSchema.parse(req.body);
      const result = await WorkspaceService.inviteMember(workspaceId, req.user!.id, validated);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = String(req.params.token);
      const result = await WorkspaceService.acceptInvitation(req.user!.id, token);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async rejectInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = String(req.params.token);
      const result = await WorkspaceService.rejectInvitation(token);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = String(req.params.workspaceId);
      const memberId = String(req.params.memberId);
      const validated = UpdateMemberRoleRequestSchema.parse(req.body);
      const callerRole = req.membership!.role;

      const result = await WorkspaceService.updateMemberRole(
        workspaceId,
        callerRole,
        memberId,
        validated
      );

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = String(req.params.workspaceId);
      const memberId = String(req.params.memberId);
      const callerRole = req.membership!.role;

      const result = await WorkspaceService.removeMember(workspaceId, callerRole, memberId);

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async transferOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = String(req.params.workspaceId);
      const validated = TransferOwnershipRequestSchema.parse(req.body);

      const result = await WorkspaceService.transferOwnership(
        workspaceId,
        req.user!.id,
        validated
      );

      const response: ApiSuccessResponse<typeof result> = {
        success: true,
        data: result,
        requestId: String(req.id || ''),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
