// Yerel Postgres ile çalıştırılır (CI'da çalışmaz): node tests/rpc-reads-equivalence.pg.cjs deployment/rpc-reads-bildirim-duyuru.sql <seed>
// diji-api "bildirimlerim"/"duyurulariGetir" mantığı ile yeni SQL fonksiyonlarının birebir aynı sonucu verdiğini
// rastgele verilerle yerel Postgres'te karşılaştırır.
const {execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
const fs=require('node:fs');
const PG=['-h','/var/tmp/kota-pg','-p','55432','-U','postgres','-v','ON_ERROR_STOP=1','-qtAX'];
const sql=(q,db='kota')=>execFileSync('psql',[...PG,'-d',db],{input:q,encoding:'utf8',maxBuffer:1e8});
const sqlFile=(f,db='kota')=>execFileSync('psql',[...PG,'-d',db,'-f',f],{encoding:'utf8'});
const json=q=>JSON.parse(sql(q).trim()||'null');

sql('drop database if exists kota','postgres');sql('create database kota','postgres');
sql(`
do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end$$;
create schema dm_private;
create table public.teachers(id uuid primary key, is_admin boolean, active boolean, username text);
create table public.students(id uuid primary key, username text, status text, role text, frozen_at timestamptz, profile jsonb, phone text, email text, class_no int, branch text, teacher_id uuid, created_at timestamptz default now());
create table public.portal_sessions(id uuid primary key default gen_random_uuid(), token_hash text unique, role text, student_id uuid, teacher_id uuid, expires_at timestamptz, last_seen_at timestamptz, teacher_portal_access_id uuid, teacher_portal_version int);
create table public.notifications(id uuid primary key, recipient_student_id uuid, sender_student_id uuid, type text, title text, message text, payload jsonb, read_at timestamptz, created_at timestamptz);
create table public.announcements(id uuid primary key, title text, message text, image_link text, target_type text, target_list jsonb, display_limit int, theme text, active boolean, created_at timestamptz, teacher_id uuid);
create table public.announcement_reads(id uuid primary key default gen_random_uuid(), announcement_id uuid, student_id uuid, seen_at timestamptz);
create table public.dm_social_controls(student_id uuid primary key, guardian_email text, pin_hash text, verified_at timestamptz, social_enabled boolean, profile_visible boolean, messages_enabled boolean, duels_enabled boolean, gifts_enabled boolean, suspended_until timestamptz, notice_seen_at timestamptz, updated_at timestamptz);
create table public.student_blocks(blocker_id uuid, blocked_id uuid, created_at timestamptz);
create table public.dm_release_flags(code text primary key, enabled boolean, updated_at timestamptz);
do $$begin if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if; end$$;
create function public.dm_progress_league() returns jsonb language sql stable set search_path to '' as $f$ select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',username,'xp',0) order by username,id),'[]') from public.students where status='approved' $f$;
create table public.extra_data(id bigserial primary key, student_id uuid, key_name text, value jsonb, updated_at timestamptz, unique(student_id,key_name));
CREATE FUNCTION public.student_contacts_complete(p_phone text, p_email text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO '' AS $f$
 select coalesce(regexp_replace(p_phone,'[^0-9]','','g') ~ '^(05[0-9]{9}|905[0-9]{9})$',false)
    and coalesce(trim(p_email) ~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$',false); $f$;
`);
for(const f of process.argv[2].split(','))sqlFile(f);

// ---------- rastgele veri ----------
let seed=Number(process.argv[3]||7);const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
const pick=a=>a[Math.floor(rnd()*a.length)];const uuid=()=>crypto.randomUUID();const maybe=p=>rnd()<p;
const DEMO_ID='dcde2026-1015-4000-8000-000000000001';
const teachers=Array.from({length:4},(_,i)=>({id:uuid(),is_admin:i===0||maybe(.2),active:maybe(.85),username:'t'+i}));
const names=['Işıl','IRMAK','İrem','ırmak','Barış','sudenaz ünlü','Duygu','ali','ALİ','Ilgın','dijimedu_demo','Zeynep · Öğretmen Denemesi a1b2c3d4','Kaan · Misafir 0a1b2c3d'];
const students=Array.from({length:40},(_,i)=>({id:i===0?DEMO_ID:uuid(),username:(i<names.length?names[i]:'ogr'+i)+(i>=names.length?'':''),status:pick(['approved','approved','approved','pending']),role:maybe(.95)?'student':'teacher',frozen_at:maybe(.1)?new Date().toISOString():null,profile:maybe(.1)?{teacher_portal_guest:true}:{},phone:pick(['05321234567','0532 123 45 67','905321234567','12345','',null]),email:pick(['a@b.co',' x@y.com ','kötü',null,'']),class_no:pick([null,0,5,6,7,8]),branch:pick([null,'A','B','ı','I']),teacher_id:maybe(.6)?pick(teachers).id:null}));
students[0].username='dijimedu_demo';
const ids=students.map(s=>s.id);
const controls=students.filter(()=>maybe(.5)).map(s=>({student_id:s.id,social_enabled:pick([true,false,null]),profile_visible:pick([true,false,null]),messages_enabled:pick([true,false,null]),duels_enabled:pick([true,false,null]),gifts_enabled:pick([true,false,null]),suspended_until:pick([null,null,new Date(Date.now()+864e5).toISOString(),new Date(Date.now()-864e5).toISOString()])}));
const blocks=Array.from({length:25},()=>({blocker_id:pick(ids),blocked_id:pick(ids)}));
let t0=Date.parse('2026-10-01T00:00:00Z');
const notifs=Array.from({length:900},()=>({id:uuid(),recipient_student_id:pick(ids),sender_student_id:maybe(.8)?pick(ids):null,type:pick(['mesaj','hediye','enerji','duello','takip','begeni','tebrik','odev','bilgi']),title:null,message:'m'+Math.floor(rnd()*1e6),payload:pick([{},null,{duyuruId:'x1'},{duyuruId:0},{duyuruId:''},{duyuruId:5},{target_name:'dijimedu_demo'},{student_name:'Ayşe · Öğretmen Denemesi deadbeef'},{duyuruId:false}]),read_at:maybe(.4)?new Date(t0).toISOString():null,created_at:new Date(t0+=Math.floor(rnd()*600000)+1000).toISOString()}));
const anns=Array.from({length:30},()=>({id:uuid(),title:'b',message:'m',image_link:pick([null,'','http://x']),target_type:pick(process.env.ONLYTARGET?['sinif','sube','ogrenci',null,'baska']:['all','tumogrenciler','herkes','ogretmen','sinif','sube','ogrenci',null,'baska']),target_list:pick([['5','6'],[5],['5|A','6|ı','5|i'],['IRMAK','ışıl','irem',' ali '],'notarray',null,['7|']]),display_limit:pick([null,0,3]),theme:pick([null,'','yesil']),active:maybe(.8),created_at:new Date(t0+=Math.floor(rnd()*600000)+1000).toISOString(),teacher_id:maybe(.5)?pick(teachers).id:null}));
const reads=Array.from({length:40},()=>({announcement_id:pick(anns).id,student_id:pick(ids)}));
const ins=(t,rows)=>{if(rows.length)sql(`insert into public.${t} select * from jsonb_populate_recordset(null::public.${t}, $J$${JSON.stringify(rows)}$J$::jsonb)`);};
ins('teachers',teachers);ins('students',students);ins('dm_social_controls',controls);ins('student_blocks',blocks);ins('notifications',notifs);ins('announcements',anns);
for(const r of reads)sql(`insert into public.announcement_reads(announcement_id,student_id) values('${r.announcement_id}','${r.student_id}')`);

// Ham satırları PostgREST'in vereceği biçimde (to_json) geri oku
const T=t=>json(`select coalesce(json_agg(x),'[]') from public.${t} x`);
const DB={students:T('students'),teachers:T('teachers'),controls:T('dm_social_controls'),blocks:T('student_blocks'),notifications:T('notifications'),announcements:T('announcements'),reads:T('announcement_reads')};

// ---------- diji-api referans mantığı (index.ts / social-safety.mjs / demo-account.ts'den) ----------
const encName=v=>String(v||'').trim().toLocaleLowerCase('tr');
const arr=v=>Array.isArray(v)?v:[];
function allowed(c,feature='social',now=Date.now()){return (!c||c.social_enabled!==false)&&!(Date.parse(c?.suspended_until||'')>now)&&(feature==='social'||c?.[feature+'_enabled']!==false)&&(feature!=='profile'||c?.profile_visible!==false);}
function publicParticipant(row){const r=row||{},rids=[r.id,r.student_id,r.sender_student_id,r.receiver_student_id,r.target_student_id,r.player_a,r.player_b];
 const nm=[r.username,r.student_name,r.ogrenci,r.isim,r.name,r.sender?.username,r.receiver?.username,r.students?.username,r.a?.username,r.b?.username,r.payload?.target_name,r.payload?.student_name];
 return !r.profile?.teacher_preview&&!nm.some(x=>/ · Öğretmen Denemesi [a-f0-9]{8}$/.test(String(x||'')))&&!rids.includes(DEMO_ID)&&r.actor_key!=='s:'+DEMO_ID&&!nm.some(x=>String(x||'').trim().toLowerCase()==='dijimedu_demo');}
function visibility(idsIn,viewer){const unique=[...new Set(idsIn.filter(Boolean))];if(!unique.length)return {controls:new Map(),blocked:new Set()};
 const frozen=DB.students.filter(s=>unique.includes(s.id)&&s.frozen_at!=null);const r=DB.controls.filter(c=>unique.includes(c.student_id));
 let blocked=new Set();if(viewer){blocked=new Set(DB.blocks.filter(b=>b.blocker_id===viewer||b.blocked_id===viewer).map(x=>x.blocker_id===viewer?x.blocked_id:x.blocker_id));}
 return {controls:new Map([...r.map(c=>[c.student_id,c]),...frozen.map(s=>[s.id,{social_enabled:false}])]),blocked};}
function filterNotifications(rows,viewer){const v=visibility(rows.flatMap(x=>[x.sender_student_id,viewer]),viewer);return rows.filter(x=>{if(!x.sender_student_id)return true;const f=x.type==='mesaj'?'messages':['hediye','enerji'].includes(x.type)?'gifts':'duels';return allowed(v.controls.get(viewer),f)&&allowed(v.controls.get(x.sender_student_id),f)&&!v.blocked.has(x.sender_student_id);});}
function refBildirim(s,tumu){
 let data=DB.notifications.filter(n=>n.recipient_student_id===s.id&&(tumu||n.read_at==null)).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,200)
  .map(n=>({...n,sender:n.sender_student_id?{username:DB.students.find(x=>x.id===n.sender_student_id)?.username}:null}));
 return {liste:filterNotifications(data,s.id).filter(publicParticipant).map(x=>({sat:x.id,tarih:x.created_at,gonderen:x.sender?.username||'',tur:x.type,metin:x.message,okundu:!!x.read_at,duyuruId:x.payload?.duyuruId||null}))};
}
function refDuyuru(s){
 const data=DB.announcements.filter(a=>a.active).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
 const gordu=new Set(DB.reads.filter(r=>r.student_id===s.id).map(r=>r.announcement_id));
 const Yids=new Set(DB.teachers.filter(t=>t.is_admin===true&&t.active===true).map(t=>t.id));
 const hedefte=x=>{const L=arr(x.target_list).map(v=>String(v)),yon=!x.teacher_id||Yids.has(x.teacher_id);
  if(!yon&&x.teacher_id!==s.teacher_id)return false;
  if(['all','tumogrenciler','herkes'].includes(x.target_type))return true;
  if(x.target_type==='ogretmen')return true;
  if(x.target_type==='sinif')return L.includes(String(s.class_no||''));
  if(x.target_type==='sube')return L.map(encName).includes(encName(`${s.class_no||''}|${s.branch||''}`));
  return L.map(encName).includes(encName(s.username));};
 const d=data.find(x=>!gordu.has(x.id)&&hedefte(x));
 return d?{id:d.id,baslik:d.title,mesaj:d.message,hedefTipi:d.target_type,gosterimSinir:d.display_limit||0,tema:d.theme||'mavi',aktif:'evet',tarih:d.created_at,gorselLink:d.image_link||''}:null;
}
const canon=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort()):x);
let fails=0,checks=0;
const same=(label,a,b)=>{checks++;if(canon(a)!==canon(b)){fails++;if(fails<6)console.log('FARK',label,'\n SQL:',canon(a).slice(0,400),'\n REF:',canon(b).slice(0,400));}};
for(const s of DB.students){
 same('bildirim tumu '+s.username,json(`select dm_private.bildirim_liste('${s.id}',true)`),refBildirim(s,true).liste);
 same('bildirim okunmamis '+s.username,json(`select dm_private.bildirim_liste('${s.id}',false)`),refBildirim(s,false).liste);
 same('duyuru '+s.username,json(`select dm_private.duyuru_icin('${s.id}')`),refDuyuru(s));
}

