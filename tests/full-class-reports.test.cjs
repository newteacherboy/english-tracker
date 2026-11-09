const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const ui=fs.readFileSync('ingilizce/teacher-reports.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20261110120000_full_class_reports.sql','utf8');
const index=fs.readFileSync('ingilizce/index.html','utf8');

test('teacher reports show four distinct data sources and per-student counts',()=>{
  for(const phrase of ['Doğru–yanlış analizi','Ders Çalış','Okul Yolum','Öğrenme Yolu','studyCorrect','schoolCorrect','learningCorrect','totalCorrect','weakTopics']) {
    assert.ok(ui.includes(phrase),phrase);
  }
  assert.match(ui,/data\.students\.filter\(st => !activity\(st\)\)/);
});
test('reports use authenticated class-scoped answer tables and only recorded answers',()=>{
  for(const table of ['dm_lesson_fair_runs','dm_parkur_question_ledger','dm_thematic_first_answers','dm_thematic_enrollment','lesson_progress','game_scores']){
    assert.ok(migration.includes('public.'+table),table);
  }
  assert.match(migration,/p\.answered is true/);
  assert.match(migration,/public\.dm_class_report_games\(p_teacher,p_class,p_days\)/);
  assert.match(migration,/revoke all on function public\.dm_class_report\(uuid,uuid,integer\) from public,anon,authenticated/);
});
test('web entry loads updated teacher reports script',()=>{
  assert.match(index,/teacher-reports\.js\?v=20261110-full-class-answers-1/);
});
