export interface DisplaySettings {
  currency: 'USD' | 'THB';
  exchangeRate: number;
  showOriginal: boolean;
}

const STORAGE_KEY = 'adbot_display_settings';

export const DEFAULT_DISPLAY: DisplaySettings = {
  currency: 'USD',
  exchangeRate: 35.0,
  showOriginal: true,
};

export function loadDisplaySettings(): DisplaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_DISPLAY, ...JSON.parse(raw) } : DEFAULT_DISPLAY;
  } catch {
    return DEFAULT_DISPLAY;
  }
}

export function saveDisplaySettings(settings: DisplaySettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function formatCurrency(usdValue: number, settings: DisplaySettings): string {
  const safe = Number.isFinite(usdValue) ? usdValue : 0;
  if (settings.currency === 'THB') {
    return `฿${Math.round(safe * settings.exchangeRate).toLocaleString()}`;
  }
  return `$${safe.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
