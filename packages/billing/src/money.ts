/**
 * Money is always an integer count of minor units (e.g. cents) plus an ISO-4217 code.
 * Floating point is never used for balances.
 */
export type Minor = number;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export function assertMinor(value: unknown, label = 'amount'): asserts value is Minor {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new MoneyError(`${label} must be a safe integer number of minor units`);
  }
}

export function assertPositiveMinor(value: unknown, label = 'amount'): asserts value is Minor {
  assertMinor(value, label);
  if (value <= 0) {
    throw new MoneyError(`${label} must be greater than zero`);
  }
}

export function normalizeCurrency(code: string): string {
  const upper = String(code ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(upper)) {
    throw new MoneyError('currency must be a 3-letter ISO-4217 code');
  }
  return upper;
}

/** available = posted - active reservations (never below zero for display). */
export function availableBalance(postedMinor: Minor, reservedMinor: Minor): Minor {
  assertMinor(postedMinor, 'postedMinor');
  assertMinor(reservedMinor, 'reservedMinor');
  return postedMinor - reservedMinor;
}
