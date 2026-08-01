// Resolve a private R2 object key to a short-lived viewable URL via the
// r2-get-url edge function (authorization enforced server-side by set_logs RLS).

import { supabase } from '../supabase';

export interface SignedGet {
  url: string;
  expiresIn: number;
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
