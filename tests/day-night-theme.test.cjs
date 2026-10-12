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
test('the daytime design stays active at every hour',()=>{
  for(let h=0;h<24;h++){
    const f=fixture(h);assert.equal(f.attrs['data-dm-theme'],'day');assert.equal(f.root.style.colorScheme,'light');
    assert.equal(f.meta.content,'#f2fbfa');assert.equal(f.window.dmDayNightTheme.themeFor(new Date(2026,9,12,h)),'day');
  }
});
test('fixed daytime theme never schedules a boundary timer',()=>{
  const f=fixture(23);f.window.dmDayNightTheme.refresh();f.setHour(8);f.window.dmDayNightTheme.refresh();assert.equal(f.timers.size,0);
});
test('restored pages reapply the daytime design',()=>{
  const f=fixture(23);f.attrs['data-dm-theme']='night';f.root.style.colorScheme='dark';f.winEvents.pageshow();assert.equal(f.attrs['data-dm-theme'],'day');assert.equal(f.root.style.colorScheme,'light');
});
test('loading theme script twice does not duplicate lifecycle listeners',()=>{
  const f=fixture();const api=f.window.dmDayNightTheme;const listener=f.winEvents.pageshow;vm.runInNewContext(source,f.context);assert.equal(f.window.dmDayNightTheme,api);assert.equal(f.winEvents.pageshow,listener);assert.equal(f.timers.size,0);
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
