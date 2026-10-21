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

export const BUSINESS_VERTICALS = [
  'ALCOHOL', 'APPAREL', 'AUTO', 'BEAUTY', 'EDU', 'ENTERTAIN', 'EVENT_PLAN', 'FINANCE', 'GOVT',
  'GROCERY', 'HEALTH', 'HOTEL', 'NONPROFIT', 'ONLINE_GAMBLING', 'OTC_DRUGS', 'OTHER',
  'PHYSICAL_GAMBLING', 'PROF_SERVICES', 'RESTAURANT', 'RETAIL', 'TRAVEL',
] as const;

/** Meta accepts JPEG/PNG profile pictures; the API body limit keeps uploads small (base64 in JSON). */
export const PROFILE_PICTURE_MAX_BASE64_CHARS = 1_800_000;

export const UpdateBusinessProfileSchema = z.object({
  about: z.string().trim().max(139).optional(),
  address: z.string().trim().max(256).optional(),
  description: z.string().trim().max(512).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  websites: z
    .array(z.string().trim().url().max(256).refine(u => /^https?:\/\//i.test(u), 'Websites must use http or https'))
    .max(2)
    .optional(),
  vertical: z.enum(BUSINESS_VERTICALS).optional(),
  profilePicture: z
    .object({
      data: z.string().min(1).max(PROFILE_PICTURE_MAX_BASE64_CHARS).regex(/^[A-Za-z0-9+/]+=*$/, 'Invalid base64 data'),
      mimeType: z.enum(['image/jpeg', 'image/png']),
    })
    .optional(),
});

export type UpdateBusinessProfileRequest = z.infer<typeof UpdateBusinessProfileSchema>;

export interface WabaPhoneNumberDto {
  id: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  qualityRating: string;
  nameStatus: string | null;
  codeVerificationStatus: string | null;
  platformType: string | null;
  /** True when this phone number is already connected in this workspace. */
  connected: boolean;
  /** True when it is connected as an active account in a different workspace. */
  unavailable: boolean;
}

export const AddPhoneNumberSchema = z.object({
  phoneNumberId: z.string().trim().min(1, 'Phone Number ID is required'),
});
export type AddPhoneNumberRequest = z.infer<typeof AddPhoneNumberSchema>;

export const BlockUsersSchema = z.object({
  // Digits with optional leading '+'; normalised to digits-only (WhatsApp ID format).
  users: z
    .array(z.string().trim().regex(/^\+?[1-9]\d{6,14}$/, 'Enter phone numbers in international format'))
    .min(1)
    .max(25),
});
export type BlockUsersRequest = z.infer<typeof BlockUsersSchema>;

export const ListBlockedUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  after: z.string().max(500).optional(),
  before: z.string().max(500).optional(),
});
export type ListBlockedUsersQuery = z.infer<typeof ListBlockedUsersQuerySchema>;

export interface BlockedUserDto {
  waId: string;
  name: string | null;
}

export interface BlockedUsersPageDto {
  items: BlockedUserDto[];
  after: string | null;
  before: string | null;
}

export interface BlockUsersResultDto {
  changed: string[];
  failed: Array<{ input: string; message: string }>;
}
