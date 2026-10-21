import { z } from 'zod';

const CurrencySchema = z
  .string()
  .length(3)
  .transform(v => v.toUpperCase());

/** Money is always integer minor units. */
export const TopUpRequestSchema = z.object({
  amountMinor: z.number().int().positive().max(100_000_000_00),
  currency: CurrencySchema.optional(),
  idempotencyKey: z.string().min(8).max(100).optional(),
});
export type TopUpRequest = z.infer<typeof TopUpRequestSchema>;

export const AdjustmentRequestSchema = z.object({
  direction: z.enum(['credit', 'debit']),
  amountMinor: z.number().int().positive().max(100_000_000_00),
  currency: CurrencySchema.optional(),
  memo: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().min(8).max(100),
});
export type AdjustmentRequest = z.infer<typeof AdjustmentRequestSchema>;

export const ListTransactionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z
    .string()
    .regex(/^[a-f0-9]{24}$/i)
    .optional(),
});
export type ListTransactionsQuery = z.infer<typeof ListTransactionsQuerySchema>;

export const PaymentCallbackSchema = z.object({
  eventId: z.string().min(1).max(200),
  type: z.enum(['payment.succeeded', 'payment.failed']),
  paymentReference: z.string().min(1).max(200),
  amountMinor: z.number().int().positive(),
  currency: CurrencySchema,
});
export type PaymentCallback = z.infer<typeof PaymentCallbackSchema>;

export interface EntitlementsDto {
  monthlyMessageLimit: number;
  contactLimit: number;
  userLimit: number;
  whatsappAccountLimit: number;
}

export interface SubscriptionDto {
  workspaceId: string;
  status: string;
  storedStatus: string;
  planKey: string;
  planVersion: number;
  trialStartedAt: string;
  trialEndsAt: string;
  trialSecondsRemaining: number;
  currentPeriodEnd: string | null;
  canDispatch: boolean;
  denialReason: string | null;
  entitlements: EntitlementsDto;
}

export interface PlanDto {
  planKey: string;
  version: number;
  name: string;
  entitlements: EntitlementsDto;
  prices: { interval: 'month' | 'year'; currency: string; amountMinor: number }[];
  purchasable: boolean;
}

export interface WalletDto {
  currency: string;
  postedMinor: number;
  reservedMinor: number;
  availableMinor: number;
  lowBalanceThresholdMinor: number;
  lowBalance: boolean;
}

export interface LedgerEntryDto {
  id: string;
  type: string;
  currency: string;
  walletDeltaMinor: number;
  balanceAfterMinor: number;
  memo: string | null;
  reference: { kind: string; id: string } | null;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  provider: string;
  status: string;
  amountMinor: number;
  currency: string;
  createdAt: string;
  completedAt: string | null;
}
