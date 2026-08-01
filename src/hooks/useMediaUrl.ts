// Resolve an R2 object key to a viewable signed URL, on demand.

import { useEffect, useState } from 'react';
import { getMediaUrl } from '../lib/storage/getUrl';

export interface UseMediaUrl {
  url: string | null;
  error: string | null;
  loading: boolean;
}

export function useMediaUrl(key: string | null): UseMediaUrl {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!key) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMediaUrl(key)
      .then((r) => {
        if (!cancelled) setUrl(r.url);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load media');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { url, error, loading };
}
