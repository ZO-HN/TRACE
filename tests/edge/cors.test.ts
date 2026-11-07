import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { createClient } from '@supabase/supabase-js';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

const functions = ['r2-presign', 'r2-get-url', 'r2-finalize', 'trace-brain'] as const;
type FunctionName = typeof functions[number];
type Handler = (request: Request) => Promise<Response>;

// Execute the checked-in Deno entry points. Only external Auth/DB/R2 services
// are controlled here; this does not establish deployed Deno/gateway behavior.
function loadHandler(name: FunctionName, { validToken = true, visible = true, insertFails = false } = {}) {
  let handler: Handler | undefined;
  const getUser = vi.fn(async () => ({
    data: { user: validToken ? { id: 'fixture-user' } : null },
    error: validToken ? null : { message: 'Invalid token' },
  }));
  const query = {
    select: () => query, eq: () => query, insert: () => query,
    maybeSingle: async () => ({ data: visible ? {object_key:'form-video/fixture-user/clip.mp4',owner_id:'fixture-user',kind:'form-video',content_type:'video/mp4',declared_size_bytes:100,
      protocol_version:2,state:'ready',verified_key:'form-video/fixture-user/clip.mp4',actual_size_bytes:100,actual_content_type:'video/mp4',verified_etag:'"verified"'} : null }),
    single: async () => ({ data: insertFails ? null : { id: 'reply', content: 'fixture reply' }, error: insertFails ? {} : null }),
  };
  const client = vi.fn(() => ({ auth: { getUser }, from: () => query,
    rpc: async () => ({ data: visible, error: null }) }));
  const sign = vi.fn(async (url: string) => ({ url }));
  function load(file: string): { [key: string]: unknown } {
    const module = { exports: {} };
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: file,
    });
    runInNewContext(outputText, {
      module, exports: module.exports, Request, Response,Headers,AbortSignal,TextEncoder,TextDecoder,crypto,
      Deno: { serve: (callback: Handler) => { handler = callback; }, env: { get: () => 'fixture-config' } },
      require: (specifier: string) => {
        if (specifier === 'jsr:@supabase/supabase-js@2') return { createClient: client };
        if (specifier === 'https://esm.sh/aws4fetch@1.0.20') return { AwsClient: class { sign = sign; fetch=async()=>new Response(null,{headers:{'content-length':'100','content-type':'video/mp4',etag:'"verified"'}}); } };
        if (specifier.startsWith('../_shared/')||specifier.startsWith('./')) return load(resolve(dirname(file), specifier));
        throw new Error(`Unexpected handler import: ${specifier}`);
      },
    }, { filename: file });
    return module.exports;
  }
  load(resolve('supabase/functions', name, 'index.ts'));
  if (!handler) throw new Error(`No handler registered by ${name}`);
  return { handler, client, getUser, sign };
}

function bodyFor(name: FunctionName) {
  if (name === 'r2-presign') return { kind: 'form-video', filename: 'clip.mp4', contentType: 'video/mp4', sizeBytes: 100 };
  if (name === 'r2-get-url') return { key: 'form-video/fixture-user/clip.mp4' };
  if(name==='r2-finalize')return {key:'form-video/fixture-user/clip.mp4',ownerId:'fixture-user'};
  return { sessionId: 'session', content: 'Hello' };
}

