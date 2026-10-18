# Diji-Medu: Her yaş için kayıt ve isteğe bağlı seviye testi

Durum: Uygulamaya uygulanmadan önce tamamlanması gereken bütünleşik değişiklik sözleşmesi. Bu belge canlı özelliğin tamamlandığı anlamına gelmez.

## Onaylanmış kullanıcı akışı
1. Hesap oluşturma / Google ile giriş. Bütün kayıt ekranlarında uygun geri ve "Hesabım Var" navigasyonu korunur.
2. Yaş aralığı; yalnızca gerekli yaş kategorisi ve kullanıcı seçimi toplanır, kesin doğum tarihi zorunlu olmaz.
3. Kullanım amacı: "Okul derslerim için", "Kendim için öğreniyorum", "Öğretmenim". İkinci seçenek yetişkinleri, üniversite öğrencilerini ve okul dışındaki öğrenenleri kapsar.
4. Sadece okul dersleri seçeneğinde eğitim bilgileri: ilkokul/ortaokul/lise/üniversite seçimine göre okul, sınıf/öğrenim yılı ve isteğe bağlı şube. Mevcut 1–8 sınıf parkurunun kelime veri eşlemesi korunur; lise/üniversite ve okul dışı kişilere zorla 1–8 sınıf atanmaz.
5. Öğrenme hedefi ve parkur tercihi.
6. Kısa adaptif CEFR ön değerlendirmesi: "Teste başla" ile "Şimdilik geç" aynı ekranda. Geçen kullanıcıya sertifika veya doğrulanmış seviye atama yapılmaz; başlangıç öğrenme yolu A1 önerilir, sonradan teste erişebilir.
7. Sonuç, sadece ilk tahmini düzeyi gösterir; standart sertifika veya kesin ölçüm iddiası yoktur. Dinleme/okuma/dil kullanımından örneklem alınır; eksik beceriler için uyarı gösterilir.

## Teknik gereklilikler
- Mevcut `students.class_no` ve `students.branch` alanları ile öğretmen/sınıf bağlantısı gerektiren işlevler geriye dönük uyumlu kalmalı. Kullanım amacı ve öğrenim türü ayrı şemada veya uygun profilde tutulmalı; keyfi sahte sınıf/şube yazılmamalı.
- `kisiselBilgilerAc` şu anda her hesap için 1–8 sınıf ve şube isteyip `kisiselBilgiGuncelle` de aynı alanları doğruluyor. İstemci + API + veritabanı birlikte güncellenmeli, mevcut öğretmen bağlantılı öğrenciler korunmalı.
- E-posta, telefon, veli iletişim ve doğrulama kuralları yaşa / hesap türüne göre ayrılmalı; çocuk güvenlik kontrolleri veya bağlı öğretmen yetkileri kazara kaldırılmamalı. Çocuklarda kişisel bilgi minimizasyonu uygulanmalı.
- Mevcut `ingilizce/placement-bank.js` havuzunda soru cevaplarının ilk indeks olduğu gözlendi; ekranda seçenekler her denemede karıştırılırken doğru cevap anahtarı güvenli yönetilmeli. Test sonucu istemciden kabul edilmemeli, erişim/puanlama sunucuda doğrulanmalı.
- Seviye testinin geçilmesi parkur, oyunlar, profil, arkadaşlar ve güncel Papi yüklenme animasyonunu bloke etmemeli.
- Eski hesaba tekrar girişte onboarding gösterilmemeli; yeni hesaba ilk kayıtta tek defa açılmalı ve kesintiden sonra kaldığı adım sürdürülmeli.

## Yayın öncesi kontroller
- 8 yaş öğrenci, lise öğrencisi, üniversite öğrencisi, yetişkin bağımsız öğrenen, öğretmen, mevcut 1–8 öğretmen bağlantılı eski hesap, Google hesabı ve demo hesap.
- Kayıt geri/ileri, kaydet, mobil klavye, yükleme ve e-posta doğrulama; her hedef cihazda.
- "Şimdilik geç" hem test başlangıcında hem uygun testi terk etme adımında çalışmalı; boş seviye değeri ödül/lig sistemiyle karışmamalı.
- Seviye tahminlerinde A1/A2/B1/B2; sınır skorları; boş cevaplar; aynı hesapta tekrarlama; yarıda kesilme.
- En az bir uçtan uca test ve API yetki testi geçmeden `main` dalına birleşim veya canlı yayın yapılmamalı.
