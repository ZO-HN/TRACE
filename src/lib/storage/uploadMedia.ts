// Orchestrates a direct-to-R2 upload: validate -> presign -> PUT -> return key.
// Dependency-injected (presign + put) so it is unit-testable without network.

import type { MediaKind, PresignRequest, PresignResponse, UploadResult } from './types';
import { validateUpload } from './policy';

export interface UploadDeps {
  presign: (req: PresignRequest) => Promise<PresignResponse>;
  put: (
    url: string,
    body: Blob,
    contentType: string,
  ) => Promise<{ ok: boolean; status: number }>;
}

export async function uploadMedia(
  file: File,
  kind: MediaKind,
  deps: UploadDeps,
): Promise<UploadResult> {
  const check = validateUpload({
    kind,
    contentType: file.type,
    sizeBytes: file.size,
  });
  if (!check.ok) throw new Error(check.reason);

  const { uploadUrl, key } = await deps.presign({
    kind,
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  });

  const res = await deps.put(uploadUrl, file, file.type);
  if (!res.ok) {
    throw new Error(`R2 upload failed (HTTP ${res.status})`);
  }

  return { key, contentType: file.type, sizeBytes: file.size };
}
