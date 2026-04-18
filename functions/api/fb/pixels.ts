import { getFbToken } from '../../_lib/fb-token';

/**
 * GET /api/fb/pixels?account_id=act_xxx
 * Fetch ad account pixel status: active/inactive, last fired, conversion events.
 */
export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string; TOKEN_ENCRYPTION_KEY: string }> = async (context) => {
  const auth = await getFbToken(context.request, context.env);

  if (auth.type === 'error') return auth.response;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id');

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });
  }

  try {
    // Fetch pixels for the ad account
    const pixelUrl = new URL(`https://graph.facebook.com/v25.0/${accountId}/adspixels`);
    pixelUrl.searchParams.set('access_token', auth.token);
    pixelUrl.searchParams.set('fields', 'id,name,is_unavailable,last_fired_time,creation_time');
    pixelUrl.searchParams.set('limit', '20');

    const pixelRes = await fetch(pixelUrl.toString());
    const pixelData = (await pixelRes.json()) as { data?: any[]; error?: any };

    if (!pixelRes.ok) {
      return Response.json(pixelData, { status: pixelRes.status });
    }

    const rawPixels = pixelData.data || [];

    // For each active pixel, try to get conversion events (best-effort)
    const pixels = rawPixels.map((p: any) => ({
      id: p.id,
      name: p.name,
      isActive: !p.is_unavailable,
      lastFiredTime: p.last_fired_time || null,
      creationTime: p.creation_time || null,
    }));

    const hasActivePixel = pixels.some((p: any) => p.isActive);

    // Fetch conversion events from the first active pixel (if any)
    let conversionEvents: string[] = [];
    const activePixel = pixels.find((p: any) => p.isActive);

    if (activePixel) {
      try {
        const statsUrl = new URL(`https://graph.facebook.com/v25.0/${activePixel.id}/stats`);
        statsUrl.searchParams.set('access_token', auth.token);

        const statsRes = await fetch(statsUrl.toString());

        if (statsRes.ok) {
          const statsData = (await statsRes.json()) as { data?: any[] };
          const events = statsData.data?.[0];

          if (events) {
            conversionEvents = Object.keys(events).filter(
              (k) => !['id', 'start_time', 'end_time'].includes(k) && parseInt(events[k]) > 0,
            );
          }
        }
      } catch {
        // Best-effort — pixel status still returned
      }
    }

    return Response.json(
      { pixels, hasActivePixel, conversionEvents },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch {
    return Response.json({ error: 'Failed to fetch pixel data' }, { status: 500 });
  }
};
