const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('automatic notices count foreground interaction time, wait five minutes and stop at three',()=>{
 let now=1000000;const intervals=[];class Clock extends Date{static now(){return now}}
 const c={Date:Clock,aktifOgrenciAdi:'test',dmLastActiveAt:now,document:{hidden:false,body:{classList:{remove(){},toggle(){}}},querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){}},setInterval:(f,ms)=>intervals.push({f,ms}),setTimeout(){},MutationObserver:class{observe(){}},getComputedStyle:()=>({display:'block',visibility:'visible'})};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('ingilizce/papi-flow.js','utf8'),c);
 const tick=intervals.find(x=>x.ms===1000).f;const advance=seconds=>{for(let i=0;i<seconds;i++){now+=1000;c.dmLastActiveAt=now;tick();}};
 advance(299);assert(!c.dmAutoNotices.can());advance(1);assert(c.dmAutoNotices.take());assert(!c.dmAutoNotices.take());
 c.document.hidden=true;advance(300);assert(!c.dmAutoNotices.can());c.document.hidden=false;advance(300);assert(c.dmAutoNotices.take());advance(300);assert(c.dmAutoNotices.take());advance(600);assert(!c.dmAutoNotices.can());assert.equal(c.dmAutoNotices.status().count,3);
 c.aktifOgrenciAdi='new';advance(1);assert.equal(c.dmAutoNotices.status().count,0);const before=c.dmAutoNotices.status().activeMs;now+=100000;c.dmLastActiveAt=now-100000;tick();assert.equal(c.dmAutoNotices.status().activeMs,before);
});
