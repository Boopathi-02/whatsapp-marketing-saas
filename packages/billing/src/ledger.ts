import { Minor, assertPositiveMinor } from './money.js';

export type LedgerEntryType =
  | 'top_up'
  | 'usage_charge'
  | 'refund'
  | 'adjustment_credit'
  | 'adjustment_debit'
  | 'reversal';

export type LedgerDirection = 'debit' | 'credit';

export interface LedgerLine {
  account: string;
  direction: LedgerDirection;
  amountMinor: Minor;
}

/** System (non-tenant) accounts. */
export const SYSTEM_ACCOUNTS = {
  paymentsClearing: 'system:payments_clearing',
  usageRevenue: 'system:usage_revenue',
  refunds: 'system:refunds',
  adjustments: 'system:adjustments',
} as const;

/**
 * The wallet account is a liability to the customer: credits increase it, debits decrease it.
 * Account ids are namespaced per tenant so a posting can never touch another tenant's wallet.
 */
export function walletAccountId(workspaceId: string): string {
  return `wallet:${workspaceId}`;
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

export function validatePosting(lines: readonly LedgerLine[]): void {
  if (lines.length < 2) throw new LedgerError('A posting needs at least two lines');
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    assertPositiveMinor(line.amountMinor, 'line amount');
    if (line.direction === 'debit') debit += line.amountMinor;
    else if (line.direction === 'credit') credit += line.amountMinor;
    else throw new LedgerError('Invalid line direction');
  }
  if (debit !== credit) throw new LedgerError(`Unbalanced posting: debit ${debit} != credit ${credit}`);
}

/** Net effect of a posting on one account, as credit - debit. */
export function netCredit(lines: readonly LedgerLine[], account: string): Minor {
  return lines.reduce((sum, l) => {
    if (l.account !== account) return sum;
    return sum + (l.direction === 'credit' ? l.amountMinor : -l.amountMinor);
  }, 0);
}

function pair(debitAccount: string, creditAccount: string, amountMinor: Minor): LedgerLine[] {
  assertPositiveMinor(amountMinor);
  const lines: LedgerLine[] = [
    { account: debitAccount, direction: 'debit', amountMinor },
    { account: creditAccount, direction: 'credit', amountMinor },
  ];
  validatePosting(lines);
  return lines;
}

export const postings = {
  topUp: (workspaceId: string, amountMinor: Minor) =>
    pair(SYSTEM_ACCOUNTS.paymentsClearing, walletAccountId(workspaceId), amountMinor),
  usageCharge: (workspaceId: string, amountMinor: Minor) =>
    pair(walletAccountId(workspaceId), SYSTEM_ACCOUNTS.usageRevenue, amountMinor),
  refund: (workspaceId: string, amountMinor: Minor) =>
    pair(SYSTEM_ACCOUNTS.refunds, walletAccountId(workspaceId), amountMinor),
  adjustmentCredit: (workspaceId: string, amountMinor: Minor) =>
    pair(SYSTEM_ACCOUNTS.adjustments, walletAccountId(workspaceId), amountMinor),
  adjustmentDebit: (workspaceId: string, amountMinor: Minor) =>
    pair(walletAccountId(workspaceId), SYSTEM_ACCOUNTS.adjustments, amountMinor),
};

/** Compensating posting: same accounts and amounts with directions swapped. */
export function reversePosting(lines: readonly LedgerLine[]): LedgerLine[] {
  const reversed = lines.map(l => ({
    ...l,
    direction: (l.direction === 'debit' ? 'credit' : 'debit') as LedgerDirection,
  }));
  validatePosting(reversed);
  return reversed;
}
