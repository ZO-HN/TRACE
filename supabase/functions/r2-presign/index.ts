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
import {mediaPolicy} from '../_shared/mediaPolicy.ts';

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
    const { kind, filename, contentType, sizeBytes, protocolVersion, operationId, ownerId } = body as Record<string, unknown>;
    const policy = mediaPolicy(kind);
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
    if(protocolVersion!==undefined&&protocolVersion!==1&&protocolVersion!==2)return json(400,{error:'Unknown upload protocol'});
    const version=protocolVersion===2?2:1;
    if(version===2&&(ownerId!==user.id||typeof operationId!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(operationId)
      ||!Number.isSafeInteger(sizeBytes)||(typeof filename==='string'&&filename.length>255)))return json(400,{error:'A captured owner and stable upload operation are required'});
    let key = `${kind}/${user.id}/${crypto.randomUUID()}${extFromName(filename ?? '')}`;

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
    if(version===2){
      const registered=await admin.rpc('register_media_upload',{p_owner_id:user.id,p_operation_id:operationId,p_kind:kind,p_content_type:contentType,p_size_bytes:sizeBytes});
      if(registered.error||typeof registered.data!=='string'||registered.data!==`${kind}/${user.id}/${String(operationId).toLowerCase()}`)return json(500,{error:'Could not process request'});
      key=registered.data;
    }else{
      const { error: registryError } = await admin.from('media_objects').insert({
        object_key: key, owner_id: user.id, kind, content_type: contentType, declared_size_bytes: sizeBytes,
      });
      if (registryError) return json(500, { error: 'Could not process request' });
    }

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: 's3',
      region: 'auto',
    });

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
    const uploadHeaders={'Content-Type':contentType,'If-None-Match':'*'};
    const signed = await aws.sign(`${endpoint}?X-Amz-Expires=600`, {
      method: 'PUT',
      ...(version===2?{headers:uploadHeaders,aws:{signQuery:true,allHeaders:true}}:{aws:{signQuery:true}}),
    });

    return json(200, { uploadUrl: signed.url, key, expiresIn: 600,...(version===2?{protocolVersion:2,uploadHeaders}: {}) });
  } catch {
    return json(500, { error: 'Could not process request' });
  }
});
