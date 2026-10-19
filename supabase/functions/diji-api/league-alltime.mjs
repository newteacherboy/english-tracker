/* Total XP is server-owned. No weekly table or historic maximum participates. */
export async function allTimeLeague(db, visibility, viewer, levelOf, isPublic) {
 const students=[];
 for(let start=0;;start+=1000){
  const result=await db.from('students').select('id,username,class_no').eq('status','approved').eq('role','student').order('id').range(start,start+999);
  if(result.error)throw result.error;
  const page=result.data||[];students.push(...page.filter(isPublic));if(page.length<1000)break;
 }
 const visible=await visibility(students,viewer),totals=new Map();
 for(let start=0;start<visible.length;start+=100){
  const result=await db.from('extra_data').select('student_id,totalXp:value->totalXp').eq('key_name','yo').in('student_id',visible.slice(start,start+100).map(s=>s.id));
  if(result.error)throw result.error;
  for(const row of result.data||[]){const xp=Number(row.totalXp);totals.set(row.student_id,Number.isFinite(xp)?Math.max(0,Math.trunc(xp)):0);}
 }
 return visible.map(s=>({id:s.id,name:s.username,class:s.class_no||'',xp:totals.get(s.id)||0,level:levelOf(totals.get(s.id)||0),league:'efsaneler'}))
  .filter(s=>s.level>=15)
  .sort((a,b)=>b.xp-a.xp||a.name.localeCompare(b.name,'tr')||a.id.localeCompare(b.id))
  .map((s,i)=>({...s,rank:i+1}));
}
