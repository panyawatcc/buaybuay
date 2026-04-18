/**
 * JWT + password hashing utilities using Web Crypto (no Node deps).
 * Cookie-based session for Cloudflare Workers.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();
const COOKIE_NAME = 'adbot_session';
const JWT_EXPIRY_SEC = 7 * 24 * 3600; // 7 days

export type Role = 'admin' | 'manager' | 'viewer';

export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: Role;
  exp: number; // unix seconds
}

// ---------- base64url ----------
function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';

  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);

  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';

  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);

  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  return bytes;
}

// ---------- Password hashing (PBKDF2-SHA256) ----------
const PBKDF2_ITERATIONS = 100_000;

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );

  return { hash: b64urlEncode(bits), salt: b64urlEncode(salt) };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const saltBytes = b64urlDecode(salt);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );

  return b64urlEncode(bits) === hash;
}

// ---------- JWT (HS256) ----------
async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function signJWT(payload: Omit<JWTPayload, 'exp'>, secret: string): Promise<string> {
  const fullPayload: JWTPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SEC };
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64urlEncode(enc.encode(JSON.stringify(fullPayload)));
  const data = `${header}.${body}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));

  return `${data}.${b64urlEncode(sig)}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  const parts = token.split('.');

  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;
  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify('HMAC', key, b64urlDecode(sig), enc.encode(`${header}.${body}`));

  if (!valid) return null;

  try {
    const payload = JSON.parse(dec.decode(b64urlDecode(body))) as JWTPayload;

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ---------- AES-256-GCM token encryption ----------
async function aesKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(plaintext: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(secret);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  // Format: base64url(iv).base64url(ciphertext)
  return `${b64urlEncode(iv)}.${b64urlEncode(ciphertext)}`;
}

export async function decryptToken(encrypted: string, secret: string): Promise<string | null> {
  try {
    const [ivPart, ctPart] = encrypted.split('.');
    if (!ivPart || !ctPart) return null;
    const iv = b64urlDecode(ivPart);
    const ciphertext = b64urlDecode(ctPart);
    const key = await aesKey(secret);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return dec.decode(plaintext);
  } catch {
    return null;
  }
}

// ---------- Cookie helpers ----------
export function buildSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${JWT_EXPIRY_SEC}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('Cookie');

  if (!header) return null;

  const match = header.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));

  return match ? match[1] : null;
}

/**
 * Middleware helper: extract + verify session from request.
 * Returns payload if valid, null otherwise.
 */
export async function getSessionUser(request: Request, secret: string): Promise<JWTPayload | null> {
  const token = readSessionCookie(request);

  if (!token) return null;

  return verifyJWT(token, secret);
}

/**
 * Require auth — returns Response if no/invalid session, payload otherwise.
 * Use at top of protected endpoints.
 */
export async function requireAuth(
  request: Request,
  secret: string,
): Promise<{ type: 'unauthorized'; response: Response } | { type: 'ok'; user: JWTPayload }> {
  const user = await getSessionUser(request, secret);

  if (!user) {
    return {
      type: 'unauthorized',
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { type: 'ok', user };
}

/**
 * Require role — returns Response if unauthorized or wrong role, payload otherwise.
 */
export async function requireRole(
  request: Request,
  secret: string,
  allowedRoles: Role[],
): Promise<{ type: 'unauthorized' | 'forbidden'; response: Response } | { type: 'ok'; user: JWTPayload }> {
  const auth = await requireAuth(request, secret);

  if (auth.type === 'unauthorized') return auth;

  if (!allowedRoles.includes(auth.user.role)) {
    return {
      type: 'forbidden',
      response: Response.json(
        { error: 'Forbidden', required_role: allowedRoles, your_role: auth.user.role },
        { status: 403 },
      ),
    };
  }

  return auth;
}
