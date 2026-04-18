import { parseDateParams, applyDateParams } from '../../_lib/date-params';
import { requireAuth } from '../../_lib/auth';
import { handleFbError } from '../../_lib/fb-fetch';
import { getFbContext, assertAdAccountAllowed, adAccountForbiddenResponse, fbContextErrorResponse } from '../../_lib/fb-context';
import { checkUserRate } from '../../_lib/rate-limit-user';
import { INSIGHTS_FIELDS, mapInsights } from './_lib/insights-fields';
import { fetchAllPages } from './_lib/paginate';

/**
 * GET /api/fb/ads?account_id=act_xxx&campaign_id=xxx&date_preset=last_7d
 * Returns ads with creative info + insights (parallel fetch).
 */
export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string; TOKEN_ENCRYPTION_KEY: string; STATE_KV?: KVNamespace }> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);
  if (auth.type === 'unauthorized') return auth.response;

  const rl = await checkUserRate(context.env.STATE_KV, auth.user.sub, 'fb-ads');
  if (rl) return rl;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id');
  const campaignId = reqUrl.searchParams.get('campaign_id');
  const adsetId = reqUrl.searchParams.get('adset_id');

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
    const parent = adsetId || campaignId || accountId;

    // Fetch ads with pagination (all statuses)
    const adsUrl = new URL(`https://graph.facebook.com/v25.0/${parent}/ads`);
    adsUrl.searchParams.set('access_token', ctx.admin_token);
    adsUrl.searchParams.set('fields', 'id,name,status,effective_status,adset_id,campaign_id,created_time,effective_object_story_id,creative{id,name,title,body,call_to_action_type}');
    adsUrl.searchParams.set('filtering', JSON.stringify([
      { field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'ARCHIVED', 'DELETED', 'IN_PROCESS', 'WITH_ISSUES', 'DISAPPROVED'] },
    ]));
    adsUrl.searchParams.set('limit', '200');

    const insightsUrl = new URL(`https://graph.facebook.com/v25.0/${accountId}/insights`);
    insightsUrl.searchParams.set('access_token', ctx.admin_token);
    insightsUrl.searchParams.set('fields', `ad_id,${INSIGHTS_FIELDS}`);
    applyDateParams(insightsUrl, dateResult);
    insightsUrl.searchParams.set('level', 'ad');
    insightsUrl.searchParams.set('action_attribution_windows', '["7d_click","1d_view"]');
    insightsUrl.searchParams.set('limit', '500');

    const [adsRaw, insightsRaw] = await Promise.all([
      fetchAllPages(adsUrl.toString()),
      fetchAllPages(insightsUrl.toString()),
    ]);

    const insightsMap: Record<string, any> = {};
    for (const row of insightsRaw) { if (row.ad_id) insightsMap[row.ad_id] = row; }

    // Images served via /api/fb/ads/{id}/image proxy — no need to resolve here
    const ads = adsRaw.map((a: any) => {
      const c = a.creative;
      const storyId = a.effective_object_story_id;
      const permalink = storyId ? `https://www.facebook.com/${storyId}` : null;
      const proxyImageUrl = `/api/fb/ads/${a.id}/image`;

      return {
        id: a.id, name: a.name, status: a.effective_status || a.status,
        campaignId: a.campaign_id, adsetId: a.adset_id,
        creative: c ? { id: c.id, name: c.name, title: c.title, body: c.body, thumbnailUrl: proxyImageUrl, callToAction: c.call_to_action_type } : null,
        adImageUrl: proxyImageUrl, permalink,
        createdTime: a.created_time,
        insights: mapInsights(insightsMap[a.id] || null),
      };
    });

    return Response.json({ data: ads }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    return handleFbError(err, 'Failed to fetch ads');
  }
};
