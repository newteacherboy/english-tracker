type DB={select:(table:string,params:Record<string,string>)=>Promise<any[]>,rpc:(name:string,body:any)=>Promise<any>};
const uuid=(v:any)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''));
export function oralHandler(db:DB){
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-diji-token,authorization,apikey','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const json=(d:any,status=200)=>new Response(JSON.stringify(d),{status,headers});
 return async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  try{
   const raw=await req.text();if(raw.length>4096)return json({ok:false,mesaj:'İstek çok büyük.'},413);let b:any;try{b=JSON.parse(raw);}catch{return json({ok:false,mesaj:'Geçersiz istek.'},400);}
   const token=String(b?.t||req.headers.get('x-diji-token')||'');if(!token||token.length>512)return json({ok:false,mesaj:'Öğretmen hesabına giriş yapın.'},401);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(v=>v.toString(16).padStart(2,'0')).join('');
   const [a]=await db.select('portal_sessions',{select:'role,teacher_id,expires_at',token_hash:'eq.'+hash,limit:'1'});
   if(a?.role!=='teacher'||!a.teacher_id||!Number.isFinite(Date.parse(a.expires_at))||Date.parse(a.expires_at)<=Date.now())return json({ok:false,mesaj:'Geçerli öğretmen oturumu gerekli.'},401);
   const [t]=await db.select('teachers',{select:'id,active,is_admin',id:'eq.'+a.teacher_id,limit:'1'});if(!t||t.active===false)return json({ok:false,mesaj:'Aktif öğretmen hesabı gerekli.'},403);
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
