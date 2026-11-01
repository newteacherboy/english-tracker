type DB={select:(table:string,params:Record<string,string>)=>Promise<any[]>,rpc:(name:string,body:any)=>Promise<any>};
const uuid=(v:any)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''));
// Stop reading at the byte limit instead of buffering an unbounded request first.
async function readSmallJson(req:Request,maxBytes:number){
 if(Number(req.headers.get('content-length')||0)>maxBytes)return {ok:false,status:413};
 if(!req.body)return {ok:false,status:400};
 const reader=req.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
  if(size>maxBytes){void reader.cancel().catch(()=>{});return {ok:false,status:413};}chunks.push(value);
 }}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{const data=JSON.parse(await new Response(bytes).text());if(!data||typeof data!=='object'||Array.isArray(data))return {ok:false,status:400};return {ok:true,data};}
 catch{return {ok:false,status:400};}
}

export function oralHandler(db:DB){
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-diji-token,authorization,apikey','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const json=(d:any,status=200)=>new Response(JSON.stringify(d),{status,headers});
 return async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  try{
   const input=await readSmallJson(req,4096);if(!input.ok)return json({ok:false,mesaj:input.status===413?'İstek çok büyük.':'Geçersiz istek.'},input.status);const b:any=input.data;
   const token=String(b?.t||req.headers.get('x-diji-token')||'');if(!token||token.length>512)return json({ok:false,mesaj:'Öğretmen hesabına giriş yapın.'},401);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(v=>v.toString(16).padStart(2,'0')).join('');
   const [a]=await db.select('portal_sessions',{select:'role,teacher_id,expires_at,teacher_portal_access_id,teacher_portal_version',token_hash:'eq.'+hash,limit:'1'});
   if(a?.role!=='teacher'||!a.teacher_id||!Number.isFinite(Date.parse(a.expires_at))||Date.parse(a.expires_at)<=Date.now())return json({ok:false,mesaj:'Geçerli öğretmen oturumu gerekli.'},401);
   const [t]=await db.select('teachers',{select:'id,active,is_admin,username,frozen_at',id:'eq.'+a.teacher_id,limit:'1'});if(!t||t.active===false||t.frozen_at)return json({ok:false,mesaj:'Aktif öğretmen hesabı gerekli.'},403);
   if(a.teacher_portal_access_id){
    const [grant]=await db.select('teacher_portal_access',{select:'teacher_id,state,version,student_id',id:'eq.'+a.teacher_portal_access_id,limit:'1'});
    if(!grant||grant.teacher_id!==a.teacher_id||grant.state!=='approved'||grant.version!==a.teacher_portal_version)return json({ok:false,mesaj:'Öğretmen erişimi sona erdi.'},403);
    if(grant.student_id){
     const [owner]=await db.select('students',{select:'status,frozen_at,email_verified_at',id:'eq.'+grant.student_id,limit:'1'});
     if(!owner||owner.status!=='approved'||owner.frozen_at||!owner.email_verified_at)return json({ok:false,mesaj:'Aktif ve doğrulanmış öğretmen hesabı gerekli.'},403);
    }else if(t.username!=='teacher'||t.is_admin!==true)return json({ok:false,mesaj:'Öğretmen erişimi doğrulanamadı.'},403);
   }
   if(b.action==='setup'){
    const p:any={select:'id,username,class_no,branch',status:'eq.approved',role:'eq.student',order:'class_no,branch,username',limit:'6000'};if(!t.is_admin)p.teacher_id='eq.'+t.id;
    const pupils:any[]=[];for(let offset=0;offset<100000;offset+=1000){const batch=await db.select('students',{...p,limit:'1000',offset:String(offset)});pupils.push(...batch);if(batch.length<1000)break;}return json({ok:true,pupils});
   }
   if(['units','draw'].includes(b.action)&&(!Number.isInteger(b.classNo)||b.classNo<1||b.classNo>8))return json({ok:false,mesaj:'Sınıf seçin.'},400);
   if(b.action==='units'){
    const rows:any[]=[];for(let offset=0;offset<20000;offset+=1000){const batch=await db.select('word_bank',{select:'unit_no',active:'eq.true',class_no:'eq.'+b.classNo,order:'id',limit:'1000',offset:String(offset)});rows.push(...batch);if(batch.length<1000)break;}
    return json({ok:true,units:[...new Set(rows.map(w=>Number(w.unit_no)))].filter(n=>n>0).sort((a,b)=>a-b)});
   }
   if(b.action==='draw'){
    if(!uuid(b.studentId)||!uuid(b.requestId)||!Number.isInteger(b.unit)||b.unit<1||b.unit>100)return json({ok:false,mesaj:'Öğrenci ve ünite seçin.'},400);
    const d=await db.rpc('dm_oral_draw',{actor:t.id,pupil:b.studentId,grade:b.classNo,unit_id:b.unit,request_id:b.requestId});return json({...d,serverNow:new Date().toISOString()});
   }
   if(b.action==='grade'){
    if(!uuid(b.questionId)||typeof b.known!=='boolean')return json({ok:false,mesaj:'Geçerli soru ve cevap seçin.'},400);
    const d=await db.rpc('dm_oral_grade',{actor:t.id,question_id:b.questionId,known:b.known});return json({...d,serverNow:new Date().toISOString()});
   }
   return json({ok:false,mesaj:'Geçersiz işlem.'},400);
  }catch(e){const m=String((e as any)?.message||'');return json({ok:false,mesaj:/öğretmen|öğrenci|yetki|sınıf|ünite|hesap|soru|isteği/i.test(m)?m:'Sözlü işlemi tamamlanamadı. Tekrar deneyin.'},400);}
 };
}
