const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const routeSource=fs.readFileSync('ingilizce/oyna-v2.js','utf8');
const schoolSource=fs.readFileSync('ingilizce/school-journey.js','utf8');
const friendsSource=fs.readFileSync('ingilizce/friends-ui.js','utf8');
const sql=fs.readFileSync('supabase/migrations/20261017162000_feed_school_and_purchases.sql','utf8');

function routeFixture(){
 const c={yo:{dmLearningPurpose:'school',altin:200,storyProgress:[1]},aktifOgrenciAdi:'deneme',
  document:{getElementById:()=>null,querySelector:()=>null,addEventListener:()=>{}},
  setTimeout,clearTimeout,console};c.window=c;c.addEventListener=()=>{};c.saves=0;c.opens=0;c.yoKaydet=()=>c.saves++;c.dunyaAc=async()=>{c.opens++};
 vm.createContext(c);vm.runInContext(routeSource,c);return c;
}
test('first transient parkur save failure retries then changes route on first click',async()=>{
 const c=routeFixture();let attempts=0;
 c.yoHemenKaydet=async()=>{attempts++;if(attempts===1)throw Error('temporary conflict');};
 assert.equal(await c.dmLearningRoute.set('independent'),true);
 assert.equal(attempts,2);assert.equal(c.yo.dmLearningPurpose,'independent');
 assert.equal(c.opens,1);assert.equal(c.yo.altin,200);assert.equal(c.yo.storyProgress[0],1);
});
test('persistent save failure rolls route selection back without opening changed route',async()=>{
 const c=routeFixture();let attempts=0;c.yoHemenKaydet=async()=>{attempts++;throw Error('offline');};
 assert.equal(await c.dmLearningRoute.set('independent'),false);
 assert.equal(attempts,3);assert.equal(c.yo.dmLearningPurpose,'school');assert.equal(c.opens,0);
});
function schoolFixture(){
 const appended=[],listeners={},document={
  getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
  createElement:tag=>({tag,style:{},dataset:{}}),
  head:{append:e=>appended.push(e)},addEventListener:(k,fn)=>{listeners[k]=fn}
 };
 const c={window:null,document,localStorage:{getItem:()=>null,setItem:()=>{}},console};
 c.window=c;c.dmLearningRoute={purpose:()=> 'school'};
 c.dmParkurSahne=()=>'<div class="rt-root rt-school"><section class="rt-week"></section></div>';
 vm.createContext(c);vm.runInContext(schoolSource,c);return {c,appended};
}
test('school route uses 8 learning-style accordion grades and different mascots',()=>{
 const {c,appended}=schoolFixture();
 const rows=[
 {b:0,d:0,label:'2. sınıf 1. ünite · 1 / 3',available:true,done:true},
 {b:0,d:1,label:'2. sınıf 1. ünite · 2 / 3',available:true},
 {b:1,d:0,label:'3. sınıf 1. ünite · 1 / 3',available:false}];
 const grades=c.dmSchoolJourney.group(rows);
 assert.equal(grades.length,8);assert.equal(grades[1].total,2);assert.equal(grades[1].completed,1);assert.equal(grades[2].total,1);
 const html=c.dmParkurSahne({steps:rows,current:1,allSteps:rows});
 assert.match(html,/rt-school-main/);assert.match(html,/data-school-appearance="day"/);assert.match(html,/ml-summary-ring/);assert.doesNotMatch(html,/rt-school-mini-grades/);
 assert.match(html,/2\. Sınıf/);assert.match(html,/3\. Sınıf/);assert.match(html,/data-school-open/);
 const mascots=[...html.matchAll(/learning-assets\/characters\/([^/]+)\.webp/g)].map(m=>m[1]);
 assert(new Set(mascots).size>=4,'different characters must appear across grade controls');
 assert(appended.some(e=>e.href==='school-journey.css?v=20261017-1'));
 assert(appended.some(e=>e.href==='school-adventure-v2.css?v=20261017-2'));
 assert.match(html,/data-school-b="0" data-school-d="1"/);
});
test('feed phrases gain escaped color accents, untrusted HTML remains text',()=>{
 const body=friendsSource.slice(friendsSource.indexOf('  function feedHighlights('),friendsSource.indexOf('  const norm ='));
 assert(body.includes('strong class="fr-feed-key'));
 const c={};vm.createContext(c);
 vm.runInContext("const esc=x=>String(x??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));"+body+"this.render=feedHighlights;",c);
 const result=c.render('Macera Haritası · 3. sınıf, 2. ünite tamamladı! <img src=x onerror=alert(1)>');
 assert.match(result,/fr-feed-key/);assert.match(result,/&lt;img/);assert.doesNotMatch(result,/<img/);
});
test('purchase and school event triggers are server-backed, not client-made awards',()=>{
 assert.match(sql,/new\.class_no not between 1 and 8/);
 assert.match(sql,/new\.kind='purchase'/);
 assert.match(sql,/perform public\.dm_feed_publish\(sid,'purchase:/);
 assert.match(sql,/delete from public\.feed_events where event_type='route_complete'/);
 assert.doesNotMatch(sql,/delete from public\.level_completions/);
});
test('league transitions use daily dedupe and account-specific snapshots',()=>{
 const code=fs.readFileSync('ingilizce/league-momentum.js','utf8');
 assert.match(code,/const KEY='dm\.league\.momentum\.v1:'/);
 assert.match(code,/current\.seen\.includes\(id\)/);
 assert.match(code,/current\.rank<before\.rank/);
 assert.match(code,/snapshot\.pending=null/);
 assert.match(fs.readFileSync('ingilizce/league-momentum.css','utf8'),/prefers-reduced-motion/);
});

test('school launch and quiz styles use separate day/night palettes and changing mascot art',()=>{
 const css=fs.readFileSync('ingilizce/school-adventure-v2.css','utf8');
 assert.match(css,/\.sp-adventure-entry\.dm-school-start/);
 assert.match(css,/#bzPerde#bzPerde#bzPerde\.rq-approved\.dm-school-game/);
 assert.match(css,/data-school-appearance="night"/);
 assert.match(css,/--dm-school-question-art/);
 assert.match(css,/\.sp-question-board::before/);
 assert.match(schoolSource,/sessionStorage\.setItem\('dm-school-last-intro-character'/);
 assert.match(schoolSource,/function decorateQuestion/);
 assert.match(schoolSource,/function launchStep/);
 assert.doesNotMatch(schoolSource,/window\.dmSchoolStopOpen\?\./);
});