// ---------- oturum kapısı: hangi oturumlar SQL'de cevaplanır, hangileri eski yola (fallback) gider ----------
const complete=(p,e)=>/^(05[0-9]{9}|905[0-9]{9})$/.test(String(p??'').replace(/[^0-9]/g,''))&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e??'').trim());
const guest=s=>s?.profile?.teacher_portal_guest===true||/ · (?:Misafir|Öğretmen Denemesi) [a-f0-9]{8}$/.test(String(s?.username||''));
const lpV1=new Set();for(const s of DB.students)if(maybe(.3)){lpV1.add(s.id);sql(`insert into public.extra_data(student_id,key_name,value) values('${s.id}','learner_profile_v1','{"version":1}')`);}
for(const s of DB.students){
 const variants=[{role:'student',exp:'+1 hour',portal:null,name:s.username},{role:'student',exp:'-1 hour',portal:null,name:s.username},{role:'student',exp:'+1 hour',portal:uuid(),name:s.username},{role:'teacher',exp:'+1 hour',portal:null,name:s.username},{role:'student',exp:'+1 hour',portal:null,name:'baskasi'},{role:'student',exp:'+1 hour',portal:null,name:' '+s.username.toLocaleUpperCase('tr')+' '},{role:'student',exp:'+1 hour',portal:null,name:''}];
 for(const v of variants){
  const tok='tok-'+crypto.randomUUID()+'-'+crypto.randomUUID();
  sql(`insert into public.portal_sessions(token_hash,role,student_id,expires_at,teacher_portal_access_id) values(encode(sha256(convert_to('${tok}','UTF8')),'hex'),'${v.role}','${s.id}',now()+interval '${v.exp}',${v.portal?`'${v.portal}'`:'null'})`);
  const r=json(`select public.dm_read_bildirimler('${tok}',$N$${v.name}$N$,true)`);
  const okStudent=v.role==='student'&&v.exp==='+1 hour'&&!v.portal&&!s.frozen_at&&s.status==='approved'&&s.role==='student'&&!guest(s);
  const nameOk=!v.name||encName(v.name)===encName(s.username);
  const contactOk=complete(s.phone,s.email)||(lpV1.has(s.id)&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email||''));
  const expectServed=okStudent&&nameOk&&contactOk;
  checks++;if(!!r.data!==expectServed||(!r.data&&!r.fallback)){fails++;console.log('KAPI FARKI',s.username,v,r,{okStudent,nameOk,contactOk});}
  if(r.data)same('kapi bildirim '+s.username,r.data,refBildirim(s,true));
 }
}
// anon yetkisi: dahili fonksiyonlar dışarıya kapalı, okuma fonksiyonları açık
const priv=sql(`select string_agg(p.proname||':'||has_function_privilege('anon',p.oid,'execute'),',' order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='dm_private') or p.proname in ('dm_read_bildirimler','dm_read_duyuru')`).trim();
console.log('anon yetkileri:',priv);
checks++;if(!/dm_read_bildirimler:true/.test(priv)||!/dm_read_duyuru:true/.test(priv)||/(bildirim_liste|duyuru_icin|rpc_ogrenci|sosyal_izin|tr_ad):true/.test(priv)){fails++;console.log('YETKI FARKI');}

