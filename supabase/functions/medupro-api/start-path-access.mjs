/* Loads the trusted inputs of computeStartPath for one student. Client-sent levels are never used. */
import {computeStartPath} from './start-path.mjs';
import LEVELS from './thematic-levels.json' with {type:'json'};
const CHAPTER_LEVEL=new Map(Object.entries(LEVELS).flatMap(([code,ids])=>ids.map(id=>[id,code])));
export function thematicSummary(rows){
 const done=new Set(),played=new Set();
 for(const r of rows||[]){const n=Number(r.chapter);if(n>=0&&n<80){played.add('A1');continue;} // old story route counts as learning-route progress
  const code=CHAPTER_LEVEL.get(n);if(!code)continue;played.add(code);if(r.completed)done.add(n);}
 return {played:[...played],complete:Object.fromEntries(Object.entries(LEVELS).map(([code,ids])=>[code,ids.every(id=>done.has(id))]))};
}
export async function loadStartPath(db,studentId,ctx){
 // One scoped read replaces three parallel PostgREST calls. No cache, mutations or
 // changed authorization: the existing server-scoped student ID is still mandatory.
 const [extras,student,story]=await Promise.all([
  db.from('extra_data').select('key_name,value').eq('student_id',studentId)
    .in('key_name',['learner_profile_v1','placement_start_v1','start_point_v1']),
  db.from('students').select('class_no').eq('id',studentId).maybeSingle(),
  db.from('papi_story_progress').select('chapter,completed').eq('student_id',studentId).limit(1000)
 ]);
 if(extras?.error)throw extras.error;
 if(student?.error)throw student.error;if(story?.error)throw story.error;
 const byKey=new Map((extras?.data||[]).map(row=>[row.key_name,row.value]));
 const profile=byKey.get('learner_profile_v1');
 const placement=byKey.get('placement_start_v1');
 const choice=byKey.get('start_point_v1');
 return computeStartPath({profile,classNo:student?.data?.class_no,placement,choice,lessons:ctx?.lessons,done:ctx?.done,units:ctx?.units,thematic:thematicSummary(Array.isArray(story?.data)?story.data:[])});
}
