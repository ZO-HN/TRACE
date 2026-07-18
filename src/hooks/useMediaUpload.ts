// React hook wrapping the R2 upload path with simple status state,
// for consumption by capture UIs (form-check video, meal photo, etc.).

import { useCallback, useState } from 'react';
import type { MediaKind, UploadResult } from '../lib/storage/types';
import { uploadMedia } from '../lib/storage/uploadMedia';
import { presignViaEdge, putToR2 } from '../lib/storage/presign';

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface UseMediaUpload {
  upload: (file: File, kind: MediaKind) => Promise<UploadResult>;
  status: UploadStatus;
  error: string | null;
  result: UploadResult | null;
  reset: () => void;
}

export function useMediaUpload(): UseMediaUpload {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const upload = useCallback(async (file: File, kind: MediaKind) => {
    setStatus('uploading');
    setError(null);
    try {
      const r = await uploadMedia(file, kind, {
        presign: presignViaEdge,
        put: putToR2,
      });
      setResult(r);
      setStatus('done');
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setStatus('error');
      throw e;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setResult(null);
  }, []);

  return { upload, status, error, result, reset };
}
