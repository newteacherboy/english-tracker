import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import { papiRewardsHandler } from './handler.ts';
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const db=createClient(Deno.env.get('SUPABASE_URL')!,keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(papiRewardsHandler(db));
