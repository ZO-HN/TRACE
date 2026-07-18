// Supabase Edge Function: r2-presign
//
// Issues a short-lived presigned PUT URL so the client can upload media
// straight to Cloudflare R2 (see docs/adr/0001-media-storage.md). R2
// credentials live ONLY here as function secrets and never reach the browser.
//
// Deploy:  supabase functions deploy r2-presign
// Secrets: supabase secrets set R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... \
//                               R2_SECRET_ACCESS_KEY=... R2_BUCKET=...
//
// SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(jwt);
  if (authError || !user) return json(401, { error: 'Invalid token' });

  let body: {
    kind?: string;
    filename?: string;
    contentType?: string;
    sizeBytes?: number;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const { kind, filename, contentType, sizeBytes } = body;
  const policy = kind ? MEDIA_POLICY[kind] : undefined;
  if (!policy) return json(400, { error: 'Unknown media kind' });
  if (!contentType || !policy.contentTypes.includes(contentType)) {
    return json(400, { error: 'Disallowed content type' });
  }
  if (typeof sizeBytes !== 'number' || sizeBytes <= 0 || sizeBytes > policy.maxBytes) {
    return json(400, { error: 'File missing or exceeds size limit' });
  }

  const key = `${kind}/${user.id}/${crypto.randomUUID()}${extFromName(String(filename ?? ''))}`;

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
    method: 'PUT',
    aws: { signQuery: true },
  });

  return json(200, { uploadUrl: signed.url, key, expiresIn: 600 });
});
