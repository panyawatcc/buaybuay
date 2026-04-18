import { requireRole, type Role } from '../../../_lib/auth';

interface Env { DB: D1Database; JWT_SECRET: string; }

// GET /api/ai/crm/orders — list CRM orders for the authenticated user.
// Supports query: ?platform=kaojao&limit=50
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager', 'viewer'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const url = new URL(context.request.url);
  const platform = url.searchParams.get('platform');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);

  try {
    const rows = platform
      ? (await context.env.DB.prepare(
          'SELECT id, platform, external_order_id, customer_identifier, amount, currency, status, received_at FROM ai_crm_orders WHERE user_id = ? AND platform = ? ORDER BY received_at DESC LIMIT ?',
        ).bind(auth.user.sub, platform, limit).all()).results
      : (await context.env.DB.prepare(
          'SELECT id, platform, external_order_id, customer_identifier, amount, currency, status, received_at FROM ai_crm_orders WHERE user_id = ? ORDER BY received_at DESC LIMIT ?',
        ).bind(auth.user.sub, limit).all()).results;
    return Response.json({ orders: rows || [], stub_note: 'real data flows in via /api/ai/crm/webhook/:platform once CRM integrations are wired' });
  } catch {
    return Response.json({ orders: [], error: 'query_failed' }, { status: 500 });
  }
};
