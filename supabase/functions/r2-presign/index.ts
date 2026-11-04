// Supabase Edge Function: r2-presign
//
// Issues a short-lived presigned PUT URL so the client can upload media
// straight to Cloudflare R2 (see docs/architecture/decisions/0001-media-storage.md). R2
// credentials live ONLY here as function secrets and never reach the browser.
//
// Deploy:  supabase functions deploy r2-presign
// Secrets: supabase secrets set R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... \
//                               R2_SECRET_ACCESS_KEY=... R2_BUCKET=...
//
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';
import { corsHeaders as CORS } from '../_shared/cors.ts';

const MB = 1024 * 1024;

// Mirror of src/lib/storage/policy.ts — keep in sync. Never trust the client.
const MEDIA_POLICY: Record<string, { contentTypes: string[]; maxBytes: number }> = {
  'form-video': {
    contentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxBytes: 50 * MB,
  },
  'meal-photo': {
    contentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    maxBytes: 10 * MB,
  },
  'coach-image': {
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 10 * MB,
  },
  file: {
    contentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 25 * MB,
  },
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function extFromName(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  // Authenticate the caller — the user id comes from the verified JWT, never
  // from the client body, so no one can write into another user's prefix.
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) return json(401, { error: 'Missing authorization' });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url?.trim() || !anonKey?.trim()) return json(500, { error: 'Could not process request' });
    const supabase = createClient(url, anonKey);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);
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
    const { kind, filename, contentType, sizeBytes } = body as Record<string, unknown>;
    const policy = typeof kind === 'string' && Object.prototype.hasOwnProperty.call(MEDIA_POLICY, kind)
      ? MEDIA_POLICY[kind] : undefined;
    if (!policy) return json(400, { error: 'Unknown media kind' });
    if (typeof contentType !== 'string' || !policy.contentTypes.includes(contentType)) {
      return json(400, { error: 'Disallowed content type' });
    }
    if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > policy.maxBytes) {
      return json(400, { error: 'File missing or exceeds size limit' });
    }

    if (filename !== undefined && typeof filename !== 'string') {
      return json(400, { error: 'filename must be a string when supplied' });
    }
    const key = `${kind}/${user.id}/${crypto.randomUUID()}${extFromName(filename ?? '')}`;

    const accountId = Deno.env.get('R2_ACCOUNT_ID');
    const bucket = Deno.env.get('R2_BUCKET');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!accountId?.trim() || !bucket?.trim() || !accessKeyId?.trim() || !secretAccessKey?.trim() || !serviceKey?.trim()) {
      return json(500, { error: 'Could not process request' });
    }
    // Only this verified server path can issue ownership; clients cannot insert
    // registry rows. Never return a PUT URL if ownership could not be recorded.
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: registryError } = await admin.from('media_objects').insert({
      object_key: key, owner_id: user.id, kind, content_type: contentType, declared_size_bytes: sizeBytes,
    });
    if (registryError) return json(500, { error: 'Could not process request' });

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: 's3',
      region: 'auto',
    });

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
    const signed = await aws.sign(`${endpoint}?X-Amz-Expires=600`, {
      method: 'PUT',
      aws: { signQuery: true },
    });

    return json(200, { uploadUrl: signed.url, key, expiresIn: 600 });
  } catch {
    return json(500, { error: 'Could not process request' });
  }
});
