import { z } from 'zod';
import { ContactOptInStatus } from '@whatsapp-saas/domain';

export { ContactOptInStatus };

export const CustomFieldScalarSchema = z.union([z.string().max(500), z.number(), z.boolean()]);

export const CreateContactSchema = z.object({
  phoneNumber: z.string().trim().min(5, 'Phone number is too short').max(30, 'Phone number is too long'),
  displayName: z.string().trim().max(100).optional(),
  email: z.string().trim().email('Invalid email address').max(255).optional().or(z.literal('')),
  tags: z.array(z.string().trim().max(50)).max(30).optional(),
  customFields: z.record(CustomFieldScalarSchema).optional(),
  consentStatus: z.nativeEnum(ContactOptInStatus).default(ContactOptInStatus.PENDING),
  consentSource: z.string().trim().max(100).optional(),
});
export type CreateContactRequest = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = z.object({
  displayName: z.string().trim().max(100).optional(),
  email: z.string().trim().email('Invalid email address').max(255).nullable().optional().or(z.literal('')),
  tags: z.array(z.string().trim().max(50)).max(30).optional(),
  customFields: z.record(CustomFieldScalarSchema).optional(),
  consentStatus: z.nativeEnum(ContactOptInStatus).optional(),
  consentSource: z.string().trim().max(100).optional(),
});
export type UpdateContactRequest = z.infer<typeof UpdateContactSchema>;

export const ToggleSuppressionSchema = z.object({
  isSuppressed: z.boolean(),
  suppressionReason: z.string().trim().max(255).optional(),
});
export type ToggleSuppressionRequest = z.infer<typeof ToggleSuppressionSchema>;

export const ContactQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  consentStatus: z.nativeEnum(ContactOptInStatus).optional(),
  isSuppressed: z
    .preprocess(val => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
  sortBy: z.enum(['createdAt', 'displayName', 'phoneNumber', 'consentStatus']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ContactQuery = z.infer<typeof ContactQuerySchema>;

export const ContactDtoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  phoneNumber: z.string(),
  displayName: z.string().optional(),
  email: z.string().nullable().optional(),
  tags: z.array(z.string()),
  customFields: z.record(CustomFieldScalarSchema).optional(),
  source: z.string(),
  consentStatus: z.nativeEnum(ContactOptInStatus),
  consentSource: z.string().nullable().optional(),
  consentTimestamp: z.string().nullable().optional(),
  isSuppressed: z.boolean(),
  suppressedAt: z.string().nullable().optional(),
  suppressionReason: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ContactDto = z.infer<typeof ContactDtoSchema>;

export const PaginatedContactsResponseSchema = z.object({
  contacts: z.array(ContactDtoSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalContacts: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});
export type PaginatedContactsResponse = z.infer<typeof PaginatedContactsResponseSchema>;

export const ImportContactsResultSchema = z.object({
  totalProcessed: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  failedCount: z.number(),
  errors: z.array(
    z.object({
      rowNumber: z.number(),
      reason: z.string(),
    })
  ),
});
export type ImportContactsResult = z.infer<typeof ImportContactsResultSchema>;
