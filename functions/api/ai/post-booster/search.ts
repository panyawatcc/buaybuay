import { requireRole, type Role } from '../../../_lib/auth';
import { getPageToken } from './_lib/page-token';
import { fbFetch } from '../../../_lib/fb-fetch';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

// Map spec's date_range keyword → FB since timestamp (unix sec).
function sinceFromRange(r: string | undefined): number {
  const now = Math.floor(Date.now() / 1000);
  const d = 86400;
  switch (r) {
    case 'last_7d':   return now - 7 * d;
    case 'last_30d':  return now - 30 * d;
    case 'last_90d':  return now - 90 * d;
    default:          return now - 30 * d;
  }
}

interface PostOut {
  post_id: string;
  page_id: string;
  message: string;
  created_time: string;
  type: string;
  engagement: { likes: number; comments: number; shares: number; total: number };
  age_days: number;
  age_warning: boolean;
}

/**
 * POST /api/ai/post-booster/search
 * Body: { page_ids[], keyword, match_mode, filters: { date_range, min_engagement, post_types[] } }
 * Returns posts matching keyword + filters across the given page_ids.
 * Preview only — no ads created.
 *
 * ai_semantic match mode is not yet wired (Phase 1 ships contains+exact only;
 * ai_semantic requires Anthropic wiring which is still stubbed).
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  let body: any;
  try { body = await context.request.json(); } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }); }

  const pageIds: string[] = Array.isArray(body.page_ids) ? body.page_ids.slice(0, 10) : [];
  const keyword: string = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const matchMode: string = body.match_mode ?? 'contains';
  const filters = body.filters ?? {};

  if (pageIds.length === 0) return Response.json({ error: 'page_ids required' }, { status: 400 });
  if (!keyword) return Response.json({ error: 'keyword required' }, { status: 400 });

  const since = sinceFromRange(filters.date_range);
  const minEng: number = typeof filters.min_engagement === 'number' ? filters.min_engagement : 0;
  const postTypes: string[] = Array.isArray(filters.post_types) ? filters.post_types : [];

  const kwLower = keyword.toLowerCase();
  const matchFn = (msg: string) => {
    const m = (msg || '').toLowerCase();
    if (matchMode === 'exact') return m === kwLower;
    return m.includes(kwLower);                 // contains (default)
  };

  const allMatched: PostOut[] = [];
  const perPageErrors: { page_id: string; reason: string }[] = [];

  for (const pageId of pageIds) {
    const pageToken = await getPageToken(context.env.DB, auth.user.sub, pageId, context.env.TOKEN_ENCRYPTION_KEY);
    if (!pageToken) {
      perPageErrors.push({ page_id: pageId, reason: 'no_page_token_reconnect_facebook' });
      continue;
    }

    const url = new URL(`https://graph.facebook.com/v25.0/${pageId}/posts`);
    url.searchParams.set('fields', 'id,message,created_time,type,likes.summary(true),comments.summary(true),shares,attachments');
    url.searchParams.set('since', String(since));
    url.searchParams.set('limit', '100');
    url.searchParams.set('access_token', pageToken);

    const res = await fbFetch<{ data?: any[] }>(url.toString(), { retries: 2 });
    if (!res.ok) {
      perPageErrors.push({ page_id: pageId, reason: res.userMessage || `fb_error_${res.status}` });
      continue;
    }

    const rawPosts = res.data?.data ?? [];
    for (const p of rawPosts) {
      const msg = p.message ?? '';
      if (!matchFn(msg)) continue;

      const type = p.type ?? 'status';
      if (postTypes.length > 0 && !postTypes.includes(type)) continue;

      const likes = p.likes?.summary?.total_count ?? 0;
      const comments = p.comments?.summary?.total_count ?? 0;
      const shares = p.shares?.count ?? 0;
      const total = likes + comments + shares;
      if (total < minEng) continue;

      const createdMs = p.created_time ? Date.parse(p.created_time) : Date.now();
      const ageDays = Math.floor((Date.now() - createdMs) / 86400000);

      allMatched.push({
        post_id: p.id,
        page_id: pageId,
        message: msg.length > 400 ? msg.slice(0, 400) + '…' : msg,
        created_time: p.created_time,
        type,
        engagement: { likes, comments, shares, total },
        age_days: ageDays,
        age_warning: ageDays > 60,
      });
    }
  }

  const aiSemanticStubbed = matchMode === 'ai_semantic';

  return Response.json({
    total_matched: allMatched.length,
    posts: allMatched,
    ai_semantic_cost_usd: 0,                 // real cost lands when Anthropic is wired
    ai_semantic_stubbed: aiSemanticStubbed,  // flag so FE can show "using contains fallback"
    per_page_errors: perPageErrors,
  });
};
