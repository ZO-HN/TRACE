// Resolve a private R2 object key to a short-lived viewable URL via the
// r2-get-url edge function (registry/attachment/relationship and readiness enforced server-side).

import { supabase } from '../supabase';

export interface SignedGet {
  url: string;
  expiresIn: number;
  contentType?: string;
}

export async function getMediaUrl(key: string): Promise<SignedGet> {
  const { data, error } = await supabase.functions.invoke<SignedGet>(
    'r2-get-url',
    { body: { key } },
  );
  if (error) throw error;
  if (!data) throw new Error('No URL returned');
  return data;
}
