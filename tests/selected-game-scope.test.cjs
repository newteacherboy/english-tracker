const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('sentence and listening games retain exactly the selected class and units',()=>{
 const source=fs.readFileSync('ingilizce/game-feedback.js','utf8');
 const code=source.slice(source.indexOf('function scope(game)'),source.indexOf('function read()'));
 for(const game of ['cumle','dikte']){
  const selected=[3],window={dmSelectedIntro:{key:game,classNo:2,units:selected},masterKelimeHavuzu:[1,2,3].map(unite=>({sinif:2,unite}))};
  vm.runInNewContext(code,{window,dmSelectedIntro:window.dmSelectedIntro});
  const result=window.dmGameScope(game);assert.equal(result.classNo,2);assert.deepEqual(Array.from(result.units),[3]);
  result.units.push(9);assert.deepEqual(selected,[3],'scope must not mutate the selection');
 }
});
