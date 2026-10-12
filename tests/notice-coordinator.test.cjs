const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('onboarding retains the notice API used by recurring announcements',()=>{
 const listeners={},classList={contains:()=>false,remove(){},toggle(){}};
 const c={document:{createElement:()=>({}),head:{append(){}},hidden:false,body:{classList},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener:(n,f)=>listeners[n]=f},MutationObserver:class{observe(){}},setInterval(){},setTimeout(){},matchMedia:()=>({matches:false}),Date,console};c.window=c;vm.createContext(c);
 for(const file of ['papi-flow.js','papi-onboarding.js'])vm.runInContext(fs.readFileSync('ingilizce/'+file,'utf8'),c);
 for(const name of ['blocked','defer','suspend','resume','later'])assert.equal(typeof c.dmPapiNotices[name],'function',name);
 assert.equal(c.dmPapiNotices.blocked(),false);assert.equal(c.dmPapiNotices.defer('test',()=>{}),false);c.dmPapiNotices.resume();
});
