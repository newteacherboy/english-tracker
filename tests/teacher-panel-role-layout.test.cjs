'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

const workspace=fs.readFileSync('ingilizce/teacher-workspace.js','utf8');
const portal=fs.readFileSync('ingilizce/teacher-portal.js','utf8');
const css=fs.readFileSync('ingilizce/teacher-portal.css','utf8');
const index=fs.readFileSync('ingilizce/index.html','utf8');
const sw=fs.readFileSync('ingilizce/sw.js','utf8');

function extract(source,first,last){
 const start=source.indexOf(first),end=source.indexOf(last,start);
 assert.ok(start>=0&&end>start,'Expected function bounds '+first);
 return source.slice(start,end);
}
test('normal teachers have no all-tools section or administrator buttons, even with stale device flag',()=>{
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://app.dijimedu.com/ingilizce/?ogretmen=1',runScripts:'outside-only'});
 const w=dom.window;
 w.sessionStorage.setItem('ing_ogr_yonetici','1'); // stale old admin session must not expose tools
 w.dmAdminGiftOpen=()=>{};w.dmAdminAdsOpen=()=>{};w.dmAdminPushOpen=()=>{};
 w.dmTeacherClassesOpen=()=>{};w.dmTeacherReportsOpen=()=>{};
 const source=extract(workspace,'function dmMidnightHome(','function dmHome(){');
 w.eval("(()=>{const token=()=> 'regularTeacher';let dmAdminRoleToken='',dmAdminRoleVerified=false;"+
   "const dmStudentList=()=>{},dmOpenCanonicalOral=()=>{},dmReportDialog=()=>{},openOwnedTool=()=>{},dmUseTool=()=>{};"+
   source+";window.testRenderTeacher=dmMidnightHome;})()");
 const board=w.document.createElement('section');w.document.body.append(board);
 w.testRenderTeacher(board,()=>{});
 assert.equal(board.querySelector('.dm-midnight-tools'),null);
 assert.equal(board.textContent.includes('Tüm araçlar'),false);
 assert.equal(board.textContent.includes('Hediye Üyelik'),false);
 board.dmSyncAdminTools(false);
 assert.equal(board.querySelector('.dm-midnight-tools'),null);
 board.dmSyncAdminTools(true); // server-verified admin response
 assert.equal(board.querySelectorAll('.dm-midnight-tools').length,1);
 for(const name of ['Hediye Üyelik','Reklam Ayarları','Bildirim Gönder'])assert.ok(board.textContent.includes(name));
 board.dmSyncAdminTools(true);
 assert.equal(board.querySelectorAll('.dm-midnight-tools').length,1,'no repeat on refresh');
 board.dmSyncAdminTools(false);
 assert.equal(board.querySelector('.dm-midnight-tools'),null,'role revoked or account switched');
 assert.match(workspace,/dmAdminRoleVerified=info\.yonetici===true/);
 assert.match(workspace,/dmAdminRoleToken===current/);
 w.close();
});

test('classroom cards are deduplicated without removing the original working actions',()=>{
 const dom=new JSDOM('<div class="tp-real-tools">'+
 '<button data-dash="league"><strong>Sınıfım</strong></button>'+
 '<button data-dash="classes"><strong>Sınıflarım</strong></button>'+
 '<button data-dash="classReports"><strong>Sınıf Raporları</strong></button>'+
 '<button data-dash="oral"><strong>Sözlü Yap</strong></button>'+
 '<button data-native-title="🏆 Sınıfım"><strong>Sınıfım</strong></button>'+
 '<button data-native-title="🏫 Sınıflarım"><strong>Sınıflarım</strong></button>'+
 '<button data-native-title="📊 Sınıf Raporları"><strong>Sınıf Raporları</strong></button>'+
 '</div>',{runScripts:'outside-only'});
 const w=dom.window;
 const source=extract(portal,'function canonicalDashboardTool(','function paginateDashboard(){');
 w.eval('(()=>{'+source+';window.removeRepeatedTools=dedupeDashboardTools;})()');
 const tiles=w.document.querySelector('.tp-real-tools');
 w.removeRepeatedTools(tiles);
 assert.deepEqual([...tiles.children].map(b=>b.dataset.dash),['league','classes','classReports','oral']);
 w.removeRepeatedTools(tiles);
 assert.equal(tiles.children.length,4,'re-running is harmless');
 assert.match(portal,/dedupeDashboardTools\(tiles\);paginateDashboard/);
 w.close();
});

