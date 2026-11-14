import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=readFileSync(new URL('../ingilizce/dm-satis.js',import.meta.url),'utf8');
const code=src.slice(src.indexOf('  let trialCache ='),src.indexOf('  function adCards()'));
function fixture(){
 const cards=new Map(),calls=[],state={owner:'account-a',teacher:false,sell:true,plan:'free',eligible:true,queries:0,now:Date.parse('2026-11-14T09:00:00Z'),active:'tab-aktiviteler',busy:false};
 const api=runInNewContext(code+';({trialPromoCards,entryTrial})',{
  D:{hidden:false,getElementById:id=>id.startsWith('tab-')?{classList:{contains:()=>state.active===id}}:cards.get(id),body:{append(card){cards.set(card.id,card)}}},
  token:()=>state.owner,teacher:()=>state.teacher,canSell:()=>state.sell,plan:()=>state.plan,busyScreen:()=>state.busy,
  Date:{now:()=>state.now,parse:Date.parse},planlar:(...args)=>calls.push(args),sheet:null,IMG:{gift:'gift.webp'},esc:x=>x,
  STUDENT:{plans:[{},{}]},plugin:()=>({getProducts:async()=>{state.queries++;return{products:[{id:'diji_premium_pro',campaign:state.eligible,text:'₺79'}]}}}),storePrice:(_,p)=>p||{},
  html:markup=>{const id=markup.match(/id="([^"]+)"/)[1],buttons={};return{id,markup,querySelector:s=>buttons[s]??=( {} ),remove(){cards.delete(id)}}},
 });
 return{...api,cards,calls,state,settle:()=>new Promise(r=>setImmediate(r))};
}
test('eligible active tab gets one compact gift; click selects Premium Pro and dismissal survives refresh',async()=>{
 const f=fixture();f.trialPromoCards();assert.equal(f.cards.size,0);await f.settle();
 const card=f.cards.get('dmsGamesTrial');assert.ok(card);assert.match(card.markup,/dms-trial-float/);
 card.querySelector('.dms-trial-open').onclick();assert.deepEqual(f.calls[0],['oyunlar-deneme-teklifi','premium_pro']);
 f.trialPromoCards();assert.equal(f.state.queries,1);assert.equal(f.cards.get('dmsGamesTrial'),card);
 f.state.active='tab-magaza';f.trialPromoCards();assert.equal(f.cards.size,1);assert.ok(f.cards.has('dmsShopTrial'));
 f.cards.get('dmsShopTrial').querySelector('.dms-trial-dismiss').onclick();f.trialPromoCards();assert.equal(f.cards.size,0);
});
test('ineligible accounts never advertise a trial; switching accounts discards cached eligibility',async()=>{
 const f=fixture();f.trialPromoCards();await f.settle();assert.equal(f.cards.size,1);
 f.state.owner='account-b';f.state.eligible=false;f.trialPromoCards();assert.equal(f.cards.size,0);await f.settle();assert.equal(f.cards.size,0);assert.equal(f.state.queries,2);
});
test('paid accounts, teachers, unsupported stores, overlays and campaign boundaries hide the gift',async()=>{
 for(const patch of [{plan:'premium_pro'},{plan:'pro'},{teacher:true},{owner:''},{sell:false},{busy:true},{now:Date.parse('2026-11-13T20:59:59Z')},{now:Date.parse('2027-03-01T21:00:00Z')}]){
  const f=fixture();f.trialPromoCards();await f.settle();Object.assign(f.state,patch);f.trialPromoCards();assert.equal(f.cards.size,0);
 }
});
