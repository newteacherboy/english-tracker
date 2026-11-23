import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStop,voiceURL,schoolWords,studyWordScope,practiceCount} from '../supabase/functions/diji-api/parent-content.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
test('school codes recover the actual class and unit from zero-valued historical rows',()=>{
 assert.deepEqual(normalizeStop({class_no:0,unit_no:0,level_no:280557}),{class_no:8,unit_no:5,level_no:280557});
 assert.equal(normalizeStop({class_no:5,unit_no:2,level_no:250251}).unit_no,2);
 assert.equal(normalizeStop({class_no:0,unit_no:0,level_no:1101}).class_no,1);
});
test('completed school stops include only their words and merge trailing singleton identically to Parkur',()=>{
 const bank=['apple','bag','book','cat','dog'].map((english,i)=>({english,turkish:'anlam'+i,unit_no:1}));
 const words=schoolWords(bank,[normalizeStop({class_no:0,unit_no:0,level_no:250151})],5);
 assert.equal(words.length,5);assert(words.every(w=>w.grade===5));
 assert.equal(schoolWords(bank,[],5).length,0);
});
test('mixed stops resolve to actual learned words rather than an empty slice',()=>{
 const bank=Array.from({length:12},(_,i)=>({english:'word'+i,turkish:'anlam'+i,unit_no:i<8?1:2}));
 const words=schoolWords(bank,[normalizeStop({class_no:0,unit_no:0,level_no:280153})],8);
 assert.equal(words.length,4);assert(words.every(w=>w.grade===8));
});
test('parent recordings resolve to the exact existing shared English recording, never synthesized speech',()=>{
 const window={localStorage:{getItem:()=>null}};vm.runInNewContext(fs.readFileSync('ingilizce/shared-voice.js','utf8'),{window});
 for(const word of ['apple','Goodbye!','My sister is seven.','book'])assert.equal(voiceURL(word),window.dmSharedVoice.urlFor(word,'en-US'));
 assert.equal(voiceURL('never_uploaded_fixture_123456'),null);
 assert(!fs.readFileSync('ingilizce/parent-center.js','utf8').includes('speechSynthesis'));
});

test('a flashcard test is restricted to studied words that the server already knows',()=>{
 const learned=[{en:'apple',tr:'elma'},{en:'book',tr:'kitap'}];
 assert.deepEqual(studyWordScope(learned,['apple|elma','unlearned|öğrenilmedi']),[learned[0]]);
 assert.deepEqual(studyWordScope(learned,['APPLE|elma.']),[learned[0]]);
 assert.equal(practiceCount({count:1,wordKeys:['apple|elma']}),1);
 assert.equal(practiceCount({count:1}),5);assert.equal(practiceCount({count:50,wordKeys:[]}),5);
});
