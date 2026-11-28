'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const { JSDOM }=require('jsdom');

const boot=fs.readFileSync('ingilizce/teacher-portal-boot.js','utf8');
const sw=fs.readFileSync('ingilizce/sw.js','utf8');
const index=fs.readFileSync('ingilizce/index.html','utf8');

test('iOS teacher panel repairs admin icons even when cached index and teacher-portal.js are old',async()=>{
 const start=boot.indexOf(' // Self-healing teacher visuals.');
 const end=boot.indexOf(' const ss=window.sessionStorage',start);
 assert.ok(start>=0&&end>start,'Guard is part of the always-network-first teacher boot script');
 const source=boot.slice(start,end);
 const dom=new JSDOM(`<!doctype html><html><head></head><body>
 <main id="tpDashboard" class="tp-approved"><section class="tp-approved-welcome"><div class="tp-approved-intro">
 <div><h2>Merhaba <span>Yönetici</span>!</h2></div></div></section>
 <div class="tp-real-tools">
  <button><strong>Başka bir araç</strong></button>
  <button><span>⚙️</span><strong>Reklam Ayarları</strong></button>
  <button><span class="tp-approved-art tp-art-chart"></span><strong>Sınıf Raporları</strong></button>
 </div><div data-teacher-identity><div id="cogOgretmenKart"><div><button>Öğretmenler</button></div></div></div></main>
 </body></html>`,{url:'https://app.dijimedu.com/ingilizce/?ogretmen=1',runScripts:'outside-only'});
 const w=dom.window;
 w.eval('(()=>{'+source+'})()');
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const buttons=w.document.querySelectorAll('.tp-real-tools>button');
 assert.equal(buttons[1].querySelector('span').textContent,'📺');
 assert.ok(buttons[1].querySelector('span').classList.contains('tp-tool-fallback-icon'));
 assert.ok(!buttons[2].querySelector('span').classList.contains('tp-tool-fallback-icon'),'3D original artwork must stay intact');
 const css=w.document.getElementById('dmTeacherVisualGuard')?.textContent||'';
 assert.match(css,/tp-approved-welcome \.tp-approved-intro h2/);
 assert.match(css,/-webkit-text-fill-color:#073249!important/);
 assert.match(css,/#cogOgretmenKart>div>button/);
 const later=w.document.createElement('button');
 later.innerHTML='<span>⚙️</span><strong>Candy Papiş</strong>';
 w.document.querySelector('.tp-real-tools').append(later);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(later.querySelector('span').textContent,'🍬','Asynchronously inserted admin cards must be repaired');
 w.close();
});

test('teacher entry and teacher assets use network-first cache behavior',()=>{
 assert.match(sw,/const SURUM = 'diji-v\d+-[^']+'/);
 assert.match(sw,/teacher-portal\.css/);
 assert.match(sw,/teacher-assets\/approved-teacher-2\.webp/);
 assert.match(sw,/url\.searchParams\.get\('ogretmen'\) === '1'/);
 assert.match(index,/teacher-portal-boot\.js\?v=20261128-branch-1/);
 assert.match(index,/teacher-portal\.css\?v=20261127-teacher-dock-fix/);
});
