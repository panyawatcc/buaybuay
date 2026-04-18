import { parseDateParams, applyDateParams } from '../../_lib/date-params';
import { requireAuth } from '../../_lib/auth';
import { handleFbError } from '../../_lib/fb-fetch';
import { getFbContext, assertAdAccountAllowed, adAccountForbiddenResponse, fbContextErrorResponse } from '../../_lib/fb-context';
import { checkUserRate } from '../../_lib/rate-limit-user';
import { mapInsights } from './_lib/insights-fields';
import { fetchAllPages } from './_lib/paginate';

// All insights fields for 23-column Ads Manager parity
const CAMPAIGN_INSIGHTS_FIELDS = [
  'campaign_id', 'spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpm', 'frequency',
  'actions', 'action_values', 'cost_per_action_type', 'purchase_roas',
  'inline_link_clicks', 'inline_link_click_ctr', 'cost_per_inline_link_click',
  'website_ctr',
].join(',');

function findAction(actions: any[] | undefined, type: string): number {
  const a = actions?.find((x: any) => x.action_type === type);
  return a ? parseFloat(a.value) : 0;
}

function findCostPerAction(cpa: any[] | undefined, type: string): number {
  const a = cpa?.find((x: any) => x.action_type === type);
  return a ? parseFloat(a.value) : 0;
}

function mapFullInsights(raw: any, objective?: string) {
  if (!raw) return null;
  const base = mapInsights(raw, objective);
  if (!base) return null;

  const linkClicks = parseFloat(raw.inline_link_clicks || '0');
  const linkCtr = parseFloat(raw.inline_link_click_ctr || '0');
  const costPerLinkClick = parseFloat(raw.cost_per_inline_link_click || '0');
  const landingPageViews = findAction(raw.actions, 'landing_page_view');
  const costPerLandingPageView = findCostPerAction(raw.cost_per_action_type, 'landing_page_view');
  const storeClicks = findAction(raw.actions, 'onsite_conversion.post_save') || findAction(raw.actions, 'page_engagement');

  return {
    ...base,
    linkClicks,
    linkCtr: +linkCtr.toFixed(2),
    costPerLinkClick: +costPerLinkClick.toFixed(2),
    landingPageViews,
    costPerLandingPageView: +costPerLandingPageView.toFixed(2),
    storeClicks,
  };
}

/**
 * GET /api/fb/campaigns?account_id=act_xxx&date_preset=last_7d
 * Returns campaigns + full 23-column insights (Ads Manager parity).
 */
export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string; TOKEN_ENCRYPTION_KEY: string; STATE_KV?: KVNamespace }> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);
  if (auth.type === 'unauthorized') return auth.response;

  const rl = await checkUserRate(context.env.STATE_KV, auth.user.sub, 'fb-campaigns');
  if (rl) return rl;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id');
  if (!accountId?.startsWith('act_')) return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });

  const dateResult = parseDateParams(reqUrl, 'last_7d');
  if (dateResult.error) return Response.json({ error: dateResult.error }, { status: 400 });

  let ctx;
  try { ctx = await getFbContext(context.env, auth.user.sub); } catch (e) { return fbContextErrorResponse(e); }
  if (!assertAdAccountAllowed(ctx, accountId)) return adAccountForbiddenResponse(accountId);

  try {
    const campaignsUrl = new URL(`https://graph.facebook.com/v25.0/${accountId}/campaigns`);
    campaignsUrl.searchParams.set('access_token', ctx.admin_token);
    campaignsUrl.searchParams.set('fields', 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,end_time,created_time');
    campaignsUrl.searchParams.set('filtering', JSON.stringify([
      { field: 'effective_status', operator: 'IN', value: ['ACTIVE','PAUSED','CAMPAIGN_PAUSED','ARCHIVED','DELETED','IN_PROCESS','WITH_ISSUES','DISAPPROVED'] },
    ]));
    campaignsUrl.searchParams.set('limit', '200');

    const insightsUrl = new URL(`https://graph.facebook.com/v25.0/${accountId}/insights`);
    insightsUrl.searchParams.set('access_token', ctx.admin_token);
    insightsUrl.searchParams.set('fields', CAMPAIGN_INSIGHTS_FIELDS);
    applyDateParams(insightsUrl, dateResult);
    insightsUrl.searchParams.set('level', 'campaign');
    insightsUrl.searchParams.set('limit', '500');
    insightsUrl.searchParams.set('action_attribution_windows', '["7d_click","1d_view"]');

    const [campaignsRaw, insightsRaw] = await Promise.all([
      fetchAllPages(campaignsUrl.toString()),
      fetchAllPages(insightsUrl.toString()),
    ]);

    const insightsMap: Record<string, any> = {};
    for (const row of insightsRaw) { if (row.campaign_id) insightsMap[row.campaign_id] = row; }

    const campaigns = campaignsRaw.map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.effective_status || c.status,
      objective: c.objective,
      dailyBudget: c.daily_budget ? parseInt(c.daily_budget, 10) / 100 : 0,
      lifetimeBudget: c.lifetime_budget ? parseInt(c.lifetime_budget, 10) / 100 : 0,
      startTime: c.start_time,
      endTime: c.end_time || null,
      createdTime: c.created_time,
      insights: mapFullInsights(insightsMap[c.id] || null, c.objective),
    }));

    if (reqUrl.searchParams.get('format') === 'csv') {
      const safe = (v: string) => /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
      const headers = ['id','name','status','objective','daily_budget','spend','impressions','reach','frequency','clicks','ctr','cpm','results','result_type','cost_per_result','roas','link_clicks','link_ctr','cost_per_link_click','landing_page_views','cost_per_landing_page_view','messages','cost_per_message','end_time'];
      const csvRows = [headers.join(',')];
      for (const c of campaigns) {
        const i = c.insights;
        csvRows.push([c.id,`"${safe(c.name||'').replace(/"/g,'""')}"`,c.status,c.objective,c.dailyBudget,i?.spend||0,i?.impressions||0,i?.reach||0,i?.frequency||0,i?.clicks||0,i?.ctr||0,i?.cpm||0,i?.results||0,i?.resultType||'',i?.costPerResult||0,i?.roas||0,i?.linkClicks||0,i?.linkCtr||0,i?.costPerLinkClick||0,i?.landingPageViews||0,i?.costPerLandingPageView||0,i?.messages||0,i?.costPerMessage||0,c.endTime||''].join(','));
      }
      return new Response(csvRows.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="campaigns.csv"' } });
    }

    return Response.json({ data: campaigns }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    return handleFbError(err, 'Failed to fetch campaigns');
  }
};
