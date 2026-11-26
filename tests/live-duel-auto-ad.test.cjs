const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('ingilizce/live-duel.js','utf8');
function extract(from,to){const a=source.indexOf(from),b=source.indexOf(to,a);assert(a>=0&&b>a);return source.slice(a,b);}
function fixture(){
 let started=[],calls=[],messages=[],events=[],layer=null;
 const button={disabled:false,isConnected:true,querySelector:()=>({textContent:''})},note={textContent:''},generic={onclick:null,remove(){},textContent:''};
 const el={isConnected:true,querySelector(sel){return sel==='[data-ad]'?button:sel==='.ld-sheet-note'?note:generic;},addEventListener(){}};
 const context={window:{dmAndroidAds:{show:async()=>({completed:true})}},Date,Math,ICON:{},PAPI:'papi',esc:String,token:()=> 'guest',who:()=> 'Guest',adAvailable:()=>true,HOLD_WAIT_S:45,VERIFY_GRACE_S:15,layer:null,rights:null,setInterval:()=>1,clearInterval(){},sleep:async()=>{},openLayer(){context.layer=el;return el;},closeLayer(){context.layer=null;el.isConnected=false;},startMatch:d=>started.push(d),sfx(){},toast:m=>messages.push(m),lobbySend:(event,p)=>events.push([event,p]),rpc:async(op,args)=>{calls.push(op);if(op==='dm_duel_ad'&&args.p_op==='prepare')return {ok:true,offerId:'offer'};if(op==='dm_duel_live_hold')return {ok:true,holdLeftMs:60000,adLeftMs:45000};if(op==='dm_duel_ad_accept')return {ok:true,claimed:true,match:{ok:true,status:'matched',id:'same-duel'}};throw Error(op);}};
 vm.runInNewContext(extract('function paywall(','/* ---------- Lobi')+';globalThis.paywall=paywall;',context);
 return {context,button,started,calls,messages,events};
}
test('ad completion immediately claims and joins the original reserved duel without a second click',async()=>{
 const f=fixture();f.context.paywall('live','',()=>assert.fail('must not open a new duel'),{duel:'same-duel',host:'Host',leftMs:20000});await f.button.onclick();assert.deepEqual(f.calls,['dm_duel_ad','dm_duel_live_hold','dm_duel_ad_accept']);assert.equal(f.started[0].id,'same-duel');assert(f.events.some(([event,p])=>event==='matched'&&p.id==='same-duel'));
});
test('expired invitation preserves the verified reward and never starts a different duel',async()=>{
 const f=fixture(),orig=f.context.rpc;f.context.rpc=async(op,args)=>op==='dm_duel_ad_accept'?{ok:true,claimed:true,match:{ok:false}}:orig(op,args);f.context.paywall('live','',()=>assert.fail('must not open a new duel'),{duel:'same-duel',host:'Host',leftMs:20000});await f.button.onclick();assert.equal(f.started.length,0);assert.match(f.messages[0],/korundu/);
});
test('match broadcast wakes the host and the server confirms the match',async()=>{
 const ctx={Date,SEARCH_MS:15000,HOLD_WAIT_S:45,VERIFY_GRACE_S:15,waitSignal:null,token:()=> 'host',setTimeout,clearTimeout,sleep:ms=>new Promise(r=>setTimeout(r,ms)),rpc:async()=>({ok:true,status:'matched',id:'d'})};
 vm.runInNewContext(extract('async function waitMatch(','/* ---------- Canlı Düello: rakip arama')+';globalThis.waitMatch=waitMatch;',ctx);
 const result=ctx.waitMatch('d','host',[10000],()=>false,()=>{});ctx.waitSignal.pulse({matched:true});assert.equal((await result).id,'d');assert.equal(ctx.waitSignal,null);
});
test('Papi VS cancel stops the countdown after confirmation',async()=>{
 let battle=0,closed=0,calls=0;
 const b={disabled:false,onclick:null},n={textContent:''},el={querySelector:s=>s==='[data-papi-cancel]'?b:n};
 const ctx={Date,Number,token:()=> 'host',inDuel:false,rights:null,layer:null,ICON:{close:''},PAPI:'papi',who:()=> 'Host',esc:String,avatarHtml:()=>'',openLayer(){ctx.layer=el;return el;},closeLayer(){ctx.layer=null;closed++;},toast(){},battle(){battle++;},rpc:async()=>{calls++;return {ok:true,cancelled:true};},setInterval,clearInterval};
 vm.runInNewContext(extract('function startMatch(','/* ---------- Savaş paneli')+';globalThis.startMatch=startMatch;',ctx);
 ctx.startMatch({id:'p',vsPapi:true,questions:Array(10).fill({})});await b.onclick();assert.equal(closed,1);assert.equal(calls,1);assert.equal(battle,0);assert.equal(ctx.inDuel,false);
});
