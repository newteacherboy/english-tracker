// Public curriculum only. No sessions, credentials, personal records or load tests.
const endpoint='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
const samples=[];
for(const compact of [false,true]){
 const url=new URL(endpoint);url.searchParams.set('islem','kelimelerGetir');if(compact)url.searchParams.set('compact','1');
 const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Public words HTTP '+r.status);
 const text=await r.text(),data=JSON.parse(text);if(!Array.isArray(data))throw Error('Expected public word array');
 samples.push({compact,rows:data.length,jsonBytes:Buffer.byteLength(text),wireBytes:Number(r.headers.get('content-length'))||null,encoding:r.headers.get('content-encoding'),version:r.headers.get('x-diji-content-version')});
 if(compact){url.searchParams.set('_contentVersion',samples[1].version);const unchanged=await fetch(url,{signal:AbortSignal.timeout(25000)});if(unchanged.status!==304)throw Error('Conditional word request did not return 304');samples.push({conditional:true,status:unchanged.status,bodyBytes:(await unchanged.arrayBuffer()).byteLength});}
}
if(samples[0].rows!==samples[1].rows)throw Error('Row count changed');
console.log(JSON.stringify({samples,jsonReductionPercent:Math.round(100*(1-samples[1].jsonBytes/samples[0].jsonBytes)),wireReductionPercent:samples[0].wireBytes&&samples[1].wireBytes?Math.round(100*(1-samples[1].wireBytes/samples[0].wireBytes)):null},null,2));
