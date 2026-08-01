// Supabase Edge Function: r2-get-url
//
// Issues a short-lived presigned GET URL so authorized users can view private
// R2 media (form-check clips, etc.). Authorization delegates to set_logs RLS:
// the caller may read a key only if a set_logs row referencing it is visible
// to them (owner or their coach). See docs/adr/0001-media-storage.md.
//
// Deploy:  supabase functions deploy r2-get-url
// Secrets: shares the R2_* secrets already set for r2-presign.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) return json(401, { error: 'Missing authorization' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await asUser.auth.getUser();
  if (authError || !user) return json(401, { error: 'Invalid token' });

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const key = body.key;
  if (!key || typeof key !== 'string') return json(400, { error: 'Missing key' });

  // Authorization: the caller must be able to SELECT a set_logs row that
  // references this key. RLS (owner or coach-of-owner) does the enforcement.
  const { data: row } = await asUser
    .from('set_logs')
    .select('id')
    .eq('form_video_s3_key', key)
    .maybeSingle();
  if (!row) return json(403, { error: 'Not authorized for this object' });

  const accountId = Deno.env.get('R2_ACCOUNT_ID')!;
  const bucket = Deno.env.get('R2_BUCKET')!;
  const aws = new AwsClient({
    accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
    service: 's3',
    region: 'auto',
  });

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
  const signed = await aws.sign(`${endpoint}?X-Amz-Expires=600`, {
    method: 'GET',
    aws: { signQuery: true },
  });

  return json(200, { url: signed.url, expiresIn: 600 });
});
