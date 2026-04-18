// Hashing + PII normalization helpers.
// SHA-256 uses CF Workers' native Web Crypto (SubtleCrypto).
// Normalize before hashing so that '  +66-81 234 5678 ' and '66812345678' hash equal.

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

// Lowercase + trim. Empty → empty. Meta / Conversion API expects email
// to be hashed after lowercase + trim (whitespace).
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}

// Meta expects E.164-ish phone numbers in hashed form: country code
// prefix + digits only, no '+', no spaces, no dashes/parens.
// Defaults to '66' (Thailand) when the caller doesn't supply a country.
// Strip any leading '+' or '00' country-prefix; strip a leading '0'
// (common Thai local formatting) before prepending the country code.
export function normalizePhone(phone: string | null | undefined, defaultCountry: string = '66'): string {
  if (!phone) return '';
  let s = String(phone).trim();
  s = s.replace(/[\s\-()+.]/g, '');        // strip formatting
  if (!s) return '';
  s = s.replace(/^00/, '');                // '0066…' → '66…'
  if (s.startsWith(defaultCountry)) return s;
  if (/^0\d+/.test(s)) return defaultCountry + s.slice(1);  // '0812…' → '66812…'
  return s;  // already country-coded with different country, or caller responsibility
}

// Convenience: hash after normalizing. Returns empty string for empty input.
export async function sha256Email(email: string | null | undefined): Promise<string> {
  const v = normalizeEmail(email);
  return v ? sha256(v) : '';
}

export async function sha256Phone(phone: string | null | undefined, defaultCountry: string = '66'): Promise<string> {
  const v = normalizePhone(phone, defaultCountry);
  return v ? sha256(v) : '';
}
