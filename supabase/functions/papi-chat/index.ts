import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import { papiChatHandler } from './handler.ts';
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const db=createClient(Deno.env.get('SUPABASE_URL')!,keys.default);
Deno.serve(papiChatHandler({db,env:(key:string)=>Deno.env.get(key),fetch}));
