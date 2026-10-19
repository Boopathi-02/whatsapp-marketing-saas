export interface CsvParsedRow {
  phoneNumber: string;
  displayName?: string;
  email?: string;
  tags?: string[];
  consentStatus?: 'opted_in' | 'opted_out' | 'pending';
  consentSource?: string;
  customFields?: Record<string, string | number | boolean>;
}

export interface CsvImportResult<T = CsvParsedRow> {
  rows: T[];
  errors: Array<{ rowNumber: number; reason: string }>;
  totalRows: number;
  validCount: number;
  invalidCount: number;
}

const MAX_CSV_ROWS = 5000;
const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Splits CSV lines safely handling escaped quotes and quoted commas/newlines.
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Robust CSV parser that handles standard contact CSV formats.
 * Expected headers: phone / phoneNumber, name / displayName, email, tags (comma/semicolon separated), consentStatus, consentSource
 */
export function parseContactsCsv(
  csvContent: string,
  options: { maxRows?: number; maxBytes?: number } = {}
): CsvImportResult {
  const maxRows = options.maxRows ?? MAX_CSV_ROWS;
  const maxBytes = options.maxBytes ?? MAX_CSV_SIZE_BYTES;

  if (Buffer.byteLength(csvContent, 'utf8') > maxBytes) {
    throw new Error(`CSV file exceeds maximum allowed size of ${maxBytes / (1024 * 1024)}MB`);
  }

  // Normalize line endings
  const rawLines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = rawLines.filter(l => l.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: [{ rowNumber: 0, reason: 'CSV content is empty' }], totalRows: 0, validCount: 0, invalidCount: 0 };
  }

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const phoneIdx = headers.findIndex(h => h === 'phone' || h === 'phonenumber' || h === 'mobile' || h === 'msisdn');
  const nameIdx = headers.findIndex(h => h === 'name' || h === 'displayname' || h === 'fullname' || h === 'contactname');
  const emailIdx = headers.findIndex(h => h === 'email' || h === 'emailaddress');
  const tagsIdx = headers.findIndex(h => h === 'tags' || h === 'tag' || h === 'labels');
  const consentIdx = headers.findIndex(h => h === 'consent' || h === 'consentstatus' || h === 'optin' || h === 'optinstatus');
  const consentSourceIdx = headers.findIndex(h => h === 'consentsource' || h === 'source');

  if (phoneIdx === -1) {
    throw new Error('CSV must contain a header column for phone number ("phone" or "phoneNumber")');
  }

  const dataLines = lines.slice(1);
  if (dataLines.length > maxRows) {
    throw new Error(`CSV exceeds maximum row limit of ${maxRows} records. Provided: ${dataLines.length}`);
  }

  const rows: CsvParsedRow[] = [];
  const errors: Array<{ rowNumber: number; reason: string }> = [];

  for (let idx = 0; idx < dataLines.length; idx++) {
    const rowNumber = idx + 2; // 1-based, accounting for header
    const line = dataLines[idx];
    const columns = parseCsvLine(line);

    const rawPhone = columns[phoneIdx]?.trim();
    if (!rawPhone) {
      errors.push({ rowNumber, reason: 'Missing phone number' });
      continue;
    }

    const displayName = nameIdx !== -1 && columns[nameIdx] ? columns[nameIdx].trim() : undefined;
    const email = emailIdx !== -1 && columns[emailIdx] ? columns[emailIdx].trim().toLowerCase() : undefined;

    let tags: string[] | undefined;
    if (tagsIdx !== -1 && columns[tagsIdx]) {
      tags = columns[tagsIdx]
        .split(/[;,]/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
    }

    let consentStatus: 'opted_in' | 'opted_out' | 'pending' | undefined;
    if (consentIdx !== -1 && columns[consentIdx]) {
      const val = columns[consentIdx].toLowerCase().trim();
      if (val === 'opted_in' || val === 'optin' || val === 'yes' || val === 'true' || val === '1') {
        consentStatus = 'opted_in';
      } else if (val === 'opted_out' || val === 'optout' || val === 'no' || val === 'false' || val === '0') {
        consentStatus = 'opted_out';
      } else {
        consentStatus = 'pending';
      }
    }

    const consentSource =
      consentSourceIdx !== -1 && columns[consentSourceIdx] ? columns[consentSourceIdx].trim() : undefined;

    rows.push({
      phoneNumber: rawPhone,
      displayName,
      email,
      tags,
      consentStatus,
      consentSource,
    });
  }

  return {
    rows,
    errors,
    totalRows: dataLines.length,
    validCount: rows.length,
    invalidCount: errors.length,
  };
}

/**
 * Escapes a single CSV value with protection against CSV Formula Injection (CWE-1236).
 * Values starting with dangerous spreadsheet formula characters (=, +, -, @, \t, \r)
 * are sanitized by prepending a single quote (') per OWASP guidelines.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val);

  // Prevent CSV / Spreadsheet Formula Injection (OWASP CWE-1236)
  const trimmed = str.trimStart();
  if (
    trimmed.startsWith('=') ||
    trimmed.startsWith('+') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('@') ||
    trimmed.startsWith('\t') ||
    trimmed.startsWith('\r')
  ) {
    str = `'${str}`;
  }

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates CSV string from contact records for safe export.
 */
export function generateContactsCsv(
  contacts: Array<{
    phoneNumber: string;
    displayName?: string;
    email?: string;
    tags?: string[];
    consentStatus: string;
    consentSource?: string;
    isSuppressed: boolean;
    createdAt?: Date | string;
  }>
): string {
  const headers = [
    'phoneNumber',
    'displayName',
    'email',
    'tags',
    'consentStatus',
    'consentSource',
    'isSuppressed',
    'createdAt',
  ];

  const lines = [headers.join(',')];

  for (const c of contacts) {
    const row = [
      escapeCsvCell(c.phoneNumber),
      escapeCsvCell(c.displayName || ''),
      escapeCsvCell(c.email || ''),
      escapeCsvCell(c.tags ? c.tags.join(';') : ''),
      escapeCsvCell(c.consentStatus),
      escapeCsvCell(c.consentSource || ''),
      escapeCsvCell(c.isSuppressed ? 'true' : 'false'),
      escapeCsvCell(c.createdAt ? new Date(c.createdAt).toISOString() : ''),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\r\n');
}
