interface Env { DB: D1Database; CRM_WEBHOOK_SECRET?: string; }

// POST /api/ai/crm/webhook/:platform
// STUB — accepts webhook payload from CRM platforms (kaojao | page365 | manual),
// stores raw payload for later processing. No JWT — webhook auth will be
// platform-specific (HMAC / shared secret) once real integrations land.
//
// TODO: per-platform signature verification + send to FB Conversion API.
const ALLOWED_PLATFORMS = ['kaojao', 'page365', 'manual'];

export const onRequestPost: PagesFunction<Env, 'platform'> = async (context) => {
  const platform = String(context.params.platform || '').toLowerCase();
  if (!ALLOWED_PLATFORMS.includes(platform)) {
    return Response.json({ error: 'unsupported_platform', allowed: ALLOWED_PLATFORMS }, { status: 400 });
  }

  // Optional shared-secret gate — skipped if env var not set (stub-friendly).
  const expected = context.env.CRM_WEBHOOK_SECRET;
  if (expected) {
    const got = context.request.headers.get('X-CRM-Secret');
    if (got !== expected) return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: any = {};
  try { payload = await context.request.json(); } catch {}

  const id = crypto.randomUUID();
  try {
    await context.env.DB.prepare(
      'INSERT INTO ai_crm_orders (id, user_id, platform, external_order_id, customer_identifier, amount, currency, status, raw_payload) VALUES (?,?,?,?,?,?,?,?,?)',
    ).bind(
      id,
      payload?.user_id ?? 'unknown',
      platform,
      payload?.order_id ?? null,
      payload?.customer ?? null,
      typeof payload?.amount === 'number' ? payload.amount : null,
      payload?.currency ?? 'THB',
      payload?.status ?? null,
      JSON.stringify(payload).slice(0, 10000),
    ).run();
  } catch {}

  return Response.json({ ok: true, stub: true, platform, received_id: id, todo: 'per-platform signature verify + FB Conversion API send' });
};
