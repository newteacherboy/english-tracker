# Ana parkurdan bir defalık XP aktarımı

Kullanıcı 2026-10-04 tarihinde mevcut altınları aynen koruyarak toplam XP ve
öğrenci seviyelerinin ana parkur ilerlemesine göre yeniden kurulmasını onayladı.
Bu değişiklik, önceki toplam/haftalık/günlük XP'yi aktarıma eklemez.

## Hesap

- Kaynak: sunucudaki `level_completions`, yalnızca `mode=buyu`.
- Güncel duraklar aktif kelime bankasındaki sınıf/ünitelerle doğrulanır.
- Eski sekiz kelimelik parçalar, mevcut haritanın aktarımıyla aynı şekilde
  bir ünitenin en az yarısı geçilmişse o ünitenin durağına dönüştürülür.
- Aynı durağın eski/yeni kayıtları tek kez sayılır. Kayıtlı yıldızların en yükseği kullanılır.
- 1/2/3 yıldız için 42/48/60 XP: doğru başına mevcut 6 XP tabanı ve kayıtlı
  yıldızın gösterdiği en az 7/8/10 doğru esas alınır. Eksik yıldız 1 kabul edilir.
  Geçmiş hız, seri, joker ve günlük çarpanları tahmin edilmez; bilinmeyen yanlış
  sayısına ilişkin ek ceza da uydurulmaz. Bu geçmiş aktarımıdır, yeni tur ödülü değildir.
- Altı tamamlanmış durak 252–360 XP'ye karşılık gelir. Altın bakiyesi değişmez.
- Yarım durak ilerlemesi sunucuda soru bazında kayıtlı olmadığından XP verilmez.
- Konuşma/harici ders tamamlamaları ve bağımsız oyun geçmişi bu başlangıca dahil edilmez.

## Koruma

`dm_private.parkur_xp_rebase_audit` her hesabın eski `yo` kaydını, eski altın
bakiyesini ve sayılan duraklarını tutar. Şema ve tablo genel/anon/authenticated
erişimine kapalıdır. Hiçbir eski kayıt ya da sahip olunan ürün silinmez.

Aktarım sadece `yo.totalXp`, `yo.guncelleme` ve `yo.dmParkurMigration` alanlarını
değiştirir. Önceden `yo` kaydı olmayan hesaplara sıfır XP'li başlangıç kaydı
oluşturulur; varsa sunucudaki mevcut altın kopyalanır. `students.gold/xp/energy`,
haftalık lig, günlük XP/hedef ve sandık ödülleri değişmez.

Envanteri yeniden sıralayan hediye tetikleyicisi ile haftalık XP kaydı tetikleyicisi,
tablo kilidi altında yalnızca aktarım boyunca durdurulur; aynı işlemde geri açılır.
Korunan tek bir alan değişirse bütün işlem geri alınır.

Aktarım işareti kalıcıdır. Yeni frontend bu işaretten sonra loglardan XP'yi yeniden
üretmez. Eski cihaz işaretsiz kayıt gönderirse sunucu önceki kaydı korur.
Eski sürüm işareti okuyup loglardan yüksek XP üretirse yalnızca toplam XP değişimi
reddedilir; yeni sürüm geçici yazma protokolünü kullanır. Protokol sunucuda saklanmaz.
Sonraki kazanılan XP kabul edilir ve aktarım tekrar çalışsa da sıfırlanmaz.

## Doğrulama

72 Node testi başarılı. Veritabanında `BEGIN … ROLLBACK` içinde gerçek kayıtlarla
aktarım, korunan alan eşitliği, eski cihaz yazımı, yeni +118 XP yazımı, geçici
protokolün saklanmaması ve ikinci çalıştırmada yeni XP'nin korunması doğrulandı.
Yayın öncesi hesap: 88 öğrenci, 34 ilerlemeli hesap, 181 eşsiz tamamlanmış durak;
en yüksek başlangıç 1.290 XP. Bu sayılar okuma anına aittir; uygulama sırasında
güncel sunucu kayıtları aynı kuralla değerlendirilir.

Bu sürüm yalnızca XP aktarımı ve buna ilişkin veri korumasını uygular. Onaylanan
40 seviyelik bütün özellik kapıları ve Papi animasyonları bu değişiklikte değildir.
