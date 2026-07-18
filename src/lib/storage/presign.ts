// Concrete wiring of the upload path to the real backend:
//  - presign via the `r2-presign` Supabase Edge Function (JWT auto-attached)
//  - PUT the file straight to R2 at the returned presigned URL

import { supabase } from '../supabase';
import type { PresignRequest, PresignResponse } from './types';

export async function presignViaEdge(
  req: PresignRequest,
): Promise<PresignResponse> {
  const { data, error } = await supabase.functions.invoke<PresignResponse>(
    'r2-presign',
    { body: req },
  );
  if (error) throw error;
  if (!data) throw new Error('Presign function returned no data');
  return data;
}

export async function putToR2(
  url: string,
  body: Blob,
  contentType: string,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(url, {
    method: 'PUT',
    body,
    headers: { 'Content-Type': contentType },
  });
  return { ok: res.ok, status: res.status };
}
