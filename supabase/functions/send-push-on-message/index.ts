// Supabase Edge Function: send-push-on-message
//
// Triggered by a Supabase Database Webhook on direct_messages INSERT. Looks
// up the recipient's Expo push token and sends a push notification via
// Expo's push API (no Expo/EAS API key required for basic sends).
//
// Setup is a manual, one-time dashboard step — Database Webhooks aren't
// configurable from migration SQL the way RLS/RPCs are (same category of
// manual step as platform_settings.default_coach_id in the Phase 0
// migration):
//   1. Supabase Dashboard -> Database -> Webhooks -> Create a new webhook
//   2. Table: direct_messages, Events: Insert
//   3. Type: HTTP Request, POST to this function's URL
//      (https://<project-ref>.supabase.co/functions/v1/send-push-on-message)
//   4. Add a request header: Authorization: Bearer <WEBHOOK_SECRET>
//      (must match this function's WEBHOOK_SECRET secret, set separately)
//
// Deploy: supabase functions deploy send-push-on-message
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected);
//          WEBHOOK_SECRET (set manually — supabase secrets set WEBHOOK_SECRET=...)
//
// Scope note: only wired to direct_messages for now. Coach-feedback
// notifications are deferred until workout_sessions.coach_feedback_notes
// has a coach write path (planned, not yet built — see Phase 6).

import { createClient } from 'jsr:@supabase/supabase-js@2';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface DirectMessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
}

interface WebhookPayload {
  type: string;
  table: string;
  record: DirectMessageRow;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const secret = Deno.env.get('WEBHOOK_SECRET');
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return json(401, { error: 'Unauthorized' });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (payload.table !== 'direct_messages' || payload.type !== 'INSERT') {
    return json(200, { skipped: true });
  }

  const message = payload.record;
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const [{ data: recipient }, { data: sender }] = await Promise.all([
    admin
      .from('profiles')
      .select('expo_push_token')
      .eq('id', message.recipient_id)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', message.sender_id)
      .maybeSingle(),
  ]);

  if (!recipient?.expo_push_token) {
    return json(200, { skipped: true, reason: 'No push token on file for recipient' });
  }

  const senderName = sender ? `${sender.first_name} ${sender.last_name}`.trim() : 'New message';

  const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: recipient.expo_push_token,
      title: senderName,
      body: message.content.slice(0, 120),
      data: { type: 'direct_message', senderId: message.sender_id },
    }),
  });

  if (!pushRes.ok) {
    const text = await pushRes.text();
    return json(502, { error: `Expo push send failed: ${text}` });
  }

  return json(200, { sent: true });
});
