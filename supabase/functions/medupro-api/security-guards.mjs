// Pure API perimeter helpers; no secret material, authentication or network.
export async function readJsonBounded(req,maxBytes=262144){
 if(!req.body)return {ok:true,data:{}};
 const advertised=Number(req.headers.get('content-length')||0);
 if(Number.isFinite(advertised)&&advertised>maxBytes)return {ok:false,status:413};
 const reader=req.body.getReader();
 let length=0;
 const chunks=[];
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   length+=value.byteLength;
   if(length>maxBytes){await reader.cancel().catch(()=>{});return {ok:false,status:413};}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const all=new Uint8Array(length);let pos=0;
 for(const chunk of chunks){all.set(chunk,pos);pos+=chunk.length;}
 try{
  const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
  if(!data||typeof data!=='object'||Array.isArray(data))return {ok:false,status:400};
  return {ok:true,data};
 }catch{return {ok:false,status:400};}
}
const anonymousLimits=Object.freeze({
 giris:[180,900,25,900],ogretmenGiris:[80,900,20,900],
 googleGiris:[120,900,0,0],googleBagla:[120,900,20,900],
 googleKayit:[60,3600,10,3600],
 kayitOl:[120,3600,0,0],ogretmenKayitOl:[40,3600,0,0],
 sifreSifirlamaIste:[50,3600,10,3600],sifreSifirla:[80,900,0,0]
});
const authenticatedLimits=Object.freeze({
 routeGraduations:[30,300],verifiedGameStatus:[120,300],verifiedGameStart:[60,300],verifiedGameAnswer:[1200,300],seviyeOyunOdulu:[80,300],
 seviyeParkurPekistirme:[90,300],
 dersTestSonucKaydet:[60,300],
 sifremiDegistir:[15,900],
 ogrenciSifreSifirla:[25,900],
 activeTime:[180,300],
 companionSummary:[120,300],companionDialogueOpen:[60,300],companionDialogueAnswer:[180,300],companionPlanStep:[60,300],teacherLearningSummary:[60,300],
 wordReviewAdd:[60,300],wordReviewList:[120,300],wordReviewAnswer:[180,300],
 ekVeriKaydet:[120,300]
});
export function anonymousBudgets(op,ip,identity){
 const rule=anonymousLimits[op];if(!rule)return [];
 const normalized=String(identity||'').trim().toLocaleLowerCase('tr').slice(0,160);
 const plans=ip&&ip!=='bilinmiyor'?[{scope:'ip:'+op,value:String(ip),max:rule[0],seconds:rule[1]}]:[];
 if(normalized&&rule[2]>0)plans.push({scope:'account:'+op,value:normalized,max:rule[2],seconds:rule[3]});
 return plans;
}
export function authenticatedBudgets(op,subject,body){
 const plans=[],rule=authenticatedLimits[op];
 if(rule)plans.push({scope:'student:'+op,value:String(subject),max:rule[0],seconds:rule[1]});
 if(op==='ekonomi')plans.push({scope:'student:ekonomi',value:String(subject),max:180,seconds:300});
 if(op==='ekonomi'&&body?.is==='parkurAdim')
   plans.push({scope:'student:parkurAdim',value:String(subject),max:180,seconds:300});
 return plans;
}

// Device saves may customize presentation, never mint rewards or authorize SQL.
const serverStateKeys=Object.freeze(['totalXp','xpGun','log','haftaHedef','hedefOdul',
 'dmRewardVersion','dmParkurMigration','dmAltinGun','odulGunluk']);
export function protectStudentState(incoming,stored,now=Date.now()){
 const result={...incoming};
 delete result.dmProgressProtocol;
 for(const key of serverStateKeys){
  if(Object.hasOwn(stored||{},key))result[key]=structuredClone(stored[key]);
  else delete result[key];
 }
 // Refresh the league from trusted day logs; freezing the old league would
 // prevent legitimate server rewards from appearing in the new week.
 const local=new Date(now+3*3600000),today=local.toISOString().slice(0,10);
 local.setUTCDate(local.getUTCDate()-(local.getUTCDay()+6)%7);
 const monday=local.toISOString().slice(0,10),thursday=new Date(local);
 thursday.setUTCDate(thursday.getUTCDate()+3);
 const year=thursday.getUTCFullYear(),yearStart=Date.UTC(year,0,1);
 const week=year+'-H'+Math.ceil(((thursday.getTime()-yearStart)/86400000+1)/7);
 const logged=Object.entries(stored?.log||{}).filter(([day])=>day>=monday&&day<=today)
  .reduce((sum,[,xp])=>sum+(Number.isFinite(Number(xp))?Math.max(0,Number(xp)):0),0);
 const old=stored?.lig||{};
 result.lig={...structuredClone(old),hafta:week,xp:Math.max(logged,old.hafta===week?Number(old.xp)||0:0)};
 result.guncelleme=Math.max(now,Number(stored?.guncelleme||0)+1);
 return result;
}
export function reservedStudentKey(key){
 return ['yo_gunluk','puan_gorulen','weekly_target','learner_profile_v1','placement_start_v1','start_point_v1','progress_mail_consent_v1'].includes(key)||String(key).startsWith('energy_daily:')||['review_word:','practice_dialogue:','practice_plan:','member_login:','streak_shield:','streak_free_shield:','mission_daily_claim:','mission_weekly_claim:'].some(prefix=>String(key).startsWith(prefix));
}
export function dailyGoalCredit(state,day){
 const goal=[30,50,100,150].includes(Number(state.hedef))?Number(state.hedef):50;
 const earned=state.xpGun?.tarih===day?Number(state.xpGun.xp):0;
 return state.hedefOdul!==day&&Number.isFinite(earned)&&earned>=goal?5:0;
}
