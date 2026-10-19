import { z } from 'zod';

export const CreateQuickReplySchema = z.object({
  shortcut: z
    .string()
    .trim()
    .min(1, 'Shortcut is required')
    .max(50)
    .regex(/^\/[a-zA-Z0-9_-]+$/, 'Shortcut must begin with a forward slash (e.g. /welcome)'),
  title: z.string().trim().min(1, 'Title is required').max(100),
  body: z.string().trim().min(1, 'Message body is required').max(4096),
  category: z.string().trim().max(50).optional(),
});

export type CreateQuickReplyRequest = z.infer<typeof CreateQuickReplySchema>;

export const UpdateQuickReplySchema = CreateQuickReplySchema.partial();
export type UpdateQuickReplyRequest = z.infer<typeof UpdateQuickReplySchema>;

export const QuickReplyDtoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  shortcut: z.string(),
  title: z.string(),
  body: z.string(),
  category: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type QuickReplyDto = z.infer<typeof QuickReplyDtoSchema>;
