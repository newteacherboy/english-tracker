const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const js=fs.readFileSync('ingilizce/premium-word-match.js','utf8');
const css=fs.readFileSync('ingilizce/premium-word-match.css','utf8');
const fixture=[
 {ingilizce:'hello',turkce:'merhaba',sinif:1,unite:1},
 {ingilizce:'goodbye',turkce:'hoşça kal',sinif:1,unite:1},
 {ingilizce:'thank you',turkce:'teşekkür ederim',sinif:1,unite:1},
 {ingilizce:'good night',turkce:'iyi geceler',sinif:1,unite:1},
 {ingilizce:'welcome',turkce:'hoş geldin',sinif:1,unite:1},
 {ingilizce:'apple',turkce:'elma',sinif:1,unite:2},
 {ingilizce:'book',turkce:'kitap',sinif:1,unite:2},
 {ingilizce:'cat',turkce:'kedi',sinif:1,unite:2},
 {ingilizce:'dog',turkce:'köpek',sinif:1,unite:2},
 {ingilizce:'house',turkce:'ev',sinif:1,unite:2}
];
function core(){
 const window={masterKelimeHavuzu:fixture};
 const document={getElementById(){return null;},createElement(){return {};},head:{append(){}}};
 const ctx=vm.createContext({window,document,Map,Set,Math,String,Number,Array,Date,Object});
 vm.runInContext(js,ctx,{timeout:1500});
 return window.dmPremiumWordMatch;
}
test('game code parses and exposes core with 1. sınıf 1. ünite first',()=>{
 new vm.Script(js);const c=core();
 assert.deepEqual(JSON.parse(JSON.stringify(c.levelList())),[{grade:1,unit:1},{grade:1,unit:2}]);
 assert.equal(c.targetFor(1),1200);
 assert.equal(c.targetFor(2),1350);
 assert.equal(c.targetFor(100),3000);
});
test('3/4/5 matches have progressive reward and counters cannot render NaN',()=>{
 const c=core();
 assert.deepEqual([3,4,5,6].map(c.pointFor),[100,250,500,600]);
 assert.match(js,/Number\(state\.goalsDone\[w\]\)\|\|0/);
 assert.match(js,/Object\.fromEntries\(current\.goals\.map\(w=>\[w,0\]\)\)/);
});
test('matches detect runs across rows and columns',()=>{
 const c=core(),board=Array.from({length:36},(_,i)=>'unique'+i);
 for(let x=0;x<4;x++)board[6+x]='apple';
 for(let y=2;y<5;y++)board[y*6+5]='book';
 const groups=c.matches(board);
 assert.equal(groups.length,2);
 assert.equal(groups.find(x=>x.word==='apple').indices.length,4);
 assert.equal(groups.find(x=>x.word==='book').indices.length,3);
});
test('mobile drag-swapping and responsive tile layout are wired in game code',()=>{
 assert.match(js,/addEventListener\('pointerdown',swipeStart\)/);
 assert.match(js,/addEventListener\('pointerup',swipeEnd\)/);
 assert.match(js,/function swipeEnd\(e\)/);
 assert.match(js,/Math\.max\(Math\.abs\(dx\),Math\.abs\(dy\)\)<18/);
 assert.doesNotMatch(js,/data-wm-grade|data-wm-unit/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(css,/touch-action:none!important/);
 assert.match(css,/pwm-long b/);
});
test('game uses account-controlled admission and stage completion',()=>{
 assert.match(js,/access\('check'\)/);
 assert.match(js,/access\('start',runId\)/);
 assert.match(js,/access\('complete',finished\.runId/);
 assert.match(js,/finished\.score\.toLocaleString/);
 assert.match(js,/state\.level/);
 assert.match(js,/Word Bank/);
});
