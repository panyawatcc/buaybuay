import { fbFetch, FbApiError } from '../../../_lib/fb-fetch';

/**
 * Fetch all pages from Facebook Graph API (follow paging.next).
 * Max 5 pages to prevent runaway loops.
 *
 * Uses fbFetch internally for retry + rate-limit classification. On
 * first-page failure throws FbApiError so callers can catch and emit
 * fbErrorResponse (Thai-friendly 429 / retry-after). Later-page failures
 * degrade gracefully — return what was collected so far.
 */
export async function fetchAllPages(initialUrl: string, maxPages = 5): Promise<any[]> {
  const allData: any[] = [];
  let url: string | null = initialUrl;
  let page = 0;

  while (url && page < maxPages) {
    const res = await fbFetch<{ data?: any[]; paging?: { next?: string } }>(url, { retries: 2 });

    if (!res.ok) {
      if (page === 0) throw new FbApiError(res);
      break; // Return what we have if later pages fail
    }

    const body = res.data ?? {};
    if (body.data) {
      allData.push(...body.data);
    }

    url = body.paging?.next || null;
    page++;
  }

  return allData;
}
