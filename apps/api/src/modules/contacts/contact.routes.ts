import { Router } from 'express';
import { ContactController } from './contact.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireWorkspace } from '../../middleware/workspace.js';
import { csvImportRateLimiter } from '../../middleware/rateLimiter.js';

export const contactRouter = Router({ mergeParams: true });

// All routes require authentication and valid workspace membership
contactRouter.use(requireAuth);

// Export contacts as CSV (Viewer+)
contactRouter.get('/export', requireWorkspace('viewer'), ContactController.exportContacts);

// Bulk import contacts from CSV or pre-parsed rows (Member+)
contactRouter.post('/import', requireWorkspace('member'), csvImportRateLimiter, ContactController.importContacts);

// List contacts with search, pagination, and filters (Viewer+)
contactRouter.get('/', requireWorkspace('viewer'), ContactController.listContacts);

// Create single contact (Member+)
contactRouter.post('/', requireWorkspace('member'), ContactController.createContact);

// Get single contact by ID (Viewer+)
contactRouter.get('/:contactId', requireWorkspace('viewer'), ContactController.getContact);

// Update single contact (Member+)
contactRouter.patch('/:contactId', requireWorkspace('member'), ContactController.updateContact);

// Toggle suppression status (Member+)
contactRouter.post('/:contactId/suppression', requireWorkspace('member'), ContactController.toggleSuppression);

// Delete contact (Admin+)
contactRouter.delete('/:contactId', requireWorkspace('admin'), ContactController.deleteContact);
