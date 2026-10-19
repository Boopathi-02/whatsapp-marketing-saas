import { Router } from 'express';
import { QuickReplyController } from './quick-reply.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireWorkspace } from '../../middleware/workspace.js';

export const quickReplyRouter = Router({ mergeParams: true });

// All routes require authentication and valid workspace membership
quickReplyRouter.use(requireAuth);

// List quick replies (Viewer+)
quickReplyRouter.get('/', requireWorkspace('viewer'), QuickReplyController.listQuickReplies);

// Get single quick reply (Viewer+)
quickReplyRouter.get('/:id', requireWorkspace('viewer'), QuickReplyController.getQuickReply);

// Create quick reply (Admin+)
quickReplyRouter.post('/', requireWorkspace('admin'), QuickReplyController.createQuickReply);

// Update quick reply (Admin+)
quickReplyRouter.put('/:id', requireWorkspace('admin'), QuickReplyController.updateQuickReply);

// Delete quick reply (Admin+)
quickReplyRouter.delete('/:id', requireWorkspace('admin'), QuickReplyController.deleteQuickReply);
