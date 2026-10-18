'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=fs.readFileSync('index.html','utf8');
const portal=fs.readFileSync('ingilizce/index.html','utf8');
const script=[...root.matchAll(/<script\b[^>]*>([^]*?)<\/script>/gi)].find(m=>m[1].includes("const splash=document.getElementById('splashEkrani')"))[1];
test('home navigation is revealed at DOM readiness even if noncritical images never load',()=>{
 const listeners={},frames=[],timers=[],classes=[];let removed=false,fill;
 const splash={style:{setProperty:(_,v)=>fill=v},classList:{add:x=>classes.push(x)},remove:()=>removed=true};
 vm.runInNewContext(script,{document:{readyState:'loading',getElementById:()=>splash,addEventListener:(n,fn)=>listeners[n]=fn},requestAnimationFrame:fn=>frames.push(fn),setTimeout:fn=>timers.push(fn)});
 assert.equal(fill,undefined);listeners.DOMContentLoaded();assert.equal(fill,'100%');
 frames.shift()();assert.deepEqual(classes,['splash-gizle']);timers.shift()();assert.equal(removed,true);
});
test('home startup also finishes when the document was already parsed',()=>{
 let fill;const splash={style:{setProperty:(_,v)=>fill=v},classList:{add(){}},remove(){}};
 vm.runInNewContext(script,{document:{readyState:'interactive',getElementById:()=>splash,addEventListener(){throw Error('already ready')}},requestAnimationFrame(){},setTimeout(){}});
 assert.equal(fill,'100%');
});
test('all opening masks share the lightweight Papi art without visible percentages or subtitles',()=>{
 for(const [html,id] of [[root,'splashEkrani'],[portal,'dmBootSplash'],[portal,'oturumYuklemeOverlay']]){
  const block=html.slice(html.indexOf('id="'+id+'"'),html.indexOf('</script>',html.indexOf('id="'+id+'"')));
  const markup=block.split('\n')[0];
  assert.match(markup,/papi-loading.webp/);assert.match(markup,/dm-papi-fill/);assert.match(markup,/Diji<span>Medu/);
  assert.doesNotMatch(markup,/\d+%|English Tracker|lütfen bekleyin|splash-progress/);
 }
 assert(fs.statSync('ingilizce/papi-loading.webp').size<80000);
});
