import { requireRole, type Role } from '../../../_lib/auth';
import { getPageToken } from './_lib/page-token';
import { fbFetch } from '../../../_lib/fb-fetch';
import { getFbContext, assertAdAccountAllowed, adAccountForbiddenResponse, fbContextErrorResponse } from '../../../_lib/fb-context';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

const DAILY_JOB_QUOTA = 10;

interface LaunchBody {
  job_id?: string;
  page_ids: string[];
  keyword: string;
  match_mode?: string;
  filters?: any;
  targeting?: any;
  budget_per_day: number;
  duration_days: number;
  copywriter_enabled?: boolean;
  selected_post_ids: string[];            // "pageId_postId" shape
  launch_status?: 'ACTIVE' | 'PAUSED';    // default PAUSED for safety (Telegram 1-click resumes)
  account_id: string;                     // act_xxx
}

/**
 * POST /api/ai/post-booster/launch
 * Create FB campaign + adset + 1 ad per selected post. Writes
 * post_booster_jobs + post_booster_runs. Per-post failures don't abort
 * the whole launch — returns partial-success counts.
 *
 * Phase 1 copywriter integration: if copywriter_enabled=true we attempt
 * to duplicate the post (POST /{page_id}/feed with the original message;
 * full Haiku rewrite lands when Anthropic SDK is wired). When rewrite
 * fails for a given post we fall back to boosting the original so one
 * post never blocks the run.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  let body: LaunchBody;
  try { body = await context.request.json(); } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }); }

  if (!body.account_id?.startsWith('act_')) return Response.json({ error: 'account_id (act_*) required' }, { status: 400 });
  if (!Array.isArray(body.page_ids) || body.page_ids.length === 0) return Response.json({ error: 'page_ids required' }, { status: 400 });
  if (!body.keyword) return Response.json({ error: 'keyword required' }, { status: 400 });
  if (!Array.isArray(body.selected_post_ids) || body.selected_post_ids.length === 0) return Response.json({ error: 'selected_post_ids required' }, { status: 400 });
  if (typeof body.budget_per_day !== 'number' || body.budget_per_day <= 0) return Response.json({ error: 'budget_per_day required' }, { status: 400 });
  if (typeof body.duration_days !== 'number' || body.duration_days <= 0) return Response.json({ error: 'duration_days required' }, { status: 400 });

  const userId = auth.user.sub;
  const accountId = body.account_id;
  const launchStatus = body.launch_status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';

  // Daily quota enforcement (10 jobs/user/day).
  const daily = (await context.env.DB.prepare(
    "SELECT COUNT(*) as c FROM post_booster_jobs WHERE user_id = ? AND date(created_at) = date('now')",
  ).bind(userId).first()) as { c: number } | null;
  if ((daily?.c ?? 0) >= DAILY_JOB_QUOTA) {
    return Response.json({ error: 'daily_quota_exceeded', quota: DAILY_JOB_QUOTA }, { status: 429 });
  }

  // Admin-token via fb-context (Hybrid Agency). Customers never hold their
  // own FB token — app makes FB calls with the admin's token and scopes by
  // allowed_ad_accounts. Per-page tokens remain per-page via getPageToken
  // for /{page_id}/feed duplication when copywriter_enabled.
  let ctx;
  try { ctx = await getFbContext(context.env, userId); } catch (e) { return fbContextErrorResponse(e); }
  if (!assertAdAccountAllowed(ctx, accountId)) return adAccountForbiddenResponse(accountId);
  const userToken = ctx.admin_token;

  // INSERT job row up-front so per-post failures can attach to it.
  const jobId = body.job_id || crypto.randomUUID();
  const jobStatusInitial = launchStatus === 'ACTIVE' ? 'active' : 'draft';
  await context.env.DB.prepare(
    `INSERT INTO post_booster_jobs (id, user_id, account_id, page_ids_json, keyword, match_mode, filters_json,
        targeting_json, budget_per_day, duration_days, copywriter_enabled, status, launched_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET status = excluded.status, launched_at = excluded.launched_at, updated_at = datetime('now')`,
  ).bind(
    jobId, userId, accountId, JSON.stringify(body.page_ids), body.keyword,
    body.match_mode ?? 'contains', JSON.stringify(body.filters ?? {}),
    JSON.stringify(body.targeting ?? {}), body.budget_per_day, body.duration_days,
    body.copywriter_enabled ? 1 : 0, jobStatusInitial,
    launchStatus === 'ACTIVE' ? new Date().toISOString() : null,
  ).run();

  const markJobError = async (msg: string) => {
    await context.env.DB.prepare(
      `UPDATE post_booster_jobs SET status='error', error_message=?, updated_at=datetime('now') WHERE id=?`,
    ).bind(msg.slice(0, 400), jobId).run();
  };

  // 1) Campaign.
  const campRes = await fbFetch<{ id: string }>(`https://graph.facebook.com/v25.0/${accountId}/campaigns`, {
    retries: 2,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `PostBooster: ${body.keyword.slice(0, 80)}`,
        objective: 'OUTCOME_ENGAGEMENT',
        status: launchStatus,
        special_ad_categories: [],
        buying_type: 'AUCTION',
        access_token: userToken,
      }),
    },
  });
  if (!campRes.ok) {
    await markJobError(`campaign_create: ${campRes.userMessage || campRes.error?.message || 'failed'}`);
    return Response.json({ error: 'campaign_create_failed', details: campRes.userMessage, job_id: jobId }, { status: campRes.rateLimited ? 429 : 502 });
  }
  const campaignId = campRes.data?.id;

  // 2) Adset.
  const endTime = Math.floor(Date.now() / 1000) + body.duration_days * 86400;
  const targeting: any = {
    geo_locations: { countries: ['TH'] },
    age_min: body.targeting?.age_min ?? 18,
    age_max: body.targeting?.age_max ?? 65,
  };
  if (Array.isArray(body.targeting?.regions) && body.targeting.regions.length > 0) {
    targeting.geo_locations = { ...targeting.geo_locations, regions: body.targeting.regions.map((k: string) => ({ key: k })) };
  }
  if (body.targeting?.gender === 'male') targeting.genders = [1];
  else if (body.targeting?.gender === 'female') targeting.genders = [2];

  const adsetRes = await fbFetch<{ id: string }>(`https://graph.facebook.com/v25.0/${accountId}/adsets`, {
    retries: 2,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `PostBooster adset: ${body.keyword.slice(0, 80)}`,
        campaign_id: campaignId,
        daily_budget: Math.round(body.budget_per_day * 100),      // FB expects minor currency units
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'POST_ENGAGEMENT',
        targeting,
        end_time: endTime,
        status: launchStatus,
        access_token: userToken,
      }),
    },
  });
  if (!adsetRes.ok) {
    await markJobError(`adset_create: ${adsetRes.userMessage || adsetRes.error?.message || 'failed'}`);
    return Response.json({ error: 'adset_create_failed', details: adsetRes.userMessage, job_id: jobId, campaign_id: campaignId }, { status: adsetRes.rateLimited ? 429 : 502 });
  }
  const adsetId = adsetRes.data?.id;

  await context.env.DB.prepare(
    `UPDATE post_booster_jobs SET fb_campaign_id=?, fb_adset_id=?, updated_at=datetime('now') WHERE id=?`,
  ).bind(campaignId, adsetId, jobId).run();

  // 3) Per-post: (optional rewrite) → adcreative → ad. Write post_booster_runs.
  const runs: { run_id: string; post_id: string; ad_id: string | null; status: string; error?: string }[] = [];
  let boosted = 0;
  let failed = 0;

  for (const selectedPostId of body.selected_post_ids) {
    const runId = crypto.randomUUID();
    const pageId = selectedPostId.split('_')[0];
    let boostedPostId = selectedPostId;
    let runError: string | null = null;

    // Phase 1 copywriter: duplicate post (rewrite stub — will call Anthropic in Day 5).
    if (body.copywriter_enabled) {
      const pageToken = await getPageToken(context.env.DB, userId, pageId, context.env.TOKEN_ENCRYPTION_KEY);
      if (pageToken) {
        // Fetch original message for rewrite/duplicate.
        const origRes = await fbFetch<{ message?: string }>(
          `https://graph.facebook.com/v25.0/${selectedPostId}?fields=message&access_token=${pageToken}`,
          { retries: 1 },
        );
        const origMsg = origRes.data?.message ?? '';
        // TODO(Day 5): Haiku rewrite — for now, duplicate verbatim so the
        // flow is wired. Verbatim duplicate means the ad is still separate
        // from the original organic post (user can track boost impact).
        const dupRes = await fbFetch<{ id: string }>(`https://graph.facebook.com/v25.0/${pageId}/feed`, {
          retries: 1,
          init: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: origMsg, access_token: pageToken }),
          },
        });
        if (dupRes.ok && dupRes.data?.id) boostedPostId = dupRes.data.id;
        // Silent fallback: on duplicate failure we boost the original.
      }
    }

    // adcreative
    const creativeRes = await fbFetch<{ id: string }>(`https://graph.facebook.com/v25.0/${accountId}/adcreatives`, {
      retries: 1,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object_story_id: boostedPostId,
          access_token: userToken,
        }),
      },
    });
    if (!creativeRes.ok) {
      runError = `adcreative: ${creativeRes.userMessage || creativeRes.error?.message || 'failed'}`;
    }

    let adId: string | null = null;
    if (!runError && creativeRes.data?.id) {
      const adRes = await fbFetch<{ id: string }>(`https://graph.facebook.com/v25.0/${accountId}/ads`, {
        retries: 1,
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `PostBooster ad: ${selectedPostId}`,
            adset_id: adsetId,
            creative: { creative_id: creativeRes.data.id },
            status: launchStatus,
            access_token: userToken,
          }),
        },
      });
      if (!adRes.ok) {
        runError = `ad_create: ${adRes.userMessage || adRes.error?.message || 'failed'}`;
      } else {
        adId = adRes.data?.id ?? null;
      }
    }

    const runStatus = runError ? 'failed' : 'launched';
    await context.env.DB.prepare(
      `INSERT INTO post_booster_runs (id, job_id, original_post_id, boosted_post_id, fb_ad_id, status, error_message, launched_at)
       VALUES (?,?,?,?,?,?,?,?)`,
    ).bind(
      runId, jobId, selectedPostId, boostedPostId, adId,
      runStatus, runError?.slice(0, 400) ?? null,
      runStatus === 'launched' ? new Date().toISOString() : null,
    ).run();

    runs.push({ run_id: runId, post_id: selectedPostId, ad_id: adId, status: runStatus, error: runError ?? undefined });
    if (runStatus === 'launched') boosted++;
    else failed++;
  }

  return Response.json({
    job_id: jobId,
    campaign_id: campaignId,
    adset_id: adsetId,
    status: jobStatusInitial,
    launch_status: launchStatus,
    posts_boosted: boosted,
    posts_failed: failed,
    runs,
  });
};
