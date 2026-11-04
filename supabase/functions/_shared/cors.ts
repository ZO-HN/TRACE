// Browser Supabase SDK requests include apikey and x-client-info as well as
// the bearer token and JSON content type. Keep browser-facing handlers aligned.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
