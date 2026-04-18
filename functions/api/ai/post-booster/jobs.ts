import { requireRole, type Role } from '../../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * GET /api/ai/post-booster/jobs
 * Returns the authenticated user's Post Booster jobs with aggregate
 * metrics joined from post_booster_runs.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager', 'viewer'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);

  const rows = (await context.env.DB.prepare(`
    SELECT
      j.id, j.keyword, j.match_mode, j.account_id,
      j.page_ids_json, j.budget_per_day, j.duration_days,
      j.copywriter_enabled, j.fb_campaign_id, j.fb_adset_id,
      j.status, j.error_message, j.launched_at, j.completed_at,
      j.created_at, j.updated_at,
      (SELECT COUNT(*) FROM post_booster_runs r WHERE r.job_id = j.id AND r.status = 'launched') AS posts_boosted,
      (SELECT COUNT(*) FROM post_booster_runs r WHERE r.job_id = j.id AND r.status = 'failed')   AS posts_failed,
      (SELECT COALESCE(SUM(spend_to_date), 0) FROM post_booster_runs r WHERE r.job_id = j.id)    AS total_spend
    FROM post_booster_jobs j
    WHERE j.user_id = ?
    ORDER BY j.created_at DESC
    LIMIT ?
  `).bind(auth.user.sub, limit).all()).results as any[];

  const jobs = rows.map(r => ({
    id: r.id,
    keyword: r.keyword,
    matchMode: r.match_mode,
    accountId: r.account_id,
    pageIds: r.page_ids_json ? JSON.parse(r.page_ids_json) : [],
    budgetPerDay: r.budget_per_day,
    durationDays: r.duration_days,
    copywriterEnabled: !!r.copywriter_enabled,
    fbCampaignId: r.fb_campaign_id,
    fbAdsetId: r.fb_adset_id,
    status: r.status,
    errorMessage: r.error_message,
    launchedAt: r.launched_at,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    postsBoosted: r.posts_boosted ?? 0,
    postsFailed: r.posts_failed ?? 0,
    totalSpend: r.total_spend ?? 0,
    // total_engagement requires joining FB insights — Phase 2 follow-up.
    totalEngagement: null,
  }));

  return Response.json({ jobs });
};
