'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('ingilizce/index.html','utf8');
test('both extracted stylesheets load in the same relative order',()=>{
 const secondary=html.indexOf('portal-secondary-extracted.css?v=20261015-1');
 const world=html.indexOf('portal-world-extracted.css?v=20261015-1');
 assert.ok(secondary>0 && world>secondary);
 for(const [name,min,needle] of [
  ['portal-secondary-extracted.css',27000,'shakeAnimation'],
  ['portal-world-extracted.css',24000,'bc-ka']]){
  const css=fs.readFileSync('ingilizce/'+name,'utf8');
  assert.ok(css.length>min,name+' unexpectedly small');
  assert.ok(css.includes(needle),name+' missing expected CSS');
 }
});
test('optional games avoid redundant activation after first successful load',()=>{
 const lazy=fs.readFileSync('ingilizce/lazy-games.js','utf8');
 assert.match(lazy,/readyDone=true/);
 assert.match(lazy,/!readyDone&&tab\?\.classList\.contains\('active'\)/);
});
