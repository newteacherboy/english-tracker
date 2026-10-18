/* Read only the authenticated student's server-marked placement_start_v1 record. */
export function placementStudyAccess(value){
 let result=value;try{if(typeof result==='string')result=JSON.parse(result);}catch{return {level:'',levels:[]};}
 const levels=['A1','A2','B1','B2'];
 if(!result||result.version!=='starting-point-20261018-v1'||result.total!==24||!Number.isFinite(Date.parse(result.completedAt)))return {level:'',levels:[]};
 const level=result.studyUnlockedLevel||(result.level==='Başlangıç'?'A1':result.level),rank=levels.indexOf(level);
 return rank<0?{level:'',levels:[]}:{level,levels:levels.slice(0,rank+1)};
}
