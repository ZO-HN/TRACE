// Supabase Edge Function: trace-brain
//
// The assistant turn of the TRACE Brain chat. Verifies the caller owns the
// session, then writes an ASSISTANT message with the service role (clients
// cannot insert ASSISTANT rows — see the ai_biometrics_rls migration).
//
// The RAG pipeline (embedding -> Pinecone -> LLMLingua compression -> LLM),
// described in docs/trace_architecture.md §4, is a documented TODO. Until an
// LLM key is configured this returns a clear placeholder so the chat loop and
// its persistence/RLS work end-to-end.
//
// Deploy:  supabase functions deploy trace-brain
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are
//          injected automatically; add LLM/Pinecone keys when wiring the RAG.

import { createClient } from 'jsr:@supabase/supabase-js@2';

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

  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await asUser.auth.getUser();
  if (authError || !user) return json(401, { error: 'Invalid token' });

  let body: { sessionId?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const { sessionId, content } = body;
  if (!sessionId || !content) return json(400, { error: 'Missing sessionId or content' });

  // Verify the session belongs to the caller (RLS-scoped read).
  const { data: session } = await asUser
    .from('ai_chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return json(403, { error: 'Not your session' });

  // Write the ASSISTANT reply with the service role (bypasses the USER-only
  // client insert policy).
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: message, error: insertError } = await admin
    .from('ai_messages')
    .insert({ session_id: sessionId, sender: 'ASSISTANT', content: draftReply(content) })
    .select()
    .single();
  if (insertError || !message) return json(500, { error: 'Could not save reply' });

  return json(200, { message });
});
