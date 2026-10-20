/* Where a learner starts and how far the school route, Ders Çalış and the
   learning route are open. Pure: the same file is copied into thematic-learning.
   Rules (approved 20 Oct 2026):
   - Lower grades / CEFR levels are always open; higher ones are locked.
   - School learners start at their class; the class also sets the CEFR level
     (1–4 → A1, 5–8 → A2). High school and university learners get the whole
     1–8 school route; their start follows their CEFR level.
   - "Seviyemi biliyorum" starts at the chosen CEFR level; the starting test
     recommends a level and the learner may start at or below it. Skipping the
     test means A1.
   - A higher grade opens when every stop of the current highest grade is done.
     A higher CEFR level opens when every lesson test or every learning-route
     stop of the current highest level is done, or when a new test result says so.
   - Accounts without a v1 learner profile (created before this rule) stay fully
     open, and nothing a learner has already played is ever locked again.
   - Learners with a class 1–8 on their account (school profile or a legacy
     account) reach the learning route only after the starting test (approved
     20 Oct 2026, 15:16 and 15:37). Only a test completed after the rule
     started (LEARNING_TEST_FROM) counts; their earlier learning-route progress
     was reset on 20 Oct 2026 while earned XP and gold stayed (17:18).
     After a test the learning route starts at the result unless the learner
     chose a lower level. */
export const CEFR=['A1','A2','B1','B2'];
const rank=c=>CEFR.indexOf(c);
export const gradeToCefr=g=>g>=5?'A2':'A1';
const cefrToMaxGrade=c=>rank(c)<=0?4:8;
const cefrToStartGrade=c=>[1,5,7,7][Math.max(0,rank(c))];
const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v&&typeof v==='object'?v:null;};
const stopClass=stop=>Math.floor((Number(stop)-200000)/10000);
const gradeOf=n=>{n=Number(n);return Number.isInteger(n)&&n>=1&&n<=8?n:0;};

export const LEARNING_TEST_FROM='2026-10-20T12:37:00Z'; // 15:37 Europe/Istanbul
export function learningTestValid(value){const r=parse(value);return !!placementLevel(value)&&Date.parse(r.completedAt)>=Date.parse(LEARNING_TEST_FROM);}
export function placementLevel(value){
 const r=parse(value);
 if(!r||r.version!=='starting-point-20261018-v1'||r.total!==24||!Number.isFinite(Date.parse(r.completedAt)))return '';
 const level=r.studyUnlockedLevel||(r.level==='Başlangıç'?'A1':r.level);
 return rank(level)<0?'':level;
}

/* profile: learner_profile_v1 value; classNo: students.class_no;
   placement: placement_start_v1 value; choice: start_point_v1 value;
   lessons: dm_progress_context().lessons (lessons[X] = level before X complete);
   done/units: school route progress from dm_progress_context;
   thematic: {complete:{A1:bool,...}, played:['A1',...]} from the learning route. */
export function computeStartPath({profile,classNo,placement,choice,lessons,done,units,thematic}={}){
 const p=parse(profile),cls=gradeOf(classNo),test=placementLevel(placement),freshTest=learningTestValid(placement),doneSet=new Set((done||[]).map(Number));
 const playedGrade=Math.max(0,...[...doneSet].map(stopClass).filter(g=>g>=1&&g<=8));
 const playedCefr=Math.max(-1,...(thematic?.played||[]).map(rank));
 if(!p||p.version!==1){
  const start=rank(parse(choice)?.level)>=0&&rank(parse(choice)?.level)<=Math.max(rank(test),0)?parse(choice).level:test||'A1';
  return {legacy:true,mode:'open',startGrade:cls||1,maxGrade:8,startCefr:start,maxCefr:'B2',testLevel:test,learningRoute:cls>0&&!freshTest?'needs-test':'open'};
 }
 const school=p.purpose==='school'&&cls>0,wholeRoute=p.purpose==='school'&&['high','university'].includes(p.educationStage);
 const mode=p.startChoice==='test'?'test':p.startChoice==='known'?'level':school?'grade':'level';
 const base=mode==='test'?(test||'A1'):p.startChoice==='known'&&rank(p.knownLevel)>=0?p.knownLevel:school?gradeToCefr(cls):'A1';
 let top=Math.max(rank(base),rank(test),playedCefr,0);
 const levelDone=i=>!!lessons?.[CEFR[i+1]]||!!thematic?.complete?.[CEFR[i]];
 while(top<3&&levelDone(top))top++;
 let maxGrade=Math.max(wholeRoute?8:school?cls:cefrToMaxGrade(CEFR[top]),playedGrade);
 const classStops=g=>(units||[]).flat().map(Number).filter(s=>stopClass(s)===g);
 const classDone=g=>{const list=classStops(g);return list.length>0&&list.every(s=>doneSet.has(s));};
 while(maxGrade<8&&classDone(maxGrade))maxGrade++;
 top=Math.max(top,rank(gradeToCefr(maxGrade)));
 const maxCefr=CEFR[top];
 const chosen=parse(choice)?.level;
 const ceiling=mode==='test'?Math.max(rank(test),0):top;
 const startCefr=rank(chosen)>=0&&rank(chosen)<=ceiling?chosen:test&&rank(test)<=ceiling?test:base;
 const startGrade=Math.min(maxGrade,school?cls:cefrToStartGrade(startCefr));
 const learningRoute=school&&!freshTest?'needs-test':'open';
 return {legacy:false,mode,startGrade,maxGrade,startCefr,maxCefr,testLevel:test,learningRoute};
}

export const cefrOpen=(path,code)=>rank(code)>=0&&rank(code)<=rank(path.maxCefr);
export function studyAccess(path){return Object.fromEntries(CEFR.map(c=>[c,cefrOpen(path,c)]));}

/* School route stop check: '' when allowed, otherwise a Turkish reason.
   Classes below the start class are fully open: any stop, any order.
   From the start class up, stops stay in order; the first stop of an open class is free. */
export function schoolStopProblem(path,ctx,stop){
 stop=Number(stop);
 const door=(ctx.units||[]).findIndex(row=>row.includes(stop));
 if(!Number.isInteger(stop)||door<0)return 'Geçerli parkur durağı gerekli.';
 const cls=stopClass(stop);
 if(cls>path.maxGrade)return cls+'. sınıf, '+path.maxGrade+'. sınıfın tüm durakları bitince açılır.';
 if(cls<Number(path.startGrade||1))return '';
 const list=ctx.units[door],prev=list[list.indexOf(stop)-1],done=ctx.done||[];
 if(!done.includes(stop)&&prev!==undefined&&stopClass(prev)===cls&&!done.includes(prev))return 'Önce önceki durağı tamamla.';
 return '';
}

/* Learning route chapter check, given the chapters in route order with their cefr. */
export function thematicChapterProblem(path,chapters,id,isDone){
 const i=chapters.findIndex(c=>c.id===id);if(i<0)return 'Geçersiz bölüm.';
 if(path.learningRoute==='needs-test')return 'Öğrenme Yolu için önce 24 soruluk seviye testini çöz. Okul Yolum’da sınıfından devam edebilirsin.';
 const c=chapters[i],prev=chapters[i-1];
 if(!cefrOpen(path,c.cefr))return c.cefr+' bölümleri, '+path.maxCefr+' tamamlanınca veya başlangıç testiyle açılır.';
 if(prev&&prev.cefr===c.cefr&&!isDone(prev.id))return 'Önce bir önceki bölümü tamamla.';
 return '';
}
