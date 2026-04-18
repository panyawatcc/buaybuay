/**
 * GET /api/fb/activity?account_id=act_xxx
 * Activity log for the account. Currently uses Facebook's activities endpoint
 * which logs admin/user actions on the ad account (e.g., budget changes, status changes).
 *
 * NOTE: This is FB-side activity, not bot/AI activity. Bot/AI actions should be
 * stored in our own DB (future). For now, return FB activities + empty bot/ai sections.
 */

interface FBActivity {
  event_type: string;
  event_time: string;
  actor_name?: string;
  object_name?: string;
  object_type?: string;
  extra_data?: string;
}

interface ActivityItem {
  id: string;
  timestamp: string;
  actor: 'bot' | 'ai' | 'user';
  action: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}

import { getFbToken } from '../../_lib/fb-token';

export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string; TOKEN_ENCRYPTION_KEY: string }> = async (context) => {
  const auth = await getFbToken(context.request, context.env);

  if (auth.type === 'error') return auth.response;

  const token = auth.token;
  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id') || reqUrl.searchParams.get('accountId');

  if (!accountId) {
    return Response.json({ error: 'account_id is required' }, { status: 400 });
  }

  if (!accountId.startsWith('act_')) {
    return Response.json({ error: 'account_id must start with "act_"' }, { status: 400 });
  }

  try {
    const url = new URL(`https://graph.facebook.com/v25.0/${accountId}/activities`);
    url.searchParams.set('access_token', token);
    url.searchParams.set(
      'fields',
      'event_type,event_time,actor_name,object_name,object_type,extra_data',
    );
    url.searchParams.set('limit', '50');

    const res = await fetch(url.toString());
    const data = (await res.json()) as { data?: FBActivity[]; error?: any };

    if (!res.ok) {
      return Response.json(data, { status: res.status });
    }

    // Transform FB activities → unified ActivityItem shape
    const activities: ActivityItem[] = (data.data || []).map((row, idx) => ({
      id: `fb_${row.event_time}_${idx}`,
      timestamp: row.event_time,
      actor: 'user',
      action: row.event_type || 'activity',
      details: `${row.actor_name || 'User'} ${row.event_type} ${row.object_name || ''}`.trim(),
      status: 'success',
    }));

    return Response.json(
      { data: activities },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch activity' },
      { status: 500 },
    );
  }
};
