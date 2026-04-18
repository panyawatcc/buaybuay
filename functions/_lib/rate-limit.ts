/**
 * KV-backed per-IP rate limit.
 * Returns Response if limit exceeded, null otherwise.
 */
export async function checkRateLimit(
  kv: KVNamespace,
  request: Request,
  scope: string,
  opts: { max: number; windowSec: number } = { max: 5, windowSec: 60 },
): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const bucket = Math.floor(Date.now() / (opts.windowSec * 1000));
  const key = `rl:${scope}:${ip}:${bucket}`;

  const current = parseInt((await kv.get(key)) || '0', 10);

  if (current >= opts.max) {
    return Response.json(
      { error: 'Too many requests', retry_after_sec: opts.windowSec },
      {
        status: 429,
        headers: {
          'Retry-After': String(opts.windowSec),
          'X-RateLimit-Limit': String(opts.max),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  await kv.put(key, String(current + 1), { expirationTtl: opts.windowSec });

  return null;
}