test('account screen uses the compact layout and preserves code/invite handlers',()=>{
 assert.match(portal,/class="tp-settings-chevron" aria-hidden="true"/);
 assert.ok(!portal.includes('<small>Kod değiştir · Şifre sıfırla · Hesap değiştir · Çıkış</small>'));
 for(const id of ['cogK1','cogK2','cogCreateStudents'])assert.ok(portal.includes("'"+id+"'"));
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/\.tp-approved-code>button\{/);
 assert.match(css,/\.tp-account-settings>summary/);
 assert.match(css,/\[data-teacher-identity\] #cogOgretmenKart\[hidden\]/);
 assert.ok(index.includes('teacher-workspace.js?v=20261128-retire-papizzle-candy'));
 assert.match(index,/teacher-portal\.css\?v=20261127-teacher-dock-fix/);
 assert.match(sw,/const SURUM = 'diji-v\d+-[^']+'/);
});

test('administrator scripts never create controls from stale sessionStorage in regular teacher accounts',async()=>{
 for(const [file,attr] of [
  ['admin-gift.js','dmg'],['admin-ads.js','dma'],['admin-push.js','dmn'],['admin-online.js','dmo']
 ]){
  const script=fs.readFileSync('ingilizce/'+file,'utf8');
  const dom=new JSDOM('<!doctype html><html><body><main id="tpDashboard"><div class="tp-real-tools"></div></main></body></html>',
   {url:'https://app.dijimedu.com/ingilizce/?ogretmen=1',runScripts:'outside-only'});
  const w=dom.window;
  w.dmTeacherPortalMode=true;
  w.sessionStorage.setItem('ing_ogr_yonetici','1'); // previous account may have been admin
  w.sessionStorage.setItem('dm_tp_session',JSON.stringify({teacherToken:'regular-teacher'}));
  w.eval(script);
  const tiles=w.document.querySelector('.tp-real-tools');
  tiles.append(w.document.createElement('span'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(tiles.querySelector('[data-'+attr+']'),null,file+' must hide with unverified role');
  w.dmTeacherVerifiedAdmin=true;w.dmTeacherVerifiedAdminToken='regular-teacher';
  w.dispatchEvent(new w.Event('dm:teacher-admin-role-verified'));
  assert.ok(tiles.querySelector('[data-'+attr+']'),file+' renders for verified administrator');
  w.dmTeacherVerifiedAdmin=false;
  w.dispatchEvent(new w.Event('dm:teacher-admin-role-verified'));
  assert.equal(tiles.querySelector('[data-'+attr+']'),null,file+' removes card on revoked role');
  w.close();
 }
});

test('three module exports remain intact without injecting any duplicate class buttons',async()=>{
 const dom=new JSDOM('<!doctype html><html><body><main id="tpDashboard">'+
  '<div class="tp-real-tools">'+
  '<button type="button" data-dash="league"><strong>Sınıfım</strong></button>'+
  '<button type="button" data-dash="classes"><strong>Sınıflarım</strong></button>'+
  '<button type="button" data-dash="classReports"><strong>Sınıf Raporları</strong></button>'+
  '</div></main></body></html>',
  {url:'https://app.dijimedu.com/ingilizce/?ogretmen=1',runScripts:'outside-only'});
 const w=dom.window;
 for(const [file,exportName] of [
  ['teacher-league.js','dmTeacherLeagueOpen'],
  ['teacher-classes.js','dmTeacherClassesOpen'],
  ['teacher-reports.js','dmTeacherReportsOpen']
 ]){
  const source=fs.readFileSync('ingilizce/'+file,'utf8');
  assert.doesNotMatch(source,/function addTile\(\)/,'old module injection removed: '+file);
  assert.doesNotMatch(source,/MutationObserver\(addTile\)/,'no automatic re-add loop: '+file);
  w.eval(source);
  assert.equal(typeof w[exportName],'function',file+' still opens its existing classroom tool');
 }
 const tiles=w.document.querySelector('.tp-real-tools');
 for(let i=0;i<3;i++){
  tiles.append(w.document.createElement('span')); // any DOM re-render
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(tiles.querySelectorAll('button').length,3,'class buttons are not re-injected');
 }
 assert.deepEqual([...tiles.querySelectorAll('button')].map(b=>b.dataset.dash),
  ['league','classes','classReports']);
 w.close();
});

test('pagination ignores old cached module buttons without triggering a re-injection loop',async()=>{
 const dom=new JSDOM('<!doctype html><html><body><main id="tpDashboard"><div class="tp-real-tools">'+
  '<button data-dash="league"><strong>Sınıfım</strong></button>'+
  '<button data-dash="classes"><strong>Sınıflarım</strong></button>'+
  '<button data-dash="classReports"><strong>Sınıf Raporları</strong></button>'+
  '</div><details class="tp-account-settings"></details></main></body></html>',
  {runScripts:'outside-only'});
 const w=dom.window,tiles=w.document.querySelector('.tp-real-tools');
 const start=portal.indexOf('function canonicalDashboardTool(');
 const end=portal.indexOf("window.addEventListener('resize',paginateDashboard);",start);
 assert.ok(start>=0&&end>start);
 w.eval('(()=>{'+portal.slice(start,end)+'window.checkTiles=paginateDashboard;})()');
 for(const [attr,title] of [['dml','Sınıfım'],['dmc','Sınıflarım'],['dmr','Sınıf Raporları']]){
  const b=w.document.createElement('button');b.setAttribute('data-'+attr,'1');
  b.innerHTML='<strong>'+title+'</strong>';
  tiles.prepend(b);
 }
 // An older module would add a missing tile whenever an existing tile is removed.
 const watched=new w.MutationObserver(()=>{
  if(!tiles.querySelector('[data-dml]')){
   const b=w.document.createElement('button');b.dataset.dml='1';b.textContent='Sınıfım';tiles.prepend(b);
  }
 });
 watched.observe(w.document.documentElement,{childList:true,subtree:true});
 w.checkTiles();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(tiles.querySelectorAll('[data-dml],[data-dmc],[data-dmr]').length,3);
 assert.ok([...tiles.querySelectorAll('[data-dml],[data-dmc],[data-dmr]')].every(b=>b.hidden));
 assert.deepEqual([...tiles.querySelectorAll('button:not([hidden])')].map(b=>b.dataset.dash),
   ['league','classes','classReports']);
 assert.equal(w.document.querySelector('.tp-tools-pager').hidden,true,'no phantom pagination page');
 w.checkTiles();
 assert.equal(tiles.querySelectorAll('[data-dml],[data-dmc],[data-dmr]').length,3);
 watched.disconnect();w.close();
});


test('approved Sınıfım design 1 keeps live data, tabs, search, class actions and premium restrictions',()=>{
 const source=fs.readFileSync('ingilizce/teacher-league.js','utf8');
 const html=fs.readFileSync('ingilizce/index.html','utf8');
 assert.match(source,/dml-class-banner/);
 assert.match(source,/dml-metrics/);
 assert.match(source,/dml-tabs/);
 assert.match(source,/dml-student-list/);
 assert.match(source,/data-add-students/);
 assert.match(source,/data-class-reports/);
 assert.match(source,/data-search/);
 assert.match(source,/data-filter/);
 assert.match(source,/data-expand/);
 assert.match(source,/window\.dmTeacherClassesOpen/);
 assert.match(source,/window\.dmTeacherReportsOpen/);
 assert.match(source,/window\.dmTeacherBulkStudentsOpen/);
 assert.match(source,/action: 'league'/);
 assert.match(source,/category\.hidden/);
 assert.match(source,/!d\.unlocked/);
 assert.match(source,/dml-board/);
 assert.match(source,/DESIGN_ONE_CSS/);
 assert.match(html,/teacher-league\.js\?v=20261115-design-one-1/);
 assert.match(html,/teacher-portal\.js\?v=20261128-branch-1/);
 assert.match(fs.readFileSync('ingilizce/sw.js','utf8'),/const SURUM = 'diji-v\d+-[^']+'/);
 assert.match(portal,/window\.dmTeacherBulkStudentsOpen = \(\) => openBulkStudents\(\)/);
});


test('approved admin teachers purple design preserves real approval, code, create and list workflows',()=>{
 const source=fs.readFileSync('ingilizce/teacher-portal.js','utf8');
 const html=fs.readFileSync('ingilizce/index.html','utf8');
 const sw=fs.readFileSync('ingilizce/sw.js','utf8');
 assert.match(source,/function attachTeacherApprovals/);
 assert.match(source,/data-tp-teacher-search/);
 assert.match(source,/data-tp-teacher-stats/);
 assert.match(source,/management\('requests'\)/);
 assert.match(source,/management\('codes'\)/);
 assert.match(source,/teacherPortalList/);
 assert.match(source,/teacherPortalDecide/);
 assert.match(source,/teacherPortalIssueCode/);
 assert.match(source,/teacherPortalAdminCreate/);
 assert.match(source,/data-create/);
 assert.match(source,/data-filter/);
 assert.match(source,/adminStyle/);
 assert.match(source,/email_verified_at/);
 assert.match(html,/teacher-portal\.js\?v=20261128-branch-1/);
 assert.match(sw,/const SURUM = 'diji-v\d+-[^']+'/);
});
