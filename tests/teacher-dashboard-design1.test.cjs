'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('ingilizce/teacher-workspace.js','utf8');
const css=fs.readFileSync('ingilizce/teacher-dashboard-selected.css','utf8');
const index=fs.readFileSync('ingilizce/index.html','utf8');
const assets='ingilizce/teacher-dashboard-assets';
function mount(){
 const dom=new JSDOM('<!doctype html><html><head></head><body><main id="tpTeacherHome"><div class="tp-home-inner"><section id="mount"></section></div></main></body></html>',{url:'https://app.dijimedu.com/ingilizce/',runScripts:'outside-only'});
 const w=dom.window,calls=[];w.__calls=calls;
 w.dmTeacherPortalParkur=()=>calls.push('parkur');
 w.dmTeacherClassesOpen=()=>calls.push('classes');
 w.dmTeacherReportsOpen=()=>calls.push('class-reports');
 const start=source.indexOf('function dmMidnightHome('),end=source.indexOf('\nfunction dmHome(){',start);
 assert.ok(start>=0&&end>start,'mount function preserved');
 w.eval('(()=>{const token=()=>\'teacher-test-token\';let dmAdminRoleToken=\'\',dmAdminRoleVerified=false;'+
  'const dmStudentList=()=>window.__calls.push(\'students\'),'+
  'dmOpenCanonicalOral=()=>window.__calls.push(\'oral\'),'+
  'dmReportDialog=()=>window.__calls.push(\'reports\'),'+
  'openOwnedTool=key=>window.__calls.push(\'owned:\'+key),'+
  'dmUseTool=key=>window.__calls.push(\'tool:\'+key);'+
  source.slice(start,end)+';window.renderApprovedHome=dmMidnightHome;})()');
 const board=w.document.querySelector('#mount');
 w.renderApprovedHome(board,key=>calls.push('route:'+key));
 return {dom,w,board,calls,close:()=>w.close()};
}
test('approved visual uses 21 separate safe, valid SVG assets, all referenced artwork exists',()=>{
 const names=['cap','people','people-add','school','mic','chart','clipboard','megaphone','chat','games','books','home','book','bolt','leaf','plus-minus','trophy','report','sparkle','arrow-right','laurel'];
 for(const name of names){
  const svg=fs.readFileSync(path.join(assets,name+'.svg'),'utf8');
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/,name);
  assert.match(svg,/<\/svg>\s*$/,name);
  assert.doesNotMatch(svg,/<script|onload=|onerror=|<foreignObject|javascript:/i,name);
  const manifest=JSON.parse(fs.readFileSync('docs/media-rights-manifest.json','utf8'));
  const record=manifest.assets.find(r=>r.path==='ingilizce/teacher-dashboard-assets/'+name+'.svg');
  assert.ok(record,name+' needs a provenance record');
  assert.equal(record.status,'original-vector');
  assert.equal(record.bytes,Buffer.byteLength(svg));
  assert.equal(record.sha256,createHash('sha256').update(svg).digest('hex'));

 }
 assert.match(source,/teacher-dashboard-selected\.css\?v=20261115-design1/);
 assert.ok(index.includes('teacher-workspace.js?v=20261128-retire-papizzle-candy'));
 assert.match(css,/\.dm-midnight-actions\s*\{\s*display:grid!important;\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/teacher-dashboard-assets\/trophy\.svg/);
});
test('design 1 preserves 4 quick-access cards, 8 two-column actions, Papi, stats and personal Parkur',()=>{
 const f=mount();
 try{
  const b=f.board;
  assert.ok(b.classList.contains('dm-approved-home'));
  assert.ok(b.querySelector('.dm-approved-welcome>img[src="papi-help-v2.png"]'));
  assert.equal(b.querySelectorAll('.dm-midnight-stats button').length,2);
  assert.equal(b.querySelectorAll('.dm-midnight-shortcuts>button').length,4);
  assert.equal(b.querySelectorAll('.dm-midnight-actions>button').length,8);
  assert.deepEqual([...b.querySelectorAll('.dm-midnight-shortcuts>button strong')].map(x=>x.textContent),['Sözlü Yap','Sınıf Oluştur','Raporlar','Artı-Eksi Ver']);
  assert.deepEqual([...b.querySelectorAll('.dm-midnight-actions>button strong')].map(x=>x.textContent),['Ödev Ver','Sınıfına Duyuru Yap','Öğrenci Sohbetleri','Raporlar','Yarışma Yaptır','Konu Anlat','Sınıflarım','Sınıf Raporları']);
  for(const im of b.querySelectorAll('img[src$=".svg"]')){
   const local=path.join('ingilizce',im.getAttribute('src'));
   assert.ok(fs.existsSync(local),local);
   assert.equal(im.getAttribute('alt'),'');
  }
  assert.equal(b.querySelector('.dm-midnight-tools'),null,'regular teachers have no administrator-only tools');
  b.querySelector('[data-teacher-parkur-switch]').click();
  b.querySelector('[data-home-students]').click();
  b.querySelector('[data-home-classes]').click();
  assert.deepEqual(f.calls,['parkur','students','classes']);
 }finally{f.close()}
});
test('approved cards call the same working teacher handlers, never placeholder links',()=>{
 const f=mount();
 try{
  [...f.board.querySelectorAll('.dm-midnight-shortcuts>button')].forEach(x=>x.click());
  [...f.board.querySelectorAll('.dm-midnight-actions>button')].forEach(x=>x.click());
  assert.deepEqual(f.calls,[
   'oral','route:classroom','reports','owned:performance',
   'owned:legacyHomework','owned:legacyAnnouncement','tool:öğrenci sohbetleri','reports',
   'route:game','route:study','classes','class-reports'
  ]);
 }finally{f.close()}
});
