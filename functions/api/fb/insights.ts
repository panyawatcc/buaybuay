import { parseDateParams, applyDateParams } from '../../_lib/date-params';
import { requireAuth } from '../../_lib/auth';
import { fbFetch, fbErrorResponse } from '../../_lib/fb-fetch';
import { getFbContext, assertAdAccountAllowed, adAccountForbiddenResponse, fbContextErrorResponse } from '../../_lib/fb-context';
import { checkUserRate } from '../../_lib/rate-limit-user';

/**
 * GET /api/fb/insights?account_id=act_xxx&date_preset=last_7d
 * GET /api/fb/insights?account_id=act_xxx&since=2026-04-01&until=2026-04-14
 * Proxy: fetch ad account insights (spend, ROAS, CPA, etc.)
 * Auth via session cookie — FB token read from DB server-side.
 */
export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string; TOKEN_ENCRYPTION_KEY: string; STATE_KV?: KVNamespace }> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);
  if (auth.type === 'unauthorized') return auth.response;

  const rl = await checkUserRate(context.env.STATE_KV, auth.user.sub, 'fb-insights');
  if (rl) return rl;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id') || reqUrl.searchParams.get('accountId');
  const level = reqUrl.searchParams.get('level') || 'campaign';

  if (!accountId) {
    return Response.json({ error: 'account_id is required' }, { status: 400 });
  }

  if (!accountId.startsWith('act_')) {
    return Response.json({ error: 'account_id must start with "act_"' }, { status: 400 });
  }

  const dateResult = parseDateParams(reqUrl, 'last_7d');

  if (dateResult.error) {
    return Response.json({ error: dateResult.error }, { status: 400 });
  }

  let ctx;
  try { ctx = await getFbContext(context.env, auth.user.sub); } catch (e) { return fbContextErrorResponse(e); }
  if (!assertAdAccountAllowed(ctx, accountId)) return adAccountForbiddenResponse(accountId);
  const token = ctx.admin_token;

  const timeIncrement = reqUrl.searchParams.get('time_increment');

  try {
    const baseFields = 'date_start,date_stop,impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions,action_values,cost_per_action_type,purchase_roas';
    const levelFields: Record<string, string> = {
      campaign: `campaign_name,campaign_id,${baseFields}`,
      adset: `campaign_name,campaign_id,adset_name,adset_id,${baseFields}`,
      ad: `campaign_name,campaign_id,adset_name,adset_id,ad_name,ad_id,${baseFields}`,
    };

    const url = new URL(`https://graph.facebook.com/v25.0/${accountId}/insights`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('fields', levelFields[level] || levelFields.campaign);
    applyDateParams(url, dateResult);
    url.searchParams.set('level', level);
    url.searchParams.set('action_attribution_windows', '["7d_click","1d_view"]');
    if (timeIncrement) url.searchParams.set('time_increment', timeIncrement);
    url.searchParams.set('limit', '500');

    const res = await fbFetch<{ data?: any[]; paging?: any; error?: any }>(url.toString(), { retries: 2 });
    if (!res.ok) return fbErrorResponse(res);
    const data = res.data ?? {};

    const enriched = (data.data || []).map((row: any) => {
      const spend = parseFloat(row.spend || '0');
      const purchaseAction = row.actions?.find((a: any) => a.action_type === 'purchase');
      const purchases = purchaseAction ? parseFloat(purchaseAction.value) : 0;
      const purchaseValue = row.action_values?.find((a: any) => a.action_type === 'purchase');
      const revenue = purchaseValue ? parseFloat(purchaseValue.value) : 0;
      return {
        ...row,
        _computed: {
          revenue, purchases,
          cpa: purchases > 0 ? +(spend / purchases).toFixed(2) : 0,
          roas: spend > 0 ? +(revenue / spend).toFixed(2) : 0,
          profit: +(revenue - spend).toFixed(2),
        },
      };
    });

    // For ad level, fetch creative data in parallel
    if (level === 'ad' && enriched.length > 0) {
      const adIds = [...new Set(enriched.map((r: any) => r.ad_id).filter(Boolean))] as string[];
      for (let i = 0; i < adIds.length; i += 50) {
        const batch = adIds.slice(i, i + 50);
        try {
          const cr = await fetch(`https://graph.facebook.com/v25.0/?ids=${batch.join(',')}&fields=creative{thumbnail_url,body,title,image_url}&access_token=${token}`);
          if (cr.ok) {
            const cd = (await cr.json()) as Record<string, any>;
            for (const row of enriched) {
              const c = cd[row.ad_id]?.creative;
              if (c) row._creative = { thumbnailUrl: c.thumbnail_url || c.image_url || null, body: c.body || null, title: c.title || null };
            }
          }
        } catch {}
      }
    }

    // CSV export
    if (reqUrl.searchParams.get('format') === 'csv') {
      const safe = (v: string) => /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
      const headers = ['date_start', 'date_stop', 'campaign_name', 'campaign_id', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions', 'revenue', 'roas'];
      const csvRows = [headers.join(',')];

      for (const row of enriched) {
        csvRows.push([
          row.date_start || '', row.date_stop || '', `"${safe(row.campaign_name || '').replace(/"/g, '""')}"`, row.campaign_id || '',
          row.spend || 0, row.impressions || 0, row.clicks || 0, row._computed.cpa || 0, row.cpc || 0,
          row._computed.purchases || 0, row._computed.revenue || 0, row._computed.roas || 0,
        ].join(','));
      }

      return new Response(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="insights.csv"',
          'Cache-Control': 'private, max-age=120',
        },
      });
    }

    return Response.json({ data: enriched, paging: data.paging }, {
      headers: { 'Cache-Control': 'private, max-age=120' },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch insights' },
      { status: 500 },
    );
  }
};
