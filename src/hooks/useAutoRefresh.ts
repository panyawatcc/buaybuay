import { useState, useEffect, useCallback, useRef } from 'react';

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useAutoRefresh(refetchFns: (() => void)[]) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const fnsRef = useRef(refetchFns);
  fnsRef.current = refetchFns;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    fnsRef.current.forEach((fn) => fn());
    setLastUpdated(new Date());
    // Brief indicator
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    const id = setInterval(() => {
      fnsRef.current.forEach((fn) => fn());
      setLastUpdated(new Date());
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const timeString = lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  return { lastUpdated: timeString, refreshing, refresh };
}
