import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAdPolicy as rawPolicy} from '../src/ad-policy.js';
import {AD_DEFAULTS, normalizeAdSettings} from '../../supabase/functions/billing/ad-settings.mjs';
// Eski testler: hesap yeni değil (ilk gün koruması dışında).
const createAdPolicy=(o={})=>rawPolicy({accountAgeHours:()=>1000,...o});
const complete=(p,id,extra={})=>p.complete({id,game:'ky',answered:10,...extra});
test('only the third completed solo game becomes eligible, duplicate results do not count',()=>{
 const p=createAdPolicy();complete(p,'one');assert.equal(p.canInterstitial(),false);
 complete(p,'one');complete(p,'two');assert.equal(p.canInterstitial(),false);
 complete(p,'three');assert.equal(p.canInterstitial(),true);assert.equal(p.snapshot().games,3);
});
test('early exits, routes, duels and teacher games never advance the counter',()=>{
 const p=createAdPolicy();complete(p,'early',{answered:0});complete(p,'route',{game:'ba'});complete(p,'duel',{game:'meteor'});complete(p,'teacher',{teacher:true});
 assert.equal(p.snapshot().games,0);
});
test('five minute gap applies after interstitials and also after rewarded videos',()=>{
 let time=1000000;const p=createAdPolicy({now:()=>time});
 for(let i=0;i<3;i++)complete(p,'a'+i);p.interstitialShown();
 for(let i=0;i<3;i++)complete(p,'b'+i);assert.equal(p.canInterstitial(),false);
 time+=299999;assert.equal(p.canInterstitial(),false);time++;assert.equal(p.canInterstitial(),true);
 p.rewardClosed('gold',true);assert.equal(p.canInterstitial(),false);
});
test('reward limits are independent and only completed videos consume a right',()=>{
 const p=createAdPolicy();for(let i=0;i<8;i++)p.rewardClosed('gold',false);assert.equal(p.rewardAllowed('gold'),true);
 for(let i=0;i<3;i++)p.rewardClosed('gold',true);assert.equal(p.rewardAllowed('gold'),false);assert.equal(p.rewardAllowed('energy'),true);
 for(let i=0;i<5;i++)p.rewardClosed('energy',true);assert.equal(p.rewardAllowed('energy'),false);
});
test('account counters persist independently and daily rewards reset on the next day',()=>{
 let time=new Date(2026,9,30,12).getTime();const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 let a=createAdPolicy({storage,owner:'a',now:()=>time});for(let i=0;i<3;i++)a.rewardClosed('gold',true);
 a=createAdPolicy({storage,owner:'a',now:()=>time});assert.equal(a.rewardAllowed('gold'),false);
 assert.equal(createAdPolicy({storage,owner:'b',now:()=>time}).rewardAllowed('gold'),true);
 time+=86400000;assert.equal(a.rewardAllowed('gold'),true);
});

test('new members see no interstitial in their first 24 hours (server age, then device first-seen fallback)',()=>{
 let time=1e12, age=5;const p=rawPolicy({now:()=>time,accountAgeHours:()=>age});
 for(let i=0;i<3;i++)complete(p,'n'+i);assert.equal(p.canInterstitial(),false);assert.equal(p.interstitialPossible(),false);
 age=24;assert.equal(p.canInterstitial(),true);
 const local=rawPolicy({now:()=>time});for(let i=0;i<3;i++)complete(local,'l'+i);assert.equal(local.canInterstitial(),false);
 time+=24*3600000;assert.equal(local.canInterstitial(),true);
});
test('at most 5 interstitials a day, reset the next day',()=>{
 let time=new Date(2026,10,4,9).getTime();const p=createAdPolicy({now:()=>time});
 for(let n=0;n<5;n++){for(let i=0;i<3;i++)complete(p,n+'-'+i);assert.equal(p.canInterstitial(),true);p.interstitialShown();time+=301000;}
 for(let i=0;i<3;i++)complete(p,'x'+i);assert.equal(p.canInterstitial(),false);
 time+=86400000;assert.equal(p.canInterstitial(),true);
});
test('abandoned or very short games do not count',()=>{
 const p=createAdPolicy();
 complete(p,'two',{answered:2});complete(p,'fast',{seconds:12});assert.equal(p.snapshot().games,0);
 complete(p,'ok',{answered:3,seconds:30});complete(p,'nodur',{answered:5});assert.equal(p.snapshot().games,2);
});
test('kill switch and per-format switches from the server',()=>{
 let s={...AD_DEFAULTS};const p=createAdPolicy({settings:()=>s});
 for(let i=0;i<3;i++)complete(p,'k'+i);assert.equal(p.canInterstitial(),true);
 s={...AD_DEFAULTS,enabled:false};assert.equal(p.canInterstitial(),false);assert.equal(p.rewardAllowed('energy'),false);
 s={...AD_DEFAULTS,interstitial:false};assert.equal(p.canInterstitial(),false);assert.equal(p.rewardAllowed('energy'),true);
 s={...AD_DEFAULTS,rewarded:false};assert.equal(p.rewardAllowed('gold'),false);
});
test('server settings are clamped and unknown keys dropped',()=>{
 const n=normalizeAdSettings({enabled:'no',dailyInterstitials:99,gapSeconds:5,bannerTabs:['games','evil'],hack:1});
 assert.equal(n.enabled,true);assert.equal(n.dailyInterstitials,20);assert.equal(n.gapSeconds,60);assert.deepEqual(n.bannerTabs,['games']);assert.equal(n.hack,undefined);
 assert.deepEqual(normalizeAdSettings(null),{...AD_DEFAULTS,bannerTabs:[...AD_DEFAULTS.bannerTabs]});
 assert.equal(AD_DEFAULTS.dailyInterstitials,5);
});
