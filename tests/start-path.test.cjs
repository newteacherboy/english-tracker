const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const SP=require('../supabase/functions/diji-api/start-path.mjs'),{thematicSummary}=require('../supabase/functions/diji-api/start-path-access.mjs');
const DATA=require('../supabase/functions/thematic-learning/curriculum.json');
const independent=(extra={})=>({version:1,purpose:'independent',ageBand:'adult',educationStage:'',goal:'daily',startChoice:'new',knownLevel:'A1',...extra});

test('every edge function carries the same rule module and chapter levels',()=>{
 const base=fs.readFileSync('supabase/functions/diji-api/start-path.mjs','utf8');
 for(const dir of ['medupro-api','thematic-learning'])assert.equal(fs.readFileSync(`supabase/functions/${dir}/start-path.mjs`,'utf8'),base,dir);
 assert.equal(fs.readFileSync('supabase/functions/medupro-api/start-path-access.mjs','utf8'),fs.readFileSync('supabase/functions/diji-api/start-path-access.mjs','utf8'));
 const levels={A1:[],A2:[],B1:[],B2:[]};DATA.chapters.forEach(c=>levels[c.cefr].push(c.id));
 for(const dir of ['diji-api','medupro-api'])assert.deepEqual(require(`../supabase/functions/${dir}/thematic-levels.json`),levels,dir);
});

test('accounts without a v1 profile stay fully open',()=>{
 const p=SP.computeStartPath({classNo:6});
 assert.deepEqual([p.legacy,p.maxGrade,p.maxCefr,p.startGrade],[true,8,'B2',6]);
});

test('class maps to CEFR: 1–4 → A1, 5–8 → A2; an independent beginner gets classes 1–4',()=>{
 for(const [cls,cefr] of [[1,'A1'],[4,'A1'],[5,'A2'],[8,'A2']]){const p=SP.computeStartPath({profile:{...independent(),purpose:'school'},classNo:cls});assert.deepEqual([p.mode,p.startGrade,p.maxGrade,p.maxCefr],['grade',cls,cls,cefr]);}
 const p=SP.computeStartPath({profile:independent()});assert.deepEqual([p.startGrade,p.maxGrade,p.startCefr,p.maxCefr],[1,4,'A1','A1']);
});

test('learning route: B1 opens after every A2 chapter, never above the open level; first chapter of an open level is free',()=>{
 const profile=independent({startChoice:'known',knownLevel:'A2'}),chapters=DATA.chapters;
 const firstB1=chapters.find(c=>c.cefr==='B1').id,firstA2=chapters.find(c=>c.cefr==='A2').id,secondA2=chapters.filter(c=>c.cefr==='A2')[1].id;
 let p=SP.computeStartPath({profile,thematic:thematicSummary([])});
 assert.equal(p.maxCefr,'A2');
 assert.equal(SP.thematicChapterProblem(p,chapters,firstA2,()=>false),'');
 assert.match(SP.thematicChapterProblem(p,chapters,secondA2,()=>false),/önceki bölümü/);
 assert.match(SP.thematicChapterProblem(p,chapters,firstB1,()=>false),/B1 bölümleri/);
 const rows=chapters.filter(c=>c.cefr==='A2').map(c=>({chapter:c.id,completed:true}));
 p=SP.computeStartPath({profile,thematic:thematicSummary(rows)});
 assert.equal(p.maxCefr,'B1');assert.equal(SP.thematicChapterProblem(p,chapters,firstB1,()=>false),'');
});

test('nothing already played is locked again',()=>{
 const p=SP.computeStartPath({profile:{...independent(),purpose:'school'},classNo:2,done:[260155],thematic:thematicSummary([{chapter:DATA.chapters.find(c=>c.cefr==='B1').id,completed:false}])});
 assert.equal(p.maxGrade,6);assert.equal(p.maxCefr,'B1');
});

test('high school and university learners get the whole school route and start by CEFR level',()=>{
 for(const stage of ['high','university']){const p=SP.computeStartPath({profile:{...independent({startChoice:'known',knownLevel:'A2'}),purpose:'school',educationStage:stage}});assert.deepEqual([p.maxGrade,p.startGrade,p.startCefr,p.maxCefr],[8,5,'A2','A2'],stage);}
});

test('classes below the start class are fully open; from the start class up stops stay in order',()=>{
 const path={startGrade:3,maxGrade:3},ctx={units:[[210151,210152,220151,220152],[230151,230152,240151]],done:[]};
 assert.equal(SP.schoolStopProblem(path,ctx,210152),'','second stop of class 1 without the first');
 assert.equal(SP.schoolStopProblem(path,ctx,220152),'','class 2 in any order');
 assert.equal(SP.schoolStopProblem(path,ctx,230151),'','first stop of the start class');
 assert.match(SP.schoolStopProblem(path,ctx,230152),/önceki durağı/);
 assert.match(SP.schoolStopProblem(path,ctx,240151),/4\. sınıf/);
});

test('class 1–8 learners need the starting test for the learning route, even if they played it before',()=>{
 const school={...independent(),purpose:'school',educationStage:'middle'},firstA1=DATA.chapters[0];
 let p=SP.computeStartPath({profile:school,classNo:7,thematic:thematicSummary([])});
 assert.equal(p.learningRoute,'needs-test');assert.match(SP.thematicChapterProblem(p,DATA.chapters,firstA1.id,()=>false),/seviye testini/);
 assert.equal(SP.computeStartPath({classNo:7,thematic:thematicSummary([])}).learningRoute,'needs-test','legacy accounts with a class too');
 assert.equal(SP.computeStartPath({profile:school,classNo:7,thematic:thematicSummary([{chapter:1000,completed:false}])}).learningRoute,'needs-test','already started still needs the test');
 assert.equal(SP.computeStartPath({classNo:7,thematic:thematicSummary([{chapter:3,completed:true}])}).learningRoute,'needs-test','old story progress too');
 assert.equal(SP.computeStartPath({profile:independent(),thematic:thematicSummary([])}).learningRoute,'open','independent learners');
 assert.equal(SP.computeStartPath({profile:{...school,educationStage:'high'},thematic:thematicSummary([])}).learningRoute,'open','high school has no 1–8 class');
 const old={version:'starting-point-20261018-v1',total:24,level:'B1',completedAt:'2026-10-20T12:36:00Z'},placement={...old,completedAt:'2026-10-20T12:38:00Z'};
 assert.equal(SP.computeStartPath({profile:school,classNo:7,placement:old}).learningRoute,'needs-test','a test from before the rule does not count');
 assert.equal(SP.computeStartPath({classNo:7,placement:old}).learningRoute,'needs-test','legacy accounts too');
 assert.equal(SP.computeStartPath({profile:school,classNo:7,placement:old}).maxCefr,'B1','an old test still opens its lessons');
 p=SP.computeStartPath({profile:school,classNo:7,placement,thematic:thematicSummary([])});
 assert.deepEqual([p.learningRoute,p.startCefr,p.maxCefr,p.startGrade],['open','B1','B1',7],'after the test the learning route starts at the result; the school route stays at the class');
 assert.equal(SP.computeStartPath({profile:school,classNo:7,placement,choice:{level:'A2'}}).startCefr,'A2','a lower chosen start wins');
 assert.equal(SP.computeStartPath({classNo:7,placement,choice:{level:'A2'}}).startCefr,'A2','legacy accounts honour the chosen start too');
});