// ---------- lig, ek veri, sosyal görünürlük ----------
const filterStudents=(rows,viewer)=>{const v=visibility(rows.map(x=>x.id),viewer);return rows.filter(x=>x.id===viewer||allowed(v.controls.get(x.id),'profile')&&!v.blocked.has(x.id));};
// yeni edge visibility(): tek RPC sonucundan aynı Map/Set
function fromRpc(r,viewer){return {controls:new Map([...(r.controls||[]).map(c=>[c.student_id,c]),...(r.frozen||[]).map(id=>[id,{social_enabled:false}])]),blocked:new Set(viewer?(r.blocks||[]).map(x=>x.blocker_id===viewer?x.blocked_id:x.blocker_id):[])};}
const ser=v=>({controls:[...v.controls.entries()].sort((a,b)=>a[0]<b[0]?-1:1).map(([k,c])=>[k,{social_enabled:c.social_enabled,profile_visible:c.profile_visible,messages_enabled:c.messages_enabled,duels_enabled:c.duels_enabled,gifts_enabled:c.gifts_enabled,suspended_until:c.suspended_until??undefined}]),blocked:[...v.blocked].sort()});
for(let i=0;i<60;i++){
 const subset=DB.students.filter(()=>maybe(.4)).map(s=>s.id),viewer=maybe(.85)?pick(ids):null;
 if(!subset.length)continue;
 const r=json(`select public.dm_social_visibility(array[${subset.map(x=>`'${x}'`).join(',')}]::uuid[],${viewer?`'${viewer}'`:'null'})`);
 const refV=visibility(subset,viewer);
 // edge Map'te sadece kontrolleri karşılaştır (sıra önemsiz); suspended_until biçimini Date ile eşitle
 const norm=v=>{const o=ser(v);o.controls=o.controls.map(([k,c])=>[k,{...c,suspended_until:c.suspended_until?Date.parse(c.suspended_until):undefined}]);return o;};
 same('gorunurluk '+i,norm(fromRpc(r,viewer)),norm(refV));
}
const DEMO_ID_LIG=DEMO_ID;
const league=json(`select public.dm_progress_league()`);
const gw=json(`select coalesce(json_agg(x),'[]') from public.extra_data x`);
// ek veri satırları: farklı biçimler
for(const s of DB.students){
 if(maybe(.6))sql(`insert into public.extra_data(student_id,key_name,value,updated_at) values('${s.id}','yo',$J$${JSON.stringify(pick([{altin:5,haftaHedef:{h:'2026-10-12',xp:1000}},{altin:1,'2':'x',a:{b:[1,2.5,'ç']}},{totalXp:12.0},{},{haftaHedef:null},{haftaHedef:{h:'2026-10-26'}}]))}$J$,now()-interval '${Math.floor(rnd()*99)} minutes') on conflict (student_id,key_name) do update set value=excluded.value`);
 if(maybe(.5))sql(`insert into public.extra_data(student_id,key_name,value) values('${s.id}','weekly_target',$J$${JSON.stringify(pick([{h:'2026-10-19',xp:1500},{h:'2026-10-05'},{h:''},{xp:1}]))}$J$) on conflict (student_id,key_name) do update set value=excluded.value`);
 if(maybe(.4))sql(`insert into public.extra_data(student_id,key_name,value) values('${s.id}','seviye',$J$${JSON.stringify(pick([{n:3},'metin',[1,2],5,null]))}$J$) on conflict (student_id,key_name) do update set value=excluded.value`);
}
const ED=json(`select coalesce(json_agg(x),'[]') from public.extra_data x`);
const metinVer=v=>v==null?"":typeof v==="string"?v:JSON.stringify(v);
function refEkVeri(s,key,tanitim){ // index.ts ekVeriGetir
 const row=ED.find(r=>r.student_id===s.id&&r.key_name===key);let data=row?{value:row.value,updated_at:row.updated_at}:null;
 if(key==='yo'){const goal=ED.find(r=>r.student_id===s.id&&r.key_name==='weekly_target');
  if(goal?.value?.h){let state=data?.value||{};if(typeof state==='string'){try{state=JSON.parse(state);}catch{state={};}}
   if(!state.haftaHedef||goal.value.h>=state.haftaHedef.h)state={...state,haftaHedef:goal.value};data={value:state,updated_at:data?.updated_at||null};}}
 if(key==='yo'&&tanitim)return {deger:data?metinVer(data.value):null,guncelleme:data?.updated_at||null,kayitTarihi:s.created_at||null};
 return data?{deger:metinVer(data.value),guncelleme:data.updated_at}:null;
}
const clientEkVeri=require(process.env.EKVERI_JS);
for(const s of DB.students){
 const tok='tok-'+crypto.randomUUID()+'-'+crypto.randomUUID();
 sql(`insert into public.portal_sessions(token_hash,role,student_id,expires_at) values(encode(sha256(convert_to('${tok}','UTF8')),'hex'),'student','${s.id}',now()+interval '1 hour')`);
 const sFull=json(`select row_to_json(x) from public.students x where id='${s.id}'`);
 const lig=json(`select public.dm_read_lig('${tok}','')`);
 const vc=DB.controls.find(c=>c.student_id===s.id);
 if(lig.data){checks++;if(!allowed(vc,'social')){fails++;console.log('LIG sosyal kapalı ama cevaplandı',s.username);}
  same('lig '+s.username,lig.data,{ok:true,liste:filterStudents(league,s.id)});}
 checks++;if(!json(`select public.dm_read_lig('${tok}','alltime')`).fallback){fails++;console.log('alltime fallback degil');}
 for(const [key,tan] of [['yo',false],['yo',true],['seviye',false],['yok',false],['',false]]){
  const r=json(`select public.dm_read_ekveri('${tok}',$N$${s.username}$N$,'${key}')`);
  if(r.fallback)continue;
  same('ekveri '+key+tan+' '+s.username,clientEkVeri(r.data,key,tan),refEkVeri(sFull,key,tan));
 }
}
sql(`insert into public.dm_release_flags(code,enabled) values('duyurular',false)`);
{const s=DB.students.find(x=>x.status==='approved'&&x.role==='student'&&!x.frozen_at&&complete(x.phone,x.email)&&!guest(x));
 if(s){const tok='tok-'+crypto.randomUUID()+'-'+crypto.randomUUID();sql(`insert into public.portal_sessions(token_hash,role,student_id,expires_at) values(encode(sha256(convert_to('${tok}','UTF8')),'hex'),'student','${s.id}',now()+interval '1 hour')`);
  checks++;if(!json(`select public.dm_read_duyuru('${tok}','')`).fallback){fails++;console.log('duyuru bayragi uygulanmadi');}}}
console.log(`kontrol: ${checks}, fark: ${fails}`);process.exit(fails?1:0);
