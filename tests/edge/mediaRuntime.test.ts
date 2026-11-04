import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

type Handler = (request: Request) => Promise<Response>;
type Name = 'r2-presign' | 'r2-get-url';
type Failure = 'client' | 'auth' | 'lookup' | 'lookupError' | 'aws' | 'sign';
const upload = { kind: 'form-video', filename: 'clip.MP4', contentType: 'video/mp4', sizeBytes: 100 };
const clipKey = 'form-video/owner/clip.mp4';
const avatarKey = 'coach-image/owner/avatar.png';
const configs = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];

// Execute actual Deno handlers and the shared CORS module. External SDK/Auth/DB/
// signing are controlled; fixtures do not establish actual media entitlement.
function loadHandler(name: Name, options: { failure?: Failure; denied?: boolean; invalidAuth?: boolean; missingUser?: boolean; missingConfig?: string; blankConfig?: boolean } = {}) {
  let handler: Handler | undefined;
  const privateError = new Error('fixture-private-secret / internal stack details');
  const getUser = vi.fn(async (_jwt?: string) => {
    if (options.failure === 'auth') throw privateError;
    return { data: { user: options.missingUser ? null : { id: 'owner' } }, error: options.invalidAuth ? privateError : null };
  });
  const lookup = vi.fn(async () => {
    if (options.failure === 'lookup') throw privateError;
    return { data: options.denied ? null : { id: 'visible' }, error: options.failure === 'lookupError' ? privateError : null };
  });
  const eq = vi.fn((_column: string, _value: unknown) => query);
  const query = { select: () => query, eq, maybeSingle: lookup };
  const from = vi.fn((_table: string) => query);
  const client = vi.fn((..._args: unknown[]) => {
    if (options.failure === 'client') throw privateError;
    return { auth: { getUser }, from };
  });
  const sign = vi.fn(async (_url: string, _options: unknown) => {
    if (options.failure === 'sign') throw privateError;
    return { url: 'https://signed.fixture/object' };
  });
  const aws = vi.fn((_options: unknown) => {
    if (options.failure === 'aws') throw privateError;
  });
  function load(file: string): Record<string, unknown> {
    const module = { exports: {} };
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file,
    });
    runInNewContext(outputText, {
      module, exports: module.exports, Request, Response, crypto,
      Deno: { serve: (callback: Handler) => { handler = callback; }, env: { get: (key: string) => key === options.missingConfig ? (options.blankConfig ? '  ' : undefined) : 'fixture-' + key } },
      require: (specifier: string) => {
        if (specifier === 'jsr:@supabase/supabase-js@2') return { createClient: client };
        if (specifier === 'https://esm.sh/aws4fetch@1.0.20') return { AwsClient: class { constructor(config: unknown) { aws(config); } sign = sign; } };
        if (specifier === '../_shared/cors.ts') return load(resolve(dirname(file), specifier));
        throw new Error('Unexpected import: ' + specifier);
      },
    }, { filename: file });
    return module.exports;
  }
  load(resolve('supabase/functions', name, 'index.ts'));
  if (!handler) throw new Error('Handler not registered');
  return { handler, client, getUser, lookup, from, eq, aws, sign };
}
function request(body: unknown, auth = 'Bearer valid') {
  return new Request('https://fixture.test', { method: 'POST', headers: { Authorization: auth }, body: JSON.stringify(body) });
}
async function expectError(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(response.headers.get('content-type')).toBe('application/json');
  expect(response.headers.get('access-control-allow-origin')).toBe('*');
  expect(response.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
  expect(response.headers.get('access-control-allow-headers')).toBe('authorization, apikey, content-type, x-client-info');
  const body = await response.json();
  expect(Object.keys(body)).toEqual(['error']);
  expect(typeof body.error).toBe('string');
  expect(body.error.length).toBeLessThan(100);
  expect(JSON.stringify(body)).not.toMatch(/fixture-private|stack|SUPABASE|R2_/);
  return body;
}

describe.each<Name>(['r2-presign', 'r2-get-url'])('%s runtime boundary', (name) => {
  const validBody = name === 'r2-presign' ? upload : { key: clipKey };
  const invalidBodies: unknown[] = [null, [], ['key'], 'text', 12, true, {}];
  if (name === 'r2-presign') {
    for (const field of ['kind', 'filename', 'contentType', 'sizeBytes']) {
      for (const value of [null, {}, [], true, '']) invalidBodies.push({ ...upload, [field]: value });
    }
    // Empty filenames remain compatible; extensionless objects were supported.
    invalidBodies.splice(invalidBodies.findIndex((body) => body !== null && typeof body === 'object' && 'filename' in body && body.filename === ''), 1);
    for (const field of ['kind', 'contentType', 'sizeBytes']) {
      const body: Record<string, unknown> = { ...upload };
      delete body[field];
      invalidBodies.push(body);
    }
    invalidBodies.push({ ...upload, kind: 42 }, { ...upload, kind: ['form-video'] },
      { ...upload, filename: 42 }, { ...upload, contentType: 42 },
      { ...upload, sizeBytes: '100' }, { ...upload, sizeBytes: 0 },
      { ...upload, sizeBytes: -1 }, { ...upload, sizeBytes: 50 * 1024 * 1024 + 1 },
      { ...upload, sizeBytes: Infinity }, { ...upload, sizeBytes: NaN },
      { ...upload, contentType: 'application/pdf' }, { ...upload, kind: 'progress-photo' });
  } else {
    for (const key of [null, {}, [], true, 42, '', ' \t\n']) invalidBodies.push({ key });
  }
  it.each(invalidBodies.map((body, index) => ({ body, index })))('rejects invalid body $index before querying/signing', async ({ body }) => {
    const h = loadHandler(name);
    await expectError(await h.handler(request(body)), 400);
    expect(h.lookup).not.toHaveBeenCalled();
    expect(h.sign).not.toHaveBeenCalled();
  });
  it('rejects malformed JSON', async () => {
    const h = loadHandler(name);
    await expectError(await h.handler(new Request('https://fixture.test', { method: 'POST', headers: { Authorization: 'Bearer valid' }, body: '{' })), 400);
    expect(h.sign).not.toHaveBeenCalled();
  });
  it.each([
    { label: 'missing bearer', auth: '', options: {} },
    { label: 'invalid auth', options: { invalidAuth: true } },
    { label: 'missing user', options: { missingUser: true } },
  ])('preserves $label denial', async ({ auth, options }) => {
    const h = loadHandler(name, options);
    await expectError(await h.handler(request(validBody, auth)), 401);
    expect(h.lookup).not.toHaveBeenCalled();
    expect(h.sign).not.toHaveBeenCalled();
  });
  it.each(configs)('bounds absent/blank %s configuration', async (missingConfig) => {
    for (const blankConfig of [false, true]) {
      const h = loadHandler(name, { missingConfig, blankConfig });
      await expectError(await h.handler(request(validBody)), 500);
      expect(h.sign).not.toHaveBeenCalled();
    }
  });
  it.each<Failure>(['client', 'auth', 'aws', 'sign'])('bounds rejected %s dependency', async (failure) => {
    const h = loadHandler(name, { failure });
    await expectError(await h.handler(request(validBody)), 500);
    if (failure !== 'sign') expect(h.sign).not.toHaveBeenCalled();
  });
});

describe('upload policy compatibility', () => {
  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'unknown'])('rejects inherited/unknown kind %s', async (kind) => {
    const h = loadHandler('r2-presign');
    const body = await expectError(await h.handler(request({ ...upload, kind })), 400);
    expect(body.error).toBe('Unknown media kind');
    expect(h.sign).not.toHaveBeenCalled();
  });
  it.each([
    { kind: 'form-video', contentType: 'video/mp4', sizeBytes: 50 * 1024 * 1024 },
    { kind: 'meal-photo', contentType: 'image/heic', sizeBytes: 10 * 1024 * 1024 },
    { kind: 'coach-image', contentType: 'image/webp', sizeBytes: 10 * 1024 * 1024 },
    { kind: 'file', contentType: 'application/pdf', sizeBytes: 25 * 1024 * 1024 },
  ])('keeps $kind maximum declared size and success shape', async (metadata) => {
    const h = loadHandler('r2-presign');
    const response = await h.handler(request({ ...metadata, filename: 'clip.MP4', extra: 'compatible', userId: 'attacker' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ uploadUrl: 'https://signed.fixture/object', key: expect.stringMatching(new RegExp('^' + metadata.kind + '/owner/[a-f0-9-]+\\.mp4$')), expiresIn: 600 });
    expect(h.getUser).toHaveBeenCalledWith('valid');
    expect(h.sign).toHaveBeenCalledWith(expect.stringContaining('/' + body.key + '?X-Amz-Expires=600'), { method: 'PUT', aws: { signQuery: true } });
  });
  it.each([undefined, ''])('keeps omitted/empty filename compatibility (%s)', async (filename) => {
    const h = loadHandler('r2-presign');
    const response = await h.handler(request({ ...upload, filename, sizeBytes: 0.5 }));
    expect(response.status).toBe(200);
    expect((await response.json()).key).toMatch(/^form-video\/owner\/[a-f0-9-]+$/);
  });
});

