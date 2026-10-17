import { Router } from 'express';
import { WorkspaceController } from './workspace.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireWorkspace } from '../../middleware/workspace.js';

const router = Router();

// Workspaces list and creation
router.post('/', requireAuth, WorkspaceController.create);
router.get('/', requireAuth, WorkspaceController.list);

// Workspace details and update
router.get('/:workspaceId', requireAuth, requireWorkspace('viewer'), WorkspaceController.getById);
router.patch('/:workspaceId', requireAuth, requireWorkspace('admin'), WorkspaceController.update);

// Members and invitations within workspace
router.get('/:workspaceId/members', requireAuth, requireWorkspace('viewer'), WorkspaceController.listMembers);
router.post('/:workspaceId/invitations', requireAuth, requireWorkspace('admin'), WorkspaceController.inviteMember);
router.patch('/:workspaceId/members/:memberId', requireAuth, requireWorkspace('admin'), WorkspaceController.updateMemberRole);
router.delete('/:workspaceId/members/:memberId', requireAuth, requireWorkspace('admin'), WorkspaceController.removeMember);
router.post('/:workspaceId/transfer-ownership', requireAuth, requireWorkspace('owner'), WorkspaceController.transferOwnership);

export const workspaceRouter = router;

// Global invitation acceptance/rejection router
const invRouter = Router();
invRouter.post('/:token/accept', requireAuth, WorkspaceController.acceptInvitation);
invRouter.post('/:token/reject', WorkspaceController.rejectInvitation);

export const invitationRouter = invRouter;
