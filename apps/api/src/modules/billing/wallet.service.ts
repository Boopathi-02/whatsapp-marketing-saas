import {
  WalletRepository,
  PaymentRepository,
  AuditRepository,
  InsufficientFundsError,
  WalletInvariantError,
  IWalletAccount,
  ILedgerEntry,
  IPaymentTransaction,
} from '@whatsapp-saas/database';
import { postings, normalizeCurrency, availableBalance, reversePosting } from '@whatsapp-saas/billing';
import {
  ErrorCode,
  WalletDto,
  LedgerEntryDto,
  PaymentDto,
  TopUpRequest,
  AdjustmentRequest,
  PaymentCallback,
} from '@whatsapp-saas/contracts';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { getPaymentProvider } from './payment.provider.js';

function toWalletDto(w: IWalletAccount): WalletDto {
  const available = availableBalance(w.postedMinor, w.reservedMinor);
  return {
    currency: w.currency,
    postedMinor: w.postedMinor,
    reservedMinor: w.reservedMinor,
    availableMinor: available,
    lowBalanceThresholdMinor: w.lowBalanceThresholdMinor,
    lowBalance: available <= w.lowBalanceThresholdMinor,
  };
}

function toEntryDto(e: ILedgerEntry): LedgerEntryDto {
  return {
    id: e._id.toString(),
    type: e.type,
    currency: e.currency,
    walletDeltaMinor: e.walletDeltaMinor,
    balanceAfterMinor: e.balanceAfterMinor,
    memo: e.memo ?? null,
    reference: e.reference ? { kind: e.reference.kind, id: e.reference.id } : null,
    createdAt: e.createdAt.toISOString(),
  };
}

function toPaymentDto(p: IPaymentTransaction): PaymentDto {
  return {
    id: p._id.toString(),
    provider: p.provider,
    status: p.status,
    amountMinor: p.amountMinor,
    currency: p.currency,
    createdAt: p.createdAt.toISOString(),
    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
  };
}

/** Maps repository-level financial errors onto API errors. */
function mapFinancialError(err: unknown): never {
  if (err instanceof InsufficientFundsError) {
    throw new AppError(err.message, 402, ErrorCode.INSUFFICIENT_FUNDS);
  }
  if (err instanceof WalletInvariantError) {
    throw new AppError(err.message, 409, ErrorCode.CONFLICT);
  }
  throw err;
}

function currencyOrDefault(c?: string): string {
  return normalizeCurrency(c ?? env.WALLET_DEFAULT_CURRENCY);
}

export class WalletService {
  static async getWallet(workspaceId: string, currency?: string): Promise<WalletDto> {
    const wallet = await WalletRepository.getOrCreateWallet(workspaceId, currencyOrDefault(currency));
    return toWalletDto(wallet);
  }

  static async listTransactions(workspaceId: string, opts: { limit: number; cursor?: string }) {
    const { items, nextCursor } = await WalletRepository.listEntries(workspaceId, opts);
    return { items: items.map(toEntryDto), nextCursor };
  }

  static async listPayments(workspaceId: string, limit = 25) {
    return (await PaymentRepository.list(workspaceId, limit)).map(toPaymentDto);
  }

  static async getPayment(workspaceId: string, id: string): Promise<PaymentDto> {
    const p = await PaymentRepository.findForWorkspace(workspaceId, id);
    if (!p) throw new AppError('Payment not found.', 404, ErrorCode.NOT_FOUND);
    return toPaymentDto(p);
  }

  /** Creates a *pending* payment. Funds are credited only by a verified provider callback. */
  static async initiateTopUp(workspaceId: string, userId: string, req: TopUpRequest): Promise<PaymentDto> {
    const provider = getPaymentProvider();
    if (!provider) {
      throw new AppError(
        'Top-ups are unavailable: no payment provider is configured.',
        503,
        ErrorCode.PAYMENT_PROVIDER_NOT_CONFIGURED
      );
    }
    const currency = currencyOrDefault(req.currency);
    const wallet = await WalletRepository.getOrCreateWallet(workspaceId, currency);
    const created = await provider.createPayment({ workspaceId, amountMinor: req.amountMinor, currency });
    const payment = await PaymentRepository.create({
      workspaceId,
      walletId: wallet._id.toString(),
      provider: provider.name,
      providerReference: created.providerReference,
      amountMinor: req.amountMinor,
      currency,
      initiatedBy: userId,
    });
    await AuditRepository.record({
      workspaceId,
      actorUserId: userId,
      action: 'wallet.topup_initiated',
      targetType: 'payment',
      targetId: payment._id.toString(),
      metadata: { amountMinor: req.amountMinor, currency },
    });
    return toPaymentDto(payment);
  }

