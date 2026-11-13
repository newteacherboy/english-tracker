// The contextual card reads one visible member, never the entire social directory.
import {memberStudents,isClassroomGuest} from './classroom-identity.mjs';
export function leagueWeek(now=new Date()) {
 const date=new Date(now.toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'})+'T00:00:00Z');
 date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
 return date.toISOString().slice(0,10);
}
export function currentStreak(keys,transactions,now=new Date()) {
 const today=now.toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'}),days=new Set(keys.map(x=>String(x.key_name).split(':')[1]));
 for(const x of transactions)days.add(new Date(x.created_at).toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'}));
 let count=0;const d=new Date(today+'T00:00:00Z');
 for(let i=0;i<370;i++){if(!days.has(d.toISOString().slice(0,10)))break;count++;d.setUTCDate(d.getUTCDate()-1);}
 return count;
}
export async function userCard(db,{viewer,target,filterStudents,publicParticipant,level,now}) {
 const name=String(target||'').trim();
 if(!name||name.length>150)return {status:400,ok:false,mesaj:'Geçerli bir kullanıcı seç.'};
 const result=await memberStudents(db.from('students').select('id,username,status,role,frozen_at,streak,profile')).eq('username',name).eq('role','student').eq('status','approved').is('frozen_at',null).maybeSingle();
 if(result.error)throw Error('Kullanıcı bilgisi alınamadı.');
 const s=result.data;
 if(!s||isClassroomGuest(s)||!publicParticipant(s)||!(await filterStudents([s],viewer)).length)return {status:404,ok:false,mesaj:'Kullanıcı bilgisi görüntülenemiyor.'};
 const [state,score,visits,legacy]=await Promise.all([
  db.from('extra_data').select('karakter:value->karakter,totalXp:value->totalXp').eq('student_id',s.id).eq('key_name','yo').maybeSingle(),
  db.rpc('dm_competitive_xp',{actor:s.id,week:leagueWeek(now)}),
  db.from('extra_data').select('key_name').eq('student_id',s.id).or('key_name.like.member_login:%,key_name.like.energy_daily:%,key_name.like.streak_shield:%').order('key_name',{ascending:false}).limit(1110),
  db.from('energy_transactions').select('created_at').eq('student_id',s.id).eq('reason','gunluk').order('created_at',{ascending:false}).limit(370)
 ]);
 if(state.error||score.error||visits.error||legacy.error)throw Error('Kullanıcı bilgisi alınamadı.');
 const l=level(Number(state.data?.totalXp)||0),xp=Number(score.data)||0;
 return {ok:true,name:s.username,level:l,streak:currentStreak(visits.data||[],legacy.data||[],now),character:state.data?.karakter||null,
  league:l<5?null:l>=15&&xp>=1800?'sampiyon':l>=10&&xp>=750?'super':'yerel'};
}
