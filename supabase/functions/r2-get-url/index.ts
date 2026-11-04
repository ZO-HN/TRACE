// Supabase Edge Function: r2-get-url
//
// Issues a short-lived presigned GET URL so authorized users can view private
// R2 media. The caller-scoped can_view_media RPC requires a server-issued
// ownership record. Owners can preview their uploads; current coaches can view
// attached trainee form videos (per-set or standalone), including historical
// standalone submissions. Unregistered legacy keys receive no new viewing URL.
// See docs/architecture/decisions/0001-media-storage.md.
//
// Deploy:  supabase functions deploy r2-get-url
// Secrets: shares the R2_* secrets already set for r2-presign.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';
import { corsHeaders as CORS } from '../_shared/cors.ts';

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

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url?.trim() || !anonKey?.trim()) return json(500, { error: 'Could not process request' });
    const asUser = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const {
      data: { user },
      error: authError,
    } = await asUser.auth.getUser();
    if (authError || !user) return json(401, { error: 'Invalid token' });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json(400, { error: 'Expected a JSON object' });
    }
    const { key } = body as Record<string, unknown>;
    if (typeof key !== 'string' || !key.trim()) return json(400, { error: 'Missing key' });

    // The caller-scoped RPC checks server-issued ownership plus the current
    // attachment/coach relationship. A writable key reference alone grants nothing.
    const { data: allowed, error: lookupError } = await asUser.rpc('can_view_media', { p_key: key });
    if (lookupError) return json(500, { error: 'Could not process request' });
    if (allowed !== true) return json(403, { error: 'Not authorized for this object' });

    const accountId = Deno.env.get('R2_ACCOUNT_ID');
    const bucket = Deno.env.get('R2_BUCKET');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    if (!accountId?.trim() || !bucket?.trim() || !accessKeyId?.trim() || !secretAccessKey?.trim()) {
      return json(500, { error: 'Could not process request' });
    }
    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: 's3',
      region: 'auto',
    });

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
    const signed = await aws.sign(`${endpoint}?X-Amz-Expires=600`, {
      method: 'GET',
      aws: { signQuery: true },
    });

    return json(200, { url: signed.url, expiresIn: 600 });
  } catch {
    return json(500, { error: 'Could not process request' });
  }
});
