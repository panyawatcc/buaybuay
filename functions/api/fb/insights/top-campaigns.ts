import { getFbToken } from '../../../_lib/fb-token';
import { parseDateParams, applyDateParams } from '../../../_lib/date-params';

/**
 * GET /api/fb/insights/top-campaigns?account_id=act_xxx&sort_by=spend&limit=10
 * Top campaigns ranked by spend, ROAS, or conversions.
 * Supports since/until date range or date_preset.
 */
export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string; TOKEN_ENCRYPTION_KEY: string }> = async (context) => {
  const auth = await getFbToken(context.request, context.env);

  if (auth.type === 'error') return auth.response;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id');
  const sortBy = reqUrl.searchParams.get('sort_by') || 'spend';
  const limit = Math.min(parseInt(reqUrl.searchParams.get('limit') || '10', 10), 50);

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });
  }

  if (!['spend', 'roas', 'conversions', 'cpa'].includes(sortBy)) {
    return Response.json({ error: 'sort_by must be spend, roas, conversions, or cpa' }, { status: 400 });
  }

  const dateResult = parseDateParams(reqUrl, 'last_7d');

  if (dateResult.error) {
    return Response.json({ error: dateResult.error }, { status: 400 });
  }

  try {
    const url = new URL(`https://graph.facebook.com/v25.0/${accountId}/insights`);
    url.searchParams.set('access_token', auth.token);
    url.searchParams.set('fields', 'campaign_id,campaign_name,spend,impressions,clicks,ctr,actions,action_values,cost_per_action_type');
    applyDateParams(url, dateResult);
    url.searchParams.set('level', 'campaign');
    url.searchParams.set('limit', '200');

    const res = await fetch(url.toString());
    const data = (await res.json()) as { data?: any[] };

    if (!res.ok) {
      return Response.json(data, { status: res.status });
    }

    const campaigns = (data.data || []).map((row: any) => {
      const spend = parseFloat(row.spend || '0');
      const purchaseAction = row.actions?.find((a: any) => a.action_type === 'purchase');
      const purchases = purchaseAction ? parseFloat(purchaseAction.value) : 0;
      const purchaseValue = row.action_values?.find((a: any) => a.action_type === 'purchase');
      const revenue = purchaseValue ? parseFloat(purchaseValue.value) : 0;
      const roas = spend > 0 ? +(revenue / spend).toFixed(2) : 0;
      const cpa = purchases > 0 ? +(spend / purchases).toFixed(2) : 0;

      return {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        spend,
        impressions: parseFloat(row.impressions || '0'),
        clicks: parseFloat(row.clicks || '0'),
        ctr: parseFloat(row.ctr || '0'),
        purchases,
        revenue,
        roas,
        cpa,
        profit: +(revenue - spend).toFixed(2),
      };
    });

    const sortFn: Record<string, (a: any, b: any) => number> = {
      spend: (a, b) => b.spend - a.spend,
      roas: (a, b) => b.roas - a.roas,
      conversions: (a, b) => b.purchases - a.purchases,
      cpa: (a, b) => a.cpa - b.cpa, // lower CPA = better
    };

    campaigns.sort(sortFn[sortBy]);

    return Response.json(
      { data: campaigns.slice(0, limit), total: campaigns.length },
      { headers: { 'Cache-Control': 'private, max-age=120' } },
    );
  } catch {
    return Response.json({ error: 'Failed to fetch top campaigns' }, { status: 500 });
  }
};
