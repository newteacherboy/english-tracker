'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('active mobile profile menu exposes and opens account switching',()=>{
 let nav=null,menu,opened=0;
 const last={setAttribute(){},focus(){}};
 const element={querySelector:()=>({textContent:'',classList:{add(){}},focus(){}}),remove(){}};
 const document={getElementById:id=>id==='bottomNavMobile'?nav:null,addEventListener(){},createElement:()=>element,body:{append(el){menu=el;}}};
 const window={dmHesapDegistirAc(){opened++;}};
 vm.runInNewContext(fs.readFileSync('ingilizce/bottom-nav.js','utf8'),{window,document,navigator:{},console});
 nav={querySelector:()=>last,querySelectorAll:()=>[]};
 window.dmProfileMenuAc();
 assert.match(menu.innerHTML,/data-profile="switchAccount"/);
 assert.match(menu.innerHTML,/Hesap Değiştir/);
 menu.onclick({target:{closest:selector=>selector==='[data-profile]'?{dataset:{profile:'switchAccount'}}:null}});
 assert.equal(opened,1);
});
