const {test}=require('node:test');
const assert=require('node:assert/strict');
const {inline}=require('./_index-source.cjs');
test('regression source loader resolves hash and descriptive release versions',()=>{
  for(const version of ['45bed1ffc0','20261115-papi-walk-2']){
    const source=inline(`<script src="app-js/i24-oku.js?v=${version}"></script>`);
    assert.match(source,/function checkpointSave\(/);
    assert.match(source,/for\(let attempt=0;attempt<3;attempt\+\+\)/);
    assert(!source.includes('src="app-js/'));
  }
});
test('source loader never resolves paths outside the module directory',()=>{
  const tag='<script src="app-js/../native-app.js?v=123"></script>';
  assert.equal(inline(tag),tag);
});
