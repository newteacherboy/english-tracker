// Student-only retirement; trusted teacher/classroom context stays available.
export const retiredGame = game => ['jp','jeopardy','kelimebul','dikte','canavar','harfbahcesi','tren','cumle','ky','kelime','bosluk','yagmur','eslestirme','es','ralli','rally','cloud-flight'].includes(String(game||'').toLowerCase());
export const personalStudent = actor => actor?.role==='student'&&!actor.teacher_portal_access_id&&!actor.teacherProxy;
export const permanentlyRetiredGame = game => ['kule','tower','word-blocks','premiumtower','premiumblok'].includes(String(game||'').toLowerCase());
export const retiredForActor = (game,actor,variant) => permanentlyRetiredGame(game)||personalStudent(actor)&&retiredGame(game)&&!(game==='ky'&&variant==='golu');
export function retiredStudentOperation(op,body,q,actor){
 if(/^kuleLiderlik(?:Kaydet|Getir|TumunuGetir)?$/i.test(op))return true;
 if(['verifiedGameStart','verifiedGameStatus','verifiedGameAnswer','verifiedGameAnswers','soloLevelStatus','soloLevelComplete','seviyeOyunOdulu'].includes(op)&&permanentlyRetiredGame(body?.game??q?.get('game')))return true;
 if(!personalStudent(actor))return false;
 if(/^mola(Durum|Baslat|Bitir|Siralama|BolumGec)$/.test(op))return true;
 if(/^(jeopardy|kelimebul|dikte|canavar|harfbahcesi|tren|cumle|kelime|bosluk|yagmur|eslestirme|eslesme|ralli)Liderlik(?:Kaydet|Getir|TumunuGetir)?$/i.test(op))return true;
 const game=String(body?.game??q?.get('game')??'').toLowerCase();
 // Legacy football shares the ky protocol; reward/status evidence is checked against the saved deck.
 if(game==='ky'&&['verifiedGameStatus','verifiedGameAnswer','verifiedGameAnswers','seviyeOyunOdulu'].includes(op))return false;
 if(['verifiedGameStart','soloLevelStatus','soloLevelComplete','verifiedGameStatus','verifiedGameAnswer','verifiedGameAnswers','seviyeOyunOdulu'].includes(op)&&retiredGame(game)&&!(game==='ky'&&op==='verifiedGameStart'&&body?.soloVariant==='golu'&&Number(body?.soloLevel)>0))return true;
 if(['duelloGonder','duelloSonucKaydet'].includes(op)&&/^(?:(Jeopardy|KelimeBul|Dikte|Canavar|HarfBahcesi|Tren|Cumle|Kelime|Yagmur|Eslesme)_Liderlik|Bosluk_Tablosu)$/i.test(String(body?.oyun??q?.get('oyun')??'')))return true;
 return false;
}
