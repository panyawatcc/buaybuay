// GET /api/health — liveness probe for AI-assisted install smoke-tests +
// uptime monitors + simple curl-verify step in CUSTOMER_GUIDE / AI_ASSISTED
// install docs.
//
// No auth, no DB, no external calls. If the Worker is up, this returns 200.
// Distinct from /api/license/status which also checks license validity +
// does a KV read — use THIS one when you just want "is the app reachable?"

type Context = EventContext<Record<string, unknown>, string, Record<string, unknown>>;

export async function onRequestGet(_context: Context): Promise<Response> {
  return Response.json(
    {
      ok: true,
      service: 'adbot-ai-product',
      ts: Math.floor(Date.now() / 1000),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
