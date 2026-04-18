/**
 * GET /api/fb/ai-insights?account_id=act_xxx
 * Rule-based AI recommendations from campaign insights.
 * Analyzes campaign performance and returns actionable suggestions.
 *
 * Categories:
 * - warning: campaign losing money (ROAS < 1, high CPA)
 * - opportunity: scale winners (ROAS > 3, high CTR)
 * - insight: notable trends or anomalies
 */

interface CampaignInsight {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
}

interface Recommendation {
  id: string;
  type: 'warning' | 'opportunity' | 'insight';
  campaignId: string;
  campaignName: string;
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  metrics: Record<string, number | string>;
}

import { getFbToken } from '../../_lib/fb-token';

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

  try {
    // Fetch last 7d campaign-level insights
    const url = new URL(`https://graph.facebook.com/v25.0/${accountId}/insights`);
    url.searchParams.set('access_token', token);
    url.searchParams.set(
      'fields',
      'campaign_id,campaign_name,spend,impressions,clicks,ctr,actions,action_values,cost_per_action_type',
    );
    url.searchParams.set('date_preset', 'last_7d');
    url.searchParams.set('action_attribution_windows', JSON.stringify(['7d_click', '1d_view']));
    url.searchParams.set('level', 'campaign');
    url.searchParams.set('limit', '100');

    const res = await fetch(url.toString());
    const data = (await res.json()) as { data?: CampaignInsight[]; error?: any };

    if (!res.ok) {
      return Response.json(data, { status: res.status });
    }

    const insights = data.data || [];
    const recommendations: Recommendation[] = [];

    for (const ins of insights) {
      const spend = parseFloat(ins.spend || '0');
      const ctr = parseFloat(ins.ctr || '0');

      const purchaseAction = ins.actions?.find((a) => a.action_type === 'purchase');
      const purchases = purchaseAction ? parseFloat(purchaseAction.value) : 0;

      const purchaseValue = ins.action_values?.find((a) => a.action_type === 'purchase');
      const revenue = purchaseValue ? parseFloat(purchaseValue.value) : 0;

      const roas = spend > 0 ? revenue / spend : 0;
      const cpa = purchases > 0 ? spend / purchases : 0;

      // Skip campaigns with no meaningful spend
      if (spend < 100) continue;

      // Rule 1: ROAS < 1 + spend > 500 → warning (losing money)
      if (roas < 1 && spend > 500) {
        recommendations.push({
          id: `warn_${ins.campaign_id}`,
          type: 'warning',
          campaignId: ins.campaign_id,
          campaignName: ins.campaign_name,
          title: 'แคมเปญขาดทุน — ROAS ต่ำกว่า 1',
          description: `ใช้ ฿${spend.toLocaleString()} ได้รายได้ ฿${revenue.toLocaleString()} (ROAS ${roas.toFixed(2)}x). ควรหยุดหรือปรับ targeting`,
          action: 'pause',
          priority: 'high',
          metrics: { spend, revenue, roas: +roas.toFixed(2), cpa: +cpa.toFixed(2) },
        });
      }
      // Rule 2: ROAS > 3 + spend > 200 → opportunity (scale winner)
      else if (roas > 3 && spend > 200) {
        recommendations.push({
          id: `opp_${ins.campaign_id}`,
          type: 'opportunity',
          campaignId: ins.campaign_id,
          campaignName: ins.campaign_name,
          title: 'แคมเปญทำกำไรดี — ควรเพิ่ม budget',
          description: `ROAS ${roas.toFixed(1)}x (รายได้ ฿${revenue.toLocaleString()} จาก ฿${spend.toLocaleString()}). เพิ่ม budget 20-50%`,
          action: 'scale_up',
          priority: 'high',
          metrics: { spend, revenue, roas: +roas.toFixed(2), purchases },
        });
      }
      // Rule 3: CTR > 3% → insight (creative ดี)
      else if (ctr > 3) {
        recommendations.push({
          id: `ins_ctr_${ins.campaign_id}`,
          type: 'insight',
          campaignId: ins.campaign_id,
          campaignName: ins.campaign_name,
          title: `CTR สูง ${ctr.toFixed(1)}% — creative น่าจะดี`,
          description: 'ลอง duplicate ad นี้ไปยัง audience ใหม่ หรือเพิ่ม similar audience',
          priority: 'medium',
          metrics: { ctr: +ctr.toFixed(2), spend, purchases },
        });
      }
      // Rule 4: CPA > average × 2 → warning (cost too high)
      else if (cpa > 0 && purchases > 0) {
        const avgCpa = insights.reduce((sum, i) => {
          const sp = parseFloat(i.spend || '0');
          const pa = i.actions?.find((a) => a.action_type === 'purchase');
          const pu = pa ? parseFloat(pa.value) : 0;

          return pu > 0 ? sum + sp / pu : sum;
        }, 0) / Math.max(insights.length, 1);

        if (avgCpa > 0 && cpa > avgCpa * 2) {
          recommendations.push({
            id: `warn_cpa_${ins.campaign_id}`,
            type: 'warning',
            campaignId: ins.campaign_id,
            campaignName: ins.campaign_name,
            title: `CPA สูงเกิน 2x average`,
            description: `CPA ฿${cpa.toFixed(0)} (เฉลี่ย ฿${avgCpa.toFixed(0)}). ตรวจ creative + audience`,
            action: 'review',
            priority: 'medium',
            metrics: { cpa: +cpa.toFixed(2), avgCpa: +avgCpa.toFixed(2), purchases },
          });
        }
      }
    }

    // Sort by priority (high → low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return Response.json(
      {
        data: recommendations,
        summary: {
          total: recommendations.length,
          warnings: recommendations.filter((r) => r.type === 'warning').length,
          opportunities: recommendations.filter((r) => r.type === 'opportunity').length,
          insights: recommendations.filter((r) => r.type === 'insight').length,
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to generate AI insights' },
      { status: 500 },
    );
  }
};
