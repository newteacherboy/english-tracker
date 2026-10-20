'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('active mobile profile menu exposes and opens account switching',()=>{
 let nav=null,menu,opened=0;
 const last={setAttribute(){},focus(){}};
 const element={style:{setProperty(){}},querySelector:()=>({textContent:'',classList:{add(){}},focus(){}}),remove(){}};
 const document={head:{append(){}},querySelector:()=>null,getElementById:id=>id==='bottomNavMobile'?nav:null,addEventListener(){},createElement:()=>element,body:{append(el){menu=el;}}};
 const window={dmHesapDegistirAc(){opened++;}};
 vm.runInNewContext(fs.readFileSync('ingilizce/bottom-nav.js','utf8'),{window,document,navigator:{},console});
 nav={querySelector:()=>last,querySelectorAll:()=>[]};
 window.dmProfileMenuAc();
 assert.match(menu.innerHTML,/data-profile="switchAccount"/);
 assert.match(menu.innerHTML,/Hesap Değiştir/);
 menu.onclick({stopPropagation(){},target:{closest:selector=>selector==='[data-profile]'?{dataset:{profile:'switchAccount'}}:null}});
 assert.equal(opened,1);
});
test('profile menu supports extra actions on portrait and short landscape screens',()=>{
 const css=fs.readFileSync('ingilizce/member-polish.css','utf8');
 assert.match(css,/grid-template-rows:repeat\(7,minmax\(60px,1fr\)\)/);
 assert.match(css,/grid-template-rows:repeat\(4,minmax\(60px,1fr\)\)/);
 assert.match(css,/grid-auto-rows:minmax\(60px,1fr\)/);
 assert.match(css,/overflow-y:auto!important;overscroll-behavior:contain/);
});
