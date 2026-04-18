import { getFbToken } from '../../../_lib/fb-token';
import { parseDateParams } from '../../../_lib/date-params';

/**
 * GET /api/fb/insights/compare?account_id=act_xxx&date_preset=last_7d
 * GET /api/fb/insights/compare?account_id=act_xxx&since=2026-04-01&until=2026-04-07
 * Fetches current + previous period in parallel, computes % change per metric.
 */

// Map date_preset → days for computing previous period
const PRESET_DAYS: Record<string, number> = {
  today: 1, yesterday: 1, last_3d: 3, last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90,
  this_month: 30, last_month: 30,
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computePreviousPeriod(params: { since: string; until: string } | { preset: string }): { since: string; until: string } {
  if ('since' in params) {
    const since = new Date(params.since + 'T00:00:00');
    const until = new Date(params.until + 'T00:00:00');
    const days = Math.ceil((until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
    const prevUntil = new Date(since.getTime() - 1000 * 60 * 60 * 24); // day before since
    const prevSince = new Date(prevUntil.getTime() - days * 1000 * 60 * 60 * 24);
    return { since: formatDate(prevSince), until: formatDate(prevUntil) };
  }
  const days = PRESET_DAYS[params.preset] || 7;
  const now = new Date();
  const currentUntil = new Date(now.getTime());
  const currentSince = new Date(now.getTime() - days * 1000 * 60 * 60 * 24);
  const prevUntil = new Date(currentSince.getTime() - 1000 * 60 * 60 * 24);
  const prevSince = new Date(prevUntil.getTime() - days * 1000 * 60 * 60 * 24);
  return { since: formatDate(prevSince), until: formatDate(prevUntil) };
}

function extractMetrics(rows: any[]): Record<string, number> {
  let spend = 0, impressions = 0, clicks = 0, purchases = 0, revenue = 0;

  for (const row of rows) {
    spend += parseFloat(row.spend || '0');
    impressions += parseFloat(row.impressions || '0');
    clicks += parseFloat(row.clicks || '0');
    const pa = row.actions?.find((a: any) => a.action_type === 'purchase');
    if (pa) purchases += parseFloat(pa.value);
    const pv = row.action_values?.find((a: any) => a.action_type === 'purchase');
    if (pv) revenue += parseFloat(pv.value);
  }

  const ctr = impressions > 0 ? +(clicks / impressions * 100).toFixed(2) : 0;
  const cpc = clicks > 0 ? +(spend / clicks).toFixed(2) : 0;
  const roas = spend > 0 ? +(revenue / spend).toFixed(2) : 0;
  const cpa = purchases > 0 ? +(spend / purchases).toFixed(2) : 0;

  return { spend: +spend.toFixed(2), impressions, clicks, ctr, cpc, conversions: purchases, revenue: +revenue.toFixed(2), roas, cpa };
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return +((curr - prev) / prev * 100).toFixed(1);
}

export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string; TOKEN_ENCRYPTION_KEY: string }> = async (context) => {
  const auth = await getFbToken(context.request, context.env);

  if (auth.type === 'error') return auth.response;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id');
  const level = reqUrl.searchParams.get('level') || 'account';

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });
  }

  const dateResult = parseDateParams(reqUrl, 'last_7d');

  if (dateResult.error) {
    return Response.json({ error: dateResult.error }, { status: 400 });
  }

  // Compute previous period
  const prev = dateResult.timeRange
    ? computePreviousPeriod({ since: dateResult.timeRange.since, until: dateResult.timeRange.until })
    : computePreviousPeriod({ preset: dateResult.datePreset || 'last_7d' });

  const fields = 'spend,impressions,clicks,actions,action_values';

  try {
    // Build current period URL
    const currentUrl = new URL(`https://graph.facebook.com/v25.0/${accountId}/insights`);
    currentUrl.searchParams.set('access_token', auth.token);
    currentUrl.searchParams.set('fields', fields);
    currentUrl.searchParams.set('level', level);
    currentUrl.searchParams.set('limit', '500');

    if (dateResult.timeRange) {
      currentUrl.searchParams.set('time_range', JSON.stringify(dateResult.timeRange));
    } else if (dateResult.datePreset) {
      currentUrl.searchParams.set('date_preset', dateResult.datePreset);
    }

    // Build previous period URL
    const prevUrl = new URL(`https://graph.facebook.com/v25.0/${accountId}/insights`);
    prevUrl.searchParams.set('access_token', auth.token);
    prevUrl.searchParams.set('fields', fields);
    prevUrl.searchParams.set('level', level);
    prevUrl.searchParams.set('limit', '500');
    prevUrl.searchParams.set('time_range', JSON.stringify(prev));

    const [currentRes, prevRes] = await Promise.all([
      fetch(currentUrl.toString()),
      fetch(prevUrl.toString()),
    ]);

    const currentData = (await currentRes.json()) as { data?: any[]; error?: any };

    if (!currentRes.ok) {
      return Response.json(currentData, { status: currentRes.status });
    }

    const prevData = (await prevRes.json()) as { data?: any[] };

    const current = extractMetrics(currentData.data || []);
    const previous = extractMetrics(prevData.data || []);

    const changes: Record<string, number> = {};

    for (const key of Object.keys(current)) {
      changes[key] = pctChange(current[key], previous[key]);
    }

    return Response.json(
      { current, previous, changes },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch {
    return Response.json({ error: 'Failed to fetch comparison data' }, { status: 500 });
  }
};
