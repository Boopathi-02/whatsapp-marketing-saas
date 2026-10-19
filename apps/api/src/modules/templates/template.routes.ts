import { Router } from 'express';
import { TemplateController } from './template.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireWorkspace } from '../../middleware/workspace.js';

export const templateRouter = Router({ mergeParams: true });

// All routes require authentication and valid workspace membership
templateRouter.use(requireAuth);

// List templates (Viewer+)
templateRouter.get('/', requireWorkspace('viewer'), TemplateController.listTemplates);

// Synchronize templates from Meta (Admin+)
templateRouter.post('/sync', requireWorkspace('admin'), TemplateController.syncTemplates);

// Create new template (Admin+)
templateRouter.post('/', requireWorkspace('admin'), TemplateController.createTemplate);

// Get template details (Viewer+)
templateRouter.get('/:templateId', requireWorkspace('viewer'), TemplateController.getTemplate);

// Delete template (Admin+)
templateRouter.delete('/:templateId', requireWorkspace('admin'), TemplateController.deleteTemplate);
