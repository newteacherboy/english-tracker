const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../ingilizce/game-access.js','utf8');
function load({name='ali',pupil='',cache=[],purpose='school'}={}){
 const buttons=Array.from({length:8},(_,i)=>({
  disabled:true,dataset:{class:String(i+1)},
  classList:{toggle(_class,value){this.active=value;}}
 }));
 const ctx={aktifOgrenciAdi:name,siniftaOynananOgrenci:pupil,globalDataCache:cache,yo:{dmLearningPurpose:purpose},
  document:{getElementById:()=>({querySelectorAll:()=>buttons})}};
 ctx.window=ctx;
 vm.runInNewContext(source,ctx);
 return {ctx,buttons};
}
test('every class and unit is available independently of the route, including classroom play',()=>{
 for(const options of [{purpose:'school'},{purpose:'independent'},{name:'teacher',pupil:'Ayşe',cache:[{ogrenci:'Ayşe',Sinif:4}]}]){
  const {ctx,buttons}=load(options);
  ctx.sinifGridKisitlamaUygula('classes');
  assert(buttons.every(button=>!button.disabled));
  for(let grade=1;grade<=8;grade++)for(let unit=1;unit<=10;unit++)assert.equal(ctx.dmGameAccess.reason(grade,unit),'');
 }
});
test('the recorded class is preferred in the game picker, and other classes remain selectable',()=>{
 const {ctx,buttons}=load({cache:[{ogrenci:'Ali',Sinif:7}]});
 const choices=[];
 ctx.sinifGridKisitlamaUygula('classes',n=>choices.push(n),n=>choices.push(n));
 assert.deepEqual(choices,[7,7]);
 assert.equal(buttons[6].classList.active,true);
 assert.equal(buttons[7].disabled,false);
});