function expectCors(response: Response) {
  expect(response.headers.get('access-control-allow-origin')).toBe('*');
  expect(response.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
  const allowed = response.headers.get('access-control-allow-headers')?.toLowerCase().split(/\s*,\s*/);
  for (const header of ['authorization', 'apikey', 'content-type', 'x-client-info']) expect(allowed).toContain(header);
}

describe.each(functions)('%s browser CORS contract', (name) => {
  it.each(['web', 'mobile'])('accepts headers emitted by the installed %s SDK before authenticating', async (app) => {
    const factory = app === 'web' ? createClient : createRequire(resolve(process.env.TRACE_CLIENT_PATH ?? '../TRACE-client', 'package.json'))('@supabase/supabase-js').createClient;
    const { handler, client } = loadHandler(name);
    const origin = app === 'web' ? 'http://localhost:5173' : 'http://localhost:8081';
    const sdk = factory('https://fixture.supabase.co', 'fixture-public-key', {
      accessToken: async () => 'fixture-jwt',
      global: { fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        const sentHeaders = [...request.headers.keys()];
        expect(sentHeaders).toEqual(expect.arrayContaining(['apikey', 'authorization', 'content-type', 'x-client-info']));
        const preflight = await handler(new Request(request.url, { method: 'OPTIONS', headers: {
          Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': sentHeaders.join(', '),
        } }));
        expect(preflight.status).toBe(200);
        expect(client).not.toHaveBeenCalled();
        expectCors(preflight);
        const allowed = preflight.headers.get('access-control-allow-headers')!.split(/\s*,\s*/);
        for (const header of sentHeaders) expect(allowed).toContain(header);
        request.headers.set('Origin', origin);
        const response = await handler(request);
        expectCors(response);
        return response;
      } },
    });
    const { data, error } = await sdk.functions.invoke(name, { body: bodyFor(name) });
    if (name === 'trace-brain') {
      expect(error).not.toBeNull();
      expect(await error!.context.json()).toEqual({ error: 'AI features are unavailable in TRACE V1.' });
      return;
    }
    expect(error).toBeNull();
    if (name === 'r2-presign') expect(data).toMatchObject({ key: expect.stringMatching(/^form-video\/fixture-user\/.+\.mp4$/), uploadUrl: expect.any(String), expiresIn: 600 });
    else if (name === 'r2-get-url') expect(data).toMatchObject({ url: expect.any(String), expiresIn: 600 });

  });

  it.each([
    { label: 'unsupported method', method: 'GET', auth: '', body: undefined, status: 405 },
    { label: 'missing authorization', method: 'POST', auth: '', body: '{}', status: 401 },
    { label: 'invalid token', method: 'POST', auth: 'Bearer invalid', body: '{}', status: 401, validToken: false },
    { label: 'malformed JSON', method: 'POST', auth: 'Bearer valid', body: '{', status: 400 },
    { label: 'missing fields', method: 'POST', auth: 'Bearer valid', body: '{}', status: 400 },
  ])('keeps CORS on $label without issuing URLs', async ({ method, auth, body, status, validToken }) => {
    const { handler, client, sign } = loadHandler(name, { validToken });
    const response = await handler(new Request('https://fixture.test', { method, headers: { Authorization: auth }, body }));
    expect(response.status).toBe(name === 'trace-brain' && auth === 'Bearer valid' && method === 'POST' ? 503 : status);
    expectCors(response);
    expect(await response.json()).toHaveProperty('error');
    expect(sign).not.toHaveBeenCalled();
    if (!auth) expect(client).not.toHaveBeenCalled();
  });

  if (name !== 'r2-presign') it('keeps CORS on denied object/session access', async () => {
    const { handler, sign } = loadHandler(name, { visible: false });
    const response = await handler(new Request('https://fixture.test', { method: 'POST', headers: { Authorization: 'Bearer valid' }, body: JSON.stringify(bodyFor(name)) }));
    expect(response.status).toBe(name === 'trace-brain' ? 503 : 403);
    expectCors(response);
    expect(sign).not.toHaveBeenCalled();
  });

  if (name === 'trace-brain') it('keeps CORS while V1 AI remains unavailable', async () => {
    const { handler } = loadHandler(name, { insertFails: true });
    const response = await handler(new Request('https://fixture.test', { method: 'POST', headers: { Authorization: 'Bearer valid' }, body: JSON.stringify(bodyFor(name)) }));
    expect(response.status).toBe(503);
    expectCors(response);
    expect(await response.json()).toEqual({ error: 'AI features are unavailable in TRACE V1.' });
  });
});
