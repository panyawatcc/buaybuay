// Per-user rate limit (Hybrid Agency scaling protection).
// Prevents one noisy customer from burning Golf's shared FB quota on
// behalf of the whole tenant pool.
//
// KV key layout: `rlu:<scope>:<userId>:<bucket>` where bucket is
// floor(now / windowMs). One KV entry per (user, scope, window).
//
// Design choices:
//   - KV eventual consistency is acceptable — the absolute cap is a
//     guideline, not a hard limit. The fb-fetch wrapper already absorbs
//     FB's own rate-limit if our local cap is loose.
//   - expirationTtl = windowSec so stale buckets auto-clean.
//   - No Lua-style atomic increment (CF KV doesn't support it). We
//     read-increment-write which is racy under burst; acceptable
//     because the guarantee here is "≤ max × 2-ish" not "exactly max".

export interface UserRateLimitOpts {
  max: number;
  windowSec: number;
}

export async function checkUserRate(
  kv: KVNamespace | undefined,
  userId: string,
  scope: string,
  opts: UserRateLimitOpts = { max: 60, windowSec: 3600 },
): Promise<Response | null> {
  if (!kv) return null;                                // no KV binding → skip
  const bucket = Math.floor(Date.now() / (opts.windowSec * 1000));
  const key = `rlu:${scope}:${userId}:${bucket}`;

  const current = parseInt((await kv.get(key)) || '0', 10);
  if (current >= opts.max) {
    const retryAfter = Math.max(1, Math.ceil(((bucket + 1) * opts.windowSec * 1000 - Date.now()) / 1000));
    return Response.json(
      {
        error: 'ขอข้อมูลถี่เกินไป — ลองใหม่ในอีกสักครู่',
        rate_limited: true,
        retry_after_sec: retryAfter,
        scope,
        limit: opts.max,
        window_sec: opts.windowSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(opts.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + retryAfter),
        },
      },
    );
  }

  // Write-through increment. TTL matches window so buckets auto-expire.
  await kv.put(key, String(current + 1), { expirationTtl: opts.windowSec });
  return null;
}
