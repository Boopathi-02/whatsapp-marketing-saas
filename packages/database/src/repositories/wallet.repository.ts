import mongoose, { ClientSession, Types } from 'mongoose';
import { WalletAccountModel, IWalletAccount } from '../models/wallet_account.model.js';
import {
  LedgerEntryModel,
  ILedgerEntry,
  ILedgerLine,
  LedgerEntryTypeValue,
} from '../models/ledger_entry.model.js';
import {
  WalletReservationModel,
  IWalletReservation,
} from '../models/wallet_reservation.model.js';

export class InsufficientFundsError extends Error {
  constructor(message = 'Insufficient available wallet balance.') {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}

export class WalletInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletInvariantError';
  }
}

function isDuplicateKey(err: unknown): boolean {
  return (err as { code?: number })?.code === 11000;
}

/**
 * Financial writes must run in a multi-document transaction. There is deliberately no
 * fallback for standalone MongoDB: a non-atomic wallet is worse than a refused request.
 */
export async function withFinancialTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  try {
    return await mongoose.connection.transaction(fn);
  } catch (err) {
    const msg = (err as Error)?.message ?? '';
    if (msg.includes('replica set') || msg.includes('Transaction numbers')) {
      throw new WalletInvariantError(
        'MongoDB transactions are unavailable. Financial operations require a replica set.'
      );
    }
    throw err;
  }
}

export interface ApplyPostingInput {
  workspaceId: string;
  currency: string;
  type: LedgerEntryTypeValue;
  lines: ILedgerLine[];
  idempotencyKey: string;
  reference?: { kind: string; id: string } | null;
  reversesEntryId?: string | null;
  memo?: string;
  createdBy?: string | null;
}

export interface PostingResult {
  entry: ILedgerEntry;
  replayed: boolean;
}

function walletAccountName(workspaceId: string): string {
  return `wallet:${workspaceId}`;
}

function assertBalanced(lines: ILedgerLine[]): void {
  let debit = 0;
  let credit = 0;
  for (const l of lines) {
    if (!Number.isSafeInteger(l.amountMinor) || l.amountMinor <= 0) {
      throw new WalletInvariantError('Ledger line amounts must be positive safe integers.');
    }
    if (l.direction === 'debit') debit += l.amountMinor;
    else credit += l.amountMinor;
  }
  if (lines.length < 2 || debit !== credit) {
    throw new WalletInvariantError('Unbalanced ledger posting.');
  }
}

function walletDelta(workspaceId: string, lines: ILedgerLine[]): number {
  const name = walletAccountName(workspaceId);
  return lines.reduce(
    (sum, l) => (l.account === name ? sum + (l.direction === 'credit' ? l.amountMinor : -l.amountMinor) : sum),
    0
  );
}

