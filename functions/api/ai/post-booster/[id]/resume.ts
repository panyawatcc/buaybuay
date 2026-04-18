import { requireRole, type Role } from '../../../../_lib/auth';
import { fbFetch } from '../../../../_lib/fb-fetch';
import { getFbContext, fbContextErrorResponse } from '../../../../_lib/fb-context';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

/**
 * POST /api/ai/post-booster/:id/resume
 * Resumes every ad in a Post Booster job + marks job status='active'.
 * Called by the Telegram 1-click approve flow to flip a draft
 * (launch_status='PAUSED' on /launch) into active.
 */
export const onRequestPost: PagesFunction<Env, 'id'> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const jobId = String(context.params.id);
  if (!jobId) return Response.json({ error: 'job_id_required' }, { status: 400 });

  const job = (await context.env.DB.prepare(
    'SELECT id, user_id FROM post_booster_jobs WHERE id = ? AND user_id = ?',
  ).bind(jobId, auth.user.sub).first()) as { id: string } | null;
  if (!job) return Response.json({ error: 'job_not_found' }, { status: 404 });

  let ctx;
  try { ctx = await getFbContext(context.env, auth.user.sub); } catch (e) { return fbContextErrorResponse(e); }
  const token = ctx.admin_token;

  const runs = (await context.env.DB.prepare(
    "SELECT id, fb_ad_id FROM post_booster_runs WHERE job_id = ? AND fb_ad_id IS NOT NULL",
  ).bind(jobId).all()).results as { id: string; fb_ad_id: string }[];

  let ok = 0;
  let failed = 0;
  for (const r of runs) {
    const res = await fbFetch(`https://graph.facebook.com/v25.0/${r.fb_ad_id}`, {
      retries: 1,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE', access_token: token }),
      },
    });
    if (res.ok) {
      ok++;
      await context.env.DB.prepare(
        "UPDATE post_booster_runs SET status = 'launched', error_message = NULL WHERE id = ?",
      ).bind(r.id).run();
    } else {
      failed++;
      await context.env.DB.prepare(
        'UPDATE post_booster_runs SET error_message = ? WHERE id = ?',
      ).bind(`state_change_resume: ${res.userMessage || res.error?.message || 'failed'}`.slice(0, 400), r.id).run();
    }
  }

  await context.env.DB.prepare(
    `UPDATE post_booster_jobs SET status = 'active', launched_at = COALESCE(launched_at, datetime('now')), updated_at = datetime('now') WHERE id = ?`,
  ).bind(jobId).run();

  return Response.json({ job_id: jobId, status: 'active', ads_affected: runs.length, ads_updated_ok: ok, ads_updated_failed: failed });
};
