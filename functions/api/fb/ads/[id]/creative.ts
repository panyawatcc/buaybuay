import { getFbToken } from '../../../../_lib/fb-token';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

/**
 * GET /api/fb/ads/:id/creative
 * 2-step fetch: safe fields first, then story ID separately.
 * Not all ads have effective_object_story_id — requesting it causes 400.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await getFbToken(context.request, context.env);

  if (auth.type === 'error') return auth.response;

  const adId = (context.params as any).id;

  try {
    // Step 1: Safe fields only (no effective_object_story_id — causes 400 on some ads)
    const url = new URL(`https://graph.facebook.com/v25.0/${adId}`);
    url.searchParams.set('access_token', auth.token);
    url.searchParams.set('fields', 'id,name,status,creative{id,name,title,body,image_url,thumbnail_url,call_to_action_type,object_story_id,object_story_spec{link_data{picture,full_picture,message,link},video_data{image_url,video_id,title,message}}}');

    const res = await fetch(url.toString());
    const data = (await res.json()) as any;

    if (!res.ok) {
      return Response.json(data, { status: res.status });
    }

    const c = data.creative;
    const storySpec = c?.object_story_spec;

    // Strip FB resize suffix (stp=...p64x64...) to get full-size image
    const stripResize = (url: string | null | undefined): string | null => {
      if (!url) return null;
      try {
        const u = new URL(url);
        u.searchParams.delete('stp'); // removes resize/crop params
        return u.toString();
      } catch {
        return url;
      }
    };

    // Image fallback chain: full-size first, strip resize on all
    const rawImageUrl =
      storySpec?.link_data?.full_picture
      || c?.image_url
      || storySpec?.link_data?.picture
      || storySpec?.video_data?.image_url
      || c?.thumbnail_url
      || null;
    const imageUrl = stripResize(rawImageUrl);

    // Step 2: Try to get post permalink from object_story_id (format: pageId_postId)
    // object_story_id is a creative-level field (safer than ad-level effective_object_story_id)
    const storyId = c?.object_story_id;
    let postUrl: string | null = null;

    if (storyId && storyId.includes('_')) {
      const parts = storyId.split('_');
      postUrl = `https://www.facebook.com/${parts[0]}/posts/${parts[1]}`;
    }

    // Step 2b: If no object_story_id, try effective_object_story_id separately (best-effort)
    if (!postUrl) {
      try {
        const storyUrl = new URL(`https://graph.facebook.com/v25.0/${adId}`);
        storyUrl.searchParams.set('access_token', auth.token);
        storyUrl.searchParams.set('fields', 'effective_object_story_id');
        const storyRes = await fetch(storyUrl.toString());

        if (storyRes.ok) {
          const storyData = (await storyRes.json()) as any;
          const eid = storyData.effective_object_story_id;

          if (eid && eid.includes('_')) {
            const parts = eid.split('_');
            postUrl = `https://www.facebook.com/${parts[0]}/posts/${parts[1]}`;
          }
        }
      } catch {
        // Best-effort — ad may not have a story
      }
    }

    // Video thumbnail (best-effort)
    let videoThumbnailUrl: string | null = null;
    const videoId = storySpec?.video_data?.video_id;

    if (videoId) {
      try {
        const vidUrl = new URL(`https://graph.facebook.com/v25.0/${videoId}`);
        vidUrl.searchParams.set('access_token', auth.token);
        vidUrl.searchParams.set('fields', 'thumbnails{uri,width,height}');
        const vidRes = await fetch(vidUrl.toString());

        if (vidRes.ok) {
          const vidData = (await vidRes.json()) as any;
          const thumbs = vidData.thumbnails?.data || [];
          const largest = thumbs.sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0];
          videoThumbnailUrl = largest?.uri || null;
        }
      } catch {
        // Best-effort
      }
    }

    // Fetch ad preview (full render like Ads Manager)
    let previewHtml: string | null = null;

    try {
      const previewUrl = new URL(`https://graph.facebook.com/v25.0/${adId}/previews`);
      previewUrl.searchParams.set('access_token', auth.token);
      previewUrl.searchParams.set('ad_format', 'DESKTOP_FEED_STANDARD');
      const previewRes = await fetch(previewUrl.toString());

      if (previewRes.ok) {
        const previewData = (await previewRes.json()) as any;
        previewHtml = previewData.data?.[0]?.body || null;
      }
    } catch {
      // Best-effort
    }

    const origin = new URL(context.request.url).origin;
    const imageProxyUrl = `${origin}/api/fb/ads/${adId}/image`;

    return Response.json({
      adId: data.id,
      adName: data.name,
      status: data.status,
      postUrl,
      previewHtml,
      creative: c ? {
        id: c.id,
        name: c.name,
        title: c.title || storySpec?.link_data?.message || storySpec?.video_data?.title,
        body: c.body || storySpec?.link_data?.message || storySpec?.video_data?.message,
        imageUrl: imageProxyUrl,
        imageUrlDirect: imageUrl,
        thumbnailUrl: c.thumbnail_url,
        videoThumbnailUrl,
        videoId: videoId || null,
        callToAction: c.call_to_action_type,
        link: storySpec?.link_data?.link || null,
      } : null,
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch {
    return Response.json({ error: 'Failed to fetch creative' }, { status: 500 });
  }
};
