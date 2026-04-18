/**
 * Parse and validate since/until date range query params.
 * Returns time_range for Facebook API or null (use date_preset fallback).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 90;

interface DateRangeResult {
  timeRange: { since: string; until: string } | null;
  datePreset: string | null;
  error: string | null;
}

export function parseDateParams(url: URL, defaultPreset = 'last_7d'): DateRangeResult {
  const since = url.searchParams.get('since');
  const until = url.searchParams.get('until');
  const datePreset = url.searchParams.get('date_preset');

  // Custom range: both since and until provided
  if (since && until) {
    if (!DATE_RE.test(since) || !DATE_RE.test(until)) {
      return { timeRange: null, datePreset: null, error: 'since and until must be YYYY-MM-DD format' };
    }

    const sinceDate = new Date(since + 'T00:00:00');
    const untilDate = new Date(until + 'T00:00:00');

    if (isNaN(sinceDate.getTime()) || isNaN(untilDate.getTime())) {
      return { timeRange: null, datePreset: null, error: 'Invalid date value' };
    }

    if (sinceDate > untilDate) {
      return { timeRange: null, datePreset: null, error: 'since must be <= until' };
    }

    const diffDays = Math.ceil((untilDate.getTime() - sinceDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > MAX_RANGE_DAYS) {
      return { timeRange: null, datePreset: null, error: `Date range must be <= ${MAX_RANGE_DAYS} days` };
    }

    return { timeRange: { since, until }, datePreset: null, error: null };
  }

  // Only one of since/until → error
  if ((since && !until) || (!since && until)) {
    return { timeRange: null, datePreset: null, error: 'Both since and until are required for custom range' };
  }

  // Preset or default
  return { timeRange: null, datePreset: datePreset || defaultPreset, error: null };
}

/**
 * Apply date params to a Facebook Graph API URL.
 * Sets either time_range (custom) or date_preset (preset).
 */
export function applyDateParams(fbUrl: URL, result: DateRangeResult): void {
  if (result.timeRange) {
    fbUrl.searchParams.set('time_range', JSON.stringify(result.timeRange));
  } else if (result.datePreset) {
    fbUrl.searchParams.set('date_preset', result.datePreset);
  }

  // Match Ads Manager default attribution: 7d click + 1d view
  // Without this, FB API uses its own default which may differ from Ads Manager UI
  fbUrl.searchParams.set('action_attribution_windows', JSON.stringify(['7d_click', '1d_view']));
}
