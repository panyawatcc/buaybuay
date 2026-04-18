import { getFbToken } from '../../_lib/fb-token';
import { parseDateParams, applyDateParams } from '../../_lib/date-params';

/**
 * GET /api/fb/audience?account_id=act_xxx&breakdowns=age,gender
 * Audience breakdown: age, gender, country, region.
 */
export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string; TOKEN_ENCRYPTION_KEY: string }> = async (context) => {
  const auth = await getFbToken(context.request, context.env);

  if (auth.type === 'error') return auth.response;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id');
  const breakdowns = reqUrl.searchParams.get('breakdowns') || 'age,gender';

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });
  }

  const allowed = ['age', 'gender', 'country', 'region', 'age,gender'];

  if (!allowed.includes(breakdowns)) {
    return Response.json({ error: `breakdowns must be one of: ${allowed.join(', ')}` }, { status: 400 });
  }

  const dateResult = parseDateParams(reqUrl, 'last_7d');

  if (dateResult.error) {
    return Response.json({ error: dateResult.error }, { status: 400 });
  }

  try {
    const url = new URL(`https://graph.facebook.com/v25.0/${accountId}/insights`);
    url.searchParams.set('access_token', auth.token);
    url.searchParams.set('fields', 'spend,impressions,clicks,actions');
    url.searchParams.set('breakdowns', breakdowns);
    applyDateParams(url, dateResult);
    url.searchParams.set('level', 'account');
    url.searchParams.set('limit', '500');

    const res = await fetch(url.toString());
    const raw = (await res.json()) as { data?: any[]; error?: any };

    if (!res.ok) {
      return Response.json(raw, { status: res.status });
    }

    const data = (raw.data || []).map((row: any) => {
      const purchaseAction = row.actions?.find((a: any) => a.action_type === 'purchase');

      return {
        ...(row.age ? { age: row.age } : {}),
        ...(row.gender ? { gender: row.gender } : {}),
        ...(row.country ? { country: row.country } : {}),
        ...(row.region ? { region: row.region } : {}),
        spend: parseFloat(row.spend || '0'),
        impressions: parseFloat(row.impressions || '0'),
        clicks: parseFloat(row.clicks || '0'),
        conversions: purchaseAction ? parseFloat(purchaseAction.value) : 0,
      };
    });

    // Compute summary: top segment per dimension
    const topBy = (key: string) => {
      const map: Record<string, number> = {};

      for (const d of data) {
        if (d[key]) map[d[key]] = (map[d[key]] || 0) + d.spend;
      }

      const entries = Object.entries(map);

      return entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0][0] : null;
    };

    return Response.json({
      data,
      summary: {
        topAge: topBy('age'),
        topGender: topBy('gender'),
        topCountry: topBy('country'),
      },
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch {
    return Response.json({ error: 'Failed to fetch audience data' }, { status: 500 });
  }
};
