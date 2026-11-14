const {chromium}=require('playwright');
require('fs').mkdirSync('sales-qa',{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
for(const [w,h] of [[390,844],[360,740],[375,667],[320,568]]){
const page=await browser.newPage({viewport:{width:w,height:h}});
await page.route('**/__sales_qa', route => route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html><meta charset="UTF-8"><body></body></html>'}));
await page.goto('http://127.0.0.1:8765/__sales_qa');
await page.setContent(`<meta charset="UTF-8"><base href="http://127.0.0.1:8765/ingilizce/"><style>body{margin:0;background:#f3eafa;font-family:system-ui}#bottomNavMobile{position:fixed;bottom:0;height:70px;width:100%;background:white}.dc-focus-card{padding:20px}.tile{padding:30px;background:#d8bafa;margin:12px;border-radius:22px}</style><section id="tab-aktiviteler" class="active"><div class="dc-focus-card"><h1>Oyunlar</h1><div class="gg-tabs">Premium Oyunlar · Ücretsiz Oyunlar</div><div class="tile">Kelime Rallisi</div><div class="tile">Kaptan Pilot Papi</div></div></section><section id="tab-magaza"></section><nav id="bottomNavMobile">Parkur · Arkadaşlar · Oyunlar · Mağaza · Profil</nav>`);
await page.evaluate(()=>{
localStorage.setItem('ing_token','qa-account');window.aktifOgrenciAdi='QA';window.yo={altin:200};window.genelEnerjiKalan=12;
const status={plan:'free',purchasePlan:'free',canBuy:true,role:'student',products:[{id:'diji_pro'},{id:'diji_premium_pro'}],entitlements:[]};window.dmAndroidBilling={available:true,status,refresh:async()=>status};window.dmAndroidPlan=status;window.dmAndroidIsTeacher=()=>false;
window.Capacitor={getPlatform:()=> 'android',Plugins:{DmBilling:{getProducts:async()=>({products:['diji_pro','diji_premium_pro'].map(id=>({id,offers:[{basePlanId:'aylik',phases:[{price:id==='diji_pro'?'₺45':'₺79',micros:79000000,period:'P1M'}]},...(id==='diji_premium_pro'?[{basePlanId:'aylik',offerId:'trial7',phases:[{price:'Ücretsiz',micros:0,period:'P7D'},{price:'₺79',micros:79000000,period:'P1M'}]}]:[])]}))})}}};window.dmAndroidWatchReward=async()=>({ok:true});
});
await page.addScriptTag({url:'http://127.0.0.1:8765/ingilizce/dm-satis.js'});await page.waitForSelector('.dms-trial-float');
await page.waitForTimeout(450);if(w===390)await page.screenshot({path:'sales-qa/gift.png'});
await page.click('.dms-trial-open');await page.waitForSelector('.dmp-trial-hero');await page.waitForTimeout(100);
await page.click('[data-period="yillik"]');await page.click('[data-trial]');
if(await page.locator('[data-period="aylik"]').getAttribute('aria-pressed')!=='true')throw Error('trial does not select monthly');
const check=await page.evaluate(()=>{const r=s=>{const a=document.querySelector(s).getBoundingClientRect();return {top:a.top,bottom:a.bottom,left:a.left,right:a.right}};return {trial:r('.dmp-trial-hero'),buy:r('.dmp-buy'),table:r('.dmp-table'),legal:r('.dmp-legal'),content:document.querySelector('.dmp-in').scrollHeight,height:document.querySelector('.dmp-in').clientHeight,overflow:document.querySelector('.dmp-in').scrollWidth>innerWidth}});
console.log(w,h,JSON.stringify(check));if(check.buy.bottom>h||check.trial.top<0||check.overflow)throw Error('layout overflow');
await page.screenshot({path:`sales-qa/plans-${w}.png`});
await page.click('[data-close]');await page.evaluate(()=>DMSatis.enerji());await page.waitForSelector('[data-energy-trial]');await page.waitForTimeout(450);if(w===390)await page.screenshot({path:'sales-qa/energy.png'});
await page.click('[data-energy-trial]');await page.waitForSelector('.dmp-trial-hero');await page.close();
}await browser.close()})().catch(e=>{console.error(e);process.exit(1)});
