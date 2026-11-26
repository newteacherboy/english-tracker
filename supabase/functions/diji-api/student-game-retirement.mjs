// Student-only retirement; trusted teacher/classroom context stays available.
export const retiredGame = game => ['jp','jeopardy','kelimebul','dikte','canavar','harfbahcesi','tren','cumle'].includes(String(game||'').toLowerCase());
export const personalStudent = actor => actor?.role==='student'&&!actor.teacher_portal_access_id&&!actor.teacherProxy;
export const permanentlyRetiredGame = game => ['kule','tower','word-blocks','premiumtower','premiumblok'].includes(String(game||'').toLowerCase());
export const retiredForActor = (game,actor) => permanentlyRetiredGame(game)||personalStudent(actor)&&retiredGame(game);
export function retiredStudentOperation(op,body,q,actor){
 if(/^kuleLiderlik(?:Kaydet|Getir|TumunuGetir)?$/i.test(op))return true;
 if(['verifiedGameStart','verifiedGameStatus','verifiedGameAnswer','verifiedGameAnswers','soloLevelStatus','soloLevelComplete','seviyeOyunOdulu'].includes(op)&&permanentlyRetiredGame(body?.game??q?.get('game')))return true;
 if(!personalStudent(actor))return false;
 if(/^mola(Durum|Baslat|Bitir|Siralama|BolumGec)$/.test(op))return true;
 if(/^(jeopardy|kelimebul|dikte|canavar|harfbahcesi|tren|cumle)Liderlik(?:Kaydet|Getir|TumunuGetir)?$/i.test(op))return true;
 if(['verifiedGameStart','verifiedGameStatus','verifiedGameAnswer','verifiedGameAnswers','soloLevelStatus','soloLevelComplete','seviyeOyunOdulu'].includes(op)&&retiredGame(body?.game??q?.get('game')))return true;
 if(['duelloGonder','duelloSonucKaydet'].includes(op)&&/^(Jeopardy|KelimeBul|Dikte|Canavar|HarfBahcesi|Tren|Cumle)_Liderlik$/i.test(String(body?.oyun??q?.get('oyun')??'')))return true;
 return false;
}
