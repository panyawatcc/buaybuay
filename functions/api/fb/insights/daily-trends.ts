import { parseDateParams, applyDateParams } from '../../../_lib/date-params';
import { getFbToken } from '../../../_lib/fb-token';

/**
 * GET /api/fb/insights/daily-trends?account_id=act_xxx&days=7
 * GET /api/fb/insights/daily-trends?account_id=act_xxx&since=2026-04-01&until=2026-04-07
 * Daily trend data for charts: spend/impressions/clicks/purchases per day.
 * Auth via session cookie — FB token read from DB server-side.
 */
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

  // Check for since/until first, then fall back to days param
  const hasSinceUntil = reqUrl.searchParams.has('since') && reqUrl.searchParams.has('until');

  let dateResult;

  if (hasSinceUntil) {
    dateResult = parseDateParams(reqUrl);
  } else {
    // Legacy days param → map to date_preset
    const days = parseInt(reqUrl.searchParams.get('days') || '7', 10);

    if (days < 1 || days > 90) {
      return Response.json({ error: 'days must be between 1 and 90' }, { status: 400 });
    }

    const preset =
      days <= 1 ? 'today' : days <= 7 ? 'last_7d' : days <= 14 ? 'last_14d' : days <= 30 ? 'last_30d' : 'last_90d';
    dateResult = { timeRange: null, datePreset: preset, error: null };
  }

  if (dateResult.error) {
    return Response.json({ error: dateResult.error }, { status: 400 });
  }

  try {
    const url = new URL(`https://graph.facebook.com/v25.0/${accountId}/insights`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('fields', 'date_start,spend,impressions,clicks,actions,action_values,ctr,cpc');
    applyDateParams(url, dateResult);
    url.searchParams.set('time_increment', '1');
    url.searchParams.set('level', 'account');
    url.searchParams.set('limit', '500');

    const res = await fetch(url.toString());
    const data = (await res.json()) as { data?: any[]; error?: any };

    if (!res.ok) {
      return Response.json(data, { status: res.status });
    }

    // Transform to chart-friendly shape
    const trends = (data.data || []).map((row) => {
      const purchaseAction = row.actions?.find((a: any) => a.action_type === 'purchase');
      const purchaseValue = row.action_values?.find((a: any) => a.action_type === 'purchase');
      const spend = parseFloat(row.spend || '0');
      const revenue = purchaseValue ? parseFloat(purchaseValue.value) : 0;

      return {
        date: row.date_start,
        spend,
        impressions: parseFloat(row.impressions || '0'),
        clicks: parseFloat(row.clicks || '0'),
        purchases: purchaseAction ? parseFloat(purchaseAction.value) : 0,
        revenue,
        roas: spend > 0 ? +(revenue / spend).toFixed(2) : 0,
        ctr: parseFloat(row.ctr || '0'),
        cpc: parseFloat(row.cpc || '0'),
      };
    });

    return Response.json(
      { data: trends },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch daily trends' },
      { status: 500 },
    );
  }
};
