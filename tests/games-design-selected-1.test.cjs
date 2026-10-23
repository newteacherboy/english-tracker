'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('ingilizce/activity-ui.js','utf8');
const css=fs.readFileSync('ingilizce/activity-ui.css','utf8');
test('approved game design 1 keeps five functioning original tab IDs and category actions',()=>{
 for(const id of ['ggSoloTab','ggOnlineTab','ggFreeTab','ggKonuTab','ggBreakTab']){
  assert.match(js,new RegExp('id="'+id+'"'));
 }
 assert.match(js,/role="tab"/);
 assert.match(js,/aria-selected/);
 assert.match(js,/data-gg-party/);
 for(const s of ['solo','duo','free','konu','break'])assert(js.includes("data-gg-party=\""+s+"\""));
});
test('all five games categories use distinct handmade 48x48 icon markup',()=>{
 for(const id of ['ggSoloTab','ggOnlineTab','ggFreeTab','ggKonuTab','ggBreakTab']){
  const tag=js.match(new RegExp('id="'+id+'"[\\s\\S]*?<svg[^>]*viewBox="0 0 48 48"'));
  assert(tag,'missing illustrated '+id);
 }
});
test('games-only design uses five-column compact tabs and a short Papi card',()=>{
 assert.match(css,/Approved Games landing design 1/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/min-height:104px!important/);
 assert.match(css,/gg-banner\{/);
 assert.match(css,/min-height:84px!important/);
 assert.match(css,/transform:none!important/);
 assert(!css.includes('.gg-page .gg-banner img{width:42%'));
});
