import { getFbToken } from '../../../_lib/fb-token';

/**
 * GET /api/fb/insights/summary?account_id=act_xxx
 * Daily summary: today vs yesterday with % change.
 * Returns spend, impressions, clicks, purchases, revenue, ROAS, CPA for both days.
 */
export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string; TOKEN_ENCRYPTION_KEY: string }> = async (context) => {
  const auth = await getFbToken(context.request, context.env);

  if (auth.type === 'error') return auth.response;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id');

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });
  }

  try {
    const fields = 'spend,impressions,clicks,actions,action_values';

    const [todayRes, yesterdayRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v25.0/${accountId}/insights?access_token=${auth.token}&fields=${fields}&date_preset=today&level=account&limit=1`),
      fetch(`https://graph.facebook.com/v25.0/${accountId}/insights?access_token=${auth.token}&fields=${fields}&date_preset=yesterday&level=account&limit=1`),
    ]);

    const todayData = (await todayRes.json()) as { data?: any[] };
    const yesterdayData = (await yesterdayRes.json()) as { data?: any[] };

    const extract = (row: any) => {
      const spend = parseFloat(row?.spend || '0');
      const impressions = parseFloat(row?.impressions || '0');
      const clicks = parseFloat(row?.clicks || '0');
      const purchaseAction = row?.actions?.find((a: any) => a.action_type === 'purchase');
      const purchases = purchaseAction ? parseFloat(purchaseAction.value) : 0;
      const purchaseValue = row?.action_values?.find((a: any) => a.action_type === 'purchase');
      const revenue = purchaseValue ? parseFloat(purchaseValue.value) : 0;
      const roas = spend > 0 ? +(revenue / spend).toFixed(2) : 0;
      const cpa = purchases > 0 ? +(spend / purchases).toFixed(2) : 0;

      return { spend, impressions, clicks, purchases, revenue, roas, cpa };
    };

    const today = extract(todayData.data?.[0]);
    const yesterday = extract(yesterdayData.data?.[0]);

    const pctChange = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : +((curr - prev) / prev * 100).toFixed(1);

    return Response.json({
      today,
      yesterday,
      change: {
        spend: pctChange(today.spend, yesterday.spend),
        impressions: pctChange(today.impressions, yesterday.impressions),
        clicks: pctChange(today.clicks, yesterday.clicks),
        purchases: pctChange(today.purchases, yesterday.purchases),
        revenue: pctChange(today.revenue, yesterday.revenue),
        roas: pctChange(today.roas, yesterday.roas),
        cpa: pctChange(today.cpa, yesterday.cpa),
      },
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch {
    return Response.json({ error: 'Failed to fetch daily summary' }, { status: 500 });
  }
};
