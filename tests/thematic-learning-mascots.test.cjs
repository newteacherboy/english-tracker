'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../ingilizce');
const source = fs.readFileSync(path.join(root, 'thematic-learning.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'learning-assets/characters/manifest.json'), 'utf8'));
const names = ['lumo','tiko','mimo','pofin','ziri','kori','fora','bumbi','nori','vela'];
const scriptRoster = source.match(/^const LEARNING_MASCOTS=.+$/m)?.[0];
const scriptPicker = source.match(/^function mascotAt\(cursor\).+$/m)?.[0];

test('approved mascot roster is present in the requested order', () => {
  assert.ok(scriptRoster && scriptPicker, 'Learning Path must have a mascot picker');
  assert.deepEqual(manifest.questionOrder, names);
  assert.ok(source.includes('data-ml-character'), 'Mascots must be rendered per question');
  assert.ok(source.includes('bindMascotFallback(box)'), 'Final-review question must use the roster');
});

test('first ten questions have different characters and retries keep the same one', () => {
  const pick = vm.runInNewContext(scriptRoster+'\n'+scriptPicker+'\nmascotAt');
  for(let i=1;i<=10;i++)assert.equal(pick(i), names[i-1], 'Question '+i);
  assert.equal(pick(11),names[0]);
  assert.equal(pick(1),pick(1),'Retry of same question');
  assert.equal(pick(0),names[0],'Intro is deterministic');
});

test('20 genuine transparent PNG/WebP files exist with readable headers', () => {
  const dir = path.join(root,'learning-assets/characters');
  for(const name of names){
    const png=fs.readFileSync(path.join(dir,name+'.png'));
    const webp=fs.readFileSync(path.join(dir,name+'.webp'));
    assert.ok(png.length>10000 && webp.length>10000,name+' should not be empty');
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+' PNG signature');
    assert.equal(png.readUInt32BE(16),512,name+' PNG width');
    assert.equal(png.readUInt32BE(20),512,name+' PNG height');
    assert.equal(webp.toString('ascii',0,4),'RIFF',name+' WebP RIFF header');
    assert.equal(webp.toString('ascii',8,12),'WEBP',name+' WebP format');
  }
});

test('larger custom mascots stay prominent through responsive fit levels', () => {
  const css=fs.readFileSync(path.join(root,'thematic-learning.css'),'utf8');
  const marker='/* Larger DijiMedu discovery mascots.';
  const i=css.lastIndexOf(marker);
  assert.ok(i>0,'Large mascot rules should exist after the compact layout');
  const rules=css.slice(i);
  assert.match(rules,/\.ml-arena-papi\[data-ml-character\]/,'Only new mascot images use enlargement');
  assert.match(rules,/grid-template-columns:minmax\(105px,35%\)/,'Normal layout reserves a larger column');
  assert.match(rules,/grid-template-columns:minmax\(92px,32%\)/,'Compact layout remains sizeable');
  assert.match(rules,/grid-template-columns:minmax\(78px,28%\)/,'Extra-compact layout should not shrink to the former 48px column');
  assert.match(rules,/@media\(max-width:360px\)/,'Small phones retain dedicated widths');
  assert.match(rules,/@media\(min-width:600px\) and \(max-height:520px\)/,'Short landscape screens have dedicated image limits');
});

test('lesson entry uses a fresh nonrepeating mascot on every opening', () => {
 const begin=source.indexOf("let lastEntryMascot=''");
 const end=source.indexOf('function mascotAt(cursor)',begin);
 assert.ok(begin>=0&&end>begin,'Entry mascot selector should exist');
 const stored=new Map();
 const context={sessionStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)}};
 const select=vm.runInNewContext(scriptRoster+'\n'+source.slice(begin,end)+'\npickEntryMascot',context);
 let previous='';
 for(let i=0;i<30;i++){
  const next=select();
  assert.ok(names.includes(next),'Only approved maskots appear');
  assert.notEqual(next,previous,'Consecutive lesson opens must have different mascots');
  previous=next;
 }
 assert.match(source,/class="ml-entry-start"/);
 assert.match(source,/Öğrenme Yolunda Devam Et/);
 assert.match(source,/bindMascotFallback\(modal\)/);
});
test('theme overview keeps 20 themes, six topics each and gated lesson buttons', () => {
 const begin=source.indexOf('async function openAll()'),end=source.indexOf('function close(',begin),ui=source.slice(begin,end);
 assert.ok(begin>=0&&end>begin);
 for(const keyword of ['ml-summary-ring','ml-summary-track','ml-theme-info','ml-theme-track','ml-topic-grid','ml-topic-card','ml-topic-steps','data-chapter','aria-disabled','ml-theme-current'])assert.ok(ui.includes(keyword),keyword);
 assert.match(ui,/t\.topics\.map/,'All topic cards stay dynamic');
 assert.match(ui,/pair\.map/,'Both chapters per topic remain rendered');
 assert.match(ui,/Önce sıradaki bölümü tamamla/,'Locked lessons still block navigation');
 assert.match(ui,/esc\(topic\.objective\)/,'Learning objectives remain escaped');
});
test('responsive approved layout keeps full-size entry mascot and one-column topics', () => {
 const css=fs.readFileSync(path.join(root,'thematic-learning.css'),'utf8');
 const newCss=css.slice(css.lastIndexOf('/* Learning-path premium redesign'));
 assert.match(newCss,/#mlThemeList \.ml-topic-grid\{display:grid;grid-template-columns:1fr/);
 assert.match(newCss,/#dmStoryLesson\.ml-entry \.ml-entry-papi/);
 assert.match(newCss,/#dmStoryLesson\.ml-entry \.ml-entry-prize/);
 assert.match(newCss,/#dmStoryLesson\.ml-entry \.ml-entry-start/);
 assert.match(newCss,/@media\(max-width:360px\)/);
});
