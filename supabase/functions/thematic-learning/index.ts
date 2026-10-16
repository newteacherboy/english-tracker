import {thematicHandler} from './core.ts';
const url=Deno.env.get('SUPABASE_URL')!;
const secrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const key=secrets.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function rest(table:string,params:any={},method='GET',body?:any,prefer?:string){const r=await fetch(url+'/rest/v1/'+table+'?'+new URLSearchParams(params),{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:prefer||'return=representation'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.message||'Veritabanı bağlantısı kurulamadı.');return d;}
Deno.serve(thematicHandler({select:(t,p)=>rest(t,p),insert:(t,b,ignore=false)=>rest(t,{},'POST',b,'return=representation'+(ignore?',resolution=ignore-duplicates':'')),update:(t,p,b)=>rest(t,p,'PATCH',b),rpc:(t,b)=>rest('rpc/'+t,{},'POST',b)}));
