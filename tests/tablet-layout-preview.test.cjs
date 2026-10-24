const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'../ingilizce');
test('Tablet-only CSS is isolated to preview',()=>{
 const css=fs.readFileSync(path.join(base,'tablet-layout-test.css'),'utf8');
 const inner=fs.readFileSync(path.join(base,'parkur-map-preview-inner.html'),'utf8');
 assert.match(css,/@media\s*\(min-width:\s*700px\)/);
 assert.match(inner,/tablet-layout-test\.css/);
 assert.match(css,/\.dm-parkur-scroll/);
 assert.match(css,/#bottomNavMobile/);
});
test('Preview supports tablet orientations',()=>{
 const html=fs.readFileSync(path.join(base,'parkur-map-preview.html'),'utf8');
 for(const screen of ['768,1024','1024,768','800,1280','1280,800'])
  assert.ok(html.includes('size('+screen+')'),screen);
});

test('Production parkur CSS scopes tablet override to coarse devices',()=>{
 const css=fs.readFileSync(path.join(base,'parkur-map-theme-v1.css'),'utf8');
 const block=css.split('/* DIJI_TABLET_LAYOUT_20261024 */')[1]?.split('/* END_DIJI_TABLET_LAYOUT_20261024 */')[0];
 assert.ok(block,'tablet block must exist');
 assert.match(block, /pointer:coarse/);
 assert.match(block, /min-width:700px/);
 assert.ok(!block.includes('display:none'),'do not hide controls');
});
