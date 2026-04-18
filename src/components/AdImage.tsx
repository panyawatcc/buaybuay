import { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

// Module-level cache: prevents refetching on every render/row remount.
// Once an ad image has succeeded or 403'd, we remember the outcome for
// the lifetime of the page so the Network tab doesn't fill with retries.
const CACHE = new Map<string, { url: string | null; failed: boolean }>();

interface Props {
  adId: string;
  className?: string;
  alt?: string;
}

export default function AdImage({ adId, className = '', alt = '' }: Props) {
  const cached = CACHE.get(adId);
  const [src, setSrc] = useState<string | null>(cached?.url ?? null);
  const [failed, setFailed] = useState<boolean>(cached?.failed ?? false);

  useEffect(() => {
    if (CACHE.has(adId)) return;

    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/fb/ads/${adId}/image`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          CACHE.set(adId, { url: null, failed: true });
          if (!cancelled) setFailed(true);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        CACHE.set(adId, { url, failed: false });
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (cancelled) return;
        CACHE.set(adId, { url: null, failed: true });
        setFailed(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [adId]);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-lighter text-text-muted ${className}`}
        aria-label={alt || 'ad image unavailable'}
      >
        <ImageIcon className="w-5 h-5" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
