const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ui=fs.readFileSync('ingilizce/oyna-v2.js','utf8'),css=fs.readFileSync('ingilizce/oyna-v2.css','utf8'),companion=fs.readFileSync('ingilizce/learning-companion.css','utf8');
test('chapter list banner moves inside map and keeps all-stop actions',()=>{
 new vm.Script(ui);
 assert.match(ui,/function pathMarkup\(steps,current,learn,info\)/);
 assert.match(ui,/\+banner\(info\|\|schoolInfo\(s\),learn\)\+'/);
 assert.match(ui,/class="rt-banner-title" data-rt="all"/);
 assert.match(ui,/data-rt="switch-route"/);
 assert.doesNotMatch(ui,/':banner\(schoolInfo\(steps\[current\]\)\)/);
 assert.match(ui,/pathMarkup\(info\.chapters,cur,true,info\)/);
});
test('map controls occupy opposite top corners',()=>{
 assert.match(css,/\.rt-path>\.rt-banner\{position:absolute;top:12px;left:10px/);
 assert.match(css,/\.rt-path>\.rt-map-switch\{left:auto;right:10px;top:13px/);
 assert.match(css,/\.rt-path\{padding-top:118px!important/);
});
test('weekly card uses stable 200px carousel and expanded progress layout',()=>{
 assert.match(companion,/\.dm-goal-pages>\.rt-week,\.dm-goal-pages>\.rt-tasks\{min-height:200px/);
 assert.match(companion,/\.dm-goal-pages>\.rt-week progress\{height:12px/);
 assert.match(companion,/\.dm-goal-pages>\.rt-week h2\{font-size:clamp/);
});
