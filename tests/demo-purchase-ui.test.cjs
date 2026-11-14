const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('demo Premium access leaves Pro monthly and yearly StoreKit purchases selectable',async()=>{
  const dom=new JSDOM('<body></body>',{url:'https://app.dijimedu.com/ingilizce/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,calls=[];
  const status={role:'student',plan:'premium_pro',purchasePlan:'free',canBuy:true,accountRef:'demo-ref',products:[{id:'diji_pro'},{id:'diji_premium_pro'}],entitlements:[]};
  const plugin={getProducts:async()=>({products:status.products.map(p=>({id:p.id,offers:['aylik','yillik'].map(basePlanId=>({basePlanId,phases:[{price:basePlanId==='aylik'?'$0.99':'$6.99',micros:990000}]}))}))}),purchase:async args=>{calls.push(args);return {canceled:true};}};
  w.dmAndroidBilling={available:true,status,refresh:async()=>status};
  w.Capacitor={getPlatform:()=> 'ios',Plugins:{DmBilling:plugin}};
  w.eval(fs.readFileSync('ingilizce/dm-satis.js','utf8'));
  await w.DMSatis.planlar('test','pro');
  for(const period of ['aylik','yillik']){
    w.document.querySelector('[data-period="'+period+'"]').click();
    const pro=w.document.querySelector('[data-pick="pro"]');assert.equal(pro.disabled,false);pro.click();
    const buy=w.document.querySelector('[data-buy]');assert.equal(buy.disabled,false);buy.click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(calls.at(-1).productId,'diji_pro');assert.equal(calls.at(-1).basePlanId,period);
    assert.equal(calls.at(-1).accountRef,'demo-ref');
  }
  assert.equal(status.plan,'premium_pro');assert.equal(calls.length,2);
  dom.window.close();
});
