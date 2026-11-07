// Renders a private R2 object (by key) as video or image via a signed GET URL.

import {useState} from 'react';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { renderKindFromKey } from '../../lib/storage/mediaKind';

export default function MediaViewer({ objectKey }: { objectKey: string }) {
  const { url, error, loading,contentType,retry } = useMediaUrl(objectKey);
  const [failedUrl,setFailedUrl]=useState<string|null>(null);
  const reload=()=>{setFailedUrl(null);retry();};
  const kind = contentType?.startsWith('image/')?'image':contentType?.startsWith('video/')?'video':renderKindFromKey(objectKey);

  if (loading) {
    return <div className="h-40 rounded-lg bg-background border border-border animate-pulse" />;
  }
  if (error || !url || failedUrl===url) {
    return (
      <div><p role="alert" className="text-xs text-red-400">{error ?? 'Media could not be displayed. Reload or choose another file.'}</p><button onClick={reload}>Reload media</button></div>
    );
  }

  if (kind === 'video') {
    return (
      <video src={url} onError={()=>setFailedUrl(url)} controls playsInline className="w-full rounded-lg border border-border" />
    );
  }
  if (kind === 'image') {
    return <img src={url} onError={()=>setFailedUrl(url)} alt="attached media" className="w-full rounded-lg border border-border" />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
      Open attachment
    </a>
  );
}
