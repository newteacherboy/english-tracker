// Açılış hızı: index.html'deki ön-yükleme bloğu, sayfadaki script/stil etiketleriyle aynı olmalı.
const {test}=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),fs=require('node:fs');
test('preload block matches every startup script and stylesheet',()=>{
 const out=execFileSync('python3',['scripts/build-preloads.py','--check'],{encoding:'utf8'});assert.match(out,/^ok \(\d+ kaynak\)/);
 const html=fs.readFileSync('ingilizce/index.html','utf8');
 assert.ok(html.indexOf('<!-- dm-preload:start')<html.indexOf('<body'),'preload block is in <head>');
 assert.ok(!/rel="preload"[^>]*data-dm-later/.test(html));
});
test('game-only stylesheets stay inactive during boot and are activated after it',()=>{
 const html=fs.readFileSync('ingilizce/index.html','utf8');
 const later=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)" media="print" data-dm-later>/g)].map(m=>m[1]);
 assert.ok(later.length>=15);
 assert.match(html,/window\.dmLateCss=go;document\.addEventListener\('dm:boot-ready',go/);
 assert.match(fs.readFileSync('ingilizce/lazy-games.js','utf8'),/window\.dmLateCss\?\.\(\)/);
});