export class WalletRepository {
  static async getOrCreateWallet(workspaceId: string, currency: string): Promise<IWalletAccount> {
    const ws = new Types.ObjectId(workspaceId);
    const cur = currency.toUpperCase();
    // Upsert is race-safe thanks to the unique {workspaceId, currency} index.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return (await WalletAccountModel.findOneAndUpdate(
          { workspaceId: ws, currency: cur },
          { $setOnInsert: { workspaceId: ws, currency: cur, postedMinor: 0, reservedMinor: 0 } },
          { upsert: true, new: true }
        ))!;
      } catch (err) {
        if (!isDuplicateKey(err) || attempt === 1) throw err;
      }
    }
    throw new WalletInvariantError('Unreachable');
  }

  static async findWallet(workspaceId: string, currency?: string): Promise<IWalletAccount | null> {
    const filter: Record<string, unknown> = { workspaceId: new Types.ObjectId(workspaceId) };
    if (currency) filter.currency = currency.toUpperCase();
    return WalletAccountModel.findOne(filter).sort({ createdAt: 1 });
  }

  static async findEntryByKey(workspaceId: string, idempotencyKey: string): Promise<ILedgerEntry | null> {
    return LedgerEntryModel.findOne({ workspaceId: new Types.ObjectId(workspaceId), idempotencyKey });
  }

  static async findEntryById(workspaceId: string, entryId: string): Promise<ILedgerEntry | null> {
    return LedgerEntryModel.findOne({
      _id: new Types.ObjectId(entryId),
      workspaceId: new Types.ObjectId(workspaceId),
    });
  }

  /**
   * Atomically applies a balanced posting to the tenant wallet and records the immutable entry.
   * Replaying the same idempotency key returns the original entry without a second movement.
   * Debits succeed only if `postedMinor - reservedMinor` still covers them.
   */
  static async applyPosting(input: ApplyPostingInput): Promise<PostingResult> {
    assertBalanced(input.lines);
    const delta = walletDelta(input.workspaceId, input.lines);
    if (delta === 0) throw new WalletInvariantError('Posting has no effect on the tenant wallet.');

    const existing = await this.findEntryByKey(input.workspaceId, input.idempotencyKey);
    if (existing) return { entry: existing, replayed: true };

    const ws = new Types.ObjectId(input.workspaceId);
    const cur = input.currency.toUpperCase();

    try {
      const entry = await withFinancialTransaction(async session => {
        const filter: Record<string, unknown> = { workspaceId: ws, currency: cur };
        if (delta < 0) {
          filter.$expr = { $gte: [{ $subtract: ['$postedMinor', '$reservedMinor'] }, -delta] };
        }
        const wallet = await WalletAccountModel.findOneAndUpdate(
          filter,
          { $inc: { postedMinor: delta } },
          { new: true, session }
        );
        if (!wallet) {
          const exists = await WalletAccountModel.exists({ workspaceId: ws, currency: cur }).session(session);
          if (!exists) throw new WalletInvariantError('Wallet not found for tenant and currency.');
          throw new InsufficientFundsError();
        }
        const [created] = await LedgerEntryModel.create(
          [
            {
              workspaceId: ws,
              walletId: wallet._id,
              type: input.type,
              currency: cur,
              lines: input.lines,
              walletDeltaMinor: delta,
              balanceAfterMinor: wallet.postedMinor,
              idempotencyKey: input.idempotencyKey,
              reference: input.reference ?? null,
              reversesEntryId: input.reversesEntryId ? new Types.ObjectId(input.reversesEntryId) : null,
              memo: input.memo,
              createdBy: input.createdBy ? new Types.ObjectId(input.createdBy) : null,
            },
          ],
          { session }
        );
        return created!;
      });
      return { entry, replayed: false };
    } catch (err) {
      if (isDuplicateKey(err)) {
        // A concurrent request with the same key won the race; its transaction is the truth.
        const winner = await this.findEntryByKey(input.workspaceId, input.idempotencyKey);
        if (winner) return { entry: winner, replayed: true };
      }
      throw err;
    }
  }

  /** Holds funds for a future charge. Atomic: cannot push reservations above posted balance. */
  static async reserve(input: {
    workspaceId: string;
    currency: string;
    amountMinor: number;
    idempotencyKey: string;
    reference?: { kind: string; id: string } | null;
  }): Promise<{ reservation: IWalletReservation; replayed: boolean }> {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new WalletInvariantError('Reservation amount must be a positive safe integer.');
    }
    const ws = new Types.ObjectId(input.workspaceId);
    const cur = input.currency.toUpperCase();

    const existing = await WalletReservationModel.findOne({ workspaceId: ws, idempotencyKey: input.idempotencyKey });
    if (existing) return { reservation: existing, replayed: true };

    try {
      const reservation = await withFinancialTransaction(async session => {
        const wallet = await WalletAccountModel.findOneAndUpdate(
          {
            workspaceId: ws,
            currency: cur,
            $expr: { $gte: [{ $subtract: ['$postedMinor', '$reservedMinor'] }, input.amountMinor] },
          },
          { $inc: { reservedMinor: input.amountMinor } },
          { new: true, session }
        );
        if (!wallet) {
          const exists = await WalletAccountModel.exists({ workspaceId: ws, currency: cur }).session(session);
          if (!exists) throw new WalletInvariantError('Wallet not found for tenant and currency.');
          throw new InsufficientFundsError();
        }
        const [created] = await WalletReservationModel.create(
          [
            {
              workspaceId: ws,
              walletId: wallet._id,
              amountMinor: input.amountMinor,
              idempotencyKey: input.idempotencyKey,
              reference: input.reference ?? null,
            },
          ],
          { session }
        );
        return created!;
      });
      return { reservation, replayed: false };
    } catch (err) {
      if (isDuplicateKey(err)) {
        const winner = await WalletReservationModel.findOne({ workspaceId: ws, idempotencyKey: input.idempotencyKey });
        if (winner) return { reservation: winner, replayed: true };
      }
      throw err;
    }
  }

  /** Releases an active reservation. Idempotent: non-active reservations are returned unchanged. */
  static async release(workspaceId: string, reservationId: string): Promise<IWalletReservation | null> {
    const ws = new Types.ObjectId(workspaceId);
    const id = new Types.ObjectId(reservationId);
    return withFinancialTransaction(async session => {
      const res = await WalletReservationModel.findOneAndUpdate(
        { _id: id, workspaceId: ws, status: 'active' },
        { $set: { status: 'released' } },
        { new: true, session }
      );
      if (!res) return WalletReservationModel.findOne({ _id: id, workspaceId: ws }).session(session);
      await WalletAccountModel.updateOne(
        { _id: res.walletId, workspaceId: ws },
        { $inc: { reservedMinor: -res.amountMinor } },
        { session }
      );
      return res;
    });
  }

  /**
   * Converts (part of) a reservation into a usage charge. The unused remainder is released.
   * `lines` must be the usage-charge posting for exactly `chargeMinor`.
   */
  static async settle(input: {
    workspaceId: string;
    reservationId: string;
    chargeMinor: number;
    lines: ILedgerLine[];
    idempotencyKey: string;
    reference?: { kind: string; id: string } | null;
  }): Promise<{ reservation: IWalletReservation; entry: ILedgerEntry | null; replayed: boolean }> {
    const ws = new Types.ObjectId(input.workspaceId);
    const id = new Types.ObjectId(input.reservationId);
    if (!Number.isSafeInteger(input.chargeMinor) || input.chargeMinor < 0) {
      throw new WalletInvariantError('Charge must be a non-negative safe integer.');
    }
    if (input.chargeMinor > 0) assertBalanced(input.lines);
    if (input.chargeMinor > 0 && -walletDelta(input.workspaceId, input.lines) !== input.chargeMinor) {
      throw new WalletInvariantError('Posting does not match the settled charge.');
    }

    return withFinancialTransaction(async session => {
      const res = await WalletReservationModel.findOneAndUpdate(
        { _id: id, workspaceId: ws, status: 'active', amountMinor: { $gte: input.chargeMinor } },
        { $set: { status: 'settled', settledMinor: input.chargeMinor } },
        { new: true, session }
      );
      if (!res) {
        const current = await WalletReservationModel.findOne({ _id: id, workspaceId: ws }).session(session);
        if (!current) throw new WalletInvariantError('Reservation not found.');
        if (current.status !== 'active') {
          const entry = await LedgerEntryModel.findOne({
            workspaceId: ws,
            idempotencyKey: input.idempotencyKey,
          }).session(session);
          return { reservation: current, entry, replayed: true };
        }
        throw new WalletInvariantError('Charge exceeds the reserved amount.');
      }
      const wallet = await WalletAccountModel.findOneAndUpdate(
        { _id: res.walletId, workspaceId: ws, postedMinor: { $gte: input.chargeMinor } },
        { $inc: { reservedMinor: -res.amountMinor, postedMinor: -input.chargeMinor } },
        { new: true, session }
      );
      if (!wallet) throw new WalletInvariantError('Wallet balance is below the reserved charge.');
      if (input.chargeMinor === 0) return { reservation: res, entry: null, replayed: false };
      const [entry] = await LedgerEntryModel.create(
        [
          {
            workspaceId: ws,
            walletId: wallet._id,
            type: 'usage_charge',
            currency: wallet.currency,
            lines: input.lines,
            walletDeltaMinor: -input.chargeMinor,
            balanceAfterMinor: wallet.postedMinor,
            idempotencyKey: input.idempotencyKey,
            reference: input.reference ?? null,
          },
        ],
        { session }
      );
      return { reservation: res, entry: entry!, replayed: false };
    });
  }

  /** Cursor-paginated (newest first). `cursor` is the last `_id` of the previous page. */
  static async listEntries(
    workspaceId: string,
    opts: { limit: number; cursor?: string }
  ): Promise<{ items: ILedgerEntry[]; nextCursor: string | null }> {
    const filter: Record<string, unknown> = { workspaceId: new Types.ObjectId(workspaceId) };
    if (opts.cursor) filter._id = { $lt: new Types.ObjectId(opts.cursor) };
    const rows = await LedgerEntryModel.find(filter)
      .sort({ _id: -1 })
      .limit(opts.limit + 1);
    const hasMore = rows.length > opts.limit;
    const items = hasMore ? rows.slice(0, opts.limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1]!._id.toString() : null };
  }

  /** Compares cached wallet balances with the ledger and reservation rows. */
  static async reconcile(workspaceId: string, currency: string) {
    const ws = new Types.ObjectId(workspaceId);
    const cur = currency.toUpperCase();
    const wallet = await WalletAccountModel.findOne({ workspaceId: ws, currency: cur });
    if (!wallet) return null;
    const [ledger] = await LedgerEntryModel.aggregate<{ total: number }>([
      { $match: { workspaceId: ws, currency: cur } },
      { $group: { _id: null, total: { $sum: '$walletDeltaMinor' } } },
    ]);
    const [reserved] = await WalletReservationModel.aggregate<{ total: number }>([
      { $match: { workspaceId: ws, walletId: wallet._id, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$amountMinor' } } },
    ]);
    const ledgerTotal = ledger?.total ?? 0;
    const reservedTotal = reserved?.total ?? 0;
    return {
      postedMinor: wallet.postedMinor,
      ledgerTotalMinor: ledgerTotal,
      reservedMinor: wallet.reservedMinor,
      activeReservationsMinor: reservedTotal,
      balanced: wallet.postedMinor === ledgerTotal && wallet.reservedMinor === reservedTotal,
    };
  }
}
