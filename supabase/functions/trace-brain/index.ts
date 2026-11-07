// Supabase Edge Function: trace-brain
//
// The assistant turn of the TRACE Brain chat. Verifies the caller owns the
// session, then writes an ASSISTANT message with the service role (clients
// cannot insert ASSISTANT rows — see the ai_biometrics_rls migration).
//
// The RAG pipeline (embedding -> Pinecone -> LLMLingua compression -> LLM),
// described in docs/architecture/overview.md, is a documented TODO. Until
// inference is implemented this always returns a clear placeholder. Adding an
// LLM key alone does not enable inference or retrieval.
//
// Deploy:  supabase functions deploy trace-brain
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are
//          injected automatically; add LLM/Pinecone keys when wiring the RAG.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders as CORS } from '../_shared/cors.ts';
import { AI_AVAILABLE } from '../_shared/availability.ts';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// Placeholder for the RAG pipeline. Swap for embedding + Pinecone + LLM.
function draftReply(userText: string): string {
  return (
    `TRACE Brain isn't fully configured yet, so I can't ground this in research. ` +
    `Once the RAG pipeline is wired I'll answer "${userText.slice(0, 80)}" with cited sources.`
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) return json(401, { error: 'Missing authorization' });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url?.trim() || !anonKey?.trim()) {
      return json(500, { error: 'Could not process request' });
    }
    const asUser = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const {
      data: { user },
      error: authError,
    } = await asUser.auth.getUser();
    if (authError || !user) return json(401, { error: 'Invalid token' });
    if (!AI_AVAILABLE) return json(503, { error: 'AI features are unavailable in TRACE V1.' });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json(400, { error: 'Expected a JSON object' });
    }
    const { sessionId, content } = body as Record<string, unknown>;
    if (typeof sessionId !== 'string' || !sessionId.trim() ||
        typeof content !== 'string' || !content.trim()) {
      return json(400, { error: 'sessionId and content must be non-empty strings' });
    }

    // Verify the session belongs to the caller (RLS-scoped read).
    const { data: session, error: sessionError } = await asUser
      .from('ai_chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessionError) return json(500, { error: 'Could not process request' });
    if (!session) return json(403, { error: 'Not your session' });

    // Write the ASSISTANT reply with the service role (bypasses the USER-only
    // client insert policy), only after the caller's session check succeeds.
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey?.trim()) return json(500, { error: 'Could not process request' });
    const admin = createClient(url, serviceKey);
    const { data: message, error: insertError } = await admin
      .from('ai_messages')
      .insert({ session_id: sessionId, sender: 'ASSISTANT', content: draftReply(content) })
      .select()
      .single();
    if (insertError || !message) return json(500, { error: 'Could not save reply' });

    return json(200, { message });
  } catch {
    return json(500, { error: 'Could not process request' });
  }
});
