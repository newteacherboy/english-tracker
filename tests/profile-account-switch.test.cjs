'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('account switch is grouped under Account and Support and still dispatches the existing action',()=>{
 let nav=null,menu,opened=0;
 const last={setAttribute(){},focus(){}};
 const slot={textContent:'',innerHTML:'',classList:{add(){}},focus(){}};
 const element={querySelector:()=>slot,remove(){}};
 const document={getElementById:id=>id==='bottomNavMobile'?nav:null,querySelector:()=>null,addEventListener(){},createElement:()=>element,body:{append(el){menu=el;}}};
 const window={dmHesapDegistirAc(){opened++;}};
 vm.runInNewContext(fs.readFileSync('ingilizce/bottom-nav.js','utf8'),{window,document,navigator:{},console});
 nav={querySelector:()=>last,querySelectorAll:()=>[]};
 window.dmProfileMenuAc();
 assert.match(menu.innerHTML,/Benim Merkezim/);
 assert.doesNotMatch(menu.innerHTML,/data-profile="switchAccount"/);
 menu.onclick({target:{closest:selector=>selector==='[data-centre]'?{dataset:{centre:'account'}}:null}});
 assert.match(menu.innerHTML,/data-profile="switchAccount"/);
 assert.match(menu.innerHTML,/Hesap Değiştir/);
 menu.onclick({target:{closest:selector=>selector==='[data-profile]'?{dataset:{profile:'switchAccount'}}:null}});
 assert.equal(opened,1);
});
test('profile menu supports extra actions on portrait and short landscape screens',()=>{
 const css=fs.readFileSync('ingilizce/member-polish.css','utf8');
 assert.match(css,/grid-template-rows:repeat\(7,minmax\(60px,1fr\)\)/);
 assert.match(css,/grid-template-rows:repeat\(4,minmax\(60px,1fr\)\)/);
 assert.match(css,/grid-auto-rows:minmax\(60px,1fr\)/);
 assert.match(css,/overflow-y:auto!important;overscroll-behavior:contain/);
});
