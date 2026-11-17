-- [18 Kas 2026] Geçiş kaydı (canlıya 20261118030000'den hemen sonra uygulandı):
-- Yayındaki eski istemci yalnız 6 soru kabul ettiği için soru üretimi geçici olarak 6'ya döndürüldü.
-- 10 soruluk istemci (PR) yayına çıkınca 20261118030000 dosyasındaki dm_private.duel_questions yeniden uygulanır.
-- Hasar formülü (duel_score) soru sayısına bakar; iki durumda da doğru çalışır. Bu dosya bilgi amaçlıdır,
-- tekrar çalıştırılmaz.
select 1;
