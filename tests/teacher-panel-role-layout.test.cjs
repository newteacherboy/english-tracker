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
 assert.ok(index.includes('teacher-workspace.js?v=20261115-role-home-1'));
 assert.ok(index.includes('teacher-portal.css?v=20261115-role-settings-1'));
 assert.ok(sw.includes('diji-v446-teacher-role-settings-20261115'));
});
