import catalog from './dialogues.json' with {type:'json'};
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export async function dialogueAction(db:any,actor:string,b:any){
 const action=String(b.action).replace(/^dialogue_/,'');let arg:any={};
 if(!['status','start','answer','finish'].includes(action))return {ok:false,code:'invalid'};
 if(action!=='status'){
  if(!uuid(b.runId))return {ok:false,code:'invalid'};arg.runId=b.runId;
 }
 if(action==='start'){
  const i=catalog.findIndex(d=>d.id===b.dialogueId);if(i<0)return {ok:false,code:'invalid'};
  const script=catalog[i];arg={...arg,script,first:i===0,after:[catalog[i-1]?.id,(script as any).legacyAfter].filter(Boolean)};
 }
 if(action==='answer'){
  if(!uuid(b.requestId)||!Number.isInteger(b.step)||b.step<0||typeof b.text!=='string'||!b.text.trim()||b.text.length>400)return {ok:false,code:'invalid'};
  arg={...arg,requestId:b.requestId,step:b.step,text:b.text.trim()};
 }
 const {data,error}=await db.rpc('dm_papi_dialogue',{actor,action,arg});if(error)throw Error('storage');return data;
}