  /**
   * Handles a signature-verified provider callback. The tenant is taken from the stored
   * payment (matched by provider reference), never from the payload. Safe to deliver any
   * number of times: the credit is keyed by the payment id and the status flip is conditional.
   */
  static async handlePaymentCallback(provider: string, cb: PaymentCallback): Promise<{ status: string; duplicate: boolean }> {
    const payment = await PaymentRepository.findByProviderReference(provider, cb.paymentReference);
    if (!payment) throw new AppError('Unknown payment reference.', 404, ErrorCode.NOT_FOUND);

    if (payment.amountMinor !== cb.amountMinor || payment.currency !== cb.currency) {
      throw new AppError('Callback amount or currency does not match the payment.', 409, ErrorCode.CONFLICT);
    }
    if (payment.status !== 'pending') return { status: payment.status, duplicate: true };

    const workspaceId = payment.workspaceId.toString();

    if (cb.type === 'payment.failed') {
      const done = await PaymentRepository.complete(payment._id, 'failed', cb.eventId);
      return { status: 'failed', duplicate: !done };
    }

    try {
      const { entry } = await WalletRepository.applyPosting({
        workspaceId,
        currency: payment.currency,
        type: 'top_up',
        lines: postings.topUp(workspaceId, payment.amountMinor),
        idempotencyKey: `topup:${payment._id.toString()}`,
        reference: { kind: 'payment', id: payment._id.toString() },
      });
      const done = await PaymentRepository.complete(payment._id, 'succeeded', cb.eventId, entry._id);
      if (done) {
        await AuditRepository.record({
          workspaceId,
          action: 'wallet.topup_completed',
          targetType: 'payment',
          targetId: payment._id.toString(),
          metadata: { amountMinor: payment.amountMinor, currency: payment.currency },
        });
      }
      return { status: 'succeeded', duplicate: !done };
    } catch (err) {
      return mapFinancialError(err);
    }
  }

  /** Owner-approved manual correction. Always a new ledger entry; history is never edited. */
  static async adjust(workspaceId: string, userId: string, req: AdjustmentRequest): Promise<LedgerEntryDto> {
    const currency = currencyOrDefault(req.currency);
    await WalletRepository.getOrCreateWallet(workspaceId, currency);
    const credit = req.direction === 'credit';
    try {
      const { entry, replayed } = await WalletRepository.applyPosting({
        workspaceId,
        currency,
        type: credit ? 'adjustment_credit' : 'adjustment_debit',
        lines: credit
          ? postings.adjustmentCredit(workspaceId, req.amountMinor)
          : postings.adjustmentDebit(workspaceId, req.amountMinor),
        idempotencyKey: `adjust:${req.idempotencyKey}`,
        memo: req.memo,
        createdBy: userId,
      });
      if (!replayed) {
        await AuditRepository.record({
          workspaceId,
          actorUserId: userId,
          action: 'wallet.adjustment',
          targetType: 'ledger_entry',
          targetId: entry._id.toString(),
          metadata: { direction: req.direction, amountMinor: req.amountMinor, currency, memo: req.memo },
        });
      }
      return toEntryDto(entry);
    } catch (err) {
      return mapFinancialError(err);
    }
  }

  /** Compensating entry for a prior entry of this tenant. */
  static async reverse(workspaceId: string, userId: string, entryId: string, memo: string): Promise<LedgerEntryDto> {
    const original = await WalletRepository.findEntryById(workspaceId, entryId);
    if (!original) throw new AppError('Ledger entry not found.', 404, ErrorCode.NOT_FOUND);
    try {
      const { entry } = await WalletRepository.applyPosting({
        workspaceId,
        currency: original.currency,
        type: 'reversal',
        lines: reversePosting(
          original.lines.map(l => ({ account: l.account, direction: l.direction, amountMinor: l.amountMinor }))
        ),
        idempotencyKey: `reversal:${original._id.toString()}`,
        reversesEntryId: original._id.toString(),
        memo,
        createdBy: userId,
      });
      await AuditRepository.record({
        workspaceId,
        actorUserId: userId,
        action: 'wallet.reversal',
        targetType: 'ledger_entry',
        targetId: entry._id.toString(),
        metadata: { reverses: original._id.toString() },
      });
      return toEntryDto(entry);
    } catch (err) {
      return mapFinancialError(err);
    }
  }

  // --- Primitives for the campaign pipeline (tenant-scoped; keys make retries safe) ---

  static async reserveFunds(workspaceId: string, amountMinor: number, key: string, currency?: string, ref?: { kind: string; id: string }) {
    try {
      return await WalletRepository.reserve({
        workspaceId,
        currency: currencyOrDefault(currency),
        amountMinor,
        idempotencyKey: key,
        reference: ref ?? null,
      });
    } catch (err) {
      return mapFinancialError(err);
    }
  }

  static async releaseReservation(workspaceId: string, reservationId: string) {
    return WalletRepository.release(workspaceId, reservationId);
  }

  static async reconcile(workspaceId: string, currency?: string) {
    return WalletRepository.reconcile(workspaceId, currencyOrDefault(currency));
  }
}
