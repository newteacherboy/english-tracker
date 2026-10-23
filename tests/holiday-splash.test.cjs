'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm');
const code=fs.readFileSync('ingilizce/holiday-splashes/splash.js','utf8');
const scope={module:{exports:{}},Intl,Date,URL};vm.runInNewContext(code,scope);
const app=scope.module.exports;
const cal=JSON.parse(fs.readFileSync('ingilizce/holiday-splashes/dates.json','utf8'));
const at=(s)=>app.resolve(s+'T12:00:00+03:00',cal);
test('odd years show first art, even years second',()=>{
 assert.equal(at('2027-10-29').file,'29-ekim-1.jpg');
 assert.equal(at('2028-10-29').file,'29-ekim-2.jpg');
 assert.equal(at('2029-10-29').file,'29-ekim-1.jpg');
});
test('2026 29 Ekim approved variant 2 replaces superseded splash, through 2 November',()=>{
 assert.equal(at('2026-10-23').file,'29-ekim-2.jpg');
 assert.equal(at('2026-10-29').variant,2);
 assert.equal(app.resolve('2026-11-02T20:59:59Z',cal).file,'29-ekim-2.jpg');
 assert.equal(app.resolve('2026-11-02T21:00:00Z',cal),null);
});
test('Ramadan whole month, Bayram priority and end',()=>{
 assert.equal(at('2027-02-08').file,'ramazan-ayi-2.jpg');
 assert.equal(at('2027-03-05').file,'ramazan-ayi-2.jpg');
 assert.equal(at('2027-03-06').file,'ramazan-bayrami-1.jpg');
 assert.equal(at('2027-03-14').file,'ramazan-bayrami-1.jpg');
 assert.equal(at('2027-03-15'),null);
});
test('Kurban outranks 19 Mayıs on 2027 May 19',()=>{
 assert.equal(at('2027-05-19').file,'kurban-bayrami-2.jpg');
 assert.equal(at('2027-05-22').file,'kurban-bayrami-2.jpg');
 assert.equal(at('2027-05-23'),null);
});
test('10 Kasım active 2 days prior and 1 after',()=>{
 assert.equal(at('2027-11-08').file,'10-kasim-1.jpg');
 assert.equal(at('2027-11-11').file,'10-kasim-1.jpg');
 assert.equal(at('2027-11-12'),null);
});
test('15 Temmuz two days before and after',()=>{
 assert.equal(at('2027-07-13').file,'15-temmuz-1.jpg');
 assert.equal(at('2027-07-17').file,'15-temmuz-1.jpg');
 assert.equal(at('2027-07-18'),null);
});
test('Türkiye midnight boundary independent of device time zone',()=>{
 assert.equal(app.turkeyDate('2027-04-22T21:00:00Z'),'2027-04-23');
});
test('no competing legacy 2026 theme or double-rendered progress bars',()=>{
 for(const file of ['index.html','ingilizce/index.html']){
  const html=fs.readFileSync(file,'utf8');
  assert(!html.includes('dm-republic-2026-prepaint'));
  assert(!html.includes('republic-day-splash.css'));
  assert(!html.includes('republic-day-splash.js'));
 }
 assert(code.includes('frame.appendChild(bar)'));
 assert(!code.includes('screen.appendChild(bar)'));
});
test('head scripts execute before visible splash; assets are local and CSS blocks painting',()=>{
 for(const [path,prefix] of [['index.html','ingilizce/'],['ingilizce/index.html','']]){
  const html=fs.readFileSync(path,'utf8');
  const head=html.split('</head>')[0],marker=head.indexOf(prefix+'holiday-splashes/splash.js');
  assert(marker>=0);
  assert(head.includes(prefix+'holiday-splashes/dates.js'));
  assert(head.includes(prefix+'holiday-splashes/splash.css'));
  assert(marker<head.indexOf(prefix+'holiday-splashes/splash.css'));
 }
 for(const entry of app.holidays){
  const files=entry.variants===2?[entry.id+'-1.jpg',entry.id+'-2.jpg']:[({ '15-temmuz':'15-temmuz-1.jpg','ramazan-ayi':'ramazan-ayi-2.jpg','ramazan-bayrami':'ramazan-bayrami-1.jpg','kurban-bayrami':'kurban-bayrami-2.jpg'})[entry.id]];
  for(const file of files)assert(fs.statSync('ingilizce/holiday-splashes/'+file).size>10000,'Missing '+file);
 }
});
