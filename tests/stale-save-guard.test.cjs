// [18 Kas 2026] Sunucu ödülü sürümü ilerletti diye cihaz kaydı "veri eski" sayılmaz; yalnız başka cihazın kaydı sayılır.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
test('stale check uses the last device save version, not reward bumps',()=>{
 assert.match(src,/const sonCihazKaydi = num\(e\.dmSaveVersion, num\(e\.guncelleme\)\);/);
 assert.match(src,/const eskiSurum = taban >= 0 && num\(e\.guncelleme\) > taban && sonCihazKaydi > taban;/);
 assert.match(src,/value\.dmSaveVersion = num\(value\.guncelleme\);/);
});
test('student saves with lower XP are corrected by protectStudentState instead of rejected',()=>{
 assert.match(src,/const korunur = a\.role === "student";/);
 assert.match(src,/const ligGeri = !korunur &&/);
 assert.match(src,/const gunGeri = !korunur &&/);
 assert.match(src,/value=protectStudentState\(value,e2\);\s*ekonomiKoru\(value, e2\);\s*value\.dmSaveVersion/);
});
