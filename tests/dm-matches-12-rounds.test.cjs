const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const migration=fs.readFileSync('supabase/migrations/20261010160000_dm_matches_12_questions.sql','utf8');
const ui=fs.readFileSync('ingilizce/medupro.js','utf8');
test('new multiplayer games select twelve questions',()=>{
 assert.match(migration,/order by random\(\) limit 12/);
 assert.match(migration,/jsonb_array_length\(qs\)<>12/);
 assert.match(migration,/jsonb_array_length\(pool\),0\)<12/);
});
test('old eight-question sessions still work',()=>{
 assert.match(migration,/idx>=jsonb_array_length\(m\.questions\)/);
 assert.match(migration,/idx between 0 and jsonb_array_length\(m\.questions\)-1/);
 assert.match(migration,/make_interval\(secs=>12\*jsonb_array_length\(m\.questions\)\)/);
 assert.match(migration,/for i in 0\.\.jsonb_array_length\(questions\)-1 loop/);
 assert.match(migration,/'total',jsonb_array_length\(m\.questions\)/);
});
test('multiplayer interface reads variable session total',()=>{
 assert.match(ui,/\$\{d\.index\+1\}\/\$\{d\.total\|\|12\} soru/);
});

test('sentence route and word flight both use word_bank',()=>{assert.doesNotMatch(migration,/from public\.sentence_bank/);assert.match(migration,/from public\.word_bank/);});
