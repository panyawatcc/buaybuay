import { parseDateParams, applyDateParams } from '../../_lib/date-params';
import { requireAuth } from '../../_lib/auth';
import { handleFbError } from '../../_lib/fb-fetch';
import { getFbContext, assertAdAccountAllowed, adAccountForbiddenResponse, fbContextErrorResponse } from '../../_lib/fb-context';
import { checkUserRate } from '../../_lib/rate-limit-user';
import { INSIGHTS_FIELDS, mapInsights } from './_lib/insights-fields';
import { fetchAllPages } from './_lib/paginate';

/**
 * GET /api/fb/adsets?account_id=act_xxx&campaign_id=xxx&date_preset=last_7d
 * Returns ad sets + insights (parallel fetch — more reliable than nested field expansion).
 */
export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string; TOKEN_ENCRYPTION_KEY: string; STATE_KV?: KVNamespace }> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);
  if (auth.type === 'unauthorized') return auth.response;

  const rl = await checkUserRate(context.env.STATE_KV, auth.user.sub, 'fb-adsets');
  if (rl) return rl;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id');
  const campaignId = reqUrl.searchParams.get('campaign_id');

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });
  }

  const dateResult = parseDateParams(reqUrl, 'last_7d');

  if (dateResult.error) {
    return Response.json({ error: dateResult.error }, { status: 400 });
  }

  let ctx;
  try { ctx = await getFbContext(context.env, auth.user.sub); } catch (e) { return fbContextErrorResponse(e); }
  if (!assertAdAccountAllowed(ctx, accountId)) return adAccountForbiddenResponse(accountId);

  try {
    const parent = campaignId || accountId;

    // Fetch adsets with pagination (all statuses)
    const adsetsUrl = new URL(`https://graph.facebook.com/v25.0/${parent}/adsets`);
    adsetsUrl.searchParams.set('access_token', ctx.admin_token);
    adsetsUrl.searchParams.set(
      'fields',
      'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,optimization_goal,start_time,end_time,created_time',
    );
    adsetsUrl.searchParams.set('filtering', JSON.stringify([
      { field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'ARCHIVED', 'DELETED', 'IN_PROCESS', 'WITH_ISSUES', 'DISAPPROVED'] },
    ]));
    adsetsUrl.searchParams.set('limit', '200');

    // Fetch insights at adset level (with pagination)
    const insightsUrl = new URL(`https://graph.facebook.com/v25.0/${accountId}/insights`);
    insightsUrl.searchParams.set('access_token', ctx.admin_token);
    insightsUrl.searchParams.set('fields', `adset_id,${INSIGHTS_FIELDS}`);
    applyDateParams(insightsUrl, dateResult);
    insightsUrl.searchParams.set('level', 'adset');
    insightsUrl.searchParams.set('limit', '500');

    const [adsetsRaw, insightsRaw] = await Promise.all([
      fetchAllPages(adsetsUrl.toString()),
      fetchAllPages(insightsUrl.toString()),
    ]);

    const insightsMap: Record<string, any> = {};

    for (const row of insightsRaw) {
      if (row.adset_id) {
        insightsMap[row.adset_id] = row;
      }
    }

    const adsets = adsetsRaw.map((a: any) => ({
      id: a.id,
      name: a.name,
      status: a.effective_status || a.status,
      campaignId: a.campaign_id,
      dailyBudget: a.daily_budget ? parseInt(a.daily_budget, 10) / 100 : 0,
      optimizationGoal: a.optimization_goal,
      startTime: a.start_time,
      endTime: a.end_time,
      insights: mapInsights(insightsMap[a.id] || null),
    }));

    return Response.json({ data: adsets }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    return handleFbError(err, 'Failed to fetch ad sets');
  }
};
