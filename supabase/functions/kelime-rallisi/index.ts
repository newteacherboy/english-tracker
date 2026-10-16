import {raceHandler} from './core.ts';
const base=Deno.env.get('SUPABASE_URL')!;
const secrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const key=secrets.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function rest(path:string,options:RequestInit={}){
 const response=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(options.headers||{})}});
 const data=await response.json();if(!response.ok)throw Error(data.message||'Veritabanı bağlantısı tamamlanamadı.');return data;
}
Deno.serve(raceHandler({select:(table,params)=>rest(table+'?'+new URLSearchParams(params)),rpc:(name,body)=>rest('rpc/'+name,{method:'POST',body:JSON.stringify(body)})}));
