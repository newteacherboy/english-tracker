import assert from 'node:assert/strict';
import {seededShuffle,shuffledChoice,isUsefulOrdering,inspectChapter} from './papi-v2-question-helpers.mjs';
const original={kind:'choice',options:['wrong','correct','other'],answer:1};
for(let seed=1;seed<=250;seed++){
 const got=shuffledChoice(original,seed);
 assert.equal(got.options[got.answer],'correct');
 assert.deepEqual([...got.options].sort(),[...original.options].sort());
}
assert.deepEqual(original.options,['wrong','correct','other']);
assert.deepEqual(seededShuffle(['a','b','c'],18),seededShuffle(['a','b','c'],18));
assert.equal(isUsefulOrdering({kind:'order',tokens:['Hello!']}),false);
assert.equal(isUsefulOrdering({kind:'order',tokens:['I','like','apples.']}),true);
assert.equal(inspectChapter({steps:[{kind:'order',tokens:['Hello!']}]}).length,1);
console.log('Papi V2 basic question helper tests passed');
