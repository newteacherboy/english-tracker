import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=readFileSync(new URL('../ingilizce/dm-satis.js',import.meta.url),'utf8');
const code=src.slice(src.indexOf('  function trialPromoCards()'),src.indexOf('  function adCards()'));
function fixture(){
  const cards=new Map(),calls=[],state={logged:true,teacher:false,sell:true,plan:'free',now:Date.parse('2026-11-14T09:00:00Z')};
  const hosts=['tab-magaza','tab-aktiviteler'].map(id=>({id,querySelector:()=>null,prepend(card){card.parentNode=this;cards.set(card.id,card)}}));
  const tabs=hosts.map(host=>({classList:{contains:()=>true},querySelector:()=>host}));
  const refresh=runInNewContext(code+';trialPromoCards',{
    D:{getElementById:id=>id==='tab-magaza'?tabs[0]:id==='tab-aktiviteler'?tabs[1]:cards.get(id)},
    loggedIn:()=>state.logged,teacher:()=>state.teacher,canSell:()=>state.sell,plan:()=>state.plan,
    Date:{now:()=>state.now,parse:Date.parse},planlar:(...args)=>calls.push(args),
    html:markup=>{const id=markup.match(/id="([^"]+)"/)[1],button={};return{id,markup,parentNode:null,querySelector:()=>button,remove(){cards.delete(id);this.parentNode=null}}},
  });
  return{refresh,cards,calls,state};
}
test('free native account sees both offer entries without a rewarded-video service; click opens Premium Pro',()=>{
  const f=fixture();f.refresh();assert.equal(f.cards.size,2);
  const card=f.cards.get('dmsGamesTrial');assert.match(card.markup,/Uygun hesaplara özel/);assert.match(card.markup,/Sonrasında aylık abonelik/);
  card.querySelector('button').onclick();assert.equal(f.calls[0][0],'oyunlar-deneme-teklifi');assert.equal(f.calls[0][1],'premium_pro');
  f.refresh();assert.equal(f.cards.get('dmsGamesTrial'),card,'refresh does not recreate cards');
});
test('paid plans, teachers, signed-out accounts and unsupported stores remove promotion entries',()=>{
  for(const patch of [{plan:'premium_pro'},{plan:'pro'},{teacher:true},{logged:false},{sell:false}]){
    const f=fixture();f.refresh();Object.assign(f.state,patch);f.refresh();assert.equal(f.cards.size,0);
  }
});
test('campaign cards disappear outside the approved campaign dates',()=>{
  for(const now of [Date.parse('2026-11-13T20:59:59Z'),Date.parse('2027-03-01T21:00:00Z')]){
    const f=fixture();f.state.now=now;f.refresh();assert.equal(f.cards.size,0);
  }
});
