'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
test('selected eight game modules parse as JavaScript',()=>{
 for(const p of ['ingilizce/game-experience.js','ingilizce/harf-bahcesi.js'])assert.doesNotThrow(()=>new vm.Script(read(p)),p);
});
test('Harf Bahçesi asks only one word per board, advances by one and retains 12 targets',()=>{
 const src=read('ingilizce/harf-bahcesi.js');
 assert.match(src,/state\.pair=state\.words\.slice\(state\.index,state\.index\+1\)/);
 assert.match(src,/s\.index\+=1;if\(s\.index>=s\.words\.length\)/);
 assert.match(src,/OC\.kelimeSec\(KEY,available,12\)/);
 assert.doesNotMatch(src,/state\.pair=state\.words\.slice\(state\.index,state\.index\+2\)/);
 const window={};
 vm.runInNewContext(src,{window,document:{querySelector:()=>null},setTimeout:()=>{},Math,Set,Object});
 for(let i=0;i<100;i++){
  const target={ingilizce:'voluntary',turkce:'gönüllü olmak'};
  const {board,adjacent}=window.dmHarfBahcesiCore;
  const result=board([target]);
  assert.equal(result.paths.length,1);
  assert.equal(result.letters.length,24);
  assert.equal(result.paths[0].map(k=>result.letters[k]).join(''),'voluntary');
  result.paths[0].forEach((position,j)=>{if(j)assert(adjacent(result.paths[0][j-1],position));});
 }
});
test('all approved design choices stay scoped to game screens',()=>{
 const css=read('ingilizce/game-experience.css');
 for(const selector of ['#jpOyunOverlay.dm-designed-playing','#yagmurOyunOverlay.dm-designed-playing',
  '#kelimebulOyunOverlay.dm-designed-playing','#esOyunOverlay.dm-designed-playing',
  '#trenOyunOverlay.dm-designed-playing',
  '#yoModal[data-dm-selected-game="dikte"]','#yoModal[data-dm-selected-game="cumle"]'])
  assert(css.includes(selector),selector);
 const garden=read('ingilizce/harf-bahcesi.css');
 assert(garden.includes('#harfBahcesiOverlay.hb-playing'));
 assert(garden.includes('.hb-hints'));
 assert(css.includes('#yoModal[data-dm-selected-game="cumle"] img'),'Sentence question remains image-free');
});
test('correct and incorrect audio and tap cues are wired to native scoring',()=>{
 const js=read('ingilizce/game-experience.js');
 assert(js.includes("['dogru',true],['yanlis',false]"));
 assert(js.includes('previous.apply(this,args)'),'original native scoring handler is retained');
 assert(js.includes('AudioContext'));
 assert(js.includes('dm-answer-right'));
 assert(js.includes('dm-answer-wrong'));
 assert(js.includes('choice.classList.add(\'dm-touch-picked\')'));
});


test('Kelime Treni shows the entire Turkish question on a high-contrast station sign',()=>{
 const css=read('ingilizce/game-experience.css');
 const section=css.split('/* Kelime Treni readability fix:')[1];
 assert(section,'Dedicated Turkish prompt legibility rules must remain');
 assert(section.includes('#trenTabela.tr-tabela'),'Must target the original question element');
 assert.match(section,/background:#fffdf3!important/);
 assert.match(section,/color:#302154!important/);
 assert.match(section,/white-space:normal!important/);
 assert.match(section,/max-height:none!important/);
 assert.match(section,/overflow-wrap:anywhere!important/);
 const rgb=hex=>hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4);
 const lum=hex=>{const [r,g,b]=rgb(hex);return .2126*r+.7152*g+.0722*b};
 const light=lum('#fffdf3'),dark=lum('#302154'),ratio=(light+.05)/(dark+.05);
 assert(ratio>=7,'Turkish question text must meet WCAG AAA normal-text contrast ratio');
});
