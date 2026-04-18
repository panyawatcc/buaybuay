// FB Graph fetch wrapper with rate-limit detection + exponential backoff.
//
// Usage:
//   const res = await fbFetch(url, { retries: 2 });
//   if (!res.ok) return Response.json({ error: res.userMessage }, { status: res.status });
//   return Response.json(res.data);
//
// Why: a bare `fetch` to FB surfaces 400/403 + raw { error: {message, code, error_subcode} }
// to the UI — user sees "(#17) User request limit reached" with no recovery hint.
// This helper:
//   1) Retries transient 429/5xx with exponential backoff (2^n seconds).
//   2) Classifies FB error codes into {rateLimited, userMessage} so callers can
//      return a consistent Thai-friendly response.
//   3) Surfaces retry-after hint when FB provides it.

// FB throttle codes per Graph docs:
//   4    = application request limit
//   17   = user request limit reached
//   32   = page request limit
//   613  = rate limit (ads)
//   80004 = subcode for too many calls (ad account)
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);
const RATE_LIMIT_SUBCODES = new Set([80004, 2446079]);

export interface FbFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: {
    code?: number;
    subcode?: number;
    message?: string;
    type?: string;
    fbtrace_id?: string;
  } | null;
  rateLimited: boolean;
  retryAfterSec: number | null;
  userMessage: string;      // Thai-friendly
}

const THAI = {
  rateLimit: (minsHint?: number | null) => minsHint
    ? `Facebook จำกัดคำขอชั่วคราว — ลองใหม่ในอีก ${minsHint} นาที`
    : 'Facebook จำกัดคำขอชั่วคราว — ลองใหม่ในอีก 2-5 นาที',
  permission: 'บัญชีโฆษณาของคุณไม่มีสิทธิ์ที่ต้องใช้ — เชื่อมต่อ Facebook ใหม่',
  tokenExpired: 'Facebook token หมดอายุ — เชื่อมต่อ Facebook ใหม่',
  generic: 'ดึงข้อมูลจาก Facebook ไม่สำเร็จ — ลองใหม่อีกครั้ง',
};

function classify(err: any, status: number): { rateLimited: boolean; userMessage: string; retryAfterSec: number | null } {
  const code = err?.code;
  const subcode = err?.error_subcode;
  const type = err?.type;
  // Rate limit
  if (status === 429 || RATE_LIMIT_CODES.has(code) || RATE_LIMIT_SUBCODES.has(subcode)) {
    // FB sometimes sends x-app-usage / x-ad-account-usage headers — retry hint is conservative.
    return { rateLimited: true, userMessage: THAI.rateLimit(5), retryAfterSec: 300 };
  }
  // Token expired (OAuthException + code 190)
  if (code === 190 || type === 'OAuthException') {
    return { rateLimited: false, userMessage: THAI.tokenExpired, retryAfterSec: null };
  }
  // Permission (code 200, 294 etc.)
  if (code === 200 || code === 294) {
    return { rateLimited: false, userMessage: THAI.permission, retryAfterSec: null };
  }
  return { rateLimited: false, userMessage: THAI.generic, retryAfterSec: null };
}

async function parseRetryAfterHeader(res: Response): Promise<number | null> {
  const h = res.headers.get('retry-after');
  if (!h) return null;
  const n = parseInt(h, 10);
  if (Number.isFinite(n) && n > 0) return Math.min(n, 3600);
  const dt = Date.parse(h);
  if (!Number.isNaN(dt)) return Math.max(0, Math.floor((dt - Date.now()) / 1000));
  return null;
}

export interface FbFetchOpts {
  retries?: number;          // default 2
  baseDelayMs?: number;      // default 500 (500, 1000, 2000)
  init?: RequestInit;
}

export async function fbFetch<T = any>(url: string, opts: FbFetchOpts = {}): Promise<FbFetchResult<T>> {
  const retries = opts.retries ?? 2;
  const baseMs = opts.baseDelayMs ?? 500;
  let lastResult: FbFetchResult<T> | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, opts.init);
    } catch (e: any) {
      // Network error — retry with backoff
      lastResult = {
        ok: false, status: 0, data: null,
        error: { message: e?.message ?? 'network_error' },
        rateLimited: false, retryAfterSec: null,
        userMessage: THAI.generic,
      };
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, baseMs * Math.pow(2, attempt)));
        continue;
      }
      return lastResult;
    }

    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch {}

    if (res.ok) {
      return {
        ok: true, status: res.status, data: parsed as T,
        error: null, rateLimited: false, retryAfterSec: null,
        userMessage: '',
      };
    }

    const err = parsed?.error ?? { message: text?.slice(0, 200) };
    const klass = classify(err, res.status);
    const retryAfter = await parseRetryAfterHeader(res);
    const retryAfterSec = retryAfter ?? klass.retryAfterSec;

    lastResult = {
      ok: false, status: res.status, data: null,
      error: { code: err?.code, subcode: err?.error_subcode, message: err?.message, type: err?.type, fbtrace_id: err?.fbtrace_id },
      rateLimited: klass.rateLimited,
      retryAfterSec,
      userMessage: klass.userMessage,
    };

    // Retry only transient: 429, 5xx, or FB rate-limit codes.
    const transient = res.status === 429 || res.status >= 500 || klass.rateLimited;
    if (!transient || attempt >= retries) return lastResult;

    const delay = retryAfterSec ? Math.min(retryAfterSec * 1000, 5000) : baseMs * Math.pow(2, attempt);
    await new Promise(r => setTimeout(r, delay));
  }
  return lastResult!;
}

// Helper to build a Response from a failed FbFetchResult.
// Returns appropriate HTTP status + Thai-friendly body so UI can render as-is.
export function fbErrorResponse(res: FbFetchResult): Response {
  const status = res.rateLimited ? 429 : (res.status || 502);
  return Response.json(
    {
      error: res.userMessage,
      rate_limited: res.rateLimited,
      retry_after_sec: res.retryAfterSec,
      fb_code: res.error?.code,
      fb_subcode: res.error?.subcode,
    },
    {
      status,
      headers: res.retryAfterSec ? { 'Retry-After': String(res.retryAfterSec) } : undefined,
    },
  );
}

// Throwable variant of FbFetchResult — carries the full result for catch
// blocks to re-emit via fbErrorResponse. Used by helpers (paginate, etc.)
// that need to signal failure through a throw.
export class FbApiError extends Error {
  constructor(public result: FbFetchResult) {
    super(result.userMessage || result.error?.message || 'FB API error');
    this.name = 'FbApiError';
  }
}

// Convenience for endpoint catch blocks:
//   try { ... } catch (e) { return handleFbError(e, 'Failed to fetch ads'); }
export function handleFbError(err: unknown, genericMessage = 'Failed to fetch from Facebook'): Response {
  if (err instanceof FbApiError) return fbErrorResponse(err.result);
  return Response.json({ error: genericMessage }, { status: 500 });
}
