export function createRewardClient(win, endpoint) {
 const sessions=new Map();
 async function request(body, expectedToken) {
  const token=win.localStorage.getItem('ing_token');
  if(expectedToken && token!==expectedToken)throw Error('Öğrenci oturumu değişti.');
  if(!token)throw Error('Öğrenci girişi gerekli.');
  const r=await win.fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-diji-token':token},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  const result=await r.json();
  if(expectedToken && win.localStorage.getItem('ing_token')!==expectedToken)throw Error('Öğrenci oturumu değişti.');
  if(!r.ok)throw Error(result.error||'Ödül doğrulanamadı.');return result;
 }
 return {
  async create(kind){const token=win.localStorage.getItem('ing_token');const intent=await request({action:'create',kind,requestKey:crypto.randomUUID()},token);sessions.set(intent.id,token);return intent;},
  async cancel(id){return request({action:'cancel',id},sessions.get(id));},
  async settle(id){
   for(let n=0;n<12;n++) {
    const result=await request({action:'status',id},sessions.get(id));
    if(result.claimed)return result;
    await new Promise(r=>setTimeout(r,2000));
   }
   return {claimed:false,pending:true}; // Google may send a late proof. Never award speculatively.
  }
 };
}
