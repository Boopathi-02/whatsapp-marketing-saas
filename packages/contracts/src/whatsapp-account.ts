import { z } from 'zod';
import {
  QualityRating,
  WhatsAppAccountStatus,
} from '@whatsapp-saas/domain';

export const ConnectWhatsAppAccountSchema = z.object({
  wabaId: z.string().trim().min(1, 'WABA ID is required'),
  phoneNumberId: z.string().trim().min(1, 'Phone Number ID is required'),
  accessToken: z.string().trim().min(1, 'Meta System User Access Token is required'),
  displayName: z.string().trim().max(100).optional(),
  displayPhoneNumber: z.string().trim().max(30).optional(),
});

export type ConnectWhatsAppAccountRequest = z.infer<
  typeof ConnectWhatsAppAccountSchema
>;

export const WhatsAppAccountDtoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  wabaId: z.string(),
  phoneNumberId: z.string(),
  displayName: z.string(),
  displayPhoneNumber: z.string(),
  qualityRating: z.enum([
    QualityRating.GREEN,
    QualityRating.YELLOW,
    QualityRating.RED,
    QualityRating.UNKNOWN,
  ]),
  status: z.enum([
    WhatsAppAccountStatus.CONNECTED,
    WhatsAppAccountStatus.DISCONNECTED,
    WhatsAppAccountStatus.PENDING_VERIFICATION,
    WhatsAppAccountStatus.DEGRADED,
  ]),
  lastSyncedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WhatsAppAccountDto = z.infer<
  typeof WhatsAppAccountDtoSchema
>;

export const SyncWhatsAppAccountResponseSchema = z.object({
  account: WhatsAppAccountDtoSchema,
  syncedPhoneDetails: z
    .object({
      displayPhoneNumber: z.string().optional(),
      verifiedName: z.string().optional(),
      qualityRating: z.string().optional(),
      codeVerificationStatus: z.string().optional(),
    })
    .optional(),
  templatesCount: z.number().optional(),
});

export type SyncWhatsAppAccountResponse = z.infer<
  typeof SyncWhatsAppAccountResponseSchema
>;

export const EmbeddedSignupConfigResponseSchema = z.object({
  appId: z.string(),
  configId: z.string(),
  graphApiVersion: z.string(),
});

export type EmbeddedSignupConfigResponse = z.infer<
  typeof EmbeddedSignupConfigResponseSchema
>;

export const EmbeddedSignupCompletionSchema = z.object({
  code: z.string().trim().min(1, 'Authorization code is required'),
  stateToken: z.string().trim().optional(),
  wabaId: z.string().trim().optional(),
  phoneNumberId: z.string().trim().optional(),
});

export type EmbeddedSignupCompletionRequest = z.infer<
  typeof EmbeddedSignupCompletionSchema
>;

export const OnboardingSessionResponseSchema = z.object({
  sessionId: z.string(),
  stateToken: z.string(),
  appId: z.string(),
  configId: z.string(),
  graphApiVersion: z.string(),
  expiresAt: z.string(),
});

export type OnboardingSessionResponse = z.infer<
  typeof OnboardingSessionResponseSchema
>;

export const WhatsAppAccountHealthDtoSchema = z.object({
  accountId: z.string(),
  phoneNumberId: z.string(),
  wabaId: z.string(),
  status: z.enum([
    WhatsAppAccountStatus.CONNECTED,
    WhatsAppAccountStatus.DISCONNECTED,
    WhatsAppAccountStatus.PENDING_VERIFICATION,
    WhatsAppAccountStatus.DEGRADED,
  ]),
  tokenValid: z.boolean(),
  permissionsValid: z.boolean(),
  wabaSubscribed: z.boolean(),
  phoneRegistered: z.boolean(),
  lastWebhookReceivedAt: z.string().nullable().optional(),
  lastCheckedAt: z.string(),
  issues: z.array(z.string()),
});

export type WhatsAppAccountHealthDto = z.infer<
  typeof WhatsAppAccountHealthDtoSchema
>;

export const BusinessProfileDtoSchema = z.object({
  about: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  profilePictureUrl: z.string().optional(),
  websites: z.array(z.string()).optional(),
  vertical: z.string().optional(),
});

export type BusinessProfileDto = z.infer<typeof BusinessProfileDtoSchema>;

export const UpdateBusinessProfileSchema = z.object({
  about: z.string().trim().max(139).optional(),
  address: z.string().trim().max(256).optional(),
  description: z.string().trim().max(512).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  websites: z.array(z.string().trim().url()).max(2).optional(),
  vertical: z.string().trim().optional(),
});

export type UpdateBusinessProfileRequest = z.infer<typeof UpdateBusinessProfileSchema>;