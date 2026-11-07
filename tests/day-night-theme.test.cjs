const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../ingilizce/day-night-theme.js'),'utf8');
function fixture(hour=12, stored={}) {
  const now=new Date(2026,9,12,hour,0,0);
  const buttons=[],docEvents={},winEvents={},attrs={},meta={},popups=[];
  const root={style:{},clientWidth:390,clientHeight:844,setAttribute(k,v){attrs[k]=v;}};
  class Clock extends Date { constructor(){super(now.getTime());} }
  function element() {
    const children={};
    return {
      attrs:{},style:{setProperty(){}},classList:{toggle(){}},parentElement:{},offsetWidth:280,offsetHeight:90,
      setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this[k]=f;},focus(){},
      getBoundingClientRect(){return {left:320,top:10,right:364,bottom:54,width:44,height:44};},
      contains(other){return this===other;},closest(){return null;},
      querySelector(k){return children[k] ||= element();},remove(){popups.splice(popups.indexOf(this),1);}
    };
  }
  const studyView={active:false,classList:{contains(){return studyView.active;}}};
  const lessonView={active:false,classList:{contains(){return lessonView.active;}}};
  const observed=new Map();
  class MutationObserver {
    constructor(callback){this.callback=callback;}
    observe(element){observed.set(element,this.callback);}
  }
  const document={
    getElementById(id){return {'tab-derscalis':studyView,'dcScreenDetail':lessonView}[id];},
    hidden:false,documentElement:root,body:{append(el){popups.push(el);}},
    elementFromPoint(){return buttons[0];},querySelector(){return meta;},querySelectorAll(){return buttons;},
    createElement:element,addEventListener(k,f){docEvents[k]=f;}
  };
  const window={
    localStorage:{getItem(k){return stored[k];},setItem(k,v){stored[k]=v;}},
    addEventListener(k,f){winEvents[k]=f;}
  };
  const context={Date:Clock,document,window,MutationObserver};
  vm.runInNewContext(source,context);
  return {window,attrs,meta,root,docEvents,winEvents,context,buttons,popups,stored,setHour(h){now.setHours(h);},
    openStudy(active){studyView.active=active;observed.get(studyView)([]);},
    openLesson(active){lessonView.active=active;observed.get(lessonView)([]);}};
}

test('every launch starts in daylight even with an old saved night preference',()=>{
  for(let hour=0;hour<24;hour++){
    const f=fixture(hour,{'dm-color-theme':'night'});
    assert.equal(f.attrs['data-dm-theme'],'day');
    assert.equal(f.root.style.colorScheme,'light');
    assert.equal(f.meta.content,'#e3f3ff');
  }
});

test('manual night mode follows navigation and resets on a new login or restored visit',()=>{
  const f=fixture(),api=f.window.dmDayNightTheme;
  f.buttons.push(api.createButton(),api.createButton());
  f.buttons[0].click();
  assert.equal(api.themeFor(),'night');
  assert.equal(f.meta.content,'#132447');
  assert.ok(f.buttons.every(b=>b.attrs['aria-pressed']==='true'));
  f.winEvents.pageshow({persisted:false});
  assert.equal(api.themeFor(),'night');
  f.docEvents['dm:login']();
  assert.equal(api.themeFor(),'day');
  f.buttons[1].click();
  f.winEvents.pageshow({persisted:true});
  assert.equal(api.themeFor(),'day');
  assert.equal(f.stored['dm-color-theme'],undefined);
});

test('a visible study lesson uses daylight and restores the chosen night theme on either exit path',()=>{
  const f=fixture(),api=f.window.dmDayNightTheme;
  const button=api.createButton();
  f.buttons.push(button);
  button.click();
  f.openStudy(true);
  assert.equal(api.themeFor(),'night');
  f.openLesson(true);
  assert.equal(api.themeFor(),'day');
  assert.equal(f.root.style.colorScheme,'light');
  assert.equal(f.meta.content,'#e3f3ff');
  assert.equal(button.disabled,true);
  button.click();
  assert.equal(api.themeFor(),'day');
  f.openLesson(false);
  assert.equal(api.themeFor(),'night');
  assert.equal(button.disabled,false);
  f.openLesson(true);
  f.openStudy(false);
  assert.equal(api.themeFor(),'night');
});

test('the 20:00 hint is deferred until the learner leaves the topic',()=>{
  const f=fixture(20),api=f.window.dmDayNightTheme;
  f.buttons.push(api.createButton());
  f.openStudy(true);
  f.openLesson(true);
  api.updateHint();
  assert.equal(f.popups.length,0);
  assert.equal(f.stored['dm-night-hint-shown'],undefined);
  f.openLesson(false);
  api.updateHint();
  assert.equal(f.popups.length,1);
});

test('the 20:00 hint appears once at a visible toggle and requires a choice',()=>{
  const f=fixture(19),api=f.window.dmDayNightTheme;
  f.buttons.push(api.createButton());
  api.updateHint();
  assert.equal(f.popups.length,0);
  f.setHour(20);
  api.updateHint();
  assert.equal(f.popups.length,1);
  assert.equal(api.themeFor(),'day');
  f.popups[0].querySelector('[data-night-enable]').click();
  assert.equal(api.themeFor(),'night');
  assert.equal(f.popups.length,0);
  f.buttons[0].click();
  api.updateHint();
  assert.equal(f.popups.length,0);
  const revisit=fixture(22,f.stored),next=revisit.window.dmDayNightTheme;
  revisit.buttons.push(next.createButton());
  next.updateHint();
  assert.equal(revisit.popups.length,0);
  assert.equal(next.themeFor(),'day');
});

test('the hint waits for a visible switch and closes if the destination changes',()=>{
  const f=fixture(20),api=f.window.dmDayNightTheme;
  api.updateHint();
  assert.equal(f.stored['dm-night-hint-shown'],undefined);
  f.buttons.push(api.createButton());
  api.updateHint();
  assert.equal(f.popups.length,1);
  f.buttons[0].parentElement={};
  api.updateHint();
  assert.equal(f.popups.length,0);
  assert.equal(api.themeFor(),'day');
});

test('teacher suggestion starts at 21:00 and keeps the theme across game participant changes',()=>{
  const f=fixture(20,{'dm-night-hint-shown':'1'}),api=f.window.dmDayNightTheme;
  f.window.dmTeacherPortalMode=true;
  f.buttons.push(api.createButton());
  api.updateHint();
  assert.equal(f.popups.length,0);
  f.setHour(21);
  api.updateHint();
  assert.equal(f.popups.length,1);
  assert.equal(f.popups[0].querySelector('p').textContent,'Gece moduna geçmek ister misiniz?');
  f.popups[0].querySelector('[data-night-enable]').click();
  assert.equal(f.stored['dm-teacher-night-hint-shown'],'1');
  f.docEvents['dm:login']({detail:{teacherParticipantChanged:true}});
  assert.equal(api.themeFor(),'night');
  f.docEvents['dm:login']({});
  assert.equal(api.themeFor(),'day');
  api.updateHint();
  assert.equal(f.popups.length,0);
});

test('loading theme script twice does not duplicate lifecycle listeners',()=>{
  const f=fixture(),api=f.window.dmDayNightTheme,listener=f.winEvents.pageshow;
  vm.runInNewContext(source,f.context);
  assert.equal(f.window.dmDayNightTheme,api);
  assert.equal(f.winEvents.pageshow,listener);
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
