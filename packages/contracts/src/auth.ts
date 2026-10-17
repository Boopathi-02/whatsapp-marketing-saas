import { z } from 'zod';
import { WorkspaceDto, WorkspaceMembershipDto } from './workspace.js';

export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string().trim().min(2, 'Display name must be at least 2 characters').max(60),
  workspaceName: z.string().trim().min(2).max(60).optional(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const AuthUserDtoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  isEmailVerified: z.boolean().default(false),
  emailVerified: z.boolean().optional(),
  status: z.enum(['active', 'pending_verification', 'suspended']).default('active'),
  accountStatus: z.enum(['active', 'pending_verification', 'suspended']).optional(),
  createdAt: z.string(),
});
export type AuthUserDto = z.infer<typeof AuthUserDtoSchema>;

export const AuthResponseDtoSchema = z.object({
  user: AuthUserDtoSchema,
  accessToken: z.string(),
  currentWorkspace: WorkspaceDto.optional(),
  workspaces: z.array(WorkspaceMembershipDto),
});
export type AuthResponseDto = z.infer<typeof AuthResponseDtoSchema>;

export const TokenRefreshResponseDtoSchema = z.object({
  accessToken: z.string(),
});
export type TokenRefreshResponseDto = z.infer<typeof TokenRefreshResponseDtoSchema>;
