import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

type Handler = (request: Request) => Promise<Response>;
type Failure = 'authReject' | 'sessionReject' | 'sessionError' | 'insertReject' | 'insertError' | 'missingMessage' | 'clientReject';

// Execute the actual Deno entry point; only configuration and external SDK calls
// are controlled. This is not a deployed Auth/RLS/provider integration test.
function loadHandler(options: { failure?: Failure; invalidAuth?: boolean; missingUser?: boolean; forbidden?: boolean; missingConfig?: string; blankConfig?: boolean } = {}) {
  let handler: Handler | undefined;
  const secretError = new Error('private dependency details / fixture-secret');
  const getUser = vi.fn(async () => {
    if (options.failure === 'authReject') throw secretError;
    return { data: { user: options.missingUser ? null : { id: 'owner' } }, error: options.invalidAuth ? secretError : null };
  });
  const lookup = vi.fn(async () => {
    if (options.failure === 'sessionReject') throw secretError;
    return { data: options.forbidden ? null : { id: 'session' }, error: options.failure === 'sessionError' ? secretError : null };
  });
  let saved: Record<string, unknown> | undefined;
  const insert = vi.fn((value: Record<string, unknown>) => {
    saved = value;
    return { select: () => ({ single: async () => {
      if (options.failure === 'insertReject') throw secretError;
      return { data: options.failure === 'missingMessage' ? null : { id: 'reply', ...saved }, error: options.failure === 'insertError' ? secretError : null };
    } }) };
  });
  const eq = vi.fn(() => ({ maybeSingle: lookup }));
  const from = vi.fn((table: string) => {
    if (table === 'ai_chat_sessions') return { select: () => ({ eq }) };
    if (table === 'ai_messages') return { insert };
    throw new Error(`Unexpected table: ${table}`);
  });
  const client = vi.fn(() => {
    if (options.failure === 'clientReject') throw secretError;
    return { auth: { getUser }, from };
  });
  function load(file: string): Record<string, unknown> {
    const module = { exports: {} };
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file,
    });
    runInNewContext(outputText, {
      module, exports: module.exports, Request, Response,
      Deno: { serve: (callback: Handler) => { handler = callback; }, env: { get: (name: string) => name === options.missingConfig ? (options.blankConfig ? '  ' : undefined) : `fixture-${name}` } },
      require: (specifier: string) => {
        if (specifier === 'jsr:@supabase/supabase-js@2') return { createClient: client };
        if (specifier === '../_shared/cors.ts') return load(resolve(dirname(file), specifier));
        throw new Error(`Unexpected import: ${specifier}`);
      },
    }, { filename: file });
    return module.exports;
  }
  load(resolve('supabase/functions/trace-brain/index.ts'));
  if (!handler) throw new Error('Handler was not registered');
  return { handler, getUser, lookup, insert, eq, client };
}

function request(body: unknown, authorization = 'Bearer valid') {
  return new Request('https://fixture.test/trace-brain', { method: 'POST', headers: { Authorization: authorization }, body: JSON.stringify(body) });
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
  expect(JSON.stringify(body)).not.toMatch(/private|fixture-secret|stack|SUPABASE/);
}

describe('trace-brain runtime boundary', () => {
  const invalidBodies: unknown[] = [null, [], ['session', 'content'], 'text', 42, true, {},
    { sessionId: 'session' }, { content: 'text' }];
  for (const field of ['sessionId', 'content']) {
    for (const value of [null, 42, {}, [], true, '', ' \t\n']) {
      invalidBodies.push({ sessionId: 'session', content: 'text', [field]: value });
    }
  }
  it.each(invalidBodies.map((body, index) => ({ body, index })))('rejects invalid body $index before querying', async ({ body }) => {
    const h = loadHandler();
    await expectError(await h.handler(request(body)), 400);
    expect(h.lookup).not.toHaveBeenCalled();
    expect(h.insert).not.toHaveBeenCalled();
  });
  it('rejects malformed JSON before querying', async () => {
    const h = loadHandler();
    await expectError(await h.handler(new Request('https://fixture.test', { method: 'POST', headers: { Authorization: 'Bearer valid' }, body: '{' })), 400);
    expect(h.lookup).not.toHaveBeenCalled();
    expect(h.insert).not.toHaveBeenCalled();
  });
  it.each([
    { label: 'missing bearer', authorization: '', options: {}, status: 401 },
    { label: 'invalid token', options: { invalidAuth: true }, status: 401 },
    { label: 'missing user', options: { missingUser: true }, status: 401 },
    { label: 'invisible session', options: { forbidden: true }, status: 403 },
  ])('preserves $label denial without writing', async ({ authorization, options, status }) => {
    const h = loadHandler(options);
    await expectError(await h.handler(request({ sessionId: 'session', content: 'text' }, authorization)), status);
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.client.mock.calls.length).toBeLessThanOrEqual(1);
  });
  it.each(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'])('bounds absent/blank %s configuration', async (missingConfig) => {
    for (const blankConfig of [false, true]) {
      const h = loadHandler({ missingConfig, blankConfig });
      await expectError(await h.handler(request({ sessionId: 'session', content: 'text' })), 500);
      expect(h.insert).not.toHaveBeenCalled();
    }
  });
  it.each<Failure>(['authReject', 'sessionReject', 'sessionError', 'insertReject', 'insertError', 'missingMessage', 'clientReject'])('bounds %s without leaking dependency errors', async (failure) => {
    const h = loadHandler({ failure });
    await expectError(await h.handler(request({ sessionId: 'session', content: 'text' })), 500);
    if (!['insertReject', 'insertError', 'missingMessage'].includes(failure)) expect(h.insert).not.toHaveBeenCalled();
  });
  it('persists the honest placeholder after the caller-scoped session check', async () => {
    const h = loadHandler();
    const content = `  ${'hello'.repeat(1000)}  `;
    const response = await h.handler(request({ sessionId: 'session', content, extra: 'compatible' }));
    expect(response.status).toBe(200);
    const { message } = await response.json();
    expect(h.eq).toHaveBeenCalledWith('id', 'session');
    expect(h.client.mock.calls).toEqual([
      ['fixture-SUPABASE_URL', 'fixture-SUPABASE_ANON_KEY', { global: { headers: { Authorization: 'Bearer valid' } } }],
      ['fixture-SUPABASE_URL', 'fixture-SUPABASE_SERVICE_ROLE_KEY'],
    ]);
    expect(h.lookup.mock.invocationCallOrder[0]).toBeLessThan(h.insert.mock.invocationCallOrder[0]);
    expect(h.insert).toHaveBeenCalledExactlyOnceWith({ session_id: 'session', sender: 'ASSISTANT', content: message.content });
    expect(message.id).toBe('reply');
    expect(message.content).toContain("TRACE Brain isn't fully configured yet");
    expect(message.content).toContain(content.slice(0, 80));
  });
});
