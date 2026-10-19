import { z } from 'zod';
import { TemplateCategory, TemplateStatus } from '@whatsapp-saas/domain';

export const TemplateComponentSchema = z.object({
  type: z.enum(['HEADER', 'BODY', 'FOOTER', 'BUTTONS']),
  format: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT']).optional(),
  text: z.string().max(1024).optional(),
  buttons: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().max(25),
        url: z.string().url().optional(),
        phone_number: z.string().optional(),
      })
    )
    .optional(),
});

export const CreateTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Template name is required')
    .max(512)
    .regex(/^[a-z0-9_]+$/, 'Template name must be lowercase alphanumeric and underscores only'),
  category: z.enum([
    TemplateCategory.MARKETING,
    TemplateCategory.UTILITY,
    TemplateCategory.AUTHENTICATION,
  ]),
  language: z.string().trim().min(2).max(10).default('en_US'),
  components: z.array(TemplateComponentSchema).min(1, 'At least one component (BODY) is required'),
});

export type CreateTemplateRequest = z.infer<typeof CreateTemplateSchema>;

export const TemplateDtoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  metaTemplateId: z.string().optional(),
  name: z.string(),
  category: z.enum([
    TemplateCategory.MARKETING,
    TemplateCategory.UTILITY,
    TemplateCategory.AUTHENTICATION,
  ]),
  language: z.string(),
  status: z.enum([
    TemplateStatus.DRAFT,
    TemplateStatus.PENDING,
    TemplateStatus.APPROVED,
    TemplateStatus.REJECTED,
    TemplateStatus.PAUSED,
  ]),
  components: z.array(TemplateComponentSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TemplateDto = z.infer<typeof TemplateDtoSchema>;

export const ListTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.enum([TemplateCategory.MARKETING, TemplateCategory.UTILITY, TemplateCategory.AUTHENTICATION]).optional(),
  status: z.enum([
    TemplateStatus.DRAFT,
    TemplateStatus.PENDING,
    TemplateStatus.APPROVED,
    TemplateStatus.REJECTED,
    TemplateStatus.PAUSED,
  ]).optional(),
  search: z.string().trim().optional(),
});

export type ListTemplatesQuery = z.infer<typeof ListTemplatesQuerySchema>;
