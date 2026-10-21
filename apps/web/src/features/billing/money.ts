/** Money helpers. Amounts are integer minor units; no floating point arithmetic on balances. */

export function currencyDigits(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function formatMinor(minor: number, currency: string): string {
  const digits = currencyDigits(currency);
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const factor = 10 ** digits;
  const major = Math.trunc(abs / factor);
  const frac = String(abs % factor).padStart(digits, '0');
  const majorText = new Intl.NumberFormat('en', { useGrouping: true }).format(major);
  return `${sign}${currency} ${majorText}${digits > 0 ? `.${frac}` : ''}`;
}

/** Parses "12.5" -> 1250 (for 2 digits). Returns null for invalid or non-positive input. */
export function parseToMinor(input: string, currency: string): number | null {
  const digits = currencyDigits(currency);
  const text = input.trim();
  const match = /^(\d{1,9})(?:\.(\d+))?$/.exec(text);
  if (!match) return null;
  const frac = match[2] ?? '';
  if (frac.length > digits) return null;
  const minor = Number(match[1]) * 10 ** digits + Number(frac.padEnd(digits, '0') || '0');
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'expired';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}
