import { createContext, useContext, useState, type ReactNode } from 'react';

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7d'
  | 'last_14d'
  | 'last_28d'
  | 'last_30d'
  | 'this_week_sun_today'
  | 'last_week_sun_sat'
  | 'this_month'
  | 'last_month'
  | 'maximum';

export interface DateRange {
  preset: DatePreset | null; // null = custom range
  since: string | null; // "2026-04-01"
  until: string | null; // "2026-04-14"
}

export const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'วันนี้',
  yesterday: 'เมื่อวานนี้',
  last_7d: '7 วันที่ผ่านมา',
  last_14d: '14 วันที่ผ่านมา',
  last_28d: '28 วันที่ผ่านมา',
  last_30d: '30 วันที่ผ่านมา',
  this_week_sun_today: 'สัปดาห์นี้',
  last_week_sun_sat: 'สัปดาห์ที่แล้ว',
  this_month: 'เดือนนี้',
  last_month: 'เดือนที่แล้ว',
  maximum: 'มากที่สุด',
};

interface DateRangeContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

const STORAGE_KEY = 'adbot_date_range';

const DEFAULT_RANGE: DateRange = { preset: 'last_7d', since: null, until: null };

function loadFromStorage(): DateRange {
  if (typeof window === 'undefined') return DEFAULT_RANGE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RANGE;
    const parsed = JSON.parse(raw) as DateRange;
    if (parsed.preset || (parsed.since && parsed.until)) return parsed;
    return DEFAULT_RANGE;
  } catch {
    return DEFAULT_RANGE;
  }
}

const DateRangeContext = createContext<DateRangeContextType>({
  dateRange: DEFAULT_RANGE,
  setDateRange: () => {},
});

export const useDateRange = () => useContext(DateRangeContext);

/** Returns API query params from the current date range. */
export function dateRangeToParams(range: DateRange): { datePreset?: string; since?: string; until?: string } {
  if (range.preset) return { datePreset: range.preset };
  if (range.since && range.until) return { since: range.since, until: range.until };
  return { datePreset: 'last_7d' };
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRangeState] = useState<DateRange>(loadFromStorage);

  const setDateRange = (range: DateRange) => {
    setDateRangeState(range);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(range));
    }
  };

  return (
    <DateRangeContext.Provider value={{ dateRange, setDateRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}
