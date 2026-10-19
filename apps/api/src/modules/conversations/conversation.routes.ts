import { Router } from 'express';
import { ConversationController } from './conversation.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireWorkspace } from '../../middleware/workspace.js';

export const conversationRouter = Router({ mergeParams: true });

// All routes require authentication and valid workspace membership
conversationRouter.use(requireAuth);

// List conversations / inbox threads (Viewer+)
conversationRouter.get('/', requireWorkspace('viewer'), ConversationController.listConversations);

// Get single conversation (Viewer+)
conversationRouter.get('/:conversationId', requireWorkspace('viewer'), ConversationController.getConversation);

// List messages in a thread (Viewer+)
conversationRouter.get('/:conversationId/messages', requireWorkspace('viewer'), ConversationController.listMessages);

// Send message in a thread (Member+)
conversationRouter.post('/:conversationId/messages', requireWorkspace('member'), ConversationController.sendMessage);

// Mark conversation as read (Member+)
conversationRouter.post('/:conversationId/read', requireWorkspace('member'), ConversationController.markAsRead);
