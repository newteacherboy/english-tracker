'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {resolve}=require('../ingilizce/holiday-splashes/splash.js');
const calendar=JSON.parse(fs.readFileSync('ingilizce/holiday-splashes/dates.json','utf8'));
for(const [name,file,prefix] of [
 ['home','index.html','ingilizce/'],
 ['English portal','ingilizce/index.html','']
]){
 test(name+' selects the approved 2026 second artwork before first paint',()=>{
  const html=fs.readFileSync(file,'utf8'),head=html.split('</head>')[0];
  assert(head.includes(prefix+'holiday-splashes/dates.js'));
  assert(head.includes(prefix+'holiday-splashes/splash.js'));
  assert(head.includes(prefix+'holiday-splashes/splash.css'));
  assert(!head.includes('republic-day-splash'));
  const chosen=resolve('2026-10-23T07:00:00+03:00',calendar);
  assert.equal(chosen.file,'29-ekim-2.jpg');
  assert.equal(chosen.variant,2);
  const image='ingilizce/holiday-splashes/'+chosen.file;
  assert(fs.statSync(image).size>250000);
  const styles=fs.readFileSync('ingilizce/holiday-splashes/splash.css','utf8');
  assert.match(styles,/html\.dm-holiday-active/);
  assert.match(styles,/dm-holiday-art>\.dm-holiday-progress/);
 });
}
test('the approved temporary campaign ends precisely at Istanbul midnight 3 November',()=>{
 const at=(d)=>resolve(d,calendar);
 assert.equal(at('2026-11-02T23:59:59+03:00')?.file,'29-ekim-2.jpg');
 assert.equal(at('2026-11-03T00:00:00+03:00'),null);
});
