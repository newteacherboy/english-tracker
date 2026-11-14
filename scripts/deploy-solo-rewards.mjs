import {readFileSync} from 'node:fs';
const token=process.env.SUPABASE_ACCESS_TOKEN,ref=process.env.PROJECT_REF;
if(!token||!ref)throw Error('Deployment credentials missing');
const query=readFileSync('deployment/solo-level-rewards.sql','utf8');
const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query})});
if(!r.ok)throw Error('Reward configuration failed: HTTP '+r.status+' '+(await r.text()).slice(0,600));
const check=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:"select position('student-level-tiers-v1' in pg_get_functiondef('public.dm_solo_fair_claim(uuid,text,text,integer,integer[],integer,integer,numeric,integer)'::regprocedure))>0 as installed"})});
const result=await check.json();if(!check.ok||result[0]?.installed!==true)throw Error('Reward configuration not verified');console.log('Student level reward tiers verified.');
