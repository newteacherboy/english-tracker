/* Sınıf kodu (çoklu sınıf). Biçim: 7 karakter, ilk harf G-Z; eski öğretmen kodları onaltılık olduğundan çakışmaz. */
export const isClassCode = kod => /^[G-Z][A-Z0-9]{6}$/.test(String(kod || ''));

// Kayıt/bağlanmada sınıf kodu kontrolü: öğrencinin seçtiği sınıf numarası sınıfınkiyle aynı olmalı
// (sınıf numarası başlangıç durağını belirlediği için kod onu sessizce değiştirmez).
export function classCodeCheck(cls, studentClassNo) {
  if (!cls) return { ok: true };
  if (studentClassNo === null || studentClassNo === undefined || studentClassNo === '') return { ok: false, mesaj: 'Sınıf kodu okul öğrencileri içindir. Okul hesabı seçip sınıfını işaretle.' };
  if (Number(studentClassNo) !== Number(cls.classNo)) return { ok: false, mesaj: `Bu sınıf kodu ${cls.classNo}. sınıf içindir. Sınıfını ${cls.classNo} olarak seç ya da öğretmeninden doğru kodu iste.` };
  return { ok: true, branch: cls.branch };
}
