// clone-campaign.ts — manual full-reconstruction clone of a Facebook campaign.
//
// Why not /copies? See incident 2026-04-18:
//   - POST /{campaignId}/copies (sync OR async) fails with subcode 1885194
//     when the total (campaign + adset + ad) count is >= 3 and sync copy
//     is requested. async=true in body or query param does not bypass —
//     requires Graph Async Batch (different API) which is complex to pipe.
//   - POST /{adId}/copies fails with subcode 3858504 on any ad whose
//     creative carries deprecated "Standard Enhancements" flags.
// Probe evidence: /api/dev/clone-probe paths a-g (commit bef1ecc).
//
// This helper sidesteps both by reconstructing each entity via create
// APIs (POST /act_X/campaigns, /act_X/adsets, /act_X/ads) with explicit
// field mapping. Ads reference the source ad's creative_id (Path G) so
// FB doesn't re-validate the deprecated flags.
//
// Used by:
//   - evaluate.ts clone_campaign action (production cron path)
//   - /api/dev/clone-campaign-probe (dev / TESTER verification)
//
// Error semantics: returns a discriminated union so callers can audit
// per-step outcomes. Does NOT throw — every FB failure is captured.

import { fbFetch, type FbFetchResult } from './fb-fetch';

export interface CloneCampaignResult {
  ok: boolean;
  source_campaign_id: string;
  new_campaign_id?: string;
  new_campaign_name?: string;
  adset_results: {
    source_adset_id: string;
    new_adset_id?: string;
    ad_results: {
      source_ad_id: string;
      new_ad_id?: string;
      creative_id?: string;
      error?: string;
      fb_code?: number;
    }[];
    error?: string;
    fb_code?: number;
  }[];
  error?: string;
  fb_code?: number;
  stage?: 'fetch_source' | 'create_campaign' | 'list_adsets' | 'fetch_adset' | 'create_adset' | 'list_ads' | 'fetch_ad' | 'create_ad' | 'complete';
}

// Fields pulled from the source campaign (union of required for /campaigns POST
// + useful preservation fields). Kept minimal to avoid FB rejecting unknown
// fields per v25 changes (e.g. campaign_budget_optimization was removed).
const CAMPAIGN_FIELDS = [
  'name', 'objective', 'status', 'special_ad_categories', 'buying_type',
  'daily_budget', 'lifetime_budget', 'spend_cap', 'bid_strategy',
  'start_time', 'stop_time',
].join(',');

// Fields pulled from source adsets.
const ADSET_FIELDS = [
  'name', 'targeting', 'optimization_goal', 'billing_event', 'bid_amount',
  'bid_strategy', 'daily_budget', 'lifetime_budget', 'start_time', 'end_time',
  'status', 'promoted_object', 'attribution_spec', 'destination_type',
  'pacing_type', 'is_dynamic_creative',
].join(',');

// Fields pulled from source ads (minimal — we only need adset_id + creative{id} for the reconstruct path).
const AD_FIELDS = 'id,name,adset_id,creative{id},effective_status';

export interface CloneCampaignOptions {
  suffix?: string;                    // appended to entity names (default: `(auto-clone YYYY-MM-DD)`)
  clone_status?: 'PAUSED' | 'ACTIVE'; // status applied to new campaign + all new adsets + all new ads (default 'PAUSED')
}

