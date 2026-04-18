import { requireRole, type Role } from '../../../../_lib/auth';
import { getFbToken } from '../../../../_lib/fb-token';
import { fbFetch, fbErrorResponse } from '../../../../_lib/fb-fetch';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

/**
 * POST /api/fb/campaigns/:id/status
 * Body: { status: "ACTIVE" | "PAUSED", accountId: "act_xxx" }
 * Admin/Manager only.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  const fbAuth = await getFbToken(context.request, context.env);

  if (fbAuth.type === 'error') return fbAuth.response;

  const campaignId = (context.params as any).id;

  let body: { status?: string; accountId?: string };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.status || !['ACTIVE', 'PAUSED'].includes(body.status)) {
    return Response.json({ error: 'status must be ACTIVE or PAUSED' }, { status: 400 });
  }

  try {
    const fbUrl = new URL(`https://graph.facebook.com/v25.0/${campaignId}`);
    fbUrl.searchParams.set('access_token', fbAuth.token);
    fbUrl.searchParams.set('status', body.status);

    const res = await fbFetch(fbUrl.toString(), { retries: 2, init: { method: 'POST' } });
    if (!res.ok) return fbErrorResponse(res);

    return Response.json({ success: true, id: campaignId, status: body.status });
  } catch {
    return Response.json({ error: 'Failed to update status' }, { status: 500 });
  }
};
