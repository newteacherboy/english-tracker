import {readFileSync} from 'node:fs';
const token=process.env.SUPABASE_ACCESS_TOKEN,ref=process.env.PROJECT_REF;
if(!token||!ref)throw Error('Deployment credentials missing');
async function query(sql){
 const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});
 if(!r.ok)throw Error('Database deployment failed: HTTP '+r.status+' '+(await r.text()).slice(0,600));
 return r.json();
}
await query(readFileSync('deployment/premium-ad-plays.sql','utf8'));
const rows=await query(`select
 position('premium-ad-plays-v1' in pg_get_functiondef('public.dm_game_access(uuid,text)'::regprocedure))>0 as quota,
 position('premium-ad-plays-v1' in pg_get_functiondef('public.dm_ad_intent(uuid,text,text,uuid,uuid)'::regprocedure))>0 as full_energy,
 not has_function_privilege('anon','public.dm_premium_ad_offer(uuid,text,text,uuid)','EXECUTE') as private_anon,
 not has_function_privilege('authenticated','public.dm_premium_ad_offer(uuid,text,text,uuid)','EXECUTE') as private_auth,
 (select relrowsecurity from pg_class where oid='dm_ad_rewards.premium_offers'::regclass) as rls`);
if(!rows[0]||Object.values(rows[0]).some(v=>v!==true))throw Error('Premium ad quota security verification failed');
await query(readFileSync('tests/premium-ad-plays-db.sql','utf8'));
console.log('Premium ad play quota, proof ownership, replay, and permissions verified.');
