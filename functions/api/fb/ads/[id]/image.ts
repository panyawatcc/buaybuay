import { getFbToken } from '../../../../_lib/fb-token';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
  PUBLIC_ORIGIN?: string;
}

// Inline placeholder returned when the ad's creative is archived/deleted
// or FB denies access. Returning 200 + image prevents the FE from retrying
// (previously 403 triggered 7x React Query retries per <img> tag).
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="315" viewBox="0 0 600 315" role="img" aria-label="Image unavailable"><rect width="600" height="315" fill="#f3f4f6"/><g fill="#9ca3af"><rect x="250" y="125" width="100" height="65" rx="8" fill="none" stroke="#9ca3af" stroke-width="2"/><circle cx="278" cy="150" r="6"/><path d="M263 180 l20-18 18 14 14-22 22 26 z"/><text x="300" y="230" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="14">โฆษณานี้ไม่พร้อมใช้งาน</text></g></svg>`;

// Self-host CORS: customers deploy to their own domain. If PUBLIC_ORIGIN
// env var is set we echo it for same-origin; otherwise '*' (safe for
// images since they don't carry credentials).
function corsOrigin(env: { PUBLIC_ORIGIN?: string }): string {
  return env.PUBLIC_ORIGIN ?? '*';
}

function placeholderResponse(reason: string, env: { PUBLIC_ORIGIN?: string }): Response {
  return new Response(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'X-Ad-Image-Status': reason,
      'Access-Control-Allow-Origin': corsOrigin(env),
    },
  });
}

/**
 * GET /api/fb/ads/:id/image
 * Proxy: fetches ad creative image from FB CDN using server token.
 * FB CDN blocks direct browser access to full-size images.
 *
 * On any failure (FB 403 on archived/deleted ad, no creative, image fetch
 * fails) returns 200 with inline SVG placeholder + X-Ad-Image-Status
 * header naming the reason. Never 403/404/500 — that caused FE retry loops.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await getFbToken(context.request, context.env);

  if (auth.type === 'error') return auth.response;

  const adId = (context.params as any).id;

  try {
    // Step 1: Get effective_object_story_id + creative from the ad
    const adRes = await fetch(`https://graph.facebook.com/v25.0/${adId}?fields=creative{id,effective_object_story_id,image_url,thumbnail_url,object_story_spec{link_data{image_hash},video_data{image_url}}}&access_token=${auth.token}`);
    const adData = (await adRes.json()) as any;
    if (!adRes.ok) {
      const fbCode = adData?.error?.code;
      const fbSubcode = adData?.error?.error_subcode;
      console.log(`[ad-image] ad=${adId} fb_error status=${adRes.status} code=${fbCode} subcode=${fbSubcode}`);
      const reason = fbCode === 100 ? 'archived_or_deleted' : `fb_error_${adRes.status}`;
      return placeholderResponse(reason, context.env);
    }

    const c = adData.creative;
    const creativeId = c?.id;
    const effectiveStoryId = c?.effective_object_story_id;
    let imageRes: Response | null = null;

    // Step 2.5: Try to get page token for better post image access
    let bestToken = auth.token;
    if (effectiveStoryId) {
      try {
        const pageId = effectiveStoryId.split('_')[0];
        const pagesRes = await fetch(`https://graph.facebook.com/v25.0/me/accounts?fields=access_token&access_token=${auth.token}`);
        if (pagesRes.ok) {
          const pagesData = (await pagesRes.json()) as { data?: { id: string; access_token: string }[] };
          const page = pagesData.data?.find(p => p.id === pageId);
          if (page?.access_token) bestToken = page.access_token;
        }
      } catch {}
    }

    // Step 3: Fetch post image via story_id (with page token if available)
    if (effectiveStoryId) {
      try {
        const postRes = await fetch(`https://graph.facebook.com/v25.0/${effectiveStoryId}?fields=full_picture,attachments{media{image{src,height,width}},subattachments{media{image{src}}}}&access_token=${bestToken}`);
        if (postRes.ok) {
          const postData = (await postRes.json()) as any;
          // Priority: attachments image (real content) > full_picture
          const attachImg = postData.attachments?.data?.[0]?.media?.image?.src;
          const subAttachImg = postData.attachments?.data?.[0]?.subattachments?.data?.[0]?.media?.image?.src;
          const fullPic = postData.full_picture;
          const imgUrl = attachImg || subAttachImg || fullPic;
          if (imgUrl) {
            imageRes = await fetch(imgUrl);
            // Verify it's not a tiny avatar (must be > 5KB)
            if (imageRes.ok && parseInt(imageRes.headers.get('Content-Length') || '99999') < 5000) {
              imageRes = null;
            }
          }
        }
      } catch {}
    }

    // Step 4: Try image_hash → adimages API
    if (!imageRes?.ok) {
      const imgHash = c?.object_story_spec?.link_data?.image_hash;
      if (imgHash) {
        try {
          const acctRes = await fetch(`https://graph.facebook.com/v25.0/${adId}?fields=account_id&access_token=${auth.token}`);
          if (acctRes.ok) {
            const acctData = (await acctRes.json()) as any;
            const accountId = acctData.account_id ? `act_${acctData.account_id}` : null;
            if (accountId) {
              const hashRes = await fetch(`https://graph.facebook.com/v25.0/${accountId}/adimages?hashes=["${imgHash}"]&fields=url_128,url&access_token=${auth.token}`);
              if (hashRes.ok) {
                const hashData = (await hashRes.json()) as { data?: { url?: string; url_128?: string }[] };
                const imgUrl = hashData.data?.[0]?.url || hashData.data?.[0]?.url_128;
                if (imgUrl) imageRes = await fetch(imgUrl);
              }
            }
          }
        } catch {}
      }
    }

    // Step 5: Try adcreatives with image_url field (higher quality)
    if (!imageRes?.ok && creativeId) {
      try {
        const crImgRes = await fetch(`https://graph.facebook.com/v25.0/${creativeId}?fields=image_url,object_story_spec{link_data{picture,call_to_action{value{link}}},photo_data{url},video_data{image_url}}&access_token=${auth.token}`);
        if (crImgRes.ok) {
          const crImg = (await crImgRes.json()) as any;
          const candidates = [
            crImg.object_story_spec?.photo_data?.url,
            crImg.object_story_spec?.video_data?.image_url,
            crImg.object_story_spec?.link_data?.picture,
            crImg.image_url,
          ].filter(Boolean);
          for (const url of candidates) {
            try {
              const r = await fetch(url);
              if (r.ok && parseInt(r.headers.get('Content-Length') || '0') > 5000) {
                imageRes = r;
                break;
              }
            } catch {}
          }
        }
      } catch {}
    }

    // Step 6: Fetch preview iframe page → extract real image from rendered HTML
    if (!imageRes?.ok && creativeId) {
      try {
        const prevRes = await fetch(`https://graph.facebook.com/v25.0/${creativeId}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${auth.token}`);
        if (prevRes.ok) {
          const prevData = (await prevRes.json()) as { data?: { body?: string }[] };
          const body = prevData.data?.[0]?.body || '';
          // Extract iframe src
          const iframeMatch = body.match(/src="(https:\/\/[^"]+)"/);
          if (iframeMatch?.[1]) {
            const iframeUrl = iframeMatch[1].replace(/&amp;/g, '&');
            // Fetch the iframe page
            const iframeRes = await fetch(iframeUrl);
            if (iframeRes.ok) {
              const iframeHtml = await iframeRes.text();
              // Find large scontent image URLs in the rendered page
              const imgMatches = [...iframeHtml.matchAll(/(?:src|url)\s*[=:(]\s*["']?(https:\/\/scontent[^"'\s)]+)/g)];
              for (const m of imgMatches) {
                const decoded = m[1].replace(/&amp;/g, '&');
                if (decoded.includes('p64x64') || decoded.includes('dst-emg0') || decoded.includes('_nc_sid=58080a')) continue;
                try {
                  const r = await fetch(decoded);
                  if (r.ok && parseInt(r.headers.get('Content-Length') || '0') > 5000) {
                    imageRes = r;
                    break;
                  }
                } catch {}
              }
            }
          }
        }
      } catch {}
    }

    if (!imageRes?.ok) {
      console.log(`[ad-image] ad=${adId} no_fetched_image — all fallbacks exhausted`);
      return placeholderResponse('no_image_accessible', context.env);
    }

    return new Response(imageRes.body, {
      headers: {
        'Content-Type': imageRes.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
        'Access-Control-Allow-Origin': corsOrigin(context.env),
      },
    });
  } catch (err) {
    console.log(`[ad-image] ad=${adId} exception ${err instanceof Error ? err.message : String(err)}`);
    return placeholderResponse('server_error', context.env);
  }
};
