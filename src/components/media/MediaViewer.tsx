// Renders a private R2 object (by key) as video or image via a signed GET URL.

import { useMediaUrl } from '../../hooks/useMediaUrl';
import { renderKindFromKey } from '../../lib/storage/mediaKind';

export default function MediaViewer({ objectKey }: { objectKey: string }) {
  const { url, error, loading } = useMediaUrl(objectKey);
  const kind = renderKindFromKey(objectKey);

  if (loading) {
    return <div className="h-40 rounded-lg bg-background border border-border animate-pulse" />;
  }
  if (error || !url) {
    return (
      <p className="text-xs text-red-400">{error ?? 'Media unavailable'}</p>
    );
  }

  if (kind === 'video') {
    return (
      <video src={url} controls playsInline className="w-full rounded-lg border border-border" />
    );
  }
  if (kind === 'image') {
    return <img src={url} alt="attached media" className="w-full rounded-lg border border-border" />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
      Open attachment
    </a>
  );
}
