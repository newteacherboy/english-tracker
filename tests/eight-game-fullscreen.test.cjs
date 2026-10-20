'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../ingilizce');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('eight mini-games load full-screen styles after existing art and routing',()=>{
 const html=read('index.html');
 assert(html.indexOf('eight-game-fullscreen.css')>html.indexOf('faithful-eight-games.css'));
 assert(html.indexOf('eight-game-fullscreen.js')>html.indexOf('faithful-eight-games.js'));
 assert.doesNotThrow(()=>new vm.Script(read('eight-game-fullscreen.js')));
 const css=read('eight-game-fullscreen.css');
 assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);
 assert(css.includes('height:100dvh!important'),'dynamic viewport');
 assert(css.includes('overscroll-behavior:contain'),'no native page scroll behind game');
 for(const id of ['jpOyunOverlay','yagmurOyunOverlay','kelimebulOyunOverlay','esOyunOverlay','trenOyunOverlay','harfBahcesiOverlay','yoModal'])assert(css.includes('#'+id+'.fg-fs-active'),id);
});
test('three answers keep native text content and separate visual A/B/C badges',()=>{
 const js=read('eight-game-fullscreen.js'),css=read('eight-game-fullscreen.css');
 assert(js.includes('span.textContent=text;'),'original choice text preserved');
 assert(js.includes('btn.replaceChildren(span);'));
 assert(js.includes("String.fromCharCode(65+index)"));
 assert(css.includes('content:attr(data-fg-choice)!important'));
 assert(css.includes('position:static!important'));
 assert(css.includes('flex:0 0 27px!important'));
 assert(css.includes('overflow-wrap:anywhere!important'));
 assert(css.includes('.fg-choice-text'));
});
test('distinct left back and right X preserve native close and avoid extra energy spend',()=>{
 const js=read('eight-game-fullscreen.js'),css=read('eight-game-fullscreen.css'),nav=read('play-navigation.js');
 assert(js.includes('close.click();'));
 assert(js.includes("if(!shown(root))window[open]();"));
 assert(js.includes("if(close.textContent!=='×')"),'prevent repeat navigation loops');
 assert(js.includes('ensureBack(yo,()=>nativeClose(yo)?.click())'),'do not start new expensive lesson');
 assert(css.includes('.fg-fs-back'));
 assert(css.includes('left:auto!important;right:calc(env(safe-area-inset-right'));
 assert(nav.includes("if(root.classList.contains('fg-fs-active'))return;"),'native X must not become a back button');
});
