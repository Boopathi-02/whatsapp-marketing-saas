import { z } from 'zod';
import { CampaignStatus } from '@whatsapp-saas/domain';

export const CreateCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required').max(100),
  templateId: z.string().trim().min(1, 'Template selection is required'),
  whatsAppAccountId: z.string().trim().min(1, 'WhatsApp Account selection is required'),
  tagFilter: z.array(z.string().trim()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type CreateCampaignRequest = z.infer<typeof CreateCampaignSchema>;

export const CampaignDtoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  templateId: z.string(),
  templateName: z.string().optional(),
  whatsAppAccountId: z.string(),
  accountDisplayName: z.string().optional(),
  status: z.enum([
    CampaignStatus.DRAFT,
    CampaignStatus.SCHEDULED,
    CampaignStatus.RUNNING,
    CampaignStatus.COMPLETED,
    CampaignStatus.PAUSED,
    CampaignStatus.FAILED,
    CampaignStatus.CANCELLED,
  ]),
  recipientCount: z.number().int().min(0),
  sentCount: z.number().int().min(0),
  deliveredCount: z.number().int().min(0),
  readCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  scheduledAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CampaignDto = z.infer<typeof CampaignDtoSchema>;

export const ListCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum([
    CampaignStatus.DRAFT,
    CampaignStatus.SCHEDULED,
    CampaignStatus.RUNNING,
    CampaignStatus.COMPLETED,
    CampaignStatus.PAUSED,
    CampaignStatus.FAILED,
    CampaignStatus.CANCELLED,
  ]).optional(),
  search: z.string().trim().optional(),
});

export type ListCampaignsQuery = z.infer<typeof ListCampaignsQuerySchema>;
