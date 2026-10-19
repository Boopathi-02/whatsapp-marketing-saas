import { parsePhoneNumber, CountryCode } from 'libphonenumber-js';

export interface PhoneValidationResult {
  isValid: boolean;
  e164: string;
  countryCode?: string;
  nationalNumber?: string;
  error?: string;
}

/**
 * Normalizes and validates an international phone number to E.164 format.
 * E.g., "(415) 555-2671" with default country US -> "+14155552671"
 * "+91 98765 43210" -> "+919876543210"
 */
export function normalizePhoneNumber(
  rawPhone: string,
  defaultCountry: string = 'US'
): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      e164: '',
      error: 'Phone number string is required',
    };
  }

  const cleaned = rawPhone.trim();
  if (!cleaned) {
    return {
      isValid: false,
      e164: '',
      error: 'Phone number cannot be blank',
    };
  }

  try {
    // If it starts with '+', parse directly without relying on default country
    const parsed = cleaned.startsWith('+')
      ? parsePhoneNumber(cleaned)
      : parsePhoneNumber(cleaned, defaultCountry as CountryCode);

    if (!parsed || !parsed.isValid()) {
      return {
        isValid: false,
        e164: '',
        error: `Invalid phone number format for ${rawPhone}`,
      };
    }

    const e164 = parsed.format('E.164');
    return {
      isValid: true,
      e164,
      countryCode: parsed.country,
      nationalNumber: parsed.nationalNumber,
    };
  } catch (err) {
    return {
      isValid: false,
      e164: '',
      error: (err as Error).message || 'Invalid phone number',
    };
  }
}