describe.each([clipKey, avatarKey])('playback path %s', (key) => {
  it('preserves caller-scoped lookup and successful response', async () => {
    const h = loadHandler('r2-get-url');
    const response = await h.handler(request({ key, extra: 'compatible' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://signed.fixture/object', expiresIn: 600 });
    expect(h.client).toHaveBeenCalledWith('fixture-SUPABASE_URL', 'fixture-SUPABASE_ANON_KEY', { global: { headers: { Authorization: 'Bearer valid' } } });
    expect(h.from).toHaveBeenCalledWith(key === avatarKey ? 'profiles' : 'set_logs');
    expect(h.eq).toHaveBeenCalledWith(key === avatarKey ? 'avatar_key' : 'form_video_s3_key', key);
    if (key === avatarKey) expect(h.eq).toHaveBeenCalledWith('id', 'owner');
    expect(h.sign).toHaveBeenCalledWith(expect.stringContaining('/' + key + '?X-Amz-Expires=600'), { method: 'GET', aws: { signQuery: true } });
    expect(h.lookup.mock.invocationCallOrder[0]).toBeLessThan(h.sign.mock.invocationCallOrder[0]);
  });
  it('retains forbidden denial without signing', async () => {
    const h = loadHandler('r2-get-url', { denied: true });
    await expectError(await h.handler(request({ key })), 403);
    expect(h.sign).not.toHaveBeenCalled();
  });
  it.each<Failure>(['lookup', 'lookupError'])('bounds %s failure without signing', async (failure) => {
    const h = loadHandler('r2-get-url', { failure });
    await expectError(await h.handler(request({ key })), 500);
    expect(h.sign).not.toHaveBeenCalled();
  });
});
