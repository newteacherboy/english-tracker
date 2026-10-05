// Only explicitly listed reads may be grouped. Each child still uses the
// original handler, session validation and feature/ownership checks.
const READS = new Set(['bildirimlerim','ilerlemeOzet','enerjiDurumuGetir',
  'duyurulariGetir','sosyalOgrencilerGetir','ekVeriGetir','seviyeDurumu',
  'seviyeLigListesi','yayinOzellikleri','dersKonulariGetir']);
export async function readBatch(req:Request,body:any,handle:any,json:any){
  const list=body.istekler;
  if(req.method!=='POST'||!Array.isArray(list)||!list.length||list.length>8||
    JSON.stringify(list).length>24000||list.some(x=>!x||!READS.has(x.islem)||
      Object.keys(x).some(k=>['t','authorization','headers','url','istekler'].includes(k))))
    return json({ok:false,mesaj:'Geçersiz okuma grubu.'},400);
  const headers=new Headers(req.headers);headers.set('content-type','application/json');
  const url=new URL(req.url);url.search='';
  // Do not let children supply credentials or inherit outer query operations.
  const results=await Promise.all(list.map(async (args:any)=>{
    try{
      const response=await handle(new Request(url,{method:'POST',headers,
        body:JSON.stringify({...args,t:body.t||new URL(req.url).searchParams.get('t')||''})}));
      return {status:response.status,body:await response.text()};
    }catch{return {status:500,body:JSON.stringify({ok:false,mesaj:'Sunucu hatası, tekrar dene.'})};}
  }));
  const sessionFailure=results.some((x:any)=>{try{return JSON.parse(x.body)?.hata==='oturum';}catch{return false;}});
  return json({ok:true,results,...(sessionFailure?{hata:'oturum'}:{})});
}

// Bounded, short-lived cache for public words/lesson text, never progress,
// balances, sessions, students or permission decisions.
export function contentCache(json:any){
  const entries=new Map<string,any>();
  return async function(req:Request,key:string,load:any){
    let entry=entries.get(key);
    if(!entry||Date.now()-entry.at>60000){
      if(entries.size>=200)entries.delete(entries.keys().next().value!);
      entry={at:Date.now(),promise:(async()=>{
        const data=await load(),body=JSON.stringify(data);
        const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body));
        const version=Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,'0')).join('');
        return {data,version};
      })()};entries.set(key,entry);
    }
    try{
      const {data,version}=await entry.promise;
      const response=json(data);
      response.headers.set('X-Diji-Content-Version',version);
      response.headers.set('Access-Control-Expose-Headers','X-Diji-Content-Version');
      response.headers.set('Cache-Control','private, no-store');
      if(new URL(req.url).searchParams.get('_contentVersion')===version)
        return new Response(null,{status:304,headers:response.headers});
      return response;
    }catch(e){if(entries.get(key)===entry)entries.delete(key);throw e;}
  };
}
