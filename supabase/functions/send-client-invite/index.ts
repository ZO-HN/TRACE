// Supabase Edge Function: send-client-invite
//
// Called directly from the coach dashboard (Clients -> Invite Client ->
// Email tab), not a webhook. Sends the client-onboarding invite link via
// Resend on the coach's behalf.
//
// Auth: the caller's Supabase JWT (forwarded automatically by
// supabase.functions.invoke from an authenticated session) is verified
// against auth.users, then the caller's profile must have role = 'coach'.
// Unauthenticated or non-coach callers are rejected — this function must
// never be reachable to send arbitrary email as this project's Resend
// sender identity.
//
// Deploy: supabase functions deploy send-client-invite
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected);
//          RESEND_API_KEY (set manually — supabase secrets set RESEND_API_KEY=...)
//
// Sender note: using Resend's shared test address (onboarding@resend.dev)
// until a custom domain is verified. In that mode Resend only delivers to
// the email address on the Resend account itself — invites to any other
// address will fail with a 403 from Resend until a real sending domain is
// verified (see https://resend.com/docs/dashboard/domains/introduction).
// Swap RESEND_FROM below once a domain is verified.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_FROM = 'TRACE <onboarding@resend.dev>';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface InvitePayload {
  email: string;
  inviteLink: string;
  coachName: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const authHeader = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await anonClient.auth.getUser();
  if (userError || !userData.user) {
    return json(401, { error: 'Not authenticated' });
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (callerProfile?.role !== 'coach') {
    return json(403, { error: 'Only coach accounts can send client invites' });
  }

  let payload: InvitePayload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (!payload.email || !payload.inviteLink) {
    return json(400, { error: 'email and inviteLink are required' });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    return json(500, { error: 'RESEND_API_KEY is not configured' });
  }

  const coachName = payload.coachName || 'Your coach';
  const safeCoachName = escapeHtml(coachName);
  const safeLink = escapeHtml(payload.inviteLink);

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [payload.email],
      subject: `${coachName} invited you to TRACE`,
      html: `
        <p>${safeCoachName} invited you to start training with them on TRACE.</p>
        <p><a href="${safeLink}">Click here to get started</a></p>
        <p style="color:#666;font-size:12px;">If the link above doesn't work, copy and paste this URL into your browser:<br>${safeLink}</p>
      `,
    }),
  });

  if (!emailRes.ok) {
    const text = await emailRes.text();
    return json(502, { error: `Resend send failed: ${text}` });
  }

  return json(200, { sent: true });
});
