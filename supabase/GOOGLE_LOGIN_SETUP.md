# Google ile İngilizce öğrenci girişi ve kayıt

Google ile giriş / kayıt düğmesi mevcut hesap bağlamayı ve yeni öğrenci kaydını destekler. Google kimliği sunucuda auth.getUser ile doğrulanır. Mevcut öğrenci hesabı yalnız mevcut şifre doğrulandıktan sonra bağlanır; aynı ad veya e-posta hesabı otomatik bağlamaz ve mevcut kayıtları değiştirmez.

Yeni Google kaydı öğrenci adı, sınıf/şube, veli cep telefonu, veli e-postası, isteğe bağlı öğretmen kodu ve veli bilgilendirme beyanını ister. Şifre oluşturulmaz; uyumluluk için sunucuda bilinmeyen rastgele bir parola hash'i tutulur. Yeni öğrenci ve Google eşleştirmesi tek veritabanı işlemiyle oluşturulur. Kullanıcının isteğiyle yeni Google öğrencileri approved durumunda açılır ve doğrudan portal oturumu alır. Mevcut bekleyen/engelli hesaplar otomatik onaylanmaz. Normal kullanıcı adı/şifre kaydı değişmez.

Sorumlu öğretmene, kod yoksa yöneticiye kayıt bilgisi bildirim kuyruğuna eklenir; onay talebi değildir. E-posta teslimatı mevcut kuyruk/gönderici sistemine bağlıdır.

SQL: google-login.sql eşleştirme tablosunu; google-signup.sql sunucuya özel SECURITY INVOKER register_google_student işlevini oluşturur. İkisi de anon/authenticated erişimine kapalıdır. JWT doğrulaması Edge Function içinde yapılır; fonksiyonun önceki verify_jwt=false ayarı korunur.

Google OAuth origin: https://panel.ogretmencocuk.com
Google OAuth callback: https://nxfqlutulxqzqgwewssd.supabase.co/auth/v1/callback
Supabase izinli uygulama dönüşü: https://panel.ogretmencocuk.com/ingilizce/
İngilizceye ait Auth storageKey: diji-ingilizce-google-auth

Doğrulama: 18 Node testi geçti (7 mevcut hesap bağlama, 7 yeni kayıt, 4 frontend). Veritabanında başarılı aktif kayıt/eşleştirme, tekrar çağrı ve başarısız eşleştirmede rollback test edildi; test verileri işlem sonunda geri alındı. RPC erişim izinleri doğrulandı. Gerçek Google OAuth ile yeni kullanıcı kaydı henüz kullanıcıyla uçtan uca test edilmedi.

Geri dönüş: Google sağlayıcısını kapatmak düğmeyi gizler; mevcut şifreli giriş çalışmaya devam eder. Oluşturulan öğrenci veya Google eşleştirmelerini silmeyin. Frontend, API ve veritabanı değişiklikleri yayınlandı; API mevcut sürüm 48 üzerine yalnız Google kayıt dalı eklenerek sürüm 49'a çıkarıldı.
