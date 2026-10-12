const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../ingilizce/day-night-theme.js'),'utf8');
function fixture(hour=12){
  let now=new Date(2026,9,12,hour,0,0),nextId=0;
  const timers=new Map(),docEvents={},winEvents={},attrs={},meta={},root={style:{},setAttribute(k,v){attrs[k]=v}};
  class Clock extends Date {constructor(...a){super(...(a.length?a:[now.getTime()]))}}
  const document={hidden:false,documentElement:root,querySelector(){return meta},addEventListener(k,f){docEvents[k]=f}};
  const window={addEventListener(k,f){winEvents[k]=f}};
  const context={Date:Clock,document,window,setTimeout(f,ms){timers.set(++nextId,{f,ms});return nextId},clearTimeout(id){timers.delete(id)}};
  vm.runInNewContext(source,context);
  return {window,document,attrs,meta,root,timers,docEvents,winEvents,context,setHour(h){now.setHours(h,0,0,0)}};
}
test('day starts at 07:00 and night starts at 19:00 in the device timezone',()=>{
  for(const [h,t] of [[0,'night'],[6,'night'],[7,'day'],[12,'day'],[18,'day'],[19,'night'],[23,'night']]){
    const f=fixture(h);assert.equal(f.attrs['data-dm-theme'],t);assert.equal(f.root.style.colorScheme,t==='night'?'dark':'light');
    assert.equal(f.meta.content,t==='night'?'#063543':'#f2fbfa');
  }
});
test('exactly one timer targets the next boundary, including next morning',()=>{
  for(const [h,hours] of [[6,1],[7,12],[18,1],[19,12],[23,8]]){
    const f=fixture(h);assert.equal(f.timers.size,1);assert.equal([...f.timers.values()][0].ms,hours*3600000+50);
    f.window.dmDayNightTheme.refresh();f.window.dmDayNightTheme.refresh();assert.equal(f.timers.size,1);
  }
});
test('hidden pages pause, restored and focused pages refresh without rebuilding the DOM',()=>{
  const f=fixture(18);f.document.hidden=true;f.docEvents.visibilitychange();assert.equal(f.timers.size,0);
  f.setHour(20);f.document.hidden=false;f.docEvents.visibilitychange();assert.equal(f.attrs['data-dm-theme'],'night');assert.equal(f.timers.size,1);
  f.winEvents.pagehide();assert.equal(f.timers.size,0);f.setHour(8);f.winEvents.pageshow();assert.equal(f.attrs['data-dm-theme'],'day');
  f.setHour(20);f.winEvents.focus();assert.equal(f.attrs['data-dm-theme'],'night');assert.equal(f.timers.size,1);
});
test('loading theme script twice does not duplicate listeners or timers',()=>{
  const f=fixture();const api=f.window.dmDayNightTheme;vm.runInNewContext(source,f.context);assert.equal(f.window.dmDayNightTheme,api);assert.equal(f.timers.size,1);
});
function lum(hex){const c=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
function ratio(a,b){const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('body, muted text, placeholder, primary buttons and feedback meet 4.5:1 in both palettes',()=>{
  const css=fs.readFileSync(path.join(__dirname,'../ingilizce/day-night-theme.css'),'utf8');
  for(const block of css.matchAll(/:root(?:\[data-dm-theme="night"\])?\s*\{([^}]+)\}/g)){
    const vars=Object.fromEntries([...block[1].matchAll(/--dm-([\w-]+):\s*(#[\da-f]{3,6})\s*;/gi)].map(x=>[x[1],x[2].length===4?'#'+[...x[2].slice(1)].map(c=>c+c).join(''):x[2]]));
    for(const [fg,bg] of [['text','page'],['text','surface'],['muted','surface'],['muted','soft'],['placeholder','input'],['on-accent','accent'],['link','soft'],['success','success-bg'],['error','error-bg']])assert.ok(ratio(vars[fg],vars[bg])>=4.5,`${fg}/${bg}: ${ratio(vars[fg],vars[bg])}`);
  }
});
