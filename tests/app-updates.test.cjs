const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('ingilizce/app-updates.js','utf8');
function fixture(controlled=true){
 const events={},docEvents={},winEvents={},nodes=[];let options,updates=0,reloads=0,interval;
 const node=()=>({remove(){this.removed=true;},style:{},setAttribute(){},append(...items){this.children=items;},addEventListener(n,f){this[n]=f;}});
 const context={console,Date,navigator:{onLine:true,serviceWorker:{controller:controlled?{}:null,addEventListener(n,f){events[n]=f;},async register(url,opt){options={url,opt};return {async update(){updates++;}};}}},
 document:{readyState:'complete',visibilityState:'visible',body:{append(n){nodes.push(n);}},createElement:node,addEventListener(n,f){docEvents[n]=f;}},
 location:{protocol:'https:',reload(){reloads++;}},window:{confirm:()=>true,addEventListener(n,f){winEvents[n]=f;}},setInterval(f,ms){interval=ms;}};
 vm.runInNewContext(source,context);
 return {context,events,docEvents,winEvents,nodes,get options(){return options;},get updates(){return updates;},get reloads(){return reloads;},get interval(){return interval;}};
}
test('checks bypass cache periodically, updates do not force reload',async()=>{
 const f=fixture();await new Promise(r=>setImmediate(r));
 assert.equal(f.options.url,'sw.js');assert.equal(f.options.opt.updateViaCache,'none');assert.equal(f.updates,1);assert.equal(f.interval,1800000);
 assert.equal(typeof f.docEvents.visibilitychange,'function');assert.equal(typeof f.winEvents.online,'function');
 f.events.controllerchange();f.events.controllerchange();assert.equal(f.nodes.length,1);assert.equal(f.reloads,0);
 const button=f.nodes[0].children[1];f.context.window.confirm=()=>false;button.click();assert.equal(f.reloads,0);
 f.context.window.confirm=()=>true;button.click();assert.equal(f.reloads,1);
});
test('first install does not display update banner',()=>{const f=fixture(false);f.events.controllerchange();assert.equal(f.nodes.length,0);assert.equal(f.reloads,0);});

test('update notice can be dismissed without a reload or reappearing in the same tab',()=>{const f=fixture();f.events.controllerchange();const box=f.nodes[0];assert.equal(box.children[2].textContent,'×');box.children[2].click();assert(box.removed);assert.equal(f.reloads,0);f.events.controllerchange();assert.equal(f.nodes.length,1);});
