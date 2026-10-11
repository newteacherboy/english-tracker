# Öğrenme Yolu — Papi etkinlik akışı (2026-10-11)

## Korunan sözleşmeler
- Mevcut A1–B2 sözcük, kalıp, cümle, çeviri ve durak içeriklerini değiştirme.
- Öğrenciye ait progress/cursor/version, enerji tahsilatı, XP, altın ve tekrar turu işlemlerini koru.
- İstemci ve API soru dizilerini tek bir deterministik içerikten üret; mevcut cevap doğrulamasını atlatma.
- Mevcut oturumlarda eski müfredat sayacını sessizce değiştirme; sürümleme/geçiş tasarla.

## Yeni soru dizisi
1. **Eşleştirme:** Duraktaki İngilizce yapı ve sözcükleri Türkçe karşılıklarıyla eşleştir. Hepsi bitince ilerle.
2. **Dinle/tekrarla:** Papi İngilizce sözcüğü, kalıbı veya cümleyi okur; mikrofonla tekrar edilir. Mikrofon erişilemezse erişilebilir alternatif sun.
3. **Sesli cümle sıralama:** Papi İngilizce cümleyi okur; kullanıcı karışık sözcükleri sıralar. Yeniden dinle, kontrol et, yanlışsa hem doğru İngilizceyi hem Türkçeyi göster ve seslendir; Tamam ile ilerle.
4. **Türkçeden İngilizceyi seç:** Papi Türkçe söyler; kullanıcı doğru İngilizce şıkkını seçer.
5. **Yarım cümleyi tamamla:** Öğretilen yapıyı içeren eksik cümle tamamlanır.
6. **Çeviri:** Bölüm cümlelerinin çevirisi iki yönde sorulabilir.
7. **Final kartları:** Bütün hedef kelime/ifadeler Türkçe olarak sırayla gelir. Öğrenci mikrofonla İngilizcesini söyler veya yazar. Her kartın iki denemesi olur. İlk yanlışta ipucu, ikinci yanlışta Papi doğru İngilizceyi seslendirir, anlamını gösterir ve kartı 'tekrar çalış' olarak işaretler; sonra sıradaki karta geçer.

## Geri bildirim ve erişilebilirlik
- Her doğru cevapta doğru İngilizce sözcük/cümleyi seslendir.
- Sesi yeniden oynatılabilir yap, konuşma sentezini dil bazında `en-US`/`tr-TR` seç.
- Konuşma tanıma tarayıcıda yoksa veya izin reddedilirse görev kilitlenmesin.
- Konuşma tanıma hatalarını pedagojik yanlış kabul etme; API'ye yalnızca doğrulanabilir kullanıcı yanıtı gönder.
- Çeviri/konuşma işlemlerini dil eşleştirme ve normalleştirme testleriyle doğrula.

## Entegrasyon gereksinimleri
- `scripts/build-story-curriculum.py`, üretilmiş istemci/Supabase desteleri, `ingilizce/story-path.js` ve `supabase/functions/diji-api/story-api.ts` birlikte değiştirilmelidir.
- `dm_story_apply` ve soru sayısı/enerji hesabı yeni soru akışına göre sürümlenmelidir.
- Final kartı başına iki deneme durumu sunucuda güvenli tutulmalı; istemci yenilendiğinde tutarlı kalmalı.
- Mevcut öğrenci kayıtları için migrasyon ve geri alma planı olmadan canlı dağıtım yapılmamalıdır.

## Bu dalda tamamlanan ilk adım
- İstemcide doğru cevap sonrası seslendirme.
- Yanlış cümle sıralama sonrası doğru İngilizce ve Türkçe metin açıklaması ve İngilizce seslendirme.
- Yeni yedi türün API/veri bağlantısı henüz uygulanmadı.
