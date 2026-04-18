import { parseDateParams, applyDateParams } from '../../_lib/date-params';
import { getFbToken } from '../../_lib/fb-token';
import { mapInsights } from './_lib/insights-fields';

/**
 * GET /api/fb/summary?account_id=act_xxx&date_preset=last_7d
 * Account-level aggregate metrics + entity counts.
 * Counts use lightweight id-only fetch with same status filter as entity endpoints.
 */
export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string; TOKEN_ENCRYPTION_KEY: string }> = async (context) => {
  const auth = await getFbToken(context.request, context.env);

  if (auth.type === 'error') return auth.response;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id');

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });
  }

  const dateResult = parseDateParams(reqUrl, 'last_7d');

  if (dateResult.error) {
    return Response.json({ error: dateResult.error }, { status: 400 });
  }

  const statusFilter = JSON.stringify([
    { field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'ARCHIVED', 'DELETED', 'IN_PROCESS', 'WITH_ISSUES', 'DISAPPROVED'] },
  ]);

  try {
    // Get account metadata (currency + timezone)
    const acctUrl = new URL(`https://graph.facebook.com/v25.0/${accountId}`);
    acctUrl.searchParams.set('access_token', auth.token);
    acctUrl.searchParams.set('fields', 'currency,timezone_name,timezone_offset_hours_utc');

    // Insights (account level)
    const insightsUrl = new URL(`https://graph.facebook.com/v25.0/${accountId}/insights`);
    insightsUrl.searchParams.set('access_token', auth.token);
    insightsUrl.searchParams.set('fields', 'spend,impressions,reach,clicks,ctr,cpm,frequency,actions,action_values,cost_per_action_type,purchase_roas');
    applyDateParams(insightsUrl, dateResult);
    insightsUrl.searchParams.set('level', 'account');
    insightsUrl.searchParams.set('limit', '1');

    // Count entities: fetch id only with filtering, follow pagination to count all
    const countUrl = (entity: string) => {
      const u = new URL(`https://graph.facebook.com/v25.0/${accountId}/${entity}`);
      u.searchParams.set('access_token', auth.token);
      u.searchParams.set('fields', 'id');
      u.searchParams.set('filtering', statusFilter);
      u.searchParams.set('limit', '500');
      return u.toString();
    };

    const countAll = async (url: string): Promise<number> => {
      let total = 0;
      let nextUrl: string | null = url;
      let pages = 0;

      while (nextUrl && pages < 5) {
        const res = await fetch(nextUrl);
        if (!res.ok) break;
        const data = (await res.json()) as { data?: any[]; paging?: { next?: string } };
        total += data.data?.length || 0;
        nextUrl = data.paging?.next || null;
        pages++;
      }

      return total;
    };

    const [acctRes, insightsRes, campCount, adsetCount, adCount] = await Promise.all([
      fetch(acctUrl.toString()),
      fetch(insightsUrl.toString()),
      countAll(countUrl('campaigns')),
      countAll(countUrl('adsets')),
      countAll(countUrl('ads')),
    ]);

    const acctData = acctRes.ok ? (await acctRes.json()) as any : {};
    const insightsData = (await insightsRes.json()) as { data?: any[] };

    const summary = mapInsights(insightsData.data?.[0]) || {
      spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpm: 0,
      frequency: 0, results: 0, resultType: null, costPerResult: 0, roas: 0,
      purchases: 0, revenue: 0, costPerPurchase: 0,
      messages: 0, costPerMessage: 0, messagingActionType: null,
    };

    return Response.json({
      summary,
      account: {
        currency: acctData.currency || 'USD',
        timezone: acctData.timezone_name || null,
        timezoneOffset: acctData.timezone_offset_hours_utc ?? null,
      },
      counts: {
        campaigns: campCount,
        adsets: adsetCount,
        ads: adCount,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
};
