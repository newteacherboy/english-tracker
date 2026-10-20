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
 const one=async key=>{const r=await db.from('extra_data').select('value').eq('student_id',studentId).eq('key_name',key).maybeSingle();if(r.error)throw r.error;return r.data?.value;};
 const [profile,placement,choice,student,story]=await Promise.all([
  one('learner_profile_v1'),one('placement_start_v1'),one('start_point_v1'),
  db.from('students').select('class_no').eq('id',studentId).maybeSingle(),
  db.from('papi_story_progress').select('chapter,completed').eq('student_id',studentId).limit(1000)
 ]);
 if(student?.error)throw student.error;if(story?.error)throw story.error;
 return computeStartPath({profile,classNo:student?.data?.class_no,placement,choice,lessons:ctx?.lessons,done:ctx?.done,units:ctx?.units,thematic:thematicSummary(Array.isArray(story?.data)?story.data:[])});
}
