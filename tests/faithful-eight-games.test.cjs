'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=p=>fs.readFileSync(path.join(__dirname,'..','ingilizce',p),'utf8');
test('all eight selected game designs load after legacy styles',()=>{
 const html=source('index.html');
 assert.match(html,/faithful-eight-games\.css\?v=20261020-selected-art-1/);
 assert.match(html,/faithful-eight-games\.js\?v=[^"\s]+/);
 assert(html.indexOf('faithful-eight-games.css')>html.indexOf('game-experience.css'));
 assert(html.indexOf('faithful-eight-games.css')>html.indexOf('selected-play.css'));
 assert(html.indexOf('faithful-eight-games.js')>html.indexOf('game-experience.js'));
 const js=source('faithful-eight-games.js');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/\byagmurOyunEkrani\b/);
 assert.match(js,/\bkelimebulOyunEkrani\b/);
 assert.match(js,/\besOyunEkrani\b/);
 assert.match(js,/\btrenOyunEkrani\b/);
 assert.match(js,/fg-listening-banner/);
 assert.match(js,/fg-sentence-banner/);
});
test('each approved visual palette has native gameplay selectors and a complete scenic background',()=>{
 const css=source('faithful-eight-games.css');
 assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);
 const expected=[
  ['#harfBahcesiOverlay.hb-playing','garden.svg'],
  ['#jpOyunOverlay.dm-designed-playing','carnival.svg'],
  ['#yagmurOyunOverlay.dm-designed-playing','storm.svg'],
  ['#kelimebulOyunOverlay.dm-designed-playing','lock.svg'],
  ['#esOyunOverlay.dm-designed-playing','garden.svg'],
  ['#trenOyunOverlay.dm-designed-playing','station.svg'],
  ['#yoModal[data-dm-selected-game="dikte"]','detective.svg'],
  ['#yoModal[data-dm-selected-game="cumle"]','garden.svg']
 ];
 for(const [selector,image] of expected){
  assert(css.includes(selector),'Missing style for '+selector);
  assert(css.includes(image),'Missing approved artwork '+image);
  assert(fs.existsSync(path.join(__dirname,'..','ingilizce','game-scenes',image)),image);
 }
 for(const image of new Set(expected.map(x=>x[1]))){
  const svg=source('game-scenes/'+image);
  assert(svg.includes('<svg')&&svg.includes('</svg>'),image);
  assert(svg.includes('viewBox='),'Responsive SVG '+image);
 }
});
test('train question has explicit readable label, wraps and preserves native question ID',()=>{
 const css=source('faithful-eight-games.css');
 assert(css.includes('#trenTabela.tr-tabela'));
 assert(css.includes('content:\'TÜRKÇE CÜMLE\''));
 assert(css.includes('white-space:normal!important'));
 assert(css.includes('max-height:none!important'));
 assert(css.includes('overflow-wrap:anywhere!important'));
 const main=source('index.html');
 assert(main.includes('id="trenTabela"'));
 assert(main.includes('trEl(\'trenTabela\').innerText = s.tr'));
});
test('answer inputs and controls remain native; nothing replaces the score or backend handlers',()=>{
 const css=source('faithful-eight-games.css');
 const js=source('faithful-eight-games.js');
 for(const id of ['jpSoruKelimeText','kbTahminInput','yagmurSecenekler','trenTabela']){
  assert(css.includes(id)||js.includes(id),'Game input binding '+id);
 }
 for(const p of ['faithful-eight-games.js','faithful-eight-games.css']){
  const s=source(p);
  assert(!/fetch\(.*(?:apiURL|supabase)/.test(s),'No backend writes in visual layer');
 }
 assert(css.includes('#esOyunOverlay.dm-designed-playing .es-k.tamam'));
 assert(css.includes('#esOyunOverlay.dm-designed-playing .es-k.hata'));
 assert(css.includes('.yg-secenek-btn.dogru'));
 assert(css.includes('.yg-secenek-btn.yanlis'));
 assert(css.includes('#yoModal[data-dm-selected-game="cumle"] .yo-soru :is(img,svg,canvas,picture)'));
});
