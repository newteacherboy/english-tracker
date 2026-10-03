import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { handleRequest } from './core.mjs';

const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const adminKey = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const db = createClient(Deno.env.get('SUPABASE_URL')!, adminKey!, {
  auth: { persistSession: false, autoRefreshToken: false }
});
// Custom password verification + one-use deletion tickets protect the public routes.
// The scheduled worker has a separate server-generated secret.
Deno.serve(req => handleRequest(req, db));