export async function cloneCampaignViaReconstruction(
  sourceCampaignId: string,
  adAccountRef: string, // 'act_<id>' form
  fbToken: string,
  options: CloneCampaignOptions = {},
): Promise<CloneCampaignResult> {
  const suffix = options.suffix ?? `(auto-clone ${new Date().toISOString().slice(0, 10)})`;
  const cloneStatus: 'PAUSED' | 'ACTIVE' = options.clone_status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
  const result: CloneCampaignResult = {
    ok: false,
    source_campaign_id: sourceCampaignId,
    adset_results: [],
  };

  const token = encodeURIComponent(fbToken);

  // 1) Fetch source campaign.
  const campRes = await fbFetch<any>(
    `https://graph.facebook.com/v25.0/${sourceCampaignId}?fields=${CAMPAIGN_FIELDS}&access_token=${token}`,
    { retries: 2 },
  );
  if (!campRes.ok || !campRes.data) {
    result.stage = 'fetch_source';
    result.error = `${campRes.userMessage || 'source campaign fetch failed'} | fb_msg=${campRes.error?.message ?? '-'}`;
    result.fb_code = campRes.error?.code;
    return result;
  }
  const src = campRes.data;

  // 2) Create new campaign. FB /campaigns POST requires status + objective + name + special_ad_categories.
  const newCampName = `${src.name || 'Campaign'} ${suffix}`;
  const newCampBody: Record<string, any> = {
    name: newCampName,
    objective: src.objective,
    status: cloneStatus,                               // caller controls via options.clone_status (default PAUSED)
    special_ad_categories: src.special_ad_categories ?? [],
  };
  if (src.buying_type) newCampBody.buying_type = src.buying_type;
  if (src.daily_budget) newCampBody.daily_budget = src.daily_budget;
  if (src.lifetime_budget) newCampBody.lifetime_budget = src.lifetime_budget;
  if (src.spend_cap) newCampBody.spend_cap = src.spend_cap;
  if (src.bid_strategy) newCampBody.bid_strategy = src.bid_strategy;

  const newCampRes = await fbFetch<{ id?: string }>(
    `https://graph.facebook.com/v25.0/${adAccountRef}/campaigns?access_token=${token}`,
    { retries: 2, init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCampBody) } },
  );
  if (!newCampRes.ok || !newCampRes.data?.id) {
    result.stage = 'create_campaign';
    result.error = newCampRes.userMessage || `create_campaign failed: ${newCampRes.error?.message}`;
    result.fb_code = newCampRes.error?.code;
    return result;
  }
  const newCampId = newCampRes.data.id;
  result.new_campaign_id = newCampId;
  result.new_campaign_name = newCampName;

  // 3) List source adsets.
  const adsetsRes = await fbFetch<{ data?: { id: string; name?: string }[] }>(
    `https://graph.facebook.com/v25.0/${sourceCampaignId}/adsets?fields=id,name&limit=100&access_token=${token}`,
    { retries: 2 },
  );
  if (!adsetsRes.ok) {
    result.stage = 'list_adsets';
    result.error = adsetsRes.userMessage || 'list_adsets failed';
    result.fb_code = adsetsRes.error?.code;
    return result;
  }
  const sourceAdsets = adsetsRes.data?.data ?? [];

  // 4) For each source adset → fetch details, create new adset under new campaign,
  //    then iterate its ads and reconstruct them via Path G.
  for (const sAdset of sourceAdsets) {
    const adsetEntry: CloneCampaignResult['adset_results'][number] = {
      source_adset_id: sAdset.id,
      ad_results: [],
    };

    // 4a) Fetch adset details.
    const aDetailRes = await fbFetch<any>(
      `https://graph.facebook.com/v25.0/${sAdset.id}?fields=${ADSET_FIELDS}&access_token=${token}`,
      { retries: 2 },
    );
    if (!aDetailRes.ok || !aDetailRes.data) {
      adsetEntry.error = aDetailRes.userMessage || 'adset fetch failed';
      adsetEntry.fb_code = aDetailRes.error?.code;
      result.adset_results.push(adsetEntry);
      continue;
    }
    const srcAdset = aDetailRes.data;

    // 4b) POST new adset under new campaign.
    const newAdsetBody: Record<string, any> = {
      name: `${srcAdset.name || 'AdSet'} ${suffix}`,
      campaign_id: newCampId,
      status: cloneStatus,
    };
    // Pass through only fields that are set on the source — FB rejects unknown/null keys in some cases.
    if (srcAdset.targeting) newAdsetBody.targeting = srcAdset.targeting;
    if (srcAdset.optimization_goal) newAdsetBody.optimization_goal = srcAdset.optimization_goal;
    if (srcAdset.billing_event) newAdsetBody.billing_event = srcAdset.billing_event;
    if (srcAdset.bid_amount) newAdsetBody.bid_amount = srcAdset.bid_amount;
    if (srcAdset.bid_strategy) newAdsetBody.bid_strategy = srcAdset.bid_strategy;
    if (srcAdset.daily_budget) newAdsetBody.daily_budget = srcAdset.daily_budget;
    if (srcAdset.lifetime_budget) newAdsetBody.lifetime_budget = srcAdset.lifetime_budget;
    if (srcAdset.start_time) newAdsetBody.start_time = srcAdset.start_time;
    if (srcAdset.end_time) newAdsetBody.end_time = srcAdset.end_time;
    if (srcAdset.promoted_object) newAdsetBody.promoted_object = srcAdset.promoted_object;
    if (srcAdset.attribution_spec) newAdsetBody.attribution_spec = srcAdset.attribution_spec;
    if (srcAdset.destination_type) newAdsetBody.destination_type = srcAdset.destination_type;
    if (srcAdset.pacing_type) newAdsetBody.pacing_type = srcAdset.pacing_type;
    if (srcAdset.is_dynamic_creative != null) newAdsetBody.is_dynamic_creative = srcAdset.is_dynamic_creative;

    const newAdsetRes = await fbFetch<{ id?: string }>(
      `https://graph.facebook.com/v25.0/${adAccountRef}/adsets?access_token=${token}`,
      { retries: 2, init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAdsetBody) } },
    );
    if (!newAdsetRes.ok || !newAdsetRes.data?.id) {
      adsetEntry.error = newAdsetRes.userMessage || `create_adset failed: ${newAdsetRes.error?.message}`;
      adsetEntry.fb_code = newAdsetRes.error?.code;
      result.adset_results.push(adsetEntry);
      continue;
    }
    const newAdsetId = newAdsetRes.data.id;
    adsetEntry.new_adset_id = newAdsetId;

    // 4c) List source ads under this adset.
    const adsRes = await fbFetch<{ data?: any[] }>(
      `https://graph.facebook.com/v25.0/${sAdset.id}/ads?fields=${AD_FIELDS}&limit=200&access_token=${token}`,
      { retries: 2 },
    );
    if (!adsRes.ok) {
      adsetEntry.error = `list_ads_failed: ${adsRes.userMessage}`;
      adsetEntry.fb_code = adsRes.error?.code;
      result.adset_results.push(adsetEntry);
      continue;
    }
    const sourceAds = adsRes.data?.data ?? [];

    // 4d) For each source ad → create new ad via Path G.
    for (const sAd of sourceAds) {
      const adEntry: CloneCampaignResult['adset_results'][number]['ad_results'][number] = {
        source_ad_id: sAd.id,
        creative_id: sAd.creative?.id,
      };
      if (!sAd.creative?.id) {
        adEntry.error = 'source_ad_missing_creative_id';
        adsetEntry.ad_results.push(adEntry);
        continue;
      }
      const newAdBody = {
        name: `${sAd.name || 'Ad'} ${suffix}`,
        adset_id: newAdsetId,
        creative: { creative_id: sAd.creative.id },
        status: cloneStatus,
      };
      const newAdRes = await fbFetch<{ id?: string }>(
        `https://graph.facebook.com/v25.0/${adAccountRef}/ads?access_token=${token}`,
        { retries: 2, init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAdBody) } },
      );
      if (newAdRes.ok && newAdRes.data?.id) {
        adEntry.new_ad_id = newAdRes.data.id;
      } else {
        adEntry.error = newAdRes.userMessage || `create_ad failed: ${newAdRes.error?.message}`;
        adEntry.fb_code = newAdRes.error?.code;
      }
      adsetEntry.ad_results.push(adEntry);
    }
    result.adset_results.push(adsetEntry);
  }

  result.ok = true;
  result.stage = 'complete';
  return result;
}
