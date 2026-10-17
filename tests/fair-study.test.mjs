import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gradeStudyQuiz,studyTier,recoveryQuestions} from '../supabase/functions/diji-api/fair-study.mjs';
const tasks=[
 {soru:'A',secenekler:['one','two'],dogru:0},
 {tip:'bosluk',soru:'B',secenekler:['red','blue'],dogru:1},
 {tip:'dogruyanlis',soru:'C',dogru:false},
 {tip:'siralama',soru:'D',parcalar:['We','are','friends'],cevap:'We are friends'},
 {soru:'E',secenekler:['happy','sad'],dogru:0},
 {soru:'F',secenekler:['cat','dog'],dogru:1},
];
test('server grades every supplied answer against original content',()=>{
 const r=gradeStudyQuiz(tasks,['one','blue','Yanlış','We are friends','happy','dog']);
 assert.equal(r.correct,6);assert.deepEqual(r.wrongIndices,[]);
 assert.equal(studyTier(r.correct,r.total),100);
});
test('one mistake gets 80 percent, two get 60 percent, three need recovery',()=>{
 assert.equal(studyTier(5,6),80);assert.equal(studyTier(4,6),60);
 const r=gradeStudyQuiz(tasks,['wrong','red','Doğru','We are friends','sad','dog']);
 assert.equal(r.correct,2);assert.deepEqual(r.wrongIndices,[0,1,2,4]);
 assert.deepEqual(recoveryQuestions(r.wrongIndices),[0,1,2]);
 assert.equal(studyTier(2,6),0);
 assert.equal(gradeStudyQuiz(tasks,['one','blue','Yanlış'],[0,1,2]).correct,3);
 assert.equal(studyTier(3,3,true),30);assert.equal(studyTier(2,3,true),0);
});
test('reject incomplete, extra, repeated indices and invalid raw answers',()=>{
 assert.equal(gradeStudyQuiz(tasks,['one']),null);
 assert.equal(gradeStudyQuiz(tasks,['one','one'],[0,0]),null);
 assert.equal(gradeStudyQuiz(tasks,['one',''],[0,1]),null);
 assert.equal(gradeStudyQuiz(tasks,['one','blue'],[0,22]),null);
 assert.equal(gradeStudyQuiz(tasks,['one','blue',null,'We are friends','happy','dog']),null);
});
test('reward tiers are per activity, not a universal hard failure',()=>{
 assert.equal(studyTier(8,11),60);
 assert.equal(studyTier(10,11),80);
 assert.equal(studyTier(11,11),100);
 assert.equal(studyTier(7,11),0);
 assert.equal(studyTier(1,2),0,'Half of a short test must not get 80 percent');
 assert.equal(studyTier(2,3),60,'Two out of three is passing, not exceptional');
 assert.equal(studyTier(3,4),60,'Three out of four is passing, not exceptional');
});
