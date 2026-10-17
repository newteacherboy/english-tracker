// Pure API perimeter helpers; no secret material, authentication or network.
export async function readJsonBounded(req,maxBytes=262144){
 if(!req.body)return {ok:true,data:{}};
 const advertised=Number(req.headers.get('content-length')||0);
 if(Number.isFinite(advertised)&&advertised>maxBytes)return {ok:false,status:413};
 const reader=req.body.getReader();
 let length=0;
 const chunks=[];
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   length+=value.byteLength;
   if(length>maxBytes){await reader.cancel().catch(()=>{});return {ok:false,status:413};}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const all=new Uint8Array(length);let pos=0;
 for(const chunk of chunks){all.set(chunk,pos);pos+=chunk.length;}
 try{
  const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
  if(!data||typeof data!=='object'||Array.isArray(data))return {ok:false,status:400};
  return {ok:true,data};
 }catch{return {ok:false,status:400};}
}
const anonymousLimits=Object.freeze({
 giris:[180,900,25,900],ogretmenGiris:[80,900,20,900],
 googleGiris:[120,900,0,0],googleBagla:[120,900,20,900],
 googleKayit:[60,3600,10,3600],
 kayitOl:[120,3600,0,0],ogretmenKayitOl:[40,3600,0,0],
 sifreSifirlamaIste:[50,3600,10,3600],sifreSifirla:[80,900,0,0]
});
const authenticatedLimits=Object.freeze({
 seviyeOyunOdulu:[80,300],
 seviyeParkurPekistirme:[90,300],
 dersTestSonucKaydet:[60,300],
 sifremiDegistir:[15,900],
 ogrenciSifreSifirla:[25,900],
 activeTime:[180,300]
});
export function anonymousBudgets(op,ip,identity){
 const rule=anonymousLimits[op];if(!rule)return [];
 const normalized=String(identity||'').trim().toLocaleLowerCase('tr').slice(0,160);
 const plans=[{scope:'ip:'+op,value:String(ip||'unknown'),max:rule[0],seconds:rule[1]}];
 if(normalized&&rule[2]>0)plans.push({scope:'account:'+op,value:normalized,max:rule[2],seconds:rule[3]});
 return plans;
}
export function authenticatedBudgets(op,subject,body){
 const plans=[],rule=authenticatedLimits[op];
 if(rule)plans.push({scope:'student:'+op,value:String(subject),max:rule[0],seconds:rule[1]});
 if(op==='ekonomi'&&body?.is==='parkurAdim')
   plans.push({scope:'student:parkurAdim',value:String(subject),max:180,seconds:300});
 return plans;
}
