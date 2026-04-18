import { getFbToken } from '../../../../_lib/fb-token';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

/**
 * GET /api/fb/ads/:id/preview
 * Returns ad preview iframe URL from FB API.
 * Frontend can embed this in an iframe to show the actual ad appearance.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await getFbToken(context.request, context.env);
  if (auth.type === 'error') return auth.response;

  const adId = (context.params as any).id;
  const reqUrl = new URL(context.request.url);
  const format = reqUrl.searchParams.get('format') || 'DESKTOP_FEED_STANDARD';

  try {
    const r = await fetch(`https://graph.facebook.com/v25.0/${adId}/previews?ad_format=${format}&access_token=${auth.token}`);
    const data = (await r.json()) as { data?: { body?: string }[]; error?: any };

    if (!r.ok) return Response.json({ error: data.error?.message || 'Preview failed' }, { status: r.status });

    const body = data.data?.[0]?.body || '';
    // Extract iframe src
    const iframeMatch = body.match(/src="(https:\/\/[^"]+)"/);
    const iframeSrc = iframeMatch ? iframeMatch[1].replace(/&amp;/g, '&') : null;

    return Response.json({
      adId,
      format,
      iframeSrc,
      iframeHtml: body,
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch {
    return Response.json({ error: 'Failed to fetch preview' }, { status: 500 });
  }
};
