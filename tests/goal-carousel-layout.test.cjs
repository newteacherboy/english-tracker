const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const js=fs.readFileSync('ingilizce/learning-companion.js','utf8'),css=fs.readFileSync('ingilizce/learning-companion.css','utf8');
test('removes redundant route shortcut but keeps existing map switch',()=>{assert.doesNotMatch(js,/createElement\('div'\);switchRow\.className='dm-parkur-shortcut'/);assert.match(js,/\.dm-parkur-shortcut'\)\?\.remove/);const map=fs.readFileSync('ingilizce/oyna-v2.js','utf8');assert.match(map,/data-rt="switch-route"/);});
test('weekly and daily carousel cards share the same fixed minimum height',()=>{assert.match(css,/\.dm-goal-pages>\.rt-week,\.dm-goal-pages>\.rt-tasks\{min-height:200px;box-sizing:border-box/);assert.match(css,/\.dm-goal-pages\{min-height:200px\}/);});
