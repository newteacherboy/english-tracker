



                    function raporlarimAc() {
    let modal = document.getElementById('tab-raporlar');
    modal.classList.add('active');
    modal.style.cssText = 'position:fixed; inset:0; z-index:100000015; background:#eef8fa; overflow-y:auto; padding:16px; display:block;';
    if (!document.getElementById('raporlarimKapatBtn')) {
        let kapat = document.createElement('button');
        kapat.id = 'raporlarimKapatBtn';
        kapat.innerHTML = '✕';
        kapat.style.cssText = 'position:fixed; top:14px; right:14px; z-index:100000016; width:36px; height:36px; border-radius:50%; background:#1e293b; color:#fff; border:none; font-size:16px; cursor:pointer;';
        kapat.onclick = raporlarimKapat;
        document.body.appendChild(kapat);
    }
}
function raporlarimKapat() {
    let modal = document.getElementById('tab-raporlar');
    modal.classList.remove('active');
    modal.style.cssText = '';
    let btn = document.getElementById('raporlarimKapatBtn');
    if (btn) btn.remove();
}

                 // --- SINIF SEVİYESİ KISITLAMA SİSTEMİ ---
        function izinVerilenSinifAraligiGetir() {
            let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === String(oyunIcinAktifIsim()).trim().toLowerCase());
            let ogrSinif = user ? Number(user.Sinif) : 0;
            if (!ogrSinif || ogrSinif < 1) return null; // sınıf bilgisi yoksa (örn. teacher) sınırlama uygulanmaz
            let min = Math.max(1, ogrSinif - 1);
            let max = Math.min(8, ogrSinif + 1);
            return { min: min, max: max };
        }
        function sinifGridKisitlamaUygula(gridId, aktifSinifAyarlaFn, sinifGuncelleFn) {
            let aralik = izinVerilenSinifAraligiGetir();
            let grid = document.getElementById(gridId);
            if (!grid) return;

            let butonlar = grid.querySelectorAll('.sinif-btn');
            let ilkIzinli = null;

            butonlar.forEach((btn, idx) => {
                let sinifNo = idx + 1;
                let izinli = !aralik || (sinifNo >= aralik.min && sinifNo <= aralik.max);
                btn.disabled = !izinli;
                btn.style.opacity = izinli ? '1' : '0.35';
                btn.style.cursor = izinli ? 'pointer' : 'not-allowed';
                btn.classList.remove('active');
                if (izinli && !ilkIzinli) ilkIzinli = { btn: btn, sinifNo: sinifNo };
            });

            if (ilkIzinli) {
                ilkIzinli.btn.classList.add('active');
                aktifSinifAyarlaFn(ilkIzinli.sinifNo);
                sinifGuncelleFn(ilkIzinli.sinifNo);
            }
        }

        function kySinifKisitlamaUygulaVeBaslat() {
            sinifGridKisitlamaUygula('kySinifGrid', function(s) { kyAktifSinif = s; }, kySinifGuncelle);
        }
        function jpSinifKisitlamaUygulaVeBaslat() {
            sinifGridKisitlamaUygula('jpSinifGrid', function(s) { jpAktifSinif = s; }, jpSinifGuncelle);
        }
        function boslukSinifKisitlamaUygulaVeBaslat() {
            sinifGridKisitlamaUygula('boslukSinifGrid', function(s) { boslukAktifSinif = s; }, boslukSinifGuncelle);
        }

                // --- KELİME YARIŞMASI MİMARİSİ ---
        let kyAktifSinif = 1;
        let kySecilenUniteler = [];
        let kySorularListesi = [];
        let kySoruIndex = 0;
        let kyDogruSayisi = 0;
        let kyYanlisSayisi = 0;
        let kyBaslangicZamani = 0;
        let kyGecenSaniye = 0;
        let kyTimerInterval = null;
        let kyMuzikAcik = true;
        let kyAudioElement = null;
                let kySoruBaslangicZamani = 0;
        let kyToplamPuan = 0;
        let kyKombo = 0;

        function kelimeYarismasiAc() {
            if (genelOyunGirisEngelliMi()) return;
            document.getElementById('kelimeYarismaOverlay').style.display = 'flex';
            document.getElementById('kyGirisEkrani').style.display = 'block';
            document.getElementById('kyOyunEkrani').style.display = 'none';
            document.getElementById('kyBitisEkrani').style.display = 'none';

            // Sınıfta oynatılıyorsa ismi kilitle, değilse normal davran
            let isimInput = document.getElementById('kyIsimInput');
            if (isimInput) {
                if (siniftaOynananOgrenci) {
                    isimInput.value = siniftaOynananOgrenci;
                    isimInput.disabled = true;
                } else if (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== "teacher") {
                    isimInput.value = aktifOgrenciAdi;
                    isimInput.disabled = false;
                } else {
                    isimInput.value = "";
                    isimInput.disabled = false;
                }
            }

            kySinifKisitlamaUygulaVeBaslat();
            kelimeMuzikBaslat();
        }

        function kelimeYarismasiKapat() {
            if (liderlikKilitliMiKontrolEt('ky', 'kyBitisEkrani')) return;
            document.getElementById('kelimeYarismaOverlay').style.display = 'none';
            kelimeMuzikDurdur();
            if (kyTimerInterval) clearInterval(kyTimerInterval);
        }
        function kySinifSec(sinif, btnElement) {
            kyAktifSinif = sinif;
            let grid = document.getElementById('kySinifGrid');
            grid.querySelectorAll('.sinif-btn').forEach(b => b.classList.remove('active'));
            btnElement.classList.add('active');
            kySinifGuncelle(sinif);
        }

        function kySinifGuncelle(sinif) {
            // Sınıfa ait üniteleri masterKelimeHavuzu'ndan veya global veriden bulalım
            let havuz = window.masterKelimeHavuzu || [];
            let sinifKelimeleri = havuz.filter(k => Number(k.sinif) === Number(sinif));
            let uniteler = [...new Set(sinifKelimeleri.map(k => Number(k.unite)))].sort((a, b) => a - b);

            if (uniteler.length === 0) {
                uniteler = [1, 2, 3, 4, 5]; // Varsayılan
            }

            let uniteBox = document.getElementById('kyUniteBox');
            uniteBox.innerHTML = "";
            kySecilenUniteler = [];

            uniteler.forEach((u, idx) => {
                let chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'unite-chip' + (idx === 0 ? ' selected' : '');
                chip.innerText = u + '.Ü';
                chip.onclick = function() {
                    chip.classList.toggle('selected');
                    kyUniteSecimleriniGuncelle();
                };
                uniteBox.appendChild(chip);
                if (idx === 0) kySecilenUniteler.push(u);
            });
        }

        function kyUniteSecimleriniGuncelle() {
            kySecilenUniteler = [];
            document.querySelectorAll('#kyUniteBox .unite-chip').forEach((chip, idx) => {
                if (chip.classList.contains('selected')) {
                    kySecilenUniteler.push(idx + 1);
                }
            });
        }

        function kelimeMuzikBaslat() {
            if (!kyMuzikAcik) return;
            if (!kyAudioElement) {
                kyAudioElement = new Audio('ozgun/tema-1.mp3'); // Arka plan müzik akışı
                kyAudioElement.loop = true;
                kyAudioElement.volume = 0.10;
            }
            kyAudioElement.play().catch(() => {});
        }

        function kelimeMuzikDurdur() {
            if (kyAudioElement) {
                kyAudioElement.pause();
                kyAudioElement.currentTime = 0;
            }
        }

        function kelimeMuzikToggle() {
            kyMuzikAcik = !kyMuzikAcik;
            let btn = document.getElementById('kelimeMuzikBtn');
            if (kyMuzikAcik) {
                btn.innerText = "🔊 Müzik: Açık";
                kelimeMuzikBaslat();
            } else {
                btn.innerText = "🔇 Müzik: Kapalı";
                kelimeMuzikDurdur();
            }
        }

        function kelimeYarismasiBaslat() {
            if (genelOyunGirisEngelliMi()) return;
            let isim = document.getElementById('kyIsimInput').value.trim();
            if (!isim) { alert("Lütfen adınızı giriniz!"); return; }
            if (kySecilenUniteler.length === 0) { alert("Lütfen en az bir ünite seçiniz!"); return; }
            let havuz = window.masterKelimeHavuzu || [];
            // Seçilen sınıf ve çoklu ünitelere ait kelimeleri filtrele
            let filtrelenmis = havuz.filter(k => Number(k.sinif) === Number(kyAktifSinif) && kySecilenUniteler.includes(Number(k.unite)));

            if (filtrelenmis.length < 3) {
                alert("Seçtiğiniz kriterlere uygun yeterli kelime bulunamadı. Lütfen farklı üniteler seçin.");
                return;
            }

            // İstediğin kural: 1. sınıfta 10 soru, sınıf arttıkça +5 ekle (1.sınıf=10, 2.sınıf=15, 3.sınıf=20 ... 8.sınıf=45)
            let hedefSoruSayisi = 10 + (Number(kyAktifSinif) - 1) * 5;

            // Kelimeleri karıştır ve yeni turda aynı kelimelerin gelmemesini sağla (Fisher-Yates Shuffle)
            kySorularListesi = OC.kelimeSec('ky', filtrelenmis, OC.SORU); OC.basla('ky'); genelEnerjiHarca(-3);

                kySoruIndex = 0;
            kyDogruSayisi = 0;
            kyYanlisSayisi = 0;
            kyBaslangicZamani = Date.now();
            kyGecenSaniye = 0;
            kyToplamPuan = 0;
            kyKombo = 0;

            document.getElementById('kyGirisEkrani').style.display = 'none';
            document.getElementById('kyOyunEkrani').style.display = 'block';
                jokerTuruBaslat('ky', 'kyOyunEkrani');

            if (kyTimerInterval) clearInterval(kyTimerInterval);
            kyTimerInterval = setInterval(() => {
                if (OC.aktif?.pauseAt) return;
                kyGecenSaniye = Math.floor((Date.now() - kyBaslangicZamani) / 1000);
                document.getElementById('kySureInfo').innerText = `⏱️ Süre: ${kyGecenSaniye}s`;
            }, 1000);

            kySoruGoster();
        }

        function kySoruGoster() {
            if (kySoruIndex >= kySorularListesi.length) {
                kelimeYarismasiBitir();
                return;
            }

            let soru = kySorularListesi[kySoruIndex];
            let toplam = kySorularListesi.length;

            document.getElementById('kySoruSayacInfo').innerText = `Soru: ${kySoruIndex + 1} / ${toplam}`;
            document.getElementById('kyProgressBar').style.width = `${((kySoruIndex) / toplam) * 100}%`;
            document.getElementById('kyPuanInfo').innerText = `Puan: ${kyToplamPuan}`;

            // İngilizce ya da Türkçe rastgele yön seçimi
            let ingilizceMi = Math.random() > 0.5;
            soru._yonIngilizce = ingilizceMi;

            if (ingilizceMi) {
                document.getElementById('kySoruYonEtiket').innerText = "Bu kelimenin Türkçe anlamı nedir?";
                document.getElementById('kySoruKelimeText').innerText = soru.ingilizce;
                try { let u = new SpeechSynthesisUtterance(soru.ingilizce); u.lang = 'en-US'; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
                soru._dogruCevap = soru.turkce;
            } else {
                document.getElementById('kySoruYonEtiket').innerText = "Bu kelimenin İngilizce karşılığı nedir?";
                document.getElementById('kySoruKelimeText').innerText = soru.turkce;
                soru._dogruCevap = soru.ingilizce;
            }

            if (soru._tekrar) { let et = document.getElementById('kySoruYonEtiket'); et.innerText = '🔁 Tekrar kelimesi · ' + et.innerText; }
            // Yanlış şıkkı genel havuzdan (aynı türde) rastgele seçelim
            let havuz = window.masterKelimeHavuzu || [];
            let yanlisAdaylar = havuz.filter(k => (ingilizceMi ? k.turkce !== soru.turkce : k.ingilizce !== soru.ingilizce));
            let rastgeleYanlisObj = yanlisAdaylar[Math.floor(Math.random() * yanlisAdaylar.length)] || { turkce: "Yanlış Şık", ingilizce: "Wrong Choice" };
            let yanlisCevap = ingilizceMi ? rastgeleYanlisObj.turkce : rastgeleYanlisObj.ingilizce;

            // 2 Şıkkı rastgele yerleştir
            let siklar = [soru._dogruCevap, yanlisCevap].sort(() => Math.random() - 0.5);
            soru._secenekler = siklar;
            soru._dogruIndex = siklar.indexOf(soru._dogruCevap);

            for (let i = 0; i < 2; i++) {
                let btn = document.getElementById('kySik' + i);
                btn.innerText = siklar[i];
                btn.disabled = false;
                btn.style.background = "#ffffff";
                btn.style.color = "#334155";
                btn.style.borderColor = "#cbd5e1";
            }
            kySoruBaslangicZamani = Date.now();
        }

        function kyCevapVer(secilenIndex) {
            let soru = kySorularListesi[kySoruIndex];
            window.dmVerifiedGames?.record(soru,soru._secenekler[secilenIndex]);
            let dogruIdx = soru._dogruIndex;
            let gecenSaniyeSoru = Math.floor((Date.now() - kySoruBaslangicZamani) / 1000);

            document.getElementById('kySik0').disabled = true;
            document.getElementById('kySik1').disabled = true;

                if (secilenIndex === dogruIdx) {
                kyDogruSayisi++;
                        OC.dogru(1); kyKombo++; kyToplamPuan = OC.puan();
                                genelSesEfektiCal('dogru');
                genelKomboGoster(kyKombo, document.querySelector('#kelimeYarismaOverlay .game-modal-content'));
                document.getElementById('kySik' + secilenIndex).style.background = "#16a34a";
                document.getElementById('kySik' + secilenIndex).style.color = "#ffffff";
                document.getElementById('kySik' + secilenIndex).style.borderColor = "#15803d";
                } else {
                genelSesEfektiCal('yanlis');
                kyYanlisSayisi++;
                      let ocKor = jokerKalkanTuket(); if (!ocKor) kyKombo = 0; OC.yanlis(ocKor); kyToplamPuan = OC.puan();
                document.getElementById('kySik' + secilenIndex).style.background = "#dc2626";
                document.getElementById('kySik' + secilenIndex).style.color = "#ffffff";
                document.getElementById('kySik' + secilenIndex).style.borderColor = "#b91c1c";

                document.getElementById('kySik' + dogruIdx).style.background = "#16a34a";
                document.getElementById('kySik' + dogruIdx).style.color = "#ffffff";
                document.getElementById('kySik' + dogruIdx).style.borderColor = "#15803d";
            }

            setTimeout(() => {
                kySoruIndex++;
                kySoruGoster();
            }, 900);
        }

        async function kelimeYarismasiBitir() {
            if (kyTimerInterval) clearInterval(kyTimerInterval);
            kelimeMuzikDurdur();

            document.getElementById('kyOyunEkrani').style.display = 'none';
            document.getElementById('kyBitisEkrani').style.display = 'block';

            let isim = document.getElementById('kyIsimInput').value.trim();
            let sinifStr = kyAktifSinif + ". Sınıf";
            let uniteStr = kySecilenUniteler.join(",") + ". Ünite";
            let toplamPuan = kyToplamPuan;
            let tarihStr = new Date().toISOString().split('T')[0];

            // Özet alanlarını doldur
            document.getElementById('kyResIsim').innerText = isim;
            document.getElementById('kyResSinifUnite').innerText = `${sinifStr} (${uniteStr})`;
            document.getElementById('kyResDogruYanlis').innerText = `${kyDogruSayisi} Doğru / ${kyYanlisSayisi} Yanlış`;
            document.getElementById('kyResSure').innerText = `${kyGecenSaniye} saniye`;
            document.getElementById('kyResPuan').innerText = `${toplamPuan} Puan`;
                    genelSonucEkraniGoster({ oyunAdi:'🔬 Kelime Laboratuvarı', isim:isim, puan:toplamPuan, dogru:kyDogruSayisi, yanlis:kyYanlisSayisi, sureSaniye:kyGecenSaniye, oyunKey:'ky', devamFn:kelimeYarismasiKapat, tekrarFn:kelimeYarismasiAc });

            let tabloKonum = document.getElementById('kyGecmisSkorlarListesi');
            tabloKonum.innerHTML = "<div>Liderlik tablosu güncelleniyor...</div>";
        // 1. Google Sheets'e Güvenli POST İsteği ile Kayıt Gönderimi
            let kayitPayload = {
                islem: "kelimeLiderlikKaydet",
                tarih: tarihStr,
                isim: isim,
                sinif: sinifStr,
                unite: uniteStr,
                dogru: kyDogruSayisi,
                yanlis: kyYanlisSayisi,
                sure: kyGecenSaniye + "s",
                suresaniye: kyGecenSaniye,
                puan: toplamPuan
            };

            try {
                await fetch(apiURL, {
                    method: "POST",
                    body: JSON.stringify(kayitPayload)
                });
            } catch(e) {
                console.error("Liderlik kaydı gönderilemedi:", e);
            }

            // 2. Tablodaki Tüm Oyuncuların Skorlarını Çek ve Sıralı Listele
            try {
                                        let liderlikUrl = `${apiURL}?islem=kelimeLiderlikTumunuGetir&sinif=${encodeURIComponent(sinifStr)}`;
                let res = await fetch(liderlikUrl);
                let liste = await res.json();
                liderlikBonusUygula(liste, isim, 'Kelime Laboratuvarı');
                    genelSonucSiralamaCiz(liste, isim);

                tabloKonum.innerHTML = "";
                if (!liste || liste.length === 0) {
                    tabloKonum.innerHTML = "<div>Henüz kayıtlı skor bulunmuyor.</div>";
                    return;
                }

                // En yüksek puanlılar üstte olacak şekilde ilk 15 kişiyi listele
                liste.slice(0, 15).forEach((item, index) => {
                    let siraEmoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
                    let benimSatirimMi = item.isim.toLowerCase() === isim.toLowerCase() ? "background: #fdf4ff; font-weight: bold;" : "";

                    tabloKonum.innerHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding: 2px 4px; border-radius: 4px; ${benimSatirimMi}">
                            <span>${siraEmoji} <b>${item.isim}</b> <span style="color:#64748b; font-size:9px;">(${item.sinif})</span></span>
                            <span>🏆 <b>${item.puan} Puan</b> <span style="color:#64748b; font-size:9px;">(${item.sure})</span></span>
                        </div>
                    `;
                });
            } catch (err) {
                tabloKonum.innerHTML = "<div>Liderlik tablosu yüklenirken hata oluştu.</div>";
            }
        }




                        // --- POMODORO ÇALIŞMA SAYACI FONKSİYONLARI ---
                function pomodoroAc() {
                    document.getElementById('pomodoroOverlay').style.display = 'flex';
                    if (window.Notification && Notification.permission === 'default') {
                        Notification.requestPermission();
                    }
                    pomodoroDurumGuncelle();
                    pomodoroSifirla();
                }

                function pomodoroKapat() {
                    if (pomodoroInterval) clearInterval(pomodoroInterval);
                    pomodoroCalisiyorMu = false;
                    pomodoroMod = 'odak';
                    pomodoroTurSayisi = 1;
                    document.getElementById('pomodoroOverlay').style.display = 'none';
                }

                function pomodoroSureDegistir(tip, fark) {
                    if (pomodoroCalisiyorMu) return;
                    if (tip === 'odak') {
                        pomodoroOdakDakika = Math.min(60, Math.max(5, pomodoroOdakDakika + fark));
                        document.getElementById('pomodoroOdakDegeri').innerText = pomodoroOdakDakika;
                        if (pomodoroMod === 'odak') pomodoroSifirla();
                    } else {
                        pomodoroMolaDakika = Math.min(30, Math.max(1, pomodoroMolaDakika + fark));
                        document.getElementById('pomodoroMolaDegeri').innerText = pomodoroMolaDakika;
                        if (pomodoroMod === 'mola') pomodoroSifirla();
                    }
                }

                function pomodoroYonSec(yon) {
                    if (pomodoroCalisiyorMu) return;
                    pomodoroYon = yon;
                    document.getElementById('pomodoroYonGeri').classList.toggle('aktif', yon === 'geri');
                    document.getElementById('pomodoroYonIleri').classList.toggle('aktif', yon === 'ileri');
                    pomodoroSifirla();
                }

                function pomodoroHedefSaniye() {
                    let dk = pomodoroMod === 'odak' ? pomodoroOdakDakika : pomodoroMolaDakika;
                    return dk * 60;
                }

                function pomodoroSifirla() {
                    if (pomodoroInterval) clearInterval(pomodoroInterval);
                    pomodoroCalisiyorMu = false;
                    pomodoroGecenSaniye = 0;
                    pomodoroKalanSaniye = pomodoroHedefSaniye();
                    document.getElementById('pomodoroBaslatBtn').innerText = '▶';
                    document.getElementById('pomodoroBaslatBtn').setAttribute('aria-label', 'Başlat');
                    document.getElementById('pomodoroAltBilgi').innerText = 'Başlamak için oynat tuşuna bas';
                    pomodoroSaatiGuncelle();
                }

                function pomodoroBaslatDuraklat() {
                    if (pomodoroCalisiyorMu) {
                        clearInterval(pomodoroInterval);
                        pomodoroCalisiyorMu = false;
                        document.getElementById('pomodoroBaslatBtn').innerText = '▶';
                        document.getElementById('pomodoroBaslatBtn').setAttribute('aria-label', 'Başlat');
                        document.getElementById('pomodoroAltBilgi').innerText = 'Duraklatıldı';
                        return;
                    }
                    pomodoroCalisiyorMu = true;
                    document.getElementById('pomodoroBaslatBtn').innerText = '⏸';
                    document.getElementById('pomodoroBaslatBtn').setAttribute('aria-label', 'Duraklat');
                    document.getElementById('pomodoroAltBilgi').innerText = pomodoroYon === 'geri' ? 'Geri sayıyor' : 'İleri sayıyor';

                    pomodoroInterval = setInterval(() => {
                        pomodoroGecenSaniye++;
                        if (pomodoroYon === 'geri') {
                            pomodoroKalanSaniye--;
                            if (pomodoroKalanSaniye <= 0) { pomodoroTamamlandi(); return; }
                        } else {
                            pomodoroKalanSaniye++;
                            if (pomodoroKalanSaniye >= pomodoroHedefSaniye()) { pomodoroTamamlandi(); return; }
                        }
                        pomodoroSaatiGuncelle();
                    }, 1000);
                }

                function pomodoroTamamlandi() {
                    clearInterval(pomodoroInterval);
                    pomodoroCalisiyorMu = false;

                    let ses = new Audio('ozgun/tema-4.mp3');
                    ses.play().catch(() => {});
                    setTimeout(() => { ses.pause(); }, 2500);

                    if (pomodoroMod === 'odak') {
                        if (pomodoroTurSayisi >= pomodoroToplamTur) {
                            pomodoroTurSayisi = 1;
                        } else {
                            pomodoroTurSayisi++;
                        }
                        pomodoroMod = 'mola';
                    } else {
                        pomodoroMod = 'odak';
                    }

                    pomodoroKalanSaniye = pomodoroYon === 'geri' ? pomodoroHedefSaniye() : 0;
                    pomodoroGecenSaniye = 0;
                    pomodoroDurumGuncelle();
                    pomodoroSaatiGuncelle();
                    document.getElementById('pomodoroBaslatBtn').innerText = '▶';
                    document.getElementById('pomodoroAltBilgi').innerText = 'Başlamak için oynat tuşuna bas';

                    if (window.Notification && Notification.permission === 'granted') {
                        new Notification(pomodoroMod === 'mola' ? 'Mola zamanı! ☕' : 'Odaklanma zamanı! 🎯');
                    }
                }

                function pomodoroDurumGuncelle() {
                    let overlay = document.getElementById('pomodoroOverlay');
                    let etiket = document.getElementById('pomodoroDurumEtiket');
                    overlay.classList.toggle('mola-modu', pomodoroMod === 'mola');
                    etiket.innerHTML = pomodoroMod === 'mola'
                        ? '<span class="pomodoro-durum-nokta"></span>MOLA ZAMANI'
                        : '<span class="pomodoro-durum-nokta"></span>ODAKLANMA ZAMANI';
                    document.getElementById('pomodoroTurBilgi').innerText = `Tur ${pomodoroTurSayisi} / ${pomodoroToplamTur}`;
                }

                function pomodoroSaatiGuncelle() {
                    let gosterilecek = pomodoroYon === 'geri' ? pomodoroKalanSaniye : pomodoroGecenSaniye;
                    let dk = String(Math.floor(gosterilecek / 60)).padStart(2, '0');
                    let sn = String(gosterilecek % 60).padStart(2, '0');
                    document.getElementById('pomodoroSaat').innerText = `${dk}:${sn}`;
                }
                const apiURL = "https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api";

                    /* =========================================================
   DIJI GLOBAL CACHE v1
   Kullanıcı/genel verileri cihazda kısa süreli tutar.
   ========================================================= */

const DIJI_GLOBAL_CACHE_SURESI = 10 * 60 * 1000; // 10 dakika

/* Önbellek kişiye özel: aynı cihazı kullanan öğrenciler birbirinin verisini görmez */
function dijiGlobalAnahtar() {
    return "diji_global_cache_v2_" + String(localStorage.getItem("ing_aktifOgrenci") || "anon").trim().toLocaleLowerCase("tr");
}

function dijiGlobalCacheOku() {
    try {
        const ham = localStorage.getItem(dijiGlobalAnahtar());

        if (!ham) return null;

        const kayit = JSON.parse(ham);

        if (!kayit || !Array.isArray(kayit.veri)) {
            localStorage.removeItem(dijiGlobalAnahtar());
            return null;
        }

        return kayit;
    } catch (e) {
        return null;
    }
}

function dijiGlobalCacheYaz(veri) {
    try {
        if (!Array.isArray(veri) || !veri.length) return;

        localStorage.setItem(
            dijiGlobalAnahtar(),
            JSON.stringify({
                zaman: Date.now(),
                veri: veri
            })
        );
    } catch (e) {
        console.warn("Global cache yazılamadı:", e);
    }
}

async function dijiGlobalVeriYukle() {

    const cache = dijiGlobalCacheOku();

    /* -----------------------------------------
       1) CACHE VARSA HEMEN KULLAN
       ----------------------------------------- */

    if (cache && Array.isArray(cache.veri) && cache.veri.length) {

        globalDataCache = cache.veri;


        /* -----------------------------------------
           2) CACHE ESKİYSE ARKA PLANDA YENİLE
           ----------------------------------------- */

        const cacheYasi = Date.now() - Number(cache.zaman || 0);

        if (
            cacheYasi > DIJI_GLOBAL_CACHE_SURESI &&
            navigator.onLine
        ) {
            fetch(apiURL)
                .then(res => {
                    if (!res.ok) {
                        throw new Error("HTTP " + res.status);
                    }

                    return res.json();
                })
                .then(data => {

                    if (Array.isArray(data) && data.length) {

                        globalDataCache = data;

                        dijiGlobalCacheYaz(data);


                        /* Güncel kullanıcı bilgisi varsa ekrana uygula */
                        if (typeof aktifOgrenciAdi !== "undefined" &&
                            aktifOgrenciAdi) {

                            const guncelUser = data.find(
                                u =>
                                    String(u.ogrenci || "")
                                        .trim()
                                        .toLowerCase()
                                    ===
                                    String(aktifOgrenciAdi || "")
                                        .trim()
                                        .toLowerCase()
                            );

                            if (guncelUser &&
                                typeof veriArayuzeIsle === "function") {
                                veriArayuzeIsle(guncelUser);
                            }
                        }
                    }
                })
                .catch(() => {});
        }

        return globalDataCache;
    }

    /* -----------------------------------------
       3) CACHE YOKSA SUNUCUDAN AL
       ----------------------------------------- */

    try {

        const res = await (window.dmStartupFetch||fetch)(apiURL);

        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }

        const data = await res.json();

        if (Array.isArray(data)) {

            globalDataCache = data;

            dijiGlobalCacheYaz(data);


            return data;
        }

    } catch (e) {

        console.warn(
            "Global veri alınamadı:",
            e
        );

        /* Offline durumda süresi geçmiş cache bile kullanılabilir */
        if (cache &&
            Array.isArray(cache.veri) &&
            cache.veri.length) {

            globalDataCache = cache.veri;


            return globalDataCache;
        }
    }

    globalDataCache = [];

    return [];
}


/* =========================================================
   DIJI KONU CACHE v1
   ========================================================= */

const DIJI_KONU_CACHE_SURESI = 24 * 60 * 60 * 1000; // 24 saat

function dijiKonuCacheOku(anahtar) {

    try {

        const ham =
            localStorage.getItem(
                "diji_konu_cache_v1_" + anahtar
            );

        if (!ham) return null;

        const kayit = JSON.parse(ham);

        if (
            !kayit ||
            !kayit.zaman ||
            !("veri" in kayit)
        ) {
            localStorage.removeItem(
                "diji_konu_cache_v1_" + anahtar
            );

            return null;
        }

        return kayit;

    } catch (e) {

        return null;

    }
}


function dijiKonuCacheYaz(anahtar, veri) {

    try {

        localStorage.setItem(
            "diji_konu_cache_v1_" + anahtar,

            JSON.stringify({
                zaman: Date.now(),
                veri: veri
            })
        );

    } catch (e) {

        console.warn(
            "Konu cache yazılamadı:",
            e
        );

    }
}

/* =========================================================
   DIJI CACHE v1 — STATİK VERİLER
   Supabase'i gereksiz tekrar sorgulamayı engeller.
   ========================================================= */

const DIJI_CACHE_SURUM = "v1";

                    function dijiCacheTemizligi() {
    try {
        const simdi = Date.now();

        const kurallar = [
            { prefix: 'diji_lig_cache_v1_', maxAge: 14 * 24 * 60 * 60 * 1000 },
            { prefix: 'diji_ma_akis_v2', maxAge: 7 * 24 * 60 * 60 * 1000 },
            { prefix: 'diji_ders_konulari_v1_', maxAge: 30 * 24 * 60 * 60 * 1000 },
            { prefix: 'diji_rubric_etkinlik_v1', maxAge: 30 * 24 * 60 * 60 * 1000 },
            { prefix: 'diji_ozellikler_v2', maxAge: 30 * 24 * 60 * 60 * 1000 }
        ];

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (!key) continue;

            const kural = kurallar.find(x => key.startsWith(x.prefix));
            if (!kural) continue;

            try {
                const kayit = JSON.parse(localStorage.getItem(key));

                if (
                    kayit &&
                    kayit.zaman &&
                    simdi - Number(kayit.zaman) > kural.maxAge
                ) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                localStorage.removeItem(key);
            }
        }
    } catch (e) {
        console.warn('Cache temizliği başarısız:', e);
    }
}
                    dijiCacheTemizligi();

function dijiCacheOku(anahtar, maxYasMs) {
    try {
        const ham = localStorage.getItem("diji_cache_" + DIJI_CACHE_SURUM + "_" + anahtar);
        if (!ham) return null;

        const kayit = JSON.parse(ham);

        if (!kayit || !kayit.zaman || !("veri" in kayit)) {
            localStorage.removeItem("diji_cache_" + DIJI_CACHE_SURUM + "_" + anahtar);
            return null;
        }

        if (Date.now() - Number(kayit.zaman) > maxYasMs) {
            return null;
        }

        return kayit.veri;
    } catch (e) {
        return null;
    }
}

function dijiCacheYaz(anahtar, veri) {
    try {
        localStorage.setItem(
            "diji_cache_" + DIJI_CACHE_SURUM + "_" + anahtar,
            JSON.stringify({
                zaman: Date.now(),
                veri: veri
            })
        );
    } catch (e) {
        console.warn("Diji cache yazılamadı:", anahtar, e);
    }
}

function dijiCacheSil(anahtar) {
    try {
        localStorage.removeItem(
            "diji_cache_" + DIJI_CACHE_SURUM + "_" + anahtar
        );
    } catch (e) {}
}

/* Kelime havuzu:
   7 gün cihazdan kullanılabilir.
   İnternet varsa arka planda yenilenebilir. */
async function dijiKelimeHavuzunuYukle() {

    const CACHE_SURESI = 7 * 24 * 60 * 60 * 1000;

    const eski = dijiCacheOku("kelime_havuzu", CACHE_SURESI);

    if (Array.isArray(eski) && eski.length) {
        window.masterKelimeHavuzu = eski;


        /* Cache varken kullanıcı beklemesin.
           İnternet varsa arka planda güncelle. */
        if (navigator.onLine) {
            fetch(apiURL + "?islem=kelimelerGetir")
                .then(res => {
                    if (!res.ok) throw new Error("HTTP " + res.status);
                    return res.json();
                })
                .then(data => {
                    if (Array.isArray(data) && data.length) {
                        window.masterKelimeHavuzu = data;
                        dijiCacheYaz("kelime_havuzu", data);

                    }
                })
                .catch(() => {});
        }

        return eski;
    }

    /* İlk kez giriyorsa sunucudan al */
    try {
        const res = await (window.dmStartupFetch||fetch)(apiURL + "?islem=kelimelerGetir");

        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }

        const data = await res.json();

        if (Array.isArray(data)) {
            window.masterKelimeHavuzu = data;
            dijiCacheYaz("kelime_havuzu", data);


            return data;
        }
    } catch (e) {
        console.warn("Kelime havuzu alınamadı:", e);

        /* İnternet yoksa süresi geçmiş cache'i bile kullan */
        const eskiHerhangi = dijiCacheOku(
            "kelime_havuzu",
            365 * 24 * 60 * 60 * 1000
        );

        if (Array.isArray(eskiHerhangi) && eskiHerhangi.length) {
            window.masterKelimeHavuzu = eskiHerhangi;
            return eskiHerhangi;
        }
    }

    window.masterKelimeHavuzu = [];
    return [];
}


                            let toplamSaniye = 0, timerInterval = null, aktifOgrenciAdi = "", globalDataCache = [];
                        let siniftaOynananOgrenci = null;
                let dcSayacDurduMu = false;
                function dcSayacDurumGuncelle() { dcSayacDurduMu = document.hidden || !document.hasFocus(); }
                document.addEventListener('visibilitychange', dcSayacDurumGuncelle);
                window.addEventListener('blur', dcSayacDurumGuncelle);
                window.addEventListener('focus', dcSayacDurumGuncelle);
                let ogrenciSohbetPolling = null;
                let ogretmenSohbetPolling = null;
                let ogretmenAktifSohbetOgrenci = null;
                function oyunIcinAktifIsim() { return siniftaOynananOgrenci || aktifOgrenciAdi; }
                let gelisimChartInstance = null, kriterChartInstance = null, denemeChartInstance = null;
                         masterKelimeHavuzu = [];

                        // --- POMODORO ÇALIŞMA SAYACI DEĞİŞKENLERİ ---
                let pomodoroOdakDakika = 25;
                let pomodoroMolaDakika = 5;
                let pomodoroYon = 'geri';
                let pomodoroKalanSaniye = pomodoroOdakDakika * 60;
                let pomodoroGecenSaniye = 0;
                let pomodoroCalisiyorMu = false;
                let pomodoroInterval = null;
                let pomodoroMod = 'odak';
                let pomodoroTurSayisi = 1;
                let pomodoroToplamTur = 4;


                // --- RUBRİK PUAN BUTONLARI (SLIDER YERİNE) ---
                       const RUBRIC_SKILLS = ['Okuma', 'Yazma', 'Vocab', 'Konusma', 'Grammar'];
                const RUBRIC_PUANLAR = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

                function rubricGridleriOlustur() {
                    RUBRIC_SKILLS.forEach(key => {
                        let kont = document.getElementById('grid' + key);
                        if (!kont) return;
                        kont.innerHTML = "";
                        RUBRIC_PUANLAR.forEach(p => {
                            let btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'puan-btn';
                            btn.innerText = p;
                            btn.onclick = function () { rubricPuanSec(key, p); };
                            kont.appendChild(btn);
                        });
                    });
                    rubricGridDegerleriGuncelle();
                }

                function rubricPuanSec(key, puan) {
                    let slider = document.getElementById('slider' + key);
                    let val = document.getElementById('val' + key);
                    if (slider) slider.value = puan;
                    if (val) val.innerText = puan;
                    let kont = document.getElementById('grid' + key);
                    if (kont) {
                        kont.querySelectorAll('.puan-btn').forEach(b => {
                            b.classList.toggle('active', parseInt(b.innerText) === puan);
                        });
                    }
                }

                function rubricGridDegerleriGuncelle() {
                    RUBRIC_SKILLS.forEach(key => {
                        let slider = document.getElementById('slider' + key);
                        if (!slider) return;
                        let val = parseInt(slider.value) || 50;
                        let kont = document.getElementById('grid' + key);
                        if (kont) {
                            kont.querySelectorAll('.puan-btn').forEach(b => {
                                b.classList.toggle('active', parseInt(b.innerText) === val);
                            });
                        }
                    });
                }

                function rubricPuanlariSifirla() {
                    RUBRIC_SKILLS.forEach(key => {
                        let slider = document.getElementById('slider' + key);
                        let val = document.getElementById('val' + key);
                        if (slider) slider.value = 50;
                        if (val) val.innerText = 50;
                    });
                    rubricGridDegerleriGuncelle();
                }

                        document.addEventListener('DOMContentLoaded', async function() {
                    let girisBtn = document.getElementById('girisBtn');
                    let girisSubtitle = document.getElementById('girisSubtitle');

                    girisBtn.disabled = false;
                    girisBtn.innerText = "Giriş Yap";
                    girisSubtitle.innerText = "Lütfen sistemde kayıtlı kullanıcı adınızı ve şifrenizi giriniz.";

                           dijiKelimeHavuzunuYukle();

                                const oturumAcik = localStorage.getItem("ing_oturumAcik");
        const kayitliOgrenci = localStorage.getItem("ing_aktifOgrenci");
        const kayitliSure = localStorage.getItem("ing_toplamSaniye");
                    const otomatikGirisYapilacak = (oturumAcik === "true" && kayitliOgrenci && !!localStorage.getItem("ing_token"));

                    if (otomatikGirisYapilacak) {
                        document.getElementById('login-container').style.display = 'none';
                        document.getElementById('oturumYuklemeOverlay').style.display = 'flex';
                    }

                   // Profile and member-state reads are independent; do not serialize them.
                   const profileReady = dijiGlobalVeriYukle();
                    if (otomatikGirisYapilacak) {
                        await window.dmOpenPortalSession({student:kayitliOgrenci,seconds:kayitliSure || "0",profileReady});
                    } else {
                        await profileReady;
                    }

                               ogretmenSelectDoldur();
                    rubricGridleriOlustur();
                    ozellikSecDoldur();
                   ogretmenMenuOkunmamisGuncelle();

setInterval(() => {
    if (document.hidden) return;
    ogretmenMenuOkunmamisGuncelle();
}, 300000);
                }, {once:true});

                // --- YEREL AKILLI ASİSTAN & İLETİŞİM KONTROLÜ MİMARİSİ ---
                        function aiModalAc() { 
                    document.getElementById('aiChatModal').style.display = 'flex'; 
                    document.getElementById('aiSoruHakInfo').innerHTML = "💬 Diji-Medu'ya doğrudan mesaj bırakabilirsin";
                    misafirBilgiKontrol();
                    sohbetGecmisiniYukle();
                    if (ogrenciSohbetPolling) clearInterval(ogrenciSohbetPolling);
                    ogrenciSohbetPolling = setInterval(sohbetGecmisiniYukle, 15000);
                }
                function aiModalKapat() {
                    document.getElementById('aiChatModal').style.display = 'none';
                    if (ogrenciSohbetPolling) clearInterval(ogrenciSohbetPolling);
                    ogrenciSohbetPolling = null;
                }

                function misafirBilgiKontrol() {
                    let footerArea = document.getElementById('aiFooterArea');
                    let inputRow = document.getElementById('aiInputRow');
                    let misafirKayit = sessionStorage.getItem("misafirBilgi");

                    if (!aktifOgrenciAdi && !misafirKayit) {
                        inputRow.style.display = "none";
                        let formId = "misafirForm";
                        if(!document.getElementById(formId)) {
                            footerArea.innerHTML += `
                                <div id="${formId}" style="display:flex; flex-direction:column; gap:5px; font-size:11px;">
                                    <span style="color:#5b21b6; font-weight:700;">Soru sormak için lütfen bilgilerinizi yazın:</span>
                                    <input type="text" id="misafirAd" placeholder="Adınız Soyadınız" style="padding:5px; border:1px solid #cbd5e1; border-radius:4px;">
                                    <input type="text" id="misafirIletisim" placeholder="Telefon veya E-posta Adresiniz" style="padding:5px; border:1px solid #cbd5e1; border-radius:4px;">
                                    <button onclick="misafirBilgiKaydet()" style="background:#7c3aed; color:white; border:none; padding:6px; border-radius:4px; font-weight:700; cursor:pointer;">Devam Et</button>
                                </div>
                            `;
                        }
                    } else {
                        inputRow.style.display = "flex";
                    }
                }

                function misafirBilgiKaydet() {
                    let ad = document.getElementById('misafirAd').value.trim();
                    let iletisim = document.getElementById('misafirIletisim').value.trim();
                    if(!ad || !iletisim) { alert("Lütfen adınızı ve iletişim bilginizi giriniz!"); return; }

                    sessionStorage.setItem("misafirBilgi", JSON.stringify({ad, iletisim}));
                    document.getElementById('misafirForm').remove();
                    document.getElementById('aiInputRow').style.display = "flex";
                }



                       async function sohbetGecmisiniYukle() {
                    let body = document.getElementById('aiChatBody');
                    let ogrenciAdi = aktifOgrenciAdi;
                    if (!ogrenciAdi) {
                        let mInfo = JSON.parse(sessionStorage.getItem("misafirBilgi") || "{}");
                        ogrenciAdi = mInfo.ad || "";
                    }
                    if (!ogrenciAdi) return;

                    try {
                        let cevap = window.dmIncrementalReads ? await window.dmIncrementalReads.chat("sohbetGetir",ogrenciAdi) : await (await fetch(`${apiURL}?islem=sohbetGetir&ogrenci=${encodeURIComponent(ogrenciAdi)}`)).json();
let mesajlar = Array.isArray(cevap)
    ? cevap
    : (cevap.messages || []);

                        let sabitKarsilama = body.querySelector('.ai-msg.bot');
                        body.innerHTML = "";
                        if (sabitKarsilama) body.appendChild(sabitKarsilama);

                        mesajlar.forEach(m => {
                            let sinif = m.gonderen === 'ogretmen' ? 'bot' : 'user';
                            body.innerHTML += `<div class="ai-msg ${sinif}">${guvenliMetin(m.mesaj)}</div>`;
                        });

                        body.scrollTop = body.scrollHeight;
                    } catch (err) {
                        console.error(err);
                    }
                }

                      async function aiMesajGonder() {
                    let input = document.getElementById('aiMesajInput');
                    let body = document.getElementById('aiChatBody');

                    let txt = input.value.trim();
                    if (!txt) return;

                    let ogrenciAdi = aktifOgrenciAdi;
                    if (!ogrenciAdi) {
                        let mInfo = JSON.parse(sessionStorage.getItem("misafirBilgi") || "{}");
                        ogrenciAdi = mInfo.ad || "Misafir Ziyaretçi";
                    }

                    input.value = "";

                    try {
                        let response = await fetch(apiURL, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({islem:"sohbetMesajGonder",ogrenci:ogrenciAdi,mesaj:txt})});
                        let data = await response.json();

                        if (data.ok === false || data.status === "error") {
                            input.value = txt;
                            body.innerHTML += `<div class="ai-msg bot">${guvenliMetin(data.mesaj || data.message || "Mesaj gönderilemedi.")}</div>`;
                        } else if (data.status === "limit_doldu") {
                            input.value = txt;
                            body.innerHTML += `<div class="ai-msg bot" style="color:#b91c1c; background:#fee2e2;">⚠️ Bugünlük mesaj hakkını doldurdun (günlük limit: ${data.limit}). Yarın tekrar deneyebilir ya da rozet kazanarak hakkını artırabilirsin!</div>`;
                        } else if (data.status === "cooldown") {
                            input.value = txt;
                            body.innerHTML += `<div class="ai-msg bot" style="color:#b45309; background:#fef3c7;">⏳ Çok hızlı mesaj gönderiyorsun, lütfen ${data.kalanSaniye} saniye daha bekle.</div>`;
                        } else if (data.status === "spam") {
                            body.innerHTML += `<div class="ai-msg user">${guvenliMetin(txt)}</div>`;
                            body.innerHTML += `<div class="ai-msg bot" style="color:#b91c1c; background:#fee2e2;">⚠️ Anlamsız veya rastgele karakterler algılandı, mesajın Diji Medu'ya iletilmedi. Lütfen düzgün bir mesaj yaz.</div>`;
                        } else {
                            body.innerHTML += `<div class="ai-msg user">${guvenliMetin(txt)}</div>`;
                            body.innerHTML += `<div class="ai-msg bot">✅ Mesajın öğretmenine iletildi, en kısa sürede buradan size dönüş sağlayacaktır. Arada girip sohbet kutusunu kontrol edin!</div>`;
                        }
                        body.scrollTop = body.scrollHeight;
                    } catch (err) {
                        console.error(err);
                        input.value = txt;
                        body.innerHTML += `<div class="ai-msg bot">Bağlantı hatası oluştu.</div>`;
                    }
                }


                function ogretmenPaneliAc() { document.getElementById('sifreModal').style.display = 'flex'; }



                function ogretmenMenuRubrikAc() {
                    document.getElementById('ogretmenMenuModal').style.display = 'none';
                    document.getElementById('rubricModal').style.display = 'flex';
                }

                function rubricPaneliKapat() {
            document.getElementById('rubricModal').style.display = 'none';
            document.getElementById('ogretmenMenuModal').style.display = 'flex';
        }

                function ogretmenMenuSohbetAc() {
                    document.getElementById('ogretmenMenuModal').style.display = 'none';
                    document.getElementById('ogretmenSohbetModal').style.display = 'flex';
                    document.getElementById('ogretmenSohbetListeAlani').style.display = 'block';
                    document.getElementById('ogretmenSohbetDetayAlani').style.display = 'none';
                    ogretmenSohbetListesiniYukle();
                    if (ogretmenSohbetPolling) clearInterval(ogretmenSohbetPolling);
                    ogretmenSohbetPolling = setInterval(() => {
                        if (document.getElementById('ogretmenSohbetDetayAlani').style.display === 'none') {
                            ogretmenSohbetListesiniYukle();
                        } else if (ogretmenAktifSohbetOgrenci) {
                            ogretmenSohbetMesajlariYenile();
                        }
                    }, 15000);
                }

                        function ogretmenSohbetKapat() {
                    document.getElementById('ogretmenSohbetModal').style.display = 'none';
                    document.getElementById('ogretmenMenuModal').style.display = 'flex';
                    if (ogretmenSohbetPolling) clearInterval(ogretmenSohbetPolling);
                    ogretmenSohbetPolling = null;
                    ogretmenAktifSohbetOgrenci = null;
                }

                async function ogretmenSohbetListesiniYukle() {
                    let alan = document.getElementById('ogretmenSohbetListeAlani');
                    try {
                       let res = await fetch(`${apiURL}?islem=ogretmenSohbetListesi`);
let cevap = await res.json();
let liste = Array.isArray(cevap)
    ? cevap
    : (cevap.messages || []);

if (!liste || liste.length === 0) {
                            alan.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:12px; padding:20px;">Henüz hiç mesaj yok.</p>`;
                            return;
                        }

                        alan.innerHTML = "";
                        liste.forEach(item => {
                            let rozetHtml = item.okunmamis > 0 ? `<span class="ogretmen-sohbet-rozet">${item.okunmamis}</span>` : "";
                            let satir = document.createElement('div');
                            satir.className = 'ogretmen-sohbet-liste-satir';
                            satir.innerHTML = `
                                <div>
                                    <div class="ogretmen-sohbet-isim">${guvenliMetin(item.ogrenci)}</div>
                                    <div class="ogretmen-sohbet-onizleme">${guvenliMetin(String(item.sonMesaj || ""))}</div>
                                </div>
                                ${rozetHtml}
                            `;
                            satir.onclick = function () { ogretmenSohbetAc(item.ogrenci); };
                            alan.appendChild(satir);
                        });

                        let toplamOkunmamis = liste.reduce((acc, i) => acc + (i.okunmamis || 0), 0);
                        ogretmenMenuOkunmamisGuncelle(toplamOkunmamis);
                    } catch (err) {
                        console.error(err);
                    }
                }

                async function ogretmenSohbetAc(ogrenciAdi) {
                    ogretmenAktifSohbetOgrenci = ogrenciAdi;
                    document.getElementById('ogretmenSohbetBaslikOgrenci').innerText = ogrenciAdi;
                    document.getElementById('ogretmenSohbetListeAlani').style.display = 'none';
                    document.getElementById('ogretmenSohbetDetayAlani').style.display = 'flex';
                    await ogretmenSohbetMesajlariYenile();
                }

                async function ogretmenSohbetMesajlariYenile() {
                    if (!ogretmenAktifSohbetOgrenci) return;
                    let mesajAlani = document.getElementById('ogretmenSohbetMesajAlani');
                    try {
                       let cevap = window.dmIncrementalReads ? await window.dmIncrementalReads.chat("ogretmenSohbetAc",ogretmenAktifSohbetOgrenci) : await (await fetch(`${apiURL}?islem=ogretmenSohbetAc&ogrenci=${encodeURIComponent(ogretmenAktifSohbetOgrenci)}`)).json();
let mesajlar = Array.isArray(cevap)
    ? cevap
    : (cevap.messages || []);

mesajAlani.innerHTML = "";
mesajlar.forEach(m => {
                            let sinif = m.gonderen === 'ogretmen' ? 'user' : 'bot';
                            mesajAlani.innerHTML += `<div class="ai-msg ${sinif}">${guvenliMetin(m.mesaj)}</div>`;
                        });
                        mesajAlani.scrollTop = mesajAlani.scrollHeight;
                    } catch (err) {
                        console.error(err);
                    }
                }

                function ogretmenSohbetListesineDon() {
                    document.getElementById('ogretmenSohbetDetayAlani').style.display = 'none';
                    document.getElementById('ogretmenSohbetListeAlani').style.display = 'block';
                    ogretmenAktifSohbetOgrenci = null;
                    ogretmenSohbetListesiniYukle();
                }

                async function ogretmenCevapGonder() {
                    const input = document.getElementById('ogretmenCevapInput');
                    const mesaj = input.value.trim();
                    if (!mesaj || !ogretmenAktifSohbetOgrenci || ogretmenCevapGonder.pending) return;
                    const ogrenci = ogretmenAktifSohbetOgrenci;
                    const draft = input.value;
                    const button = document.getElementById('ogretmenCevapButton');
                    const status = document.getElementById('ogretmenCevapDurum');
                    ogretmenCevapGonder.pending = true;
                    button.disabled = true;
                    status.textContent = 'Gönderiliyor…';
                    try {
                        const response = await fetch(apiURL, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({islem: 'ogretmenCevapGonder', ogrenci, mesaj}),
                            signal: AbortSignal.timeout(15000)
                        });
                        const result = await response.json();
                        if (!response.ok || result.ok !== true || result.status !== 'success') {
                            throw Error(result.mesaj || result.message || 'Mesaj gönderilemedi. Tekrar deneyin.');
                        }
                        if (ogretmenAktifSohbetOgrenci === ogrenci) {
                            if (input.value === draft) input.value = '';
                            status.textContent = 'Mesaj gönderildi.';
                            await ogretmenSohbetMesajlariYenile();
                        }
                    } catch (err) {
                        if (ogretmenAktifSohbetOgrenci === ogrenci) {
                            status.textContent = 'Gönderim doğrulanamadı: ' + (err.message || 'Bağlantıyı kontrol edin.');
                        }
                        console.error(err);
                    } finally {
                        ogretmenCevapGonder.pending = false;
                        button.disabled = false;
                    }
                }

                function ogretmenMenuOkunmamisGuncelle(sayi) {
                    let rozetGenel = document.getElementById('ogretmenGenelRozet');
                    let rozetMenu = document.getElementById('ogretmenMenuOkunmamis');
                    if (sayi === undefined) {
                       fetch(`${apiURL}?islem=ogretmenSohbetListesi`).then(r => r.json()).then(cevap => {
    let liste = Array.isArray(cevap)
        ? cevap
        : (cevap.messages || []);

    let toplam = liste.reduce((acc, i) => acc + (i.okunmamis || 0), 0);
                            ogretmenMenuOkunmamisGuncelle(toplam);
                        }).catch(() => {});
                        return;
                    }
                    if (sayi > 0) {
                        rozetGenel.style.display = 'flex';
                        rozetGenel.innerText = sayi;
                        rozetMenu.style.display = 'inline-block';
                        rozetMenu.innerText = sayi;
                    } else {
                        rozetGenel.style.display = 'none';
                        rozetMenu.style.display = 'none';
                    }
                }

                function ogretmenSelectDoldur() {
                    let sel = document.getElementById('rubricOgrenciSelect');
                    if(!sel) return;
                    sel.innerHTML = '<option value="">-- Öğrenci Seçin --</option>';
                    globalDataCache.forEach(u => {
                        let opt = document.createElement('option');
                        opt.value = u.ogrenci;
                        opt.innerText = u.ogrenci;
                        sel.appendChild(opt);
                    });
                }

                     function ogrenciVerileriniYukle() {
                         rubricSeciliEtkinlikler = [];
                    rubricSeciliVideolar = [];
                    let etkMesajEl = document.getElementById('rubricEtkinlikSonucMesaj');
                    let vidMesajEl = document.getElementById('rubricVideoSonucMesaj');
                    if (etkMesajEl) etkMesajEl.innerText = "";
                    if (vidMesajEl) vidMesajEl.innerText = "";
                    let ogrAdi = document.getElementById('rubricOgrenciSelect').value;
                    let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === ogrAdi.toLowerCase());
                    if (!user) return;

                                ogretmenPlanListesiniOlustur(user);
                    rubricKategorileriYukle();
                    rubricOgrenciChecklistDoldur();
                    rubricVideoOgrenciChecklistDoldur();

                    document.getElementById('rubricTelefon').value = user.telefon || "";


                    let tarihSel = document.getElementById('rubricGecmisTarihSelect');
                    tarihSel.innerHTML = '<option value="">-- Yeni Kayıt / En Güncel --</option>';
                    if (user.arsivListesi) {
                        user.arsivListesi.forEach(ar => {
                            let opt = document.createElement('option');
                            opt.value = ar.tarih;
                            opt.innerText = ar.tarih + ` (Genel Puan: ${ar.genel})`;
                            tarihSel.appendChild(opt);
                        });
                    }

                    document.getElementById('rubricTamamlananTarih').value = new Date().toISOString().split('T')[0];
                    if (user.kitapBilgi) {
                        document.getElementById('rubricKitapAdi').value = user.kitapBilgi.kitapAdi || "";
                        document.getElementById('rubricSayfa').value = user.kitapBilgi.sayfa || 0;
                        document.getElementById('rubricHedef').value = user.kitapBilgi.hedef || 40;
                        document.getElementById('rubricToplamKitap').value = user.kitapBilgi.okunanSayisi || 1;
                    }
                    document.getElementById('rubricSonDeneme').value = user.sonDeneme || 0;

                    // Yeni öğrenci seçildiğinde 5 kriter puan butonlarını varsayılana (50) sıfırla
                                rubricPuanlariSifirla();

                    rubricVideoListesiYukleAta();
                }

                function gecmisTarihVerisiniGetir() {
                    let ogrAdi = document.getElementById('rubricOgrenciSelect').value;
                    let secilenTarih = document.getElementById('rubricGecmisTarihSelect').value;
                    let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === ogrAdi.toLowerCase());
                    if (!user || !secilenTarih) return;

                    let arsivRow = user.arsivListesi.find(ar => ar.tarih === secilenTarih);
                    if (arsivRow) {
                        document.getElementById('sliderOkuma').value = arsivRow.okuma;
                        document.getElementById('valOkuma').innerText = arsivRow.okuma;
                        document.getElementById('sliderYazma').value = arsivRow.yazma;
                        document.getElementById('valYazma').innerText = arsivRow.yazma;
                        document.getElementById('sliderVocab').value = arsivRow.vocabulary;
                        document.getElementById('valVocab').innerText = arsivRow.vocabulary;
                        document.getElementById('sliderKonusma').value = arsivRow.konusma;
                        document.getElementById('valKonusma').innerText = arsivRow.konusma;
                        document.getElementById('sliderGrammar').value = arsivRow.grammar;
                        document.getElementById('valGrammar').innerText = arsivRow.grammar;
                        document.getElementById('rubricSonDeneme').value = arsivRow.deneme;
                        document.getElementById('rubricTamamlananTarih').value = arsivRow.tarih;
                        // Buton grid'lerini geçmiş veriye göre işaretle
                        rubricGridDegerleriGuncelle();
                    }
                }

                async function rubrikVerileriniKaydetVeWhatsappGonder() {
                    let ogrenci = document.getElementById('rubricOgrenciSelect').value;
                    let telefon = document.getElementById('rubricTelefon').value.trim();
                    let tarih = document.getElementById('rubricTamamlananTarih').value;
                    let sonrakiTarih = document.getElementById('rubricSonrakiTarih').value;
                    let kitapAdi = document.getElementById('rubricKitapAdi').value;
                    let sayfa = document.getElementById('rubricSayfa').value;
                    let hedef = document.getElementById('rubricHedef').value;
                    let okunansayisi = document.getElementById('rubricToplamKitap').value;
                    let sondeneme = document.getElementById('rubricSonDeneme').value;
                    let okuma = document.getElementById('sliderOkuma').value;
                    let yazma = document.getElementById('sliderYazma').value;
                    let vocab = document.getElementById('sliderVocab').value;
                    let konusma = document.getElementById('sliderKonusma').value;
                    let grammar = document.getElementById('sliderGrammar').value;
                    let odevDonut = document.getElementById('rubricOdevDonut').value;
                    let sonrakiOdev = document.getElementById('rubricSonrakiOdev').value;

                    if (!ogrenci || !tarih) {
                        alert("Lütfen öğrenci ve tamamlanan ders tarihini seçiniz!");
                        return;
                    }

                    // MOBİL/TABLET WHATSAPP AÇILMAMA SORUNU İÇİN DÜZELTME:
                    // window.open() işlemini, kullanıcı tıklamasından hemen sonra (fetch/await beklemeden)
                    // SENKRON olarak çağırıyoruz. Böylece mobil tarayıcıların pop-up engelleyicisi bunu
                    // "kullanıcı etkileşimiyle açılan pencere" olarak tanıyıp izin veriyor.
                    // Veriler kaydedildikten sonra bu boş pencerenin adresini WhatsApp linkine yönlendiriyoruz.
                    let waPencere = null;
                    let kaydetBtn = document.getElementById('rubricKaydetBtn');
                    if (telefon) {
                        waPencere = window.open('', '_blank');
                        if (waPencere) {
                            waPencere.document.write('<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,Arial,sans-serif; padding:40px; text-align:center; color:#334155;">WhatsApp raporu hazırlanıyor, lütfen bekleyin...</div>');
                        }
                    }

                    if (kaydetBtn) { kaydetBtn.disabled = true; kaydetBtn.innerText = "⏳ Kaydediliyor..."; }

                    let url = `${apiURL}?islem=rubrikKaydet&ogrenci=${encodeURIComponent(ogrenci)}&tarih=${tarih}&sonrakitarih=${sonrakiTarih}&kitapadi=${encodeURIComponent(kitapAdi)}&sayfa=${sayfa}&hedef=${hedef}&okunansayisi=${okunansayisi}&sondeneme=${sondeneme}&okuma=${okuma}&yazma=${yazma}&vocab=${vocab}&konusma=${konusma}&grammar=${grammar}&odevdonut=${encodeURIComponent(odevDonut)}&sonrakiodev=${encodeURIComponent(sonrakiOdev)}`;

                    try {
                        await fetch(url);
                                       let ortalamaPuan = Math.round((Number(okuma) + Number(yazma) + Number(vocab) + Number(konusma) + Number(grammar)) / 5);

                        let sondenemeGecerliMiWA = Number(sondeneme) > 0;
                        let kitapGecerliMiWA = kitapAdi && kitapAdi.trim() !== "" && Number(sayfa) > 0;

                        // Emojiler Unicode kaçış koduyla yazılıyor ki editör/kayıt sırasında bozulmasınlar
                        const E = {
                            cap: "\uD83C\uDF93",       // 🎓
                            star: "\uD83C\uDF1F",      // 🌟
                            rocket: "\uD83D\uDE80",    // 🚀
                            chart: "\uD83D\uDCCA",     // 📊
                            bulb: "\uD83D\uDCA1",      // 💡
                            book: "\uD83D\uDCD6",      // 📖
                            pencil: "\u270D\uFE0F",    // ✍️
                            brain: "\uD83E\uDDE0",     // 🧠
                            speak: "\uD83D\uDDE3\uFE0F", // 🗣️
                            ruler: "\uD83D\uDCD0",     // 📐
                            teacher: "\uD83D\uDC69\u200D\uD83C\uDFEB", // 👩‍🏫
                            chat: "\uD83D\uDCAC",      // 💬
                            pin: "\uD83D\uDCCC",       // 📌
                            sparkle: "\u2728",         // ✨
                            target: "\uD83C\uDFAF",    // 🎯
                            trend: "\uD83D\uDCC8",     // 📈
                            bookBlue: "\uD83D\uDCD8",  // 📘
                            page: "\uD83D\uDCC4",      // 📄
                            clapper: "\uD83C\uDFAC",   // 🎬
                            sunflower: "\uD83C\uDF3B", // 🌻
                            herb: "\uD83C\uDF3F",      // 🌿
                            calendar: "\uD83D\uDCC5",  // 📅
                            books: "\uD83D\uDCDA"      // 📚
                        };

                        let genelDurumCumlesi = sondenemeGecerliMiWA
                            ? `Değerlendirmelerimiz sonucunda öğrencimiz genel başarı çıtasını ${E.sparkle} *${ortalamaPuan}/100* ${E.sparkle} seviyesine taşırken, son deneme sınavında elde ettiği ${E.target} *${sondeneme}* puan ile istikrarlı yükselişini müthiş bir şekilde sürdürmektedir. ${E.trend}\n\n`
                            : `Değerlendirmelerimiz sonucunda öğrencimiz genel başarı çıtasını ${E.sparkle} *${ortalamaPuan}/100* ${E.sparkle} seviyesine taşıdı. ${E.trend}\n\n`;

                        let kitapBolumuWA = kitapGecerliMiWA
                            ? `${E.books} *Okuma Kültürü & Kitap Takibi:*\n` +
                              `Öğrencimiz, şu an büyük bir ilgiyle okuduğu ${E.bookBlue} *${kitapAdi}* adlı kitapta ${E.page} *${sayfa}/${hedef}* sayfaya ulaşarak hedefine doğru sağlam adımlarla ilerlemektedir. ${E.target}\n\n`
                            : "";

                        let tavsiyeBolumu = "";
                        if (rubricSeciliEtkinlikler.length > 0 || rubricSeciliVideolar.length > 0) {
                            tavsiyeBolumu = `${E.star} *Bu Hafta Önerilenler:*\nÖğretmeniniz aşağıdaki etkinlik ve videoları yapmanızı/izlemenizi tavsiye ediyor:\n`;
                            let sayac = 1;
                            rubricSeciliEtkinlikler.forEach(ad => {
                                tavsiyeBolumu += `${E.target} ${sayac}. ${ad}\n`;
                                sayac++;
                            });
                            rubricSeciliVideolar.forEach(baslik => {
                                tavsiyeBolumu += `${E.clapper} ${sayac}. ${baslik}\n`;
                                sayac++;
                            });
                            tavsiyeBolumu += `\n`;
                        }

                                        let raporMetni = `${E.cap} *Diji-Medu - HAFTALIK İNGİLİZCE GELİŞİM RAPORU* ${E.cap}\n\n` +
                            `Sevgili Velimiz, ${E.star} *${tarih}* tarihli dersimizi geride bıraktık. Öğrencimiz *${ogrenci}*, 'ın bu hafta sergilediği performansın özeti sizlerle. ${E.rocket}\n\n` +
                            `${E.chart} *Haftalık Genel Durumumuz:*\n` +
                            genelDurumCumlesi +
                            `${E.bulb} *Detaylı Beceri Dağılımımız:*\n` +
                            `${E.book} • Okuma: ${okuma}/100\n` +
                            `${E.pencil} • Yazma: ${yazma}/100\n` +
                            `${E.brain} • Kelime (Vocabulary): ${vocab}/100\n` +
                            `${E.speak} • Konuşma: ${konusma}/100\n` +
                            `${E.ruler} • Grammar: ${grammar}/100\n\n` +
                            kitapBolumuWA +
                            `${E.teacher} *Öğretmen Gözlemi & Değerlendirme:*\n` +
                            `${E.chat} _"${odevDonut || "Ders boyunca odaklanması ve derse katılımı son derece olumluydu."}"_\n\n` +
                            tavsiyeBolumu +
                            `${E.pin} *Ödev & Gelecek Planı:*\n` +
                            `• Verilen Ödev: *${sonrakiOdev || "Kelime tekrarı ve pratik"}*\n` +
                            `• Sonraki Dersimiz: ${E.calendar} *${sonrakiTarih || "Planlanıyor"}*\n\n` +
                            `${E.sparkle} _Öğrencimizin tüm detaylı istatistiklerini, çözdüğü testleri, kazanmış olduğu rozetleri ve özel gelişim grafiklerini anlık incelemek için lütfen **Öğrenci Portalımıza** giriş yapmayı unutmayın!_\n\n` +
                            `Destekleriniz, değerli güveniniz ve harika iş birliğiniz için çok teşekkür ederiz. Sağlıklı, mutlu ve başarılı bir hafta dileriz! ${E.sunflower}${E.herb}`;

                        document.getElementById('rubricModal').style.display = 'none';
                                        document.getElementById('rubricModal').style.display = 'none';
                        rubricSeciliEtkinlikler = [];
                        rubricSeciliVideolar = [];

                        if (telefon) {
                            let waURL = `https://wa.me/${telefon}?text=${encodeURIComponent(raporMetni)}`;
                            if (waPencere) {
                                // Önceden senkron açılmış pencereyi WhatsApp linkine yönlendir
                                waPencere.location.href = waURL;
                            } else {
                                // Pop-up engellendiyse (pencere açılamadıysa) son çare olarak yine dene
                                window.open(waURL, '_blank');
                                alert("Pencere açma engellendi olabilir. Açılmadıysa tarayıcınızın pop-up izinlerini kontrol edin.");
                            }
                        } else {
                            if (waPencere) waPencere.close();
                            alert("Veriler başarıyla kaydedildi. Bu öğrenciye ait telefon numarası bulunamadığı için WhatsApp raporu gönderilmedi.");
                        }

                    } catch(e) {
                        if (waPencere) waPencere.close();
                        alert("Kayıt sırasında hata oluştu: " + e);
                    } finally {
                        if (kaydetBtn) { kaydetBtn.disabled = false; kaydetBtn.innerText = "💾 Kaydet & Uzun Veli Raporunu WhatsApp'a Gönder"; }
                    }
                }

                // ===== ŞİFRE İŞLEMLERİ (Şifremi Unuttum / Şifre Değiştir ortak) =====
                function sifremiUnuttumAc() {
                    document.getElementById('sifreIslemBaslik').innerText = "Şifremi unuttum";
                    document.getElementById('sifreIslemKullaniciAdi').value = "";
                    document.getElementById('sifreIslemKullaniciAdi').readOnly = false;
                    document.getElementById('sifreIslemKullaniciAdi').style.background = "#edf2f7";
                    sifreIslemFormuSifirla();
                    document.getElementById('sifreIslemModal').style.display = 'flex';
                }

                function sifreDegistirAc() {
                    if (!aktifOgrenciAdi) return;
                    document.getElementById('sifreIslemBaslik').innerText = "🔑 Şifre Değiştir";
                    document.getElementById('sifreIslemKullaniciAdi').value = aktifOgrenciAdi;
                    document.getElementById('sifreIslemKullaniciAdi').readOnly = true;
                    document.getElementById('sifreIslemKullaniciAdi').style.background = "#e2e8f0";
                    sifreIslemFormuSifirla();
                    document.getElementById('sifreIslemModal').style.display = 'flex';
                }

                function sifreIslemFormuSifirla() {
                    document.getElementById('sifreIslemTelefon').value = "";
                    document.getElementById('sifreIslemEmail').value = "";
                    document.getElementById('sifreIslemNeden').value = "";
                    document.getElementById('sifreIslemNedenSayac').innerText = "0 / 10";
                    document.getElementById('sifreIslemNedenSayac').style.color = "#94a3b8";
                    document.getElementById('sifreIslemYeniSifre1').value = "";
                    document.getElementById('sifreIslemYeniSifre2').value = "";
                    document.getElementById('sifreIslemSonucMesaj').innerText = "";
                }

                function sifreIslemKapat() {
                    document.getElementById('sifreIslemModal').style.display = 'none';
                }

                document.addEventListener('DOMContentLoaded', function() {
                    let nedenEl = document.getElementById('sifreIslemNeden');
                    if (nedenEl) {
                        nedenEl.addEventListener('input', function() {
                            let uzunluk = this.value.trim().length;
                            let sayacEl = document.getElementById('sifreIslemNedenSayac');
                            sayacEl.innerText = uzunluk + " / 10";
                            sayacEl.style.color = uzunluk >= 10 ? "#16a34a" : "#94a3b8";
                        });
                    }
                });

                async function sifreIslemGonder() {
                    let kullaniciAdi = document.getElementById('sifreIslemKullaniciAdi').value.trim();
                    let telefon = document.getElementById('sifreIslemTelefon').value.trim();
                    let email = document.getElementById('sifreIslemEmail').value.trim();
                    let neden = document.getElementById('sifreIslemNeden').value.trim();
                    let yeni1 = document.getElementById('sifreIslemYeniSifre1').value;
                    let yeni2 = document.getElementById('sifreIslemYeniSifre2').value;
                    let mesajDiv = document.getElementById('sifreIslemSonucMesaj');

                    if (!kullaniciAdi || !telefon || !email || !neden || !yeni1 || !yeni2) {
                        mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Lütfen tüm alanları doldurun."; return;
                    }
                    if (neden.length < 10) {
                        mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Açıklama en az 10 karakter olmalı."; return;
                    }
                    if (yeni1.length < 6) {
                        mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Şifre en az 6 karakter olmalı."; return;
                    }
                    if (yeni1 !== yeni2) {
                        mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Girdiğiniz yeni şifreler birbiriyle uyuşmuyor."; return;
                    }

                    let btn = document.getElementById('sifreIslemGonderBtn');
                    btn.disabled = true; btn.innerText = "İşleniyor...";
                    mesajDiv.style.color = "#334155"; mesajDiv.innerText = "Kontrol ediliyor...";

                    try {
                        let res = await fetch(apiURL, {
                            method: "POST",
                            body: JSON.stringify({ islem: "sifreDegistir", ogrenciAdi: kullaniciAdi, telefon: telefon, email: email, neden: neden, yeniSifre: yeni1 })
                        });
                        let data = await res.json();
                        if (data.status === "success") {
                            mesajDiv.style.color = "#16a34a";
                            mesajDiv.innerText = "✅ Şifreniz başarıyla güncellendi! Yeni şifrenizle giriş yapabilirsiniz.";
                            setTimeout(() => { sifreIslemKapat(); }, 2500);
                        } else {
                            mesajDiv.style.color = "#dc2626";
                            mesajDiv.innerText = "❌ " + (data.message || "Bir hata oluştu.");
                        }
                    } catch (e) {
                        mesajDiv.style.color = "#dc2626";
                        mesajDiv.innerText = "Bağlantı hatası oluştu.";
                    } finally {
                        btn.disabled = false; btn.innerText = "Şifreyi Güncelle";
                    }
                }

                        // ===== KAYIT OL =====
                function kayitOlAc() {
                    document.getElementById('kayitOlKullaniciAdi').value = "";
                    document.getElementById('kayitOlAdSoyad').value = "";
                    document.getElementById('kayitOlSifre1').value = "";
                    document.getElementById('kayitOlSifre2').value = "";
                    document.getElementById('kayitOlTelefon').value = "";
                    document.getElementById('kayitOlSinif').value = "";
                    document.getElementById("kayitOlOgrenimTuru").value="school";
                    document.getElementById("kayitOlOkulAlanlari").hidden=false;
                    document.getElementById('kayitOlSube').value = "";
                    document.getElementById('kayitOlEmail').value = "";
                    document.getElementById('kayitOlSonucMesaj').innerText = "";
                    document.getElementById('kayitOlModal').style.display = 'flex';
                }

                function kayitOlKapat() {
                    document.getElementById('kayitOlModal').style.display = 'none';
                }

                       async function kayitOlGonder() {
                    let kullaniciAdi = document.getElementById('kayitOlKullaniciAdi').value.trim();
                    let adSoyad = document.getElementById('kayitOlAdSoyad').value.trim();
                    let sifre1 = document.getElementById('kayitOlSifre1').value;
                    let sifre2 = document.getElementById('kayitOlSifre2').value;
                    let telefon = document.getElementById('kayitOlTelefon').value.trim();
                    let independent = document.getElementById("kayitOlOgrenimTuru").value === "independent";
                    let sinif = independent ? null : document.getElementById('kayitOlSinif').value;
                    let sube = independent ? null : document.getElementById('kayitOlSube').value.trim();
                    let email = document.getElementById('kayitOlEmail').value.trim();
                    let kvkkOnay = document.getElementById('kayitOlKvkkOnay').checked;
                    let mesajDiv = document.getElementById('kayitOlSonucMesaj');

                    if (!kullaniciAdi || !adSoyad || !sifre1 || !sifre2 || !telefon || (!independent && (!sinif || !sube))) {
                        mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Lütfen zorunlu alanları doldurun."; return;
                    }
                    if (!kvkkOnay) {
                        mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Devam edebilmek için veli ve bilgilendirme beyanını işaretlemelisiniz."; return;
                    }
                    if (sifre1.length < 6) {
                        mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Şifre en az 6 karakter olmalı."; return;
                    }
                    if (sifre1 !== sifre2) {
                        mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Girdiğiniz şifreler birbiriyle uyuşmuyor."; return;
                    }

                    let btn = document.getElementById('kayitOlGonderBtn');
                    btn.disabled = true; btn.innerText = "Gönderiliyor...";
                    mesajDiv.style.color = "#334155"; mesajDiv.innerText = "İşleniyor...";

                    try {
                                        let res = await fetch(apiURL, {
                            method: "POST",
                            body: JSON.stringify({ islem: "kayitOl", ogrenciAdi: kullaniciAdi, adSoyad: adSoyad, sifre: sifre1, telefon: telefon, ogrenimTuru: independent ? "independent" : "school", sinif: sinif, sube: sube, email: email, kvkkOnayTarihi: new Date().toISOString() })
                        });
                        let data = await res.json();
                        if (data.status === "success") {
                            mesajDiv.style.color = "#16a34a";
                            mesajDiv.innerText = data.message || "✅ Hoş geldin! E-postandaki bağlantıyla hesabını doğrula.";
                            if(data.token){localStorage.setItem('ing_token',data.token);localStorage.setItem('ing_oturumAcik','true');localStorage.setItem('ing_aktifOgrenci',data.ogrenci||kullaniciAdi);kayitOlKapat();await window.dmOpenPortalSession?.({student:data.ogrenci||kullaniciAdi,refreshProfile:true});}
                            else setTimeout(() => { kayitOlKapat(); }, 3200);
                        } else {
                            mesajDiv.style.color = "#dc2626";
                            mesajDiv.innerText = "❌ " + (data.message || "Bir hata oluştu.");
                        }
                    } catch (e) {
                        mesajDiv.style.color = "#dc2626";
                        mesajDiv.innerText = "Bağlantı hatası oluştu.";
                    } finally {
                        btn.disabled = false; btn.innerText = "Ücretsiz Kayıt Ol";
                    }
                }

                // ===== BEKLEYEN KAYITLAR (öğretmen tarafı) =====
                function ogretmenMenuBekleyenKayitlarAc() {
                    document.getElementById('ogretmenMenuModal').style.display = 'none';
                    document.getElementById('bekleyenKayitlarModal').style.display = 'flex';
                    bekleyenKayitlariYukle();
                }

                function bekleyenKayitlariYukle() {
                    let alan = document.getElementById('bekleyenKayitlarListeAlani');
                    alan.innerHTML = `<div style="font-size:11px; color:#64748b; text-align:center; padding:10px;">Yükleniyor...</div>`;
                    fetch(apiURL, {
                        method: "POST",
                        body: JSON.stringify({ islem: "bekleyenKayitlariGetir" })
                    })
                    .then(res => res.json())
                    .then(data => {
                        let liste = data.liste || [];
                        let badge = document.getElementById('ogretmenMenuBekleyenSayisi');
                        if (liste.length > 0) { badge.style.display = 'inline-block'; badge.innerText = liste.length; }
                        else { badge.style.display = 'none'; }

                        if (liste.length === 0) {
                            alan.innerHTML = `<div style="font-size:11px; color:#64748b; text-align:center; padding:14px;">Bekleyen kayıt talebi yok.</div>`;
                            return;
                        }
                        alan.innerHTML = "";
                        liste.forEach(k => {
                            let kart = document.createElement('div');
                            kart.style.cssText = "background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px;";
                            kart.innerHTML = `
                                <div style="font-weight:800; font-size:13px; color:#1e293b; margin-bottom:4px;">${guvenliMetin(k.ogrenciAdi)}${k.adSoyad ? ` <span style="font-weight:600; color:#64748b;">(${guvenliMetin(k.adSoyad)})</span>` : ''}</div>
                                <div style="font-size:11px; color:#64748b; line-height:1.7; margin-bottom:10px;">
                                    📚 Sınıf: ${guvenliMetin(String(k.sinif))} / ${guvenliMetin(String(k.sube))}<br>
                                    📞 Veli Telefon: ${guvenliMetin(String(k.telefon))}<br>
                                    ${k.email ? `✉️ E-posta: ${guvenliMetin(String(k.email))}` : ''}
                                </div>
                                <div style="display:flex; gap:8px;">
                                    <button onclick="kayitOnaylaYap('${guvenliMetin(k.ogrenciAdi).replace(/'/g,"\\'")}')" style="flex:1; background:#dcfce7; color:#166534; border:none; padding:8px; border-radius:8px; font-weight:700; font-size:11.5px; cursor:pointer;">✅ Onayla</button>
                                    <button onclick="kayitReddetYap('${guvenliMetin(k.ogrenciAdi).replace(/'/g,"\\'")}')" style="flex:1; background:#fee2e2; color:#991b1b; border:none; padding:8px; border-radius:8px; font-weight:700; font-size:11.5px; cursor:pointer;">❌ Reddet</button>
                                </div>
                            `;
                            alan.appendChild(kart);
                        });
                    })
                    .catch(() => { alan.innerHTML = `<div style="font-size:11px; color:#dc2626; text-align:center;">Yüklenirken hata oluştu.</div>`; });
                }

                function kayitOnaylaYap(ogrenciAdi) {
                    fetch(apiURL, {
                        method: "POST",
                        body: JSON.stringify({ islem: "kayitOnayla", ogrenciAdi: ogrenciAdi })
                    })
                    .then(() => bekleyenKayitlariYukle())
                    .catch(() => {});
                }

                function kayitReddetYap(ogrenciAdi) {
                    if (!confirm(`${ogrenciAdi} adlı kayıt talebini reddetmek istediğine emin misin? Bu işlem geri alınamaz.`)) return;
                    fetch(apiURL, {
                        method: "POST",
                        body: JSON.stringify({ islem: "kayitReddet", ogrenciAdi: ogrenciAdi })
                    })
                    .then(() => bekleyenKayitlariYukle())
                    .catch(() => {});
                }

                        // ===== YARDIM KÖŞESİ =====


                function yardimAc() {
                    document.getElementById('yardimAramaInput').value = "";
                    yardimIcerikCiz("");
                    document.getElementById('yardimModal').style.display = 'flex';
                }
                function yardimKapat() {
                    document.getElementById('yardimModal').style.display = 'none';
                    window.dmProfileDismiss?.();
                }



                    // ===== SINIF OYUN MODU =====
                function siniftaOyunModuAc() {
                    document.getElementById('ogretmenMenuModal').style.display = 'none';
                    document.getElementById('siniftaOyunModal').style.display = 'flex';
                    siniftaOyunSinifDoldur();
                    document.getElementById('siniftaOyunOgrenciSelect').innerHTML = '<option value="">-- Önce sınıf seçin --</option>';
                    siniftaOyunButonlariGuncelle();
                }

                function siniftaOyunSinifDoldur() {
                    let sel = document.getElementById('siniftaOyunSinifSelect');
                    let siniflar = new Set();
                    globalDataCache.forEach(u => {
                        let ad = String(u.ogrenci || "").trim();
                        if (!ad || ad.toLowerCase() === "teacher") return;
                        let s = String(u.Sinif || "").trim();
                        if (s) siniflar.add(s);
                    });
                    sel.innerHTML = '<option value="">-- Sınıf Seçin --</option>';
                    Array.from(siniflar).sort((a,b) => Number(a) - Number(b)).forEach(s => {
                        sel.innerHTML += `<option value="${s}">${s}. Sınıf</option>`;
                    });
                }

                function siniftaOyunSinifSecildi() {
                    let sinif = document.getElementById('siniftaOyunSinifSelect').value;
                    let ogrSel = document.getElementById('siniftaOyunOgrenciSelect');
                    ogrSel.innerHTML = '<option value="">-- Öğrenci Seçin --</option>';
                    if (sinif) {
                        globalDataCache
                            .filter(u => String(u.Sinif || "").trim() === sinif && String(u.ogrenci || "").trim().toLowerCase() !== "teacher")
                            .sort((a, b) => String(a.ogrenci).localeCompare(String(b.ogrenci), 'tr'))
                            .forEach(u => {
                                ogrSel.innerHTML += `<option value="${guvenliMetin(u.ogrenci)}">${guvenliMetin(u.ogrenci)}</option>`;
                            });
                    }
                    siniftaOyunButonlariGuncelle();
                }

                function siniftaOyunButonlariGuncelle() {
                    let ogr = document.getElementById('siniftaOyunOgrenciSelect').value;
                    let aktifMi = !!ogr;
                    document.querySelectorAll('.siniftaOyunBtn').forEach(b => {
                        b.disabled = !aktifMi;
                        b.style.opacity = aktifMi ? '1' : '0.45';
                    });
                }

                function siniftaOyunuBaslat(oyunTuru) {
                    window.dmClassroomOnlineOwner=null;
                    let ogr = document.getElementById('siniftaOyunOgrenciSelect').value;
                    if (!ogr) { alert("Lütfen önce bir öğrenci seçin."); return; }
                    siniftaOynananOgrenci = ogr;
                    document.getElementById('siniftaOyunModal').style.display = 'none';
                    siniftaOyunRozetiGoster();

                               if (oyunTuru === 'yolculuk') seviyeHaritasiAc();
                    else if (oyunTuru === 'ky') kelimeYarismasiAc();
                    else if (oyunTuru === 'jp') jpOyunAc();
                    else if (oyunTuru === 'bosluk') boslukOyunAc();
                    else if (oyunTuru === 'hafiza') hafizaOyunAc();
                    else if (oyunTuru === 'yagmur') yagmurOyunAc();
                    else if (oyunTuru === 'asmaca') asmacaOyunAc();
                    else if (oyunTuru === 'kelimebul') kelimebulOyunAc();
                    else if (oyunTuru === 'eslestirme') esOyunAc();
                    else if (oyunTuru === 'tren') trenOyunAc();
                    else if (oyunTuru === 'dikte') dikteAc();
                    else if (oyunTuru === 'cumle') cumleAc();
                    else if (oyunTuru === 'okuma') okumaStudyosunuAc();
                    else if (oyunTuru === 'pomodoro') pomodoroAc();
                    else if (oyunTuru === 'ucus' || oyunTuru === 'rota') { window.dmClassroomOnlineOwner=ogr; window.dmInviteAc?.(oyunTuru); }
                    else if (oyunTuru === 'harfbahcesi') window.harfBahcesiAc?.();
                    else if (oyunTuru === 'papicards') window.dmPapiCards?.open?.();
                    else if (oyunTuru === 'meteor') window.dmMeteor?.open?.();
                    else if (oyunTuru === 'wheel') window.dmWordWheel?.open?.();
                }

                function siniftaOyunRozetiGoster() {
                    let rozet = document.getElementById('siniftaOyunAktifRozet');
                    if (!rozet) return;
                    if (siniftaOynananOgrenci) {
                        document.getElementById('siniftaOyunAktifIsim').innerText = siniftaOynananOgrenci;
                        rozet.style.display = 'flex';
                    } else {
                        rozet.style.display = 'none';
                    }
                }

                function siniftaOyunModunuKapat() {
                    window.dmClassroomOnlineOwner=null;
                    siniftaOynananOgrenci = null;
                    siniftaOyunRozetiGoster();
                }

                            function genelSesEfektiCal(tip, komboSayisi) {
            try {
                let ctx = new (window.AudioContext || window.webkitAudioContext)();
                let osc = ctx.createOscillator();
                let gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                if (tip === 'dogru') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(660, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
                    gain.gain.setValueAtTime(0.18, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                    osc.start(); osc.stop(ctx.currentTime + 0.3);
                    if (navigator.vibrate) navigator.vibrate(40);
                } else if (tip === 'yanlis') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(180, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.25);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                    osc.start(); osc.stop(ctx.currentTime + 0.35);
                    if (navigator.vibrate) navigator.vibrate([50, 40, 50]);
                } else if (tip === 'kombo') {
                    let pitch = Math.min(1800, 700 + (komboSayisi || 5) * 60);
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(pitch * 0.7, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(pitch, ctx.currentTime + 0.22);
                    gain.gain.setValueAtTime(0.2, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                    osc.start(); osc.stop(ctx.currentTime + 0.5);
                    if (navigator.vibrate) navigator.vibrate([30, 20, 30, 20, 70]);
                }
            } catch (e) {}
        }

        function genelKomboGoster(komboSayisi, targetEl) {
            if (!komboSayisi || komboSayisi % 5 !== 0) return;
            genelSesEfektiCal('kombo', komboSayisi);
            let wrap = document.createElement('div');
            wrap.className = 'genel-kombo-burst-wrap';
            let raylar = '';
            for (let i = 0; i < 8; i++) raylar += `<div class="gkb-ray" style="--rot:${i*45}deg;"></div>`;
            wrap.innerHTML = `<div class="gkb-star"></div>${raylar}<span class="gkb-papagan">🦜</span><span class="gkb-txt">🔥 KOMBO x${komboSayisi}!</span>`;
            document.body.appendChild(wrap);
            setTimeout(() => wrap.remove(), 1500);
        }
        async function genelEnerjiHarca(miktar) {
            let isim = (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) || (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi);
            if (!isim || isim.toLowerCase() === 'teacher') return;
            try {
                let res = await fetch(apiURL, { method:"POST", body: JSON.stringify({ islem:"enerjiDegistir", ogrenci: isim, fark: miktar }) });
                let d = await res.json();
                if (typeof headerEnerjiGoster === 'function') headerEnerjiGoster(d.enerjiKalan, d.enerjiMax);
                genelEnerjiDegisimGoster(miktar);
            } catch(e) {}
        }
        function genelEnerjiBittiGoster() {
            if(window.DijiMeduPapiFeedback){window.DijiMeduPapiFeedback.energy();return;}
            /* Retired legacy energy overlay. */
        }
        function genelOyunGirisEngelliMi() {
            if (window.genelEnerjiKalan !== undefined && window.genelEnerjiKalan <= 0) {
                genelEnerjiBittiGoster();
                return true;
            }
            return false;
        }

                        // ===== ORTAK: Bu 4 oyun için havuz filtreleme yardımcı fonksiyonu =====
                function oyunHavuzGetir(sinif, uniteler) {
                    let havuz = window.masterKelimeHavuzu || [];
                    return havuz.filter(k => Number(k.sinif) === Number(sinif) && uniteler.includes(Number(k.unite)));
                }
                function genericSinifGuncelle(sinif, uniteBoxId, secilenUnitelerSetFn) {
                    let havuz = window.masterKelimeHavuzu || [];
                    let sinifKelimeleri = havuz.filter(k => Number(k.sinif) === Number(sinif));
                    let uniteler = [...new Set(sinifKelimeleri.map(k => Number(k.unite)))].sort((a,b) => a-b);
                    if (uniteler.length === 0) uniteler = (Number(sinif)===3||Number(sinif)===4)?Array.from({length:10},(_,i)=>i+1):Array.from({length:8},(_,i)=>i+1);
                    let box = document.getElementById(uniteBoxId);
                    box.innerHTML = "";
                    let secilen = [];
                    uniteler.forEach((u, idx) => {
                        let chip = document.createElement('button');
                        chip.type = 'button';
                        chip.className = 'unite-chip' + (idx === 0 ? ' selected' : '');
                        chip.innerText = u + '.Ü';
                        chip.onclick = function() { chip.classList.toggle('selected'); secilenUnitelerSetFn(Array.from(box.querySelectorAll('.unite-chip.selected')).map((c,i) => uniteler[Array.from(box.children).indexOf(c)])); };
                        box.appendChild(chip);
                        if (idx === 0) secilen.push(u);
                    });
                    secilenUnitelerSetFn(secilen);
                }

                           // ============ 1) HAFIZA KARTLARI ============
                        let hafizaAktifSinif = 1, hafizaSecilenUniteler = [1];
                let hafizaKartlar = [], hafizaAcikIndexler = [], hafizaHamle = 0, hafizaEslesenSayi = 0, hafizaSure = 0, hafizaYanlisSayisi = 0, hafizaTimer = null;
                let hafizaKombo = 0, hafizaKomboBonus = 0;
                let hafizaMuzikAcik = true, hafizaAudioElement = null;

                function hafizaMuzikBaslat() {
                    if (!hafizaMuzikAcik) return;
                    if (!hafizaAudioElement) {
                        hafizaAudioElement = new Audio('ozgun/tema-1.mp3');
                        hafizaAudioElement.loop = true;
                        hafizaAudioElement.volume = 0.10;
                    }
                    hafizaAudioElement.play().catch(() => {});
                }
                function hafizaMuzikDurdur() { if (hafizaAudioElement) { hafizaAudioElement.pause(); hafizaAudioElement.currentTime = 0; } }
                function hafizaMuzikToggle() {
                    hafizaMuzikAcik = !hafizaMuzikAcik;
                    let btn = document.getElementById('hafizaMuzikBtn');
                    if (hafizaMuzikAcik) { btn.innerText = "🔊 Müzik: Açık"; hafizaMuzikBaslat(); }
                    else { btn.innerText = "🔇 Müzik: Kapalı"; hafizaMuzikDurdur(); }
                }
                function hafizaSesCal(basariliMi) {
                    try {
                        let ctx = new (window.AudioContext || window.webkitAudioContext)();
                        let osc = ctx.createOscillator();
                        let gain = ctx.createGain();
                        osc.connect(gain); gain.connect(ctx.destination);
                        osc.type = 'sine';
                        osc.frequency.value = basariliMi ? 880 : 220;
                        gain.gain.setValueAtTime(0.15, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                        osc.start(); osc.stop(ctx.currentTime + 0.3);
                    } catch(e) {}
                }

                function hafizaOyunAc() {
                    if (genelOyunGirisEngelliMi()) return;
                    let modalEl = document.getElementById('hafizaOyunOverlay');
                    document.body.appendChild(modalEl);
                    modalEl.style.display = 'flex';
                    hafizaMuzikBaslat();
                    document.getElementById('hafizaGirisEkrani').style.display = 'block';
                    document.getElementById('hafizaOyunEkrani').style.display = 'none';
                    document.getElementById('hafizaBitisEkrani').style.display = 'none';
                    let isimInput = document.getElementById('hafizaIsimInput');
                    if (siniftaOynananOgrenci) { isimInput.value = siniftaOynananOgrenci; isimInput.disabled = true; }
                    else if (aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== "teacher") { isimInput.value = aktifOgrenciAdi; isimInput.disabled = false; }
                    else { isimInput.value = ""; isimInput.disabled = false; }
                    sinifGridKisitlamaUygula('hafizaSinifGrid', function(s){ hafizaAktifSinif = s; }, function(s){ genericSinifGuncelle(s, 'hafizaUniteBox', function(u){ hafizaSecilenUniteler = u; }); });
                }
                function hafizaSinifSec(sinif, btn) {
                    hafizaAktifSinif = sinif;
                    document.getElementById('hafizaSinifGrid').querySelectorAll('.sinif-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    genericSinifGuncelle(sinif, 'hafizaUniteBox', function(u){ hafizaSecilenUniteler = u; });
                }
              function hafizaOyunKapat() { if (liderlikKilitliMiKontrolEt('hafiza', 'hafizaBitisEkrani')) return; document.getElementById('hafizaOyunOverlay').style.display = 'none'; if (hafizaTimer) clearInterval(hafizaTimer); hafizaMuzikDurdur(); }

                function hafizaOyunuBaslat() {
            if (genelOyunGirisEngelliMi()) return;
            let isim = document.getElementById('hafizaIsimInput').value.trim();
            if (!isim) { alert("Lütfen adınızı giriniz!"); return; }
            let havuz = oyunHavuzGetir(hafizaAktifSinif, hafizaSecilenUniteler);
                    if (havuz.length < 4) { alert("Yeterli kelime bulunamadı, farklı ünite seçin."); return; }
                    let secilenler = OC.kelimeSec('hafiza', havuz, OC.SORU); let ciftSayisi = secilenler.length; OC.basla('hafiza'); window.hafizaOcHata = 0;
                    hafizaKartlar = [];
                    const enCards=[], trCards=[];
                    secilenler.forEach((k, i) => {
                        enCards.push({tip:'en', metin:(k.ingilizce||k.en||''), pairId:i, acik:true, sabit:true, eslesti:false});
                        trCards.push({tip:'tr', metin:(k.turkce||k.tr||''), pairId:i, acik:true, sabit:false, eslesti:false});
                    });
                    const karistir = arr => { for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr; };
                    hafizaKartlar = [...karistir(enCards), ...karistir(trCards)];
                               hafizaAcikIndexler = []; hafizaSeciliAcik=-1; hafizaKilitli=false; hafizaHamle = 0; hafizaEslesenSayi = 0; hafizaSure = 0; hafizaYanlisSayisi = 0; hafizaKombo = 0; hafizaKomboBonus = 0;

                        genelEnerjiHarca(-3);
            document.getElementById('hafizaGirisEkrani').style.display = 'none';
            document.getElementById('hafizaOyunEkrani').style.display = 'block';
                        jokerTuruBaslat('hafiza', 'hafizaOyunEkrani');
            document.getElementById('hafizaKalanInfo').innerText = `Kalan: ${ciftSayisi} çift`;
            hafizaMuzikBaslat();
                    hafizaKartlariCiz();

                    if (hafizaTimer) clearInterval(hafizaTimer);
                    hafizaTimer = setInterval(() => { if (OC.aktif?.pauseAt || jk.donuk) return; hafizaSure++; document.getElementById('hafizaSureInfo').innerText = `⏱️ ${hafizaSure}s`; }, 1000);
                }
                let hafizaSeciliAcik = -1, hafizaKilitli = false;
                function hafizaKartlariCiz() {
                    const grid=document.getElementById('hafizaKartGrid');
                    grid.innerHTML='';
                    grid.classList.add('hz-half-open-grid');
                    const half=hafizaKartlar.length/2;const turn=Math.min(Math.floor(hafizaEslesenSayi/4),Math.ceil(half/4)-1);grid.style.setProperty('--ab-rows',2);grid.dataset.turn=turn;const label=document.getElementById('abMemoryTurn');if(label)label.textContent=(turn+1)+' / '+Math.ceil(half/4)+' tur · '+Math.min(4,half-turn*4)+' çift';
                    hafizaKartlar.forEach((k,idx)=>{
                        if(Math.floor(k.pairId/4)!==turn)return;
                        const btn=document.createElement('button');
                        btn.type='button';btn.dataset.cardIndex=idx;
                        btn.className='hz-kart hz-'+k.tip+(k.eslesti?' eslesti':(k.acik?' acik':''))+(k.sabit?' hz-open-fixed':' hz-hidden-match')+(idx===hafizaSeciliAcik?' hz-selected':'');
                        btn.textContent=(k.acik||k.eslesti)?k.metin:'❓';
                        btn.disabled=k.eslesti||hafizaKilitli;
                        btn.setAttribute('aria-label',k.sabit?'Açık kelime: '+k.metin:(k.acik?'Açılan anlam: '+k.metin:'Gizli eş kartı'));
                        btn.onclick=()=>hafizaKartTikla(idx);
                        if(!grid.querySelector('.hz-'+k.tip)){const sep=document.createElement('div');sep.className='hz-grid-divider';sep.innerHTML='<svg class="ab-flag" aria-hidden="true"><use href="games-assets/approved-ui-v1.svg#'+(k.tip==='en'?'uk':'tr')+'"></use></svg>'+(k.tip==='en'?'İngilizce Kartlar':'Türkçe Kartlar');grid.append(sep);}
                        grid.append(btn);
                    });
                }
                function gridWrongFeedback(a,b){[a,b].forEach(i=>document.querySelector('#hafizaKartGrid [data-card-index="'+i+'"]')?.classList.add('hz-wrong'));}
                function hafizaKartTikla(idx) {
                    if(jk.bakis||hafizaKilitli)return;
                    const kart=hafizaKartlar[idx];
                    if(!kart||kart.eslesti)return;
                    if(kart.sabit){
                        hafizaSeciliAcik=idx===hafizaSeciliAcik?-1:idx;
                        hafizaKartlariCiz();
                        return;
                    }
                    if(hafizaSeciliAcik<0)return;
                    hafizaKilitli=true;
                    kart.acik=true;
                    const secilen=hafizaKartlar[hafizaSeciliAcik];
                    window.dmVerifiedGames?.record(secilen.metin,kart.metin);
                    hafizaHamle++;
                    document.getElementById('hafizaHamleInfo').innerText='Hamle: '+hafizaHamle;
                    hafizaKartlariCiz();
                    if(kart.pairId===secilen.pairId){
                        kart.eslesti=secilen.eslesti=true;
                        hafizaEslesenSayi++;
                        OC.dogru(window.hafizaOcHata<=1?1:window.hafizaOcHata<=3?0.5:0);
                        window.hafizaOcHata=0;
                        hafizaKombo++;
                        hafizaKomboBonus+=hafizaKombo*2;
                        genelSesEfektiCal('dogru');
                        genelKomboGoster(hafizaKombo,document.querySelector('#hafizaOyunOverlay .game-modal-content'));
                        if(navigator.vibrate)navigator.vibrate([90,40,120]);
                        hafizaSesCal(true);
                        document.getElementById('hafizaKalanInfo').innerText='Kalan: '+((hafizaKartlar.length/2)-hafizaEslesenSayi)+' çift';
                        hafizaSeciliAcik=-1;
                        hafizaKilitli=false;
                        hafizaKartlariCiz();
                        if(hafizaEslesenSayi===hafizaKartlar.length/2)setTimeout(()=>hafizaOyunuBitir(),500);
                    }else{
                        genelSesEfektiCal('yanlis');
                        hafizaYanlisSayisi++;
                        const anlamKart=hafizaKartlar.find(x=>x.tip==='tr'&&x.pairId===secilen.pairId);if(anlamKart)window.dmWrongWords?.add({en:secilen.metin,tr:anlamKart.metin,source:'hafiza'});
                        OC.yanlis(typeof jk!=='undefined'&&!!jk.kalkan);
                        if(!(typeof jk!=='undefined'&&jk.kalkan))window.hafizaOcHata=(window.hafizaOcHata||0)+1;
                        if(!jokerKalkanTuket())hafizaKombo=0;
                        hafizaSesCal(false);
                        gridWrongFeedback(hafizaSeciliAcik,idx);
                        setTimeout(()=>{
                            kart.acik=true;
                            hafizaSeciliAcik=-1;
                            hafizaKilitli=false;
                            if(document.getElementById('hafizaOyunEkrani')?.style.display!=='none')hafizaKartlariCiz();
                        },900);
                    }
                }
                async function hafizaOyunuBitir() {
                    if (hafizaTimer) clearInterval(hafizaTimer);
                    hafizaMuzikDurdur();
                    document.getElementById('hafizaOyunEkrani').style.display = 'none';
                    document.getElementById('hafizaBitisEkrani').style.display = 'block';
                    let isim = document.getElementById('hafizaIsimInput').value.trim();
                    let sinifStr = hafizaAktifSinif + ". Sınıf";
                    let ciftSayisi = hafizaKartlar.length / 2;
                    // Süre geçtikçe ve yanlış eşleştirme yaptıkça puan düşer
                              let puan = OC.puan();
                    document.getElementById('hzResIsim').innerText = isim;
                    document.getElementById('hzResHamle').innerText = hafizaHamle;
                    document.getElementById('hzResSure').innerText = hafizaSure + " saniye";
                    document.getElementById('hzResPuan').innerText = puan + " Puan";
                                    genelSonucEkraniGoster({ oyunAdi:'🃏 Hafıza Sandığı', isim:isim, puan:puan, dogru:ciftSayisi, yanlis:hafizaYanlisSayisi, sureSaniye:hafizaSure, oyunKey:'hafiza', devamFn:hafizaOyunKapat, tekrarFn:hafizaOyunAc });
                    try {
                        await fetch(apiURL, { method:"POST", body: JSON.stringify({ islem:"hafizaLiderlikKaydet", tarih:new Date().toISOString().split('T')[0], isim:isim, sinif:sinifStr, detay:hafizaYanlisSayisi+" yanlış", sure:hafizaSure+"s", suresaniye:hafizaSure, puan:puan }) });
                    } catch(e) {}
                               liderlikKilitBaslat('hafiza');
                    oyunLiderlikGoster('hafizaLiderlikTumunuGetir', sinifStr, isim, 'hzGecmisSkorlarListesi', 'Hafıza Sandığı', 'hafiza');
                }

                // ============ ORTAK LİDERLİK GÖSTERİM ============
                       async function oyunLiderlikGoster(islemAdi, sinifStr, benimIsim, konteynerId, oyunAdi, oyunKey, denemeNo) {
                    denemeNo = denemeNo || 1;
                    let konum = document.getElementById(konteynerId);
                    konum.innerHTML = `Yükleniyor... (deneme ${denemeNo}/6)`;
                    try {
                        let res = await fetch(`${apiURL}?islem=${islemAdi}&sinif=${encodeURIComponent(sinifStr)}`);
                        let liste = await res.json();
                        if (oyunAdi) liderlikBonusUygula(liste, benimIsim, oyunAdi);
                            genelSonucSiralamaCiz(liste, benimIsim);
                        konum.innerHTML = "";
                        if (!liste || liste.length === 0) { konum.innerHTML = "Henüz kayıtlı skor bulunmuyor."; if (oyunKey) liderlikKilitBitir(oyunKey); return; }
                        liste.slice(0, 15).forEach((item, i) => {
                            let siraEmoji = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
                            let vurgu = item.isim.toLowerCase() === benimIsim.toLowerCase() ? "background:#fef9c3;font-weight:bold;" : "";
                            konum.innerHTML += `<div style="display:flex;justify-content:space-between;padding:2px 4px;border-bottom:1px solid #edf2f7;${vurgu}"><span>${siraEmoji} <b>${item.isim}</b></span><span>🏆 <b>${item.puan}</b></span></div>`;
                        });
                        if (oyunKey) liderlikKilitBitir(oyunKey);
                    } catch(e) {
                        if (denemeNo < 6) {
                            setTimeout(() => { oyunLiderlikGoster(islemAdi, sinifStr, benimIsim, konteynerId, oyunAdi, oyunKey, denemeNo + 1); }, 5000);
                        } else {
                            konum.innerHTML = "Liderlik tablosu yüklenirken hata oluştu.";
                            if (oyunKey) liderlikKilitBitir(oyunKey);
                        }
                    }
                }

                async function oyunLiderlikGosterDetayli(islemAdi, sinifStr, benimIsim, konteynerId, oyunAdi, oyunKey, denemeNo) {
                    denemeNo = denemeNo || 1;
                    let tabloKonum = document.getElementById(konteynerId);
                    tabloKonum.innerHTML = `<div>Liderlik tablosu güncelleniyor... (deneme ${denemeNo}/6)</div>`;
                    try {
                        let liderlikUrl = `${apiURL}?islem=${islemAdi}&sinif=${encodeURIComponent(sinifStr)}`;
                        let res = await fetch(liderlikUrl);
                        let liste = await res.json();
                        liderlikBonusUygula(liste, benimIsim, oyunAdi);
                                            genelSonucSiralamaCiz(liste, benimIsim);

                        tabloKonum.innerHTML = "";
                        if (!liste || liste.length === 0) {
                            tabloKonum.innerHTML = "<div>Henüz kayıtlı skor bulunmuyor.</div>";
                            if (oyunKey) liderlikKilitBitir(oyunKey);
                            return;
                        }
                        liste.slice(0, 15).forEach((item, index) => {
                            let siraEmoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
                            let benimSatirimMi = item.isim.toLowerCase() === benimIsim.toLowerCase() ? "background: #fdf4ff; font-weight: bold;" : "";
                            tabloKonum.innerHTML += `
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding: 2px 4px; border-radius: 4px; ${benimSatirimMi}">
                                    <span>${siraEmoji} <b>${item.isim}</b> <span style="color:#64748b; font-size:9px;">(${item.sinif})</span></span>
                                    <span>🏆 <b>${item.puan} Puan</b> <span style="color:#64748b; font-size:9px;">(${item.sure})</span></span>
                                </div>
                            `;
                        });
                        if (oyunKey) liderlikKilitBitir(oyunKey);
                    } catch (err) {
                        if (denemeNo < 6) {
                            setTimeout(() => { oyunLiderlikGosterDetayli(islemAdi, sinifStr, benimIsim, konteynerId, oyunAdi, oyunKey, denemeNo + 1); }, 5000);
                        } else {
                            tabloKonum.innerHTML = "<div>Liderlik tablosu yüklenirken hata oluştu.</div>";
                            if (oyunKey) liderlikKilitBitir(oyunKey);
                        }
                    }
                }

                // ============ 2) KELİME YAĞMURU (4 ŞIKLI + SÜRE/YANLIŞ CEZALI) ============
                let yagmurAktifSinif = 1, yagmurSecilenUniteler = [1];
                let yagmurHavuz = [], yagmurAktifIndex = 0, yagmurPuan = 0, yagmurDogru = 0, yagmurCan = 3, yagmurLevel = 1, yagmurInterval = null, yagmurPozisyon = 0, yagmurBaslangic = 0, yagmurAktifKelime = null, yagmurKelimeBaslangicZamani = 0, yagmurKombo = 0;
                let yagmurMuzikAcik = true, yagmurAudioElement = null;

                function yagmurMuzikBaslat() {
                    if (!yagmurMuzikAcik) return;
                    if (!yagmurAudioElement) {
                        yagmurAudioElement = new Audio('ozgun/tema-2.mp3');
                        yagmurAudioElement.loop = true;
                        yagmurAudioElement.volume = 0.10;
                    }
                    yagmurAudioElement.play().catch(() => {});
                }
                function yagmurMuzikDurdur() { if (yagmurAudioElement) { yagmurAudioElement.pause(); yagmurAudioElement.currentTime = 0; } }
                function yagmurMuzikToggle() {
                    yagmurMuzikAcik = !yagmurMuzikAcik;
                    let btn = document.getElementById('yagmurMuzikBtn');
                    if (yagmurMuzikAcik) { btn.innerText = "🔊 Müzik: Açık"; yagmurMuzikBaslat(); }
                    else { btn.innerText = "🔇 Müzik: Kapalı"; yagmurMuzikDurdur(); }
                }

               function yagmurOyunAc() {
                    if (genelOyunGirisEngelliMi()) return;
                    let modalEl = document.getElementById('yagmurOyunOverlay');
                    document.body.appendChild(modalEl);
                    modalEl.style.display = 'flex';
                    yagmurMuzikBaslat();
                    document.getElementById('yagmurGirisEkrani').style.display = 'block';
                    document.getElementById('yagmurOyunEkrani').style.display = 'none';
                    document.getElementById('yagmurBitisEkrani').style.display = 'none';
                    let isimInput = document.getElementById('yagmurIsimInput');
                    if (siniftaOynananOgrenci) { isimInput.value = siniftaOynananOgrenci; isimInput.disabled = true; }
                    else if (aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== "teacher") { isimInput.value = aktifOgrenciAdi; isimInput.disabled = false; }
                    else { isimInput.value = ""; isimInput.disabled = false; }
                    sinifGridKisitlamaUygula('yagmurSinifGrid', function(s){ yagmurAktifSinif = s; }, function(s){ genericSinifGuncelle(s, 'yagmurUniteBox', function(u){ yagmurSecilenUniteler = u; }); });
                }
                function yagmurSinifSec(sinif, btn) {
                    yagmurAktifSinif = sinif;
                    document.getElementById('yagmurSinifGrid').querySelectorAll('.sinif-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    genericSinifGuncelle(sinif, 'yagmurUniteBox', function(u){ yagmurSecilenUniteler = u; });
                }
           function yagmurOyunKapat() { if (liderlikKilitliMiKontrolEt('yagmur', 'yagmurBitisEkrani')) return; document.getElementById('yagmurOyunOverlay').style.display = 'none'; if (yagmurInterval) clearInterval(yagmurInterval); yagmurMuzikDurdur(); }

                function yagmurOyunuBaslat() {
            if (genelOyunGirisEngelliMi()) return;
            let isim = document.getElementById('yagmurIsimInput').value.trim();
            if (!isim) { alert("Lütfen adınızı giriniz!"); return; }
            yagmurHavuz = oyunHavuzGetir(yagmurAktifSinif, yagmurSecilenUniteler);
if (yagmurHavuz.length < 4) { alert("Yeterli kelime bulunamadı, farklı ünite seçin."); return; }
yagmurHavuz = OC.kelimeSec('yagmur', yagmurHavuz, OC.SORU); OC.basla('yagmur');
                        yagmurAktifIndex = 0; yagmurPuan = 0; yagmurDogru = 0; yagmurCan = 3; yagmurLevel = 1; yagmurBaslangic = Date.now(); yagmurKombo = 0;
                        genelEnerjiHarca(-3);
            document.getElementById('yagmurGirisEkrani').style.display = 'none';
            document.getElementById('yagmurOyunEkrani').style.display = 'block';
                        jokerTuruBaslat('yagmur', 'yagmurOyunEkrani');
            document.getElementById('yagmurAlan').innerHTML = "";
            yagmurMuzikBaslat();
                    yagmurYeniKelimeDusur();
                }
                function yagmurCanGoster() { document.getElementById('yagmurCanInfo').innerText = "❤️".repeat(yagmurCan) + "🖤".repeat(3 - yagmurCan); }

                function yagmurYeniKelimeDusur() {
                    if (yagmurInterval) clearInterval(yagmurInterval);
                    if (yagmurAktifIndex >= yagmurHavuz.length) { yagmurAktifIndex = 0; yagmurHavuz.sort(() => Math.random() - 0.5); }
                    yagmurAktifKelime = yagmurHavuz[yagmurAktifIndex];
                    yagmurKelimeBaslangicZamani = Date.now();

                    let alan = document.getElementById('yagmurAlan');
                    alan.innerHTML = "";
                    let el = document.createElement('div');
                    el.className = 'yg-dusen-kelime';
                    el.innerText = (yagmurAktifKelime.ingilizce || yagmurAktifKelime.en || '');
                    el.style.top = '0%';
                    alan.appendChild(el);
                    yagmurPozisyon = 0;
                    document.getElementById('yagmurLevelInfo').innerText = `Seviye: ${yagmurLevel}`;
                    yagmurCanGoster();

                    let dogruCevap = (yagmurAktifKelime.turkce || yagmurAktifKelime.tr || '');
                    let yanlisHavuz = (window.masterKelimeHavuzu || []).filter(k => (k.turkce || k.tr || '') !== dogruCevap);
                    let yanlisSecenekler = [...yanlisHavuz].sort(() => Math.random() - 0.5).slice(0, 2).map(k => k.turkce || k.tr || '');
                    while (yanlisSecenekler.length < 2) yanlisSecenekler.push("---");
                    let secenekler = [dogruCevap, ...yanlisSecenekler].sort(() => Math.random() - 0.5);
                    let dogruIndex = secenekler.indexOf(dogruCevap);

                    let secAlan = document.getElementById('yagmurSecenekler');
                    secAlan.innerHTML = "";
                    secenekler.forEach((sec, i) => {
                        let btn = document.createElement('button');
                        btn.className = 'yg-secenek-btn';
                        btn.innerText = sec;
                        btn.onclick = function() { yagmurSecenekSec(i, dogruIndex, btn); };
                        secAlan.appendChild(btn);
                    });

                    let hiz = (Number(yagmurAktifSinif) <= 2 ? 0.9 : Number(yagmurAktifSinif) <= 4 ? 1.15 : 1.4) * (1 + (yagmurLevel - 1) * 0.06);   /* Hız Fırtınası: doğru bildikçe hızlanır */
                    yagmurInterval = setInterval(() => {
                        if (OC.aktif?.pauseAt) return;
                                       if (jk.donuk) return;
                        yagmurPozisyon += hiz;
                        el.style.top = yagmurPozisyon + '%';
                                       if (yagmurPozisyon >= 90) {
                            clearInterval(yagmurInterval);
                            document.querySelectorAll('.yg-secenek-btn').forEach(b => b.disabled = true);
                            let ocKor = jokerKalkanTuket(); if (!ocKor) yagmurKombo = 0; OC.yanlis(ocKor); yagmurPuan = OC.puan();
                            window.dmVerifiedGames?.record(yagmurHavuz[yagmurAktifIndex],null);
                            yagmurCan = Math.max(0, yagmurCan - 1);
                            document.getElementById('yagmurPuanInfo').innerText = `Puan: ${yagmurPuan}`;
                            yagmurAktifIndex++;
                            setTimeout(() => yagmurYeniKelimeDusur(), 400);
                        }
                    }, 60);
                }

                function yagmurSecenekSec(secilenIndex, dogruIndex, btnEl) {
                    window.dmVerifiedGames?.record(yagmurHavuz[yagmurAktifIndex],btnEl.textContent);
                    if (yagmurInterval) clearInterval(yagmurInterval);
                    document.querySelectorAll('.yg-secenek-btn').forEach(b => b.disabled = true);
                    let gecenSaniyeKelime = Math.floor((Date.now() - yagmurKelimeBaslangicZamani) / 1000);

                        if (secilenIndex === dogruIndex) {
                btnEl.classList.add('dogru');
                // Süre geçtikçe kazanılan puan azalır, kombo arttıkça bonus büyür
                       OC.dogru(1); yagmurKombo++; yagmurPuan = OC.puan();
                               genelSesEfektiCal('dogru');
                genelKomboGoster(yagmurKombo, document.querySelector('#yagmurOyunOverlay .game-modal-content'));
                yagmurDogru++;
                yagmurLevel++;
                document.getElementById('yagmurPuanInfo').innerText = `Puan: ${yagmurPuan}`;
                yagmurAktifIndex++;
                setTimeout(() => yagmurYeniKelimeDusur(), 500);
               } else {
                genelSesEfektiCal('yanlis');
                btnEl.classList.add('yanlis');
                let ocKor = jokerKalkanTuket(); if (!ocKor) yagmurKombo = 0; OC.yanlis(ocKor);
                let dogruBtn = document.querySelectorAll('.yg-secenek-btn')[dogruIndex];
                if (dogruBtn) dogruBtn.classList.add('dogru');
                yagmurPuan = OC.puan();
                        document.getElementById('yagmurPuanInfo').innerText = `Puan: ${yagmurPuan}`;
                        yagmurCan = Math.max(0, yagmurCan - 1);
                        yagmurAktifIndex++;
                        setTimeout(() => yagmurYeniKelimeDusur(), 700);
                    }
                }

                async function yagmurOyunuBitir() {
                    if (yagmurInterval) clearInterval(yagmurInterval);
                    yagmurMuzikDurdur();
                    document.getElementById('yagmurOyunEkrani').style.display = 'none';
                    document.getElementById('yagmurBitisEkrani').style.display = 'block';
                    let isim = document.getElementById('yagmurIsimInput').value.trim();
                    let sinifStr = yagmurAktifSinif + ". Sınıf";
                    let sureToplam = Math.round((Date.now() - yagmurBaslangic) / 1000);
                    document.getElementById('ygResIsim').innerText = isim;
                    document.getElementById('ygResDogru').innerText = yagmurDogru;
                    document.getElementById('ygResSure').innerText = sureToplam + " saniye";
                    document.getElementById('ygResPuan').innerText = yagmurPuan + " Puan";
                                    genelSonucEkraniGoster({ oyunAdi:'🌪️ Hız Fırtınası', isim:isim, puan:yagmurPuan, dogru:yagmurDogru, yanlis:3 - Math.max(0, yagmurCan), sureSaniye:sureToplam, oyunKey:'yagmur', devamFn:yagmurOyunKapat, tekrarFn:yagmurOyunAc });
                    try {
                        await fetch(apiURL, { method:"POST", body: JSON.stringify({ islem:"yagmurLiderlikKaydet", tarih:new Date().toISOString().split('T')[0], isim:isim, sinif:sinifStr, detay:yagmurDogru+" doğru", sure:sureToplam+"s", suresaniye:sureToplam, puan:yagmurPuan }) });
                    } catch(e) {}
                                liderlikKilitBaslat('yagmur');
                    oyunLiderlikGoster('yagmurLiderlikTumunuGetir', sinifStr, isim, 'ygGecmisSkorlarListesi', 'Hız Fırtınası', 'yagmur');
                }

                // ============ 3) ADAM ASMACA (5 CAN + SÜRE/YANLIŞ CEZALI + NOKTALAMA DÜZELTMESİ) ============
                        let asmacaAktifSinif = 1, asmacaSecilenUniteler = [1];
                let asmacaKelimeler = [], asmacaAktifIndex = 0, asmacaAktifKelime = "", asmacaTahminEdilenHarfler = [], asmacaYanlisSayisi = 0, asmacaPuan = 0, asmacaCan = 5, asmacaKelimeBaslangicZamani = 0;
                        let asmacaKombo = 0, asmacaDogruSayi = 0, asmacaYanlisSayi = 0, asmacaBaslangic = 0;
                let asmacaMuzikAcik = true, asmacaAudioElement = null;

                function asmacaMuzikBaslat() {
                    if (!asmacaMuzikAcik) return;
                    if (!asmacaAudioElement) {
                        asmacaAudioElement = new Audio('ozgun/tema-3.mp3');
                        asmacaAudioElement.loop = true;
                        asmacaAudioElement.volume = 0.10;
                    }
                    asmacaAudioElement.play().catch(() => {});
                }
                function asmacaMuzikDurdur() { if (asmacaAudioElement) { asmacaAudioElement.pause(); asmacaAudioElement.currentTime = 0; } }
                function asmacaMuzikToggle() {
                    asmacaMuzikAcik = !asmacaMuzikAcik;
                    let btn = document.getElementById('asmacaMuzikBtn');
                    if (asmacaMuzikAcik) { btn.innerText = "🔊 Müzik: Açık"; asmacaMuzikBaslat(); }
                    else { btn.innerText = "🔇 Müzik: Kapalı"; asmacaMuzikDurdur(); }
                }
                function asmacaCanGoster() { document.getElementById('asmacaCanInfo').innerText = "❤️".repeat(Math.max(0, asmacaCan)) + "🖤".repeat(5 - Math.max(0, asmacaCan)); }

                function asmacaHangmanSVG(yanlis) {
                    let parcalar = [
                        '<line x1="10" y1="95" x2="75" y2="95" stroke="#78350f" stroke-width="4" stroke-linecap="round"/><line x1="30" y1="95" x2="30" y2="8" stroke="#78350f" stroke-width="4" stroke-linecap="round"/><line x1="30" y1="8" x2="65" y2="8" stroke="#78350f" stroke-width="4" stroke-linecap="round"/><line x1="65" y1="8" x2="65" y2="20" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>',
                        '<circle cx="65" cy="32" r="11" stroke="#dc2626" stroke-width="3.5" fill="#fff"/>',
                        '<line x1="65" y1="43" x2="65" y2="68" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round"/>',
                        '<line x1="65" y1="50" x2="50" y2="60" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round"/>',
                        '<line x1="65" y1="50" x2="80" y2="60" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round"/>',
                        '<line x1="65" y1="68" x2="53" y2="85" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round"/>',
                        '<line x1="65" y1="68" x2="77" y2="85" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round"/>'
                    ];
                    let gosterilecek = parcalar.slice(0, 1 + Math.min(yanlis, 6));
                    return `<svg class="as-hangman-svg" width="110" height="105" viewBox="0 0 100 100">${gosterilecek.join('')}</svg>`;
                }

                function asmacaOyunAc() {
                    if (genelOyunGirisEngelliMi()) return;
                    let modalEl = document.getElementById('asmacaOyunOverlay');
                    document.body.appendChild(modalEl);
                    modalEl.style.display = 'flex';
                    asmacaMuzikBaslat();
                    document.getElementById('asmacaGirisEkrani').style.display = 'block';
                    document.getElementById('asmacaOyunEkrani').style.display = 'none';
                    document.getElementById('asmacaBitisEkrani').style.display = 'none';
                    let isimInput = document.getElementById('asmacaIsimInput');
                    if (siniftaOynananOgrenci) { isimInput.value = siniftaOynananOgrenci; isimInput.disabled = true; }
                    else if (aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== "teacher") { isimInput.value = aktifOgrenciAdi; isimInput.disabled = false; }
                    else { isimInput.value = ""; isimInput.disabled = false; }
                    sinifGridKisitlamaUygula('asmacaSinifGrid', function(s){ asmacaAktifSinif = s; }, function(s){ genericSinifGuncelle(s, 'asmacaUniteBox', function(u){ asmacaSecilenUniteler = u; }); });
                }
                function asmacaSinifSec(sinif, btn) {
                    asmacaAktifSinif = sinif;
                    document.getElementById('asmacaSinifGrid').querySelectorAll('.sinif-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    genericSinifGuncelle(sinif, 'asmacaUniteBox', function(u){ asmacaSecilenUniteler = u; });
                }
          function asmacaOyunKapat() { if (liderlikKilitliMiKontrolEt('asmaca', 'asmacaBitisEkrani')) return; document.getElementById('asmacaOyunOverlay').style.display = 'none'; asmacaMuzikDurdur(); }

               function asmacaOyunuBaslat() {
            if (genelOyunGirisEngelliMi()) return;
            let isim = document.getElementById('asmacaIsimInput').value.trim();
            if (!isim) { alert("Lütfen adınızı giriniz!"); return; }
            let havuz = oyunHavuzGetir(asmacaAktifSinif, asmacaSecilenUniteler).filter(k => (k.ingilizce||k.en||'').replace(/[^a-zA-Z]/g,'').length >= 3); if (havuz.length < 3) { alert("Yeterli kelime bulunamadı, farklı ünite seçin."); return; }
                    asmacaKelimeler = OC.kelimeSec('asmaca', havuz, OC.SORU); OC.basla('asmaca');
                               asmacaAktifIndex = 0; asmacaPuan = 0; asmacaCan = 5; asmacaKombo = 0;
                           asmacaDogruSayi = 0; asmacaYanlisSayi = 0; asmacaBaslangic = Date.now();
                        genelEnerjiHarca(-3);
            document.getElementById('asmacaGirisEkrani').style.display = 'none';
            document.getElementById('asmacaOyunEkrani').style.display = 'block';
                       jokerTuruBaslat('asmaca', 'asmacaOyunEkrani');
            asmacaMuzikBaslat();
            asmacaSonrakiKelime();
        }
                function asmacaSonrakiKelime() {
                    if (asmacaAktifIndex >= asmacaKelimeler.length) { asmacaOyunuBitir(); return; }
                    let k = asmacaKelimeler[asmacaAktifIndex];
                    asmacaAktifKelime = (k.ingilizce || k.en || '').toUpperCase();
                    asmacaTahminEdilenHarfler = [];
                    asmacaYanlisSayisi = 0;
                    asmacaKelimeBaslangicZamani = Date.now();
                    document.getElementById('asmacaKelimeInfo').innerText = `Kelime: ${asmacaAktifIndex+1}/${asmacaKelimeler.length}`;
                    document.getElementById('asmacaPuanInfo').innerText = `Puan: ${asmacaPuan}`;
                    asmacaCanGoster();
                    document.getElementById('asmacaIpucu').innerText = "İpucu: " + (k.turkce || k.tr || '');
                    document.getElementById('asmacaSahne').innerHTML = asmacaHangmanSVG(0);
                    asmacaBlanklariCiz();
                    asmacaKlavyeCiz();
                }
                function asmacaBlanklariCiz() {
                    let alan = document.getElementById('asmacaBlanklar');
                    alan.innerHTML = "";
                    for (let ch of asmacaAktifKelime) {
                        let harfMi = /[A-Z]/.test(ch);
                        let span = document.createElement('span');
                        span.className = 'as-blank-v2' + (harfMi ? '' : ' sabit');
                        span.innerText = (!harfMi || asmacaTahminEdilenHarfler.includes(ch)) ? ch : '_';
                        alan.appendChild(span);
                    }
                }
                function asmacaKlavyeCiz() {
                    let alan = document.getElementById('asmacaKlavye');
                    alan.innerHTML = "";
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').forEach(ch => {
                        let btn = document.createElement('button');
                        btn.className = 'as-harf-btn';
                        btn.innerText = ch;
                        btn.onclick = function() { asmacaHarfSec(ch, btn); };
                        alan.appendChild(btn);
                    });
                }
                function asmacaHarfSec(harf, btn) {
                    window.dmVerifiedGames?.record(asmacaKelimeler[asmacaAktifIndex],{letter:harf});
                    btn.classList.add('kullanildi');
                    if (asmacaAktifKelime.includes(harf)) {
                        asmacaTahminEdilenHarfler.push(harf);
                        asmacaBlanklariCiz();
                        let sadeceHarfler = asmacaAktifKelime.split('').filter(ch => /[A-Z]/.test(ch));
                        let tamamMi = sadeceHarfler.every(ch => asmacaTahminEdilenHarfler.includes(ch));
                               if (tamamMi) {
                    let gecenSaniye = Math.floor((Date.now() - asmacaKelimeBaslangicZamani) / 1000);
                                window.dmVerifiedGames?.record(asmacaKelimeler[asmacaAktifIndex],asmacaAktifKelime);
                                OC.dogru(asmacaYanlisSayisi <= 2 ? 1 : 0.5); asmacaPuan = OC.puan();
                    if (asmacaYanlisSayisi === 0) asmacaKombo++; else asmacaKombo = 0;
                    asmacaDogruSayi++;
                                         genelSesEfektiCal('dogru');
                    genelKomboGoster(asmacaKombo, document.querySelector('#asmacaOyunOverlay .game-modal-content'));
                    document.getElementById('asmacaPuanInfo').innerText = `Puan: ${asmacaPuan}`;
                    setTimeout(() => { asmacaAktifIndex++; asmacaSonrakiKelime(); }, 900);
                }
                } else {
                genelSesEfektiCal('yanlis');
                asmacaYanlisSayisi++;
                document.getElementById('asmacaSahne').innerHTML = asmacaHangmanSVG(asmacaYanlisSayisi);
                if (asmacaYanlisSayisi >= 6) {
                    asmacaKombo = 0;
                    document.getElementById('asmacaIpucu').innerText = "Doğrusu: " + asmacaAktifKelime;
                    window.dmVerifiedGames?.record(asmacaKelimeler[asmacaAktifIndex],null);
                    asmacaCan = Math.max(0, asmacaCan - 1); asmacaYanlisSayi++; OC.yanlis(false);
                            asmacaCanGoster();
                            asmacaPuan = OC.puan();
                            document.getElementById('asmacaPuanInfo').innerText = `Puan: ${asmacaPuan}`;
                            setTimeout(() => { asmacaAktifIndex++; asmacaSonrakiKelime(); }, 1400);
                        }
                    }
                }
                async function asmacaOyunuBitir() {
                    asmacaMuzikDurdur();
                    document.getElementById('asmacaOyunEkrani').style.display = 'none';
                    document.getElementById('asmacaBitisEkrani').style.display = 'block';
                    let isim = document.getElementById('asmacaIsimInput').value.trim();
                    let sinifStr = asmacaAktifSinif + ". Sınıf";
                    document.getElementById('asResIsim').innerText = isim;
                    document.getElementById('asResPuan').innerText = asmacaPuan + " Puan";
                                    genelSonucEkraniGoster({ oyunAdi:'🔤 Harf Avı', isim:isim, puan:asmacaPuan, dogru:asmacaDogruSayi, yanlis:asmacaYanlisSayi, sureSaniye:Math.round((Date.now() - asmacaBaslangic) / 1000), oyunKey:'asmaca', devamFn:asmacaOyunKapat, tekrarFn:asmacaOyunAc });
                    try {
                        await fetch(apiURL, { method:"POST", body: JSON.stringify({ islem:"asmacaLiderlikKaydet", tarih:new Date().toISOString().split('T')[0], isim:isim, sinif:sinifStr, detay:asmacaAktifIndex+" kelime tamamlandı", sure:"", suresaniye:0, puan:asmacaPuan }) });
                    } catch(e) {}
                                liderlikKilitBaslat('asmaca');
                    oyunLiderlikGoster('asmacaLiderlikTumunuGetir', sinifStr, isim, 'asGecmisSkorlarListesi', 'Harf Avı', 'asmaca');
                }

                // ============ 4) KELİME BUL (5 CAN + SÜRE/YANLIŞ CEZALI - KELİME TAHMİNİ) ============
                       let kelimebulAktifSinif = 1, kelimebulSecilenUniteler = [1];
                let kelimebulKelimeler = [], kelimebulAktifIndex = 0, kelimebulHedef = "", kelimebulDenemeSayisi = 0, kelimebulPuan = 0, kelimebulSatirlarArr = [], kelimebulCan = 5, kelimebulKelimeBaslangicZamani = 0;

                            let kelimebulKombo = 0, kelimebulDogruSayi = 0, kelimebulYanlisSayi = 0, kelimebulBaslangic = 0;
                let kelimebulMuzikAcik = true, kelimebulAudioElement = null;

                function kelimebulMuzikBaslat() {
                    if (!kelimebulMuzikAcik) return;
                    if (!kelimebulAudioElement) {
                        kelimebulAudioElement = new Audio('ozgun/tema-1.mp3');
                        kelimebulAudioElement.loop = true;
                        kelimebulAudioElement.volume = 0.10;
                    }
                    kelimebulAudioElement.play().catch(() => {});
                }
                function kelimebulMuzikDurdur() { if (kelimebulAudioElement) { kelimebulAudioElement.pause(); kelimebulAudioElement.currentTime = 0; } }
                function kelimebulMuzikToggle() {
                    kelimebulMuzikAcik = !kelimebulMuzikAcik;
                    let btn = document.getElementById('kelimebulMuzikBtn');
                    if (kelimebulMuzikAcik) { btn.innerText = "🔊 Müzik: Açık"; kelimebulMuzikBaslat(); }
                    else { btn.innerText = "🔇 Müzik: Kapalı"; kelimebulMuzikDurdur(); }
                }
                function kelimebulCanGoster() { document.getElementById('kbCanInfo').innerText = "❤️".repeat(Math.max(0, kelimebulCan)) + "🖤".repeat(5 - Math.max(0, kelimebulCan)); }

               function kelimebulOyunAc() {
                    if (genelOyunGirisEngelliMi()) return;
                    let modalEl = document.getElementById('kelimebulOyunOverlay');
                    document.body.appendChild(modalEl);
                    modalEl.style.display = 'flex';
                    kelimebulMuzikBaslat();
                    document.getElementById('kelimebulGirisEkrani').style.display = 'block';
                    document.getElementById('kelimebulOyunEkrani').style.display = 'none';
                    document.getElementById('kelimebulBitisEkrani').style.display = 'none';
                    let isimInput = document.getElementById('kelimebulIsimInput');
                    if (siniftaOynananOgrenci) { isimInput.value = siniftaOynananOgrenci; isimInput.disabled = true; }
                    else if (aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== "teacher") { isimInput.value = aktifOgrenciAdi; isimInput.disabled = false; }
                    else { isimInput.value = ""; isimInput.disabled = false; }
                    sinifGridKisitlamaUygula('kelimebulSinifGrid', function(s){ kelimebulAktifSinif = s; }, function(s){ genericSinifGuncelle(s, 'kelimebulUniteBox', function(u){ kelimebulSecilenUniteler = u; }); });
                }
                function kelimebulSinifSec(sinif, btn) {
                    kelimebulAktifSinif = sinif;
                    document.getElementById('kelimebulSinifGrid').querySelectorAll('.sinif-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    genericSinifGuncelle(sinif, 'kelimebulUniteBox', function(u){ kelimebulSecilenUniteler = u; });
                }
               function kelimebulOyunKapat() { if (liderlikKilitliMiKontrolEt('kelimebul', 'kelimebulBitisEkrani')) return; document.getElementById('kelimebulOyunOverlay').style.display = 'none'; kelimebulMuzikDurdur(); }

               function kelimebulOyunuBaslat() {
            if (genelOyunGirisEngelliMi()) return;
            let isim = document.getElementById('kelimebulIsimInput').value.trim();
            if (!isim) { alert("Lütfen adınızı giriniz!"); return; }
            let havuz = oyunHavuzGetir(kelimebulAktifSinif, kelimebulSecilenUniteler).filter(k => {
                        let en = (k.ingilizce || k.en || '').trim();
                        return /^[a-zA-Z]{3,9}$/.test(en);
                    });
                    if (havuz.length < 2) { alert("Yeterli kelime bulunamadı, farklı ünite seçin."); return; }
                    kelimebulKelimeler = OC.kelimeSec('kelimebul', havuz, OC.SORU); OC.basla('kelimebul');
                              kelimebulAktifIndex = 0; kelimebulPuan = 0; kelimebulCan = 5; kelimebulKombo = 0;
                           kelimebulDogruSayi = 0; kelimebulYanlisSayi = 0; kelimebulBaslangic = Date.now();
                        genelEnerjiHarca(-3);
            document.getElementById('kelimebulGirisEkrani').style.display = 'none';
            document.getElementById('kelimebulOyunEkrani').style.display = 'block';
                       jokerTuruBaslat('kelimebul', 'kelimebulOyunEkrani');
            kelimebulMuzikBaslat();
            kelimebulSonrakiKelime();
        }
                function kelimebulSonrakiKelime() {
                    if (kelimebulAktifIndex >= kelimebulKelimeler.length) { kelimebulOyunuBitir(); return; }
                    let k = kelimebulKelimeler[kelimebulAktifIndex];
                    kelimebulHedef = (k.ingilizce || k.en || '').toUpperCase();
                    kelimebulDenemeSayisi = 0;
                    kelimebulSatirlarArr = [];
                    kelimebulKelimeBaslangicZamani = Date.now();
                    document.getElementById('kbKelimeInfo').innerText = `Kelime: ${kelimebulAktifIndex+1}/${kelimebulKelimeler.length}`;
                    document.getElementById('kbPuanInfo').innerText = `Puan: ${kelimebulPuan}`;
                    kelimebulCanGoster();
                    document.getElementById('kbIpucu').className = 'kb-ipucu-kutu';
                    document.getElementById('kbIpucu').innerHTML = `💡 <b>${guvenliMetin(k.turkce || k.tr || '')}</b> &nbsp;·&nbsp; ${kelimebulHedef.length} harfli kelime`;
                    document.getElementById('kbTahminInput').value = "";
                    document.getElementById('kbTahminInput').maxLength = kelimebulHedef.length;
                    document.getElementById('kbSatirlar').innerHTML = "";
                }
                function kelimebulTahminGonder() {
                    let tahmin = document.getElementById('kbTahminInput').value.trim().toUpperCase();
                    if (tahmin.length !== kelimebulHedef.length) { alert(`Lütfen ${kelimebulHedef.length} harfli bir kelime gir.`); return; }
                    window.dmVerifiedGames?.record(kelimebulKelimeler[kelimebulAktifIndex],tahmin);
                    kelimebulDenemeSayisi++;

                    let satir = document.createElement('div');
                    satir.className = 'kb-row-v2';
                    let hedefHarfleri = kelimebulHedef.split('');
                    let kullanilan = new Array(hedefHarfleri.length).fill(false);
                    let renkler = new Array(tahmin.length).fill('gri');

                    for (let i = 0; i < tahmin.length; i++) {
                        if (tahmin[i] === hedefHarfleri[i]) { renkler[i] = 'yesil'; kullanilan[i] = true; }
                    }
                    for (let i = 0; i < tahmin.length; i++) {
                        if (renkler[i] === 'yesil') continue;
                        let idx = hedefHarfleri.findIndex((ch, j) => ch === tahmin[i] && !kullanilan[j]);
                        if (idx !== -1) { renkler[i] = 'sari'; kullanilan[idx] = true; }
                    }
                    tahmin.split('').forEach((ch, i) => {
                        let box = document.createElement('div');
                        box.className = 'kb-box-v2 ' + renkler[i];
                        box.innerText = ch;
                        satir.appendChild(box);
                    });
                    document.getElementById('kbSatirlar').appendChild(satir);
                    document.getElementById('kbTahminInput').value = "";

                              if (tahmin === kelimebulHedef) {
                        let gecenSaniye = Math.floor((Date.now() - kelimebulKelimeBaslangicZamani) / 1000);
                                        OC.dogru(kelimebulDenemeSayisi <= 3 ? 1 : 0.5); let puanKazanc = 0;
                        kelimebulKombo++;
                                                      kelimebulDogruSayi++;
                        kelimebulPuan = OC.puan();
                                                      genelSesEfektiCal('dogru');
                        genelKomboGoster(kelimebulKombo, document.querySelector('#kelimebulOyunOverlay .game-modal-content'));
                        document.getElementById('kbPuanInfo').innerText = `Puan: ${kelimebulPuan}`;
                        setTimeout(() => { kelimebulAktifIndex++; kelimebulSonrakiKelime(); }, 1200);
                               } else if (kelimebulDenemeSayisi >= 6) {
                        genelSesEfektiCal('yanlis');
                        kelimebulKombo = 0;
                        document.getElementById('kbIpucu').innerHTML = "❌ Doğrusu: <b>" + kelimebulHedef + "</b>";
                        kelimebulCan = Math.max(0, kelimebulCan - 1); OC.yanlis(false);
                                                      kelimebulYanlisSayi++;
                        kelimebulCanGoster();
                        kelimebulPuan = OC.puan();
                        document.getElementById('kbPuanInfo').innerText = `Puan: ${kelimebulPuan}`;
                        setTimeout(() => { kelimebulAktifIndex++; kelimebulSonrakiKelime(); }, 1600);
                    }
                }
                async function kelimebulOyunuBitir() {
                    kelimebulMuzikDurdur();
                    document.getElementById('kelimebulOyunEkrani').style.display = 'none';
                    document.getElementById('kelimebulBitisEkrani').style.display = 'block';
                    let isim = document.getElementById('kelimebulIsimInput').value.trim();
                    let sinifStr = kelimebulAktifSinif + ". Sınıf";
                    document.getElementById('kbResIsim').innerText = isim;
                    document.getElementById('kbResPuan').innerText = kelimebulPuan + " Puan";
                                    genelSonucEkraniGoster({ oyunAdi:'🔐 Şifre Kırıcı', isim:isim, puan:kelimebulPuan, dogru:kelimebulDogruSayi, yanlis:kelimebulYanlisSayi, sureSaniye:Math.round((Date.now() - kelimebulBaslangic) / 1000), oyunKey:'kelimebul', devamFn:kelimebulOyunKapat, tekrarFn:kelimebulOyunAc });
                    try {
                        await fetch(apiURL, { method:"POST", body: JSON.stringify({ islem:"kelimebulLiderlikKaydet", tarih:new Date().toISOString().split('T')[0], isim:isim, sinif:sinifStr, detay:kelimebulAktifIndex+" kelime tamamlandı", sure:"", suresaniye:0, puan:kelimebulPuan }) });
                    } catch(e) {}
                                liderlikKilitBaslat('kelimebul');
                    oyunLiderlikGoster('kelimebulLiderlikTumunuGetir', sinifStr, isim, 'kbGecmisSkorlarListesi', 'Şifre Kırıcı', 'kelimebul');
                }

                        // ===== ORTAK: Liderlik bonusu (tüm oyunlar için) =====
                function liderlikBonusUygula(liste, isim, oyunAdi) {
                    if (!liste || liste.length === 0) return;
                    let sira = liste.findIndex(item => String(item.isim).toLowerCase() === isim.toLowerCase());
                    if (sira === -1) return;
                    let bonus = 0;
                    if (sira < 3) bonus = 1.5;
                    else if (sira < 8) bonus = 1;
                    else if (sira < 15) bonus = 0.5;
                    if (bonus <= 0) return;
                    let bugunStr = new Date().toISOString().split('T')[0];
                    fetch(apiURL, {
                        method: "POST",
                        body: JSON.stringify({ islem: "hizliPuanEkle", ogrenci: isim, puan: bonus, sebep: "Liderlik Bonusu (" + oyunAdi + ") - Sınıfta " + (sira + 1) + ". sıra", tekBonusAnahtari: oyunAdi + "_" + bugunStr })
                    })
                    .then(res => res.json())
                    .then(data => { if (data.status === "success" && data.verildiMi) liderlikBonusToastGoster(bonus, sira + 1); })
                    .catch(() => {});
                }
                function liderlikBonusToastGoster(bonus, sira) {
                    let toast = document.createElement('div');
                    toast.style.cssText = "position:fixed; top:16px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg,#fbbf24,#f59e0b); color:#78350f; padding:12px 22px; border-radius:14px; font-weight:900; font-size:13px; box-shadow:0 8px 24px rgba(245,158,11,.4); z-index:100000002; font-family:system-ui,-apple-system,BlinkMacSystemFont,Arial,sans-serif; text-align:center;";
                    toast.innerText = `🥇 Sınıfında ${sira}. sıraya girdin! +${bonus} bonus puan!`;
                    toast.className = 'dm-leader-bonus';
                    const mascot = document.createElement('img');
                    mascot.src = 'papi-reward-v2.png'; mascot.alt = 'Başarını kutlayan papağan';
                    mascot.width = 60; mascot.height = 72;
                    toast.prepend(mascot);
                    document.body.appendChild(toast);
                    (window.dmPapiNotices?.later||((el,fn,ms)=>setTimeout(fn,ms)))(toast,() => { toast.style.transition = 'opacity .4s'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 4000);
                }

                        // ===== PUAN BİLDİRİM SİSTEMİ =====
                let pbBildirimKuyrugu = [];
                let pbGosteriliyorMu = false;

                function pbEkranMesgulMu() {
                    let mesgulSiniflar = ['.gso-overlay', '.game-modal-overlay', '.rubric-modal', '.seviye-harita-overlay', '.pomodoro-overlay', '.kart-oyun-overlay', '.duy3-overlay', '.yardim-modal-overlay'];
                    for (let sinif of mesgulSiniflar) {
                        let eller = document.querySelectorAll(sinif);
                        for (let el of eller) {
                            if (window.getComputedStyle(el).display !== 'none') return true;
                        }
                    }
                    return false;
                }

                function puanBildirimKontrolEt() {
                    if (!aktifOgrenciAdi || aktifOgrenciAdi.toLowerCase() === "teacher") return;
                    fetch(`${apiURL}?islem=yeniPuanBildirimleriGetir&ogrenci=${encodeURIComponent(aktifOgrenciAdi)}`)
                    .then(res => res.json())
                    .then(liste => {
                        if (liste && liste.length > 0) {
                            liste.forEach(item => { if (Number(item.degisim) !== 0) pbBildirimKuyrugu.push(item); });
                            pbSiradakiniGoster();
                        }
                    })
                    .catch(() => {});
                }

                       function pbSiradakiniGoster() {
                    if (pbGosteriliyorMu || pbBildirimKuyrugu.length === 0) return;
                    if (pbEkranMesgulMu()) return; // Öğrenci bir oyun/panel içindeyken bekle, arka planda dinlemeye devam et
                    pbGosteriliyorMu = true;
                    let item = pbBildirimKuyrugu.shift();
                    let degisim = Number(item.degisim);
                    let pozitifMi = degisim > 0;

                    let overlay = document.getElementById('pbToastOverlay');
                    let card = document.getElementById('pbToastCard');
                    let ok = document.getElementById('pbToastOk');
                    let baslik = document.getElementById('pbToastBaslik');
                    let sebep = document.getElementById('pbToastSebep');
                    let puanEl = document.getElementById('pbToastPuan');

                    card.className = 'pb-toast-card ' + (pozitifMi ? 'pozitif' : 'negatif');
                    ok.className = 'pb-toast-ok ' + (pozitifMi ? 'yukari' : 'asagi');
                    ok.innerText = pozitifMi ? '▲' : '▼';
                    baslik.innerText = pozitifMi ? 'Harika iş çıkardın!' : 'Küçük bir hatırlatma';
                    sebep.innerText = (item.sebep || 'Genel değerlendirme') + (pozitifMi ? ' için tebrikler! 🎉' : ' nedeniyle. Sorun değil, bir dahaki sefere telafi edersin! 💪');
                    puanEl.innerText = (pozitifMi ? '+' : '') + degisim + ' puan';

                    overlay.classList.add('show');

                    let kapatTimeoutId = setTimeout(() => { pbToastKapat(); }, 6000);
                    overlay.dataset.timeoutId = kapatTimeoutId;
                }

                       function pbToastKapat() {
                    let overlay = document.getElementById('pbToastOverlay');
                    if (overlay.dataset.timeoutId) clearTimeout(Number(overlay.dataset.timeoutId));
                    overlay.classList.remove('show');
                    setTimeout(() => {
                        pbGosteriliyorMu = false;
                        pbSiradakiniGoster();
                    }, 450);
                }

                // Bir oyun/panel açıkken bekleyen bildirim varsa, kapatılır kapatılmaz otomatik göster
                setInterval(() => {
                    if (!pbGosteriliyorMu && pbBildirimKuyrugu.length > 0 && !pbEkranMesgulMu()) {
                        pbSiradakiniGoster();
                    }
                }, 1500);

                        // ===== LİDERLİK TABLOSU KİLİDİ (30 saniye, otomatik yeniden deneme) =====
                let liderlikKilitAktif = {};
                function liderlikKilitBaslat(oyunKey) {
                    liderlikKilitAktif[oyunKey] = true;
                    setTimeout(() => { liderlikKilitAktif[oyunKey] = false; }, 30000);
                }
                function liderlikKilitBitir(oyunKey) {
                    liderlikKilitAktif[oyunKey] = false;
                }
                function liderlikKilitliUyariGoster() {
                    alert("Liderlik tablosu henüz yükleniyor, lütfen birkaç saniye bekle (en fazla 30 saniye).");
                }

                               let liderlikKapatDenemeSayaci = {};
                function liderlikKilitliMiKontrolEt(oyunKey, bitisEkraniId) {
                    // Ranking requests may continue in the background; exits never wait for them.
                    liderlikKapatDenemeSayaci[oyunKey] = 0;
                    return false;
                }

                function ogrenciMaskotSec(isim) {
            const maskotlar = ['🦉', '🦊', '🐰', '🐼', '🐻', '🐨', '🐱', '🐶', '🦁', '🐯', '🐹', '🐸'];
            let toplam = 0;
            for (let i = 0; i < isim.length; i++) toplam += isim.charCodeAt(i);
            return maskotlar[toplam % maskotlar.length];

        }

            function girisSerisiGuncelleVeGetir() {
            let bugun = new Date();
            let bugunStr = bugun.getFullYear() + '-' + String(bugun.getMonth()+1).padStart(2,'0') + '-' + String(bugun.getDate()).padStart(2,'0');
            const owner=String(aktifOgrenciAdi||'').trim().toLowerCase();
            if(!owner||owner==='teacher')return;
            const dateKey='dm_login_day:'+owner,countKey='dm_login_streak:'+owner;
            let sonGirisTarihi=localStorage.getItem(dateKey);
            let mevcutSeri=parseInt(localStorage.getItem(countKey)||'0')||0;

            if (sonGirisTarihi !== bugunStr) {
                let dun = new Date(bugun);
                dun.setDate(dun.getDate() - 1);
                let dunStr = dun.getFullYear() + '-' + String(dun.getMonth()+1).padStart(2,'0') + '-' + String(dun.getDate()).padStart(2,'0');
                mevcutSeri = (sonGirisTarihi === dunStr) ? mevcutSeri + 1 : 1;
                localStorage.setItem(dateKey,bugunStr);localStorage.setItem(countKey,mevcutSeri);
            }
            localStorage.setItem('ing_girisSerisiSonTarih',bugunStr);localStorage.setItem('ing_girisSerisiSayisi',mevcutSeri);
            let el = document.getElementById('headerStreakNum');
            if (el) el.innerText = `🔥 ${mevcutSeri}`;
        }
                        function seviyeSinifSecimKisitlamaUygula() {
                    let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === oyunIcinAktifIsim().toLowerCase());
                    let kendiSinifi = user ? Number(user.Sinif) || 0 : 0;
                    let grid = document.getElementById('seviyeSinifGrid');
                    if (!grid) return;

                    grid.querySelectorAll('.sinif-btn').forEach((btn, idx) => {
                        let sinifNo = idx + 1;
                        let izinli = !kendiSinifi || (sinifNo === kendiSinifi || sinifNo === kendiSinifi - 1);
                        btn.disabled = !izinli;
                        btn.style.opacity = izinli ? '1' : '0.35';
                        btn.style.cursor = izinli ? 'pointer' : 'not-allowed';
                    });
                }

                       function seviyeHaritasiAc() {
                    if (genelOyunGirisEngelliMi()) return;
                    let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === oyunIcinAktifIsim().toLowerCase());
                    if (!user || !user.aktiviteKartlari || user.aktiviteKartlari.length === 0) {
                        alert("Henüz kelime kartı bulunmuyor. Öğretmenin yakında ekleyecek!");
                        return;
                    }

                    document.getElementById('seviyeHaritaOverlay').style.display = 'flex';

                    let kendiSinifi = Number(user.Sinif) || 0;

                    if (user.secilenSinif && user.secilenSinif > 0) {
                        seviyeAktifSinif = user.secilenSinif;
                        document.getElementById('sinifSecimAlani').style.display = 'none';
                        seviyeGosterilenUnite = 1;
                        seviyeHaritasiCiz();
                    } else if (kendiSinifi > 0) {
                        // YENİ: Sınıf bilgisi varsa hiç sormadan direkt kendi sınıfıyla aç
                        seviyeSinifSecildi(kendiSinifi);
                    } else {
                        document.getElementById('sinifSecimAlani').style.display = 'block';
                        document.getElementById('sinifDegistirBtn').style.display = 'none';
                        document.getElementById('seviyeYolAlani').innerHTML = '';
                        document.getElementById('seviyeHaritaUniteAd').innerText = '';
                        seviyeSinifSecimKisitlamaUygula();
                    }
                }

                            function seviyeSinifSecildi(sinif) {
                    let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === oyunIcinAktifIsim().toLowerCase());
                    let kendiSinifi = user ? Number(user.Sinif) || 0 : 0;

                    // YENİ: Öğrenci sadece kendi sınıfını veya bir alt sınıfı seçebilir
                    if (kendiSinifi && sinif !== kendiSinifi && sinif !== kendiSinifi - 1) {
                        alert("Sadece kendi sınıf seviyeni veya bir alt sınıfı seçebilirsin.");
                        return;
                    }

                    seviyeAktifSinif = sinif;
                    seviyeGosterilenUnite = 1;
                    document.getElementById('sinifSecimAlani').style.display = 'none';

                    if (user) user.secilenSinif = sinif;

                    fetch(`${apiURL}?islem=sinifSec&ogrenci=${encodeURIComponent(oyunIcinAktifIsim())}&sinif=${sinif}`).catch(() => {});

                    seviyeHaritasiCiz();
                }
                                       function sinifDegistirmeEkraniniAc() {
                    document.getElementById('seviyeYolAlani').innerHTML = '';
                    document.getElementById('seviyeHaritaUniteAd').innerText = '';
                    document.getElementById('seviyeHaritaUniteEtiket').innerText = '';
                    document.getElementById('sinifSecimAlani').style.display = 'block';
                    seviyeSinifSecimKisitlamaUygula();
                }


                       function seviyeHaritasiCiz() {
                    let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === oyunIcinAktifIsim().toLowerCase());
                    if (!user) return;
                    document.getElementById('sinifDegistirBtn').style.display = 'inline-block';

                    let uniteler = [...new Set(user.aktiviteKartlari.filter(k => k.sinif === seviyeAktifSinif).map(k => k.unite))].sort((a,b) => a-b);

                    document.getElementById('seviyeHaritaUniteEtiket').innerText = `${seviyeAktifSinif}. SINIF`;
                    document.getElementById('seviyeHaritaUniteAd').innerText = `🗺️ Takımadalar`;

                    let genislik = 320;
                    let adaAraligi = 150;
                    let toplamYukseklik = 90 + uniteler.length * adaAraligi;

                    let adaNoktalari = uniteler.map((unite, idx) => {
                        let kartlar = user.aktiviteKartlari.filter(k => k.sinif === seviyeAktifSinif && k.unite === unite);
                        let seviyeler = [...new Set(kartlar.map(k => k.seviye))].sort((a,b) => a-b);
                        let tamamlananSeviyeler = (user.seviyeIlerleme || [])
                            .filter(s => s.sinif === seviyeAktifSinif && s.unite === unite && s.tamamlandi)
                            .map(s => s.seviye);
                        let uniteTamamlandiMi = seviyeler.length > 0 && seviyeler.every(sv => tamamlananSeviyeler.includes(sv));

                        let x = 70 + (idx % 2 === 0 ? 0 : 140) + (idx % 4 >= 2 ? 30 : 0);
                        let y = toplamYukseklik - 80 - idx * adaAraligi;

                        return { unite, seviyeler, tamamlananSeviyeler, uniteTamamlandiMi, x, y };
                    });

                    let ilkKilitliBulundu = false;
                    adaNoktalari.forEach(ada => {
                        if (ada.uniteTamamlandiMi) {
                            ada.kilitli = false;
                            ada.durum = 'tamamlandi';
                        } else if (!ilkKilitliBulundu) {
                            ada.kilitli = false;
                            ada.durum = 'aktif';
                            ilkKilitliBulundu = true;
                        } else {
                            ada.kilitli = true;
                            ada.durum = 'kilitli';
                        }
                    });

                    let yolStr = adaNoktalari.map((n, i) => (i === 0 ? `M ${n.x} ${n.y}` : `Q ${(n.x + adaNoktalari[i-1].x)/2 + 25} ${(n.y + adaNoktalari[i-1].y)/2} ${n.x} ${n.y}`)).join(' ');

                    let svgIcerik = `<path d="${yolStr}" stroke="#f8fafc" stroke-width="3" fill="none" stroke-dasharray="6 8" opacity="0.8"/>`;

                    adaNoktalari.forEach((n, i) => {
                        if (i > 0) {
                            let onceki = adaNoktalari[i-1];
                            let midX = (onceki.x + n.x) / 2 + 20;
                            let midY = (onceki.y + n.y) / 2;
                            svgIcerik += `<text x="${midX}" y="${midY}" font-size="18">⛵</text>`;
                        }

                        let renk = n.durum === 'tamamlandi' ? '#22c55e' : (n.durum === 'kilitli' ? '#e2e8f0' : '#f59e0b');
                        let icerik = n.durum === 'tamamlandi' ? '✓' : (n.durum === 'kilitli' ? '🔒' : '★');
                        let boyut = n.durum === 'aktif' ? 34 : 30;
                        let pulsAnim = n.durum === 'aktif' ? `<animate attributeName="r" values="${boyut};${boyut+4};${boyut}" dur="1.6s" repeatCount="indefinite"/>` : '';
                        let yesilRenk = n.durum === 'kilitli' ? '#94a3b8' : '#4ade80';

                        svgIcerik += `
                            <g class="seviye-daire-svg" data-unite="${n.unite}" data-kilitli="${n.kilitli}" transform="translate(${n.x},${n.y})">
                                <ellipse cx="0" cy="${boyut}" rx="${boyut + 20}" ry="18" fill="${yesilRenk}"/>
                                <circle r="${boyut}" fill="${renk}" stroke="#ffffff" stroke-width="4">${pulsAnim}</circle>
                                <text x="0" y="8" text-anchor="middle" font-size="${boyut - 8}" fill="#ffffff">${icerik}</text>
                            </g>
                            <text x="${n.x}" y="${n.y + boyut + 32}" text-anchor="middle" font-size="11" font-weight="800" fill="#f8fafc">Ada ${n.unite}</text>
                            <text x="${n.x}" y="${n.y + boyut + 46}" text-anchor="middle" font-size="9" font-weight="700" fill="#e0f2fe">${n.tamamlananSeviyeler.length}/${n.seviyeler.length} seviye</text>
                        `;
                    });

                    document.getElementById('seviyeYolAlani').innerHTML = `
                        <svg class="ada-svg-alani" viewBox="0 0 ${genislik} ${toplamYukseklik}">
                            ${svgIcerik}
                        </svg>
                    `;

                    document.querySelectorAll('.seviye-daire-svg').forEach(el => {
                        let unite = Number(el.getAttribute('data-unite'));
                        let kilitli = el.getAttribute('data-kilitli') === 'true';
                        if (kilitli) {
                            el.onclick = function () {
                                alert('🔒 Bu adayı açmak için önceki adadaki tüm seviyeleri tamamlamalısın!');
                            };
                        } else {
                            el.onclick = function () { seviyeGosterilenUnite = unite; adaSeviyeDetayiniAc(unite); };
                        }
                    });

                    let toplamAda = uniteler.length;
                    let tamamlananAda = adaNoktalari.filter(a => a.durum === 'tamamlandi').length;
                    document.getElementById('seviyeIlerlemeMetni').innerText = `${tamamlananAda} / ${toplamAda} ada tamamlandı`;

                    let scrollAlani = document.getElementById('seviyeYolAlani');
                    setTimeout(() => { scrollAlani.scrollTop = scrollAlani.scrollHeight; }, 50);
                }

                                        function adaSeviyeDetayiniAc(unite) {
                    let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === oyunIcinAktifIsim().toLowerCase());
                    if (!user) return;

                    let kartlar = user.aktiviteKartlari.filter(k => k.sinif === seviyeAktifSinif && k.unite === unite);
                    let seviyeler = [...new Set(kartlar.map(k => k.seviye))].sort((a,b) => a-b);
                    let tamamlananSeviyeler = (user.seviyeIlerleme || [])
                        .filter(s => s.sinif === seviyeAktifSinif && s.unite === unite && s.tamamlandi)
                        .map(s => s.seviye);

                    let ilkKilitliBulundu = false;
                    let secenekler = seviyeler.map(sv => {
                        let tamamlandi = tamamlananSeviyeler.includes(sv);
                        let kilitli = false;
                        if (!tamamlandi) {
                            if (ilkKilitliBulundu) kilitli = true;
                            else ilkKilitliBulundu = true;
                        }
                        return { sv, tamamlandi, kilitli };
                    });

                    let acikOlanlar = secenekler.filter(s => !s.kilitli);

                                if (acikOlanlar.length === 1) {
                        seviyeDisLinkAc(seviyeAktifSinif, unite, acikOlanlar[0].sv);
                        return;
                    }

                    seviyeSecimEkraniniGoster(unite, secenekler);
                }

                function seviyeSecimEkraniniGoster(unite, secenekler) {
                    let mevcutModal = document.getElementById('seviyeSecimModal');
                    if (mevcutModal) mevcutModal.remove();

                    let modal = document.createElement('div');
                    modal.id = 'seviyeSecimModal';
                    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:1000000; padding:16px;";

                    let kutu = document.createElement('div');
                    kutu.style.cssText = "background:#ffffff; border-radius:14px; padding:18px; width:100%; max-width:320px; max-height:80vh; overflow-y:auto;";

                    let baslik = document.createElement('div');
                    baslik.style.cssText = "font-weight:900; font-size:14px; color:#0c4a6e; margin-bottom:12px; text-align:center;";
                    baslik.innerText = `🏝️ Ada ${unite} · Seviye Seç`;
                    kutu.appendChild(baslik);

                    secenekler.forEach(s => {
                        let satir = document.createElement('button');
                        let renk = s.tamamlandi ? '#22c55e' : (s.kilitli ? '#e2e8f0' : '#f59e0b');
                        let yaziRenk = s.kilitli ? '#94a3b8' : '#ffffff';
                        let etiket = s.tamamlandi ? `Seviye ${s.sv}  ✓  (tekrar bak)` : (s.kilitli ? `Seviye ${s.sv}  🔒` : `Seviye ${s.sv}  ★  (devam et)`);
                        satir.innerText = etiket;
                        satir.style.cssText = `width:100%; text-align:left; background:${renk}; color:${yaziRenk}; border:none; border-radius:10px; padding:12px 14px; font-weight:700; font-size:12.5px; margin-bottom:8px; cursor:${s.kilitli ? 'not-allowed' : 'pointer'};`;
                        if (!s.kilitli) {
                                            satir.onclick = function () {
                                modal.remove();
                                seviyeDisLinkAc(seviyeAktifSinif, unite, s.sv);
                            };
                        }
                        kutu.appendChild(satir);
                    });

                    let kapatBtn = document.createElement('button');
                    kapatBtn.innerText = "Kapat";
                    kapatBtn.style.cssText = "width:100%; background:#f1f5f9; color:#64748b; border:none; border-radius:10px; padding:10px; font-weight:700; font-size:12.5px; margin-top:4px; cursor:pointer;";
                    kapatBtn.onclick = function () { modal.remove(); };
                    kutu.appendChild(kapatBtn);

                    modal.appendChild(kutu);
                    document.body.appendChild(modal);
                }


                        // ===== GENEL SÜRE KİLİDİ (Video + Etkinlik Dış Link için) =====
                let genelKilitAcilisZamani = 0;
                const GENEL_MIN_SANIYE = 60;
                let genelKilitKapatCallback = null;

                function genelSureKilitBaslat() { genelKilitAcilisZamani = Date.now(); }

                function genelSureKontrolEtVeKapat(gercekKapatFn) {
                    let gecen = Math.floor((Date.now() - genelKilitAcilisZamani) / 1000);
                    if (gecen < GENEL_MIN_SANIYE) {
                        let kalan = GENEL_MIN_SANIYE - gecen;
                        document.getElementById('genelSureUyariMetni').innerText = `Bu içerikte en az ${GENEL_MIN_SANIYE} saniye geçirmen gerekiyor. Kalan süre: ${kalan} saniye.`;
                        genelKilitKapatCallback = gercekKapatFn;
                        document.getElementById('genelSureUyariModal').style.display = 'flex';
                        return;
                    }
                    gercekKapatFn();
                }
                function genelSureUyariDevamEt() {
                    document.getElementById('genelSureUyariModal').style.display = 'none';
                    genelKilitKapatCallback = null;
                }
                function genelSureUyariniOnaylaKapat() {
                    document.getElementById('genelSureUyariModal').style.display = 'none';
                    if (genelKilitKapatCallback) genelKilitKapatCallback();
                    genelKilitKapatCallback = null;
                }

                              // ===== KAYBOLAN/YANLIŞ YERE DÜŞEN İÇERİKLERİ KURTAR (kalıcı, genel çözüm) =====
                function govdeKaybolanIcerikleriKurtar() {
                    let panelAlani = document.getElementById('panel-alani');
                    if (!panelAlani) return;
                    // Önce tüm konumları oku, sonra taşı: okuma/yazma iç içe olunca her
                    // öğe için stil yeniden hesaplanıyor ve açılış saniyelerce uzuyordu.
                    let tasinacaklar = Array.from(document.body.children).filter(function(el) {
                        if (el.id === 'login-container' || el.id === 'panel-alani' || el.id === 'oturumYuklemeOverlay') return false;
                        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
                        return window.getComputedStyle(el).position !== 'fixed'; // sabit konumlu modal/pencere ise dokunma
                    });
                    tasinacaklar.forEach(function(el) { panelAlani.appendChild(el); });
                }
                document.addEventListener('DOMContentLoaded', govdeKaybolanIcerikleriKurtar);

                        function gizlilikModaliniAc() { document.getElementById('gizlilikModal').style.display = 'flex'; }
                function kullanimKosullariModaliniAc() { document.getElementById('kullanimKosullariModal').style.display = 'flex'; }

                function guvenliMetin(str) {
                    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
                }

        // ==================== DERS ÇALIŞ SİSTEMİ ====================
        let dcGecmis = ['dcScreenLevels'];
        let dcAktifSeviye = null, dcAktifKategori = null, dcAktifKonu = null;
        let dcTumKonularCache = [];
        let dcSesTercihi = localStorage.getItem('dc_ses_tercihi') || 'us';
                let dcYuklemePromise = null;
        let dcSecilenVoice = null;
        let dcQuizCevaplari = [];
        let dcQuizDogruSayisi = 0;
        let dcAnlatimBaslangicZamani = 0;
        let dcAnlatimOnaylandiMi = false;
        let dcAktifKonuTamamlanmisMi = false;
        let dcAnlatimTimerInterval = null;
        let dcOrnekDinlenenSet = new Set();
        let dcOrnekToplamSayisi = 0;

        const dcKategoriRenkleri = {
            grammar: { accent:'#f59e0b', accentDeep:'#c2760a', label:'Grammar Topics' },
            vocab:   { accent:'#16a34a', accentDeep:'#0d7a3a', label:'Vocabulary Topics' },
            comm:    { accent:'#2563eb', accentDeep:'#1741a6', label:'Communication / Functions' },
            pron:    { accent:'#db2777', accentDeep:'#9d174d', label:'Pronunciation Focus' }
        };

        function dcSesSecimiYap(tip) {
            dcSesTercihi = tip;
            localStorage.setItem('dc_ses_tercihi', tip);
            document.getElementById('dcSesUS').classList.toggle('active', tip === 'us');
            document.getElementById('dcSesUK').classList.toggle('active', tip === 'uk');
            dcVoiceSec();
        }
        function dcVoiceSec() {
            if (!('speechSynthesis' in window)) return;
            let voices = window.speechSynthesis.getVoices();
            let hedefLang = dcSesTercihi === 'uk' ? 'en-GB' : 'en-US';
            dcSecilenVoice = voices.find(v => v.lang === hedefLang) || voices.find(v => v.lang.startsWith('en')) || null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = dcVoiceSec;
            dcVoiceSec();
        }
        function dcSesDurdur() {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        }

        function dcSesOku(text) {
            if (!('speechSynthesis' in window)) return;
            window.speechSynthesis.cancel();
            let u = new SpeechSynthesisUtterance(text);
            u.lang = dcSesTercihi === 'uk' ? 'en-GB' : 'en-US';
            if (dcSecilenVoice) u.voice = dcSecilenVoice;
            u.rate = 0.92;
            window.speechSynthesis.speak(u);
        }

                function dcAnlatimTimerBaslat() {
            if (dcAnlatimTimerInterval) clearInterval(dcAnlatimTimerInterval);
            let btn = document.getElementById('dcOkudumBtn');

            if (dcAktifKonuTamamlanmisMi) {
                dcAnlatimOnaylandiMi = true;
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '✅ Bu konuyu zaten tamamladın';
                    btn.style.background = '#2f855a';
                    btn.style.boxShadow = '0 4px 0 #1c5a3a';
                    btn.style.cursor = 'default';
                }
                return;
            }

            dcAnlatimBaslangicZamani = Date.now();
            dcAnlatimOnaylandiMi = false;
            if (!btn) return;
            btn.disabled = true;
            btn.style.background = '#cbd5e1';
            btn.style.boxShadow = '0 4px 0 #94a3b8';
            btn.style.cursor = 'not-allowed';
            btn.innerHTML = `⏳ En az <span id="dcOkudumSayac">30</span> saniye oku...`;

            dcAnlatimTimerInterval = setInterval(() => {
                let gecen = Math.floor((Date.now() - dcAnlatimBaslangicZamani) / 1000);
                let kalan = 30 - gecen;
                if (kalan <= 0) {
                    clearInterval(dcAnlatimTimerInterval);
                    btn.disabled = false;
                    btn.innerHTML = '✅ Okudum, Anladım';
                    btn.style.background = '#2f855a';
                    btn.style.boxShadow = '0 4px 0 #1c5a3a';
                    btn.style.cursor = 'pointer';
                } else {
                    let sayacEl = document.getElementById('dcOkudumSayac');
                    if (sayacEl) sayacEl.innerText = kalan;
                }
            }, 300);
        }

        function dcOkudumAnladimOnayla() {
            if (!document.getElementById('dcOkudumBtn') || document.getElementById('dcOkudumBtn').disabled) return;
            dcAnlatimOnaylandiMi = true;
            let btn = document.getElementById('dcOkudumBtn');
            btn.innerHTML = '✅ Onaylandı — Örneklere geçebilirsin';
            btn.disabled = true;
            btn.style.cursor = 'default';
            dcToastGoster('✅ Harika! Şimdi Örnekler sekmesine geçebilirsin');
        }

        function dcOrnekSesOku(idx, text) {
            dcSesOku(text);
            dcOrnekDinlenenSet.add(idx);
            let ilerlemeEl = document.getElementById('dcOrnekIlerleme');
            if (ilerlemeEl) ilerlemeEl.innerText = `🔊 ${dcOrnekDinlenenSet.size} / ${dcOrnekToplamSayisi} cümle dinlendi`;
            let btnEl = document.getElementById('dcExPlay' + idx);
            if (btnEl) { btnEl.innerHTML = '✅'; btnEl.style.background = '#dcfce7'; }
            if (dcOrnekDinlenenSet.size >= dcOrnekToplamSayisi && dcOrnekToplamSayisi > 0) {
                dcToastGoster('✅ Tüm cümleleri dinledin! Teste geçebilirsin');
            }
        }

                function dcToastGoster(msg) {
            if(window.DijiMeduPapiFeedback){window.DijiMeduPapiFeedback.notice(msg);return;}
            document.getElementById('dcToastText').innerText = msg;
            const mascot = document.querySelector('#dcToast .dc-toast-icon img');
            if (mascot) mascot.src = /kazand|harika|tamam|tebrik|✅|puan|bonus/i.test(msg) ? 'papi-reward-v2.png' : 'papi-help-v2.png';
            let t = document.getElementById('dcToast');
            t.classList.add('show');
            clearTimeout(window._dcToastTimeout);
            window._dcToastTimeout = setTimeout(() => t.classList.remove('show'), 2600);
        }

        function dcCalisBaslat() { dersCalisBaslat(); }
       function dersCalisBaslat() {

    document.getElementById('dcSesUS').classList.toggle(
        'active',
        dcSesTercihi === 'us'
    );

    document.getElementById('dcSesUK').classList.toggle(
        'active',
        dcSesTercihi === 'uk'
    );


    /* =====================================================
       DERS KONULARI CİHAZ CACHE
       ===================================================== */

    const CACHE_KEY =
        "diji_ders_konulari_v1_" +
        String(aktifOgrenciAdi || "").trim().toLowerCase();

    const CACHE_SURESI =
        24 * 60 * 60 * 1000; // 24 saat


    /* =====================================================
       1. CİHAZDA KAYITLI KONU VARSA ÖNCE ONU KULLAN
       ===================================================== */

    try {

        const ham =
            localStorage.getItem(CACHE_KEY);

        if (ham) {

            const kayit =
                JSON.parse(ham);

            if (
                kayit &&
                kayit.zaman &&
                Array.isArray(kayit.veri)
            ) {

                const cacheYasi =
                    Date.now() -
                    Number(kayit.zaman);


                if (
                    cacheYasi <= CACHE_SURESI &&
                    kayit.veri.length
                ) {

                    dcTumKonularCache =
                        kayit.veri;



                    /* Cache eskiyse arka planda yenile */
                    if (
                        cacheYasi > 60 * 60 * 1000 &&
                        navigator.onLine &&
                        !dcYuklemePromise
                    ) {

                        dcYuklemePromise =
                            fetch(
                                `${apiURL}?islem=dersKonulariGetir&ogrenci=${encodeURIComponent(aktifOgrenciAdi || "")}`
                            )
                            .then(res => {

                                if (!res.ok) {
                                    throw new Error(
                                        "HTTP " + res.status
                                    );
                                }

                                return res.json();
                            })
                            .then(liste => {

                                dcTumKonularCache =
                                    Array.isArray(liste)
                                        ? liste
                                        : [];

                                localStorage.setItem(
                                    CACHE_KEY,
                                    JSON.stringify({
                                        zaman: Date.now(),
                                        veri: dcTumKonularCache
                                    })
                                );

                            })
                            .catch(() => {})
                            .finally(() => {

                                dcYuklemePromise =
                                    null;
                            });
                    }

                    return;
                }
            }
        }

    } catch (e) {

        console.warn(
            "Ders konu cache okunamadı:",
            e
        );
    }


    /* =====================================================
       2. CACHE YOKSA SUPABASE'DEN AL
       ===================================================== */

    if (
        dcTumKonularCache.length === 0 &&
        !dcYuklemePromise
    ) {

        dcYuklemePromise =
            fetch(
                `${apiURL}?islem=dersKonulariGetir&ogrenci=${encodeURIComponent(aktifOgrenciAdi || "")}`
            )
            .then(res => {

                if (!res.ok) {
                    throw new Error(
                        "HTTP " + res.status
                    );
                }

                return res.json();
            })
            .then(liste => {

                dcTumKonularCache =
                    Array.isArray(liste)
                        ? liste
                        : [];


                /* Yeni veriyi cihaza kaydet */

                if (dcTumKonularCache.length) {

                    try {

                        localStorage.setItem(
                            CACHE_KEY,
                            JSON.stringify({
                                zaman: Date.now(),
                                veri: dcTumKonularCache
                            })
                        );

                    } catch (e) {

                        console.warn(
                            "Ders konu cache yazılamadı:",
                            e
                        );
                    }
                }


            })
            .catch(e => {

                console.warn(
                    "Ders konuları alınamadı:",
                    e
                );

            })
            .finally(() => {

                dcYuklemePromise =
                    null;
            });
    }
}

        function dcEkranGoster(id) {
            document.querySelectorAll('.dc-screen').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            document.getElementById('dcBackBtn').classList.toggle('hidden', dcGecmis.length <= 1);
        }
        function dcGeriGit() {
            dcSesDurdur();
            dcGecmis.pop();
            dcEkranGoster(dcGecmis[dcGecmis.length - 1]);
            dcCrumbGuncelle();
        }
        function dcIleriGit(id) { dcSesDurdur(); dcGecmis.push(id); dcEkranGoster(id); dcCrumbGuncelle(); }
        function dcCrumbGuncelle() {
            let parts = [];
            if (dcAktifSeviye) parts.push(dcAktifSeviye);
            if (dcAktifKategori) parts.push(dcKategoriRenkleri[dcAktifKategori].label);
            if (dcAktifKonu) parts.push(dcAktifKonu);
            document.getElementById('dcCrumb').innerText = parts.join(' / ');
        }

        function dcSeviyeSec(kod, ad) {
            dcAktifSeviye = kod;
            let renkler = { A1:'#2f855a', A2:'#2563eb', B1:'#7c3aed', B2:'#ea580c' };
            let badge = document.getElementById('dcLevelBadge');
            badge.style.background = renkler[kod];
            document.getElementById('dcLevelBadgeDot').innerText = kod;
            document.getElementById('dcLevelBadgeText').innerText = ad + ' Seviyesi';
            dcIleriGit('dcScreenCats');
        }

        async function dcKategoriSec(key, ad) {
            dcAktifKategori = key;
            let r = dcKategoriRenkleri[key];
            let badge = document.getElementById('dcCatBadge');
            badge.style.background = r.accent;
            document.getElementById('dcCatBadgeDot').innerHTML = '';
            document.getElementById('dcCatBadgeText').innerText = `${dcAktifSeviye} · ${ad}`;

            document.getElementById('dcGridProgressText').innerText = '...';
            document.getElementById('dcGridBarFill').style.width = '0%';
            dcIleriGit('dcScreenTopics');

            if (dcTumKonularCache.length === 0 && dcYuklemePromise) {
                document.getElementById('dcTopicListArea').innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:#94a3b8; font-weight:700; font-size:12px;">⏳ Konular yükleniyor...</div>`;
                await dcYuklemePromise;
            }

            dcKategoriIcerikCiz(key);
        }

        function dcKategoriIcerikCiz(key) {
            let konular = dcTumKonularCache.filter(k => k.seviye === dcAktifSeviye && k.kategori === key).sort((a,b) => a.siraNo - b.siraNo);
            let alan = document.getElementById('dcTopicListArea');

            if (konular.length === 0) {
                alan.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:#94a3b8; font-weight:700; font-size:12px;">🌱 Bu kategori için konular yakında eklenecek</div>`;
                document.getElementById('dcGridProgressText').innerText = '0 / 0 konu';
                document.getElementById('dcGridBarFill').style.width = '0%';
                return;
            }

            let tamamlananSayisi = konular.filter(k => k.durum === 'tamamlandi').length;
            document.getElementById('dcGridProgressText').innerText = `${tamamlananSayisi} / ${konular.length} konu`;
            document.getElementById('dcGridBarFill').style.width = `${Math.round((tamamlananSayisi / konular.length) * 100)}%`;

            alan.innerHTML = konular.map((k, i) => {
                let ds = 'yeni', ikon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>`;
                if (k.durum === 'tamamlandi') {
                    ds = 'done';
                    ikon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
                } else if (k.durum === 'basarisiz') {
                    ds = 'retry';
                    ikon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>`;
                }
                let flagHtml = k.bilmiyordum ? '<span class="dc-card-flag">🚩</span>' : '';
                        return `<div class="dc-card ${ds}" onclick="dcKonuAc('${k.konuAdi.replace(/'/g,"\\'")}')">
                    ${flagHtml}
                    <div class="dc-card-top">
                        <div class="dc-card-icon ${ds}">${ikon}</div>
                        <span class="dc-card-num">${i+1}</span>
                    </div>
                    <div class="dc-card-title">${k.konuAdi}</div>
                </div>`;
            }).join('');
        }

        let dcDetayIstekNo = 0;
        function dcKonuAc(konuAdi) {
            if (genelOyunGirisEngelliMi()) return;
            genelEnerjiHarca(-1);
            dcSesDurdur();
            dcAktifKonu = konuAdi;
            const detayIstekNo = ++dcDetayIstekNo, detayOgrenci = aktifOgrenciAdi;
                    dcKonuBaslangicZamani = Date.now(); dcTestBitiriliyor = false;
            let konuOzetErken = dcTumKonularCache.find(k => k.seviye === dcAktifSeviye && k.kategori === dcAktifKategori && k.konuAdi === konuAdi);
            dcAktifKonuTamamlanmisMi = !!(konuOzetErken && konuOzetErken.durum === 'tamamlandi');
            let r = dcKategoriRenkleri[dcAktifKategori];
            let konuOzet = dcTumKonularCache.find(k => k.seviye === dcAktifSeviye && k.kategori === dcAktifKategori && k.konuAdi === konuAdi);

            document.getElementById('dcTopicHeader').style.background = `linear-gradient(135deg, ${r.accent}, ${r.accentDeep || r.accent})`;
            document.getElementById('dcThEyebrow').innerText = `${dcAktifSeviye} · ${r.label.toUpperCase()}`;
            document.getElementById('dcThTitle').innerText = konuAdi;
            document.getElementById('dcBilmiyordumBtn').classList.toggle('aktif', konuOzet && konuOzet.bilmiyordum);

            document.querySelectorAll('.dc-tab-btn').forEach(b => { b.classList.remove('active'); b.style.background = 'transparent'; });
            document.querySelectorAll('.dc-tab-panel').forEach(p => p.classList.remove('active'));
            let ilkTab = document.querySelector('.dc-tab-btn[data-tab="anlatim"]');
            ilkTab.classList.add('active'); ilkTab.style.background = r.accent;
            document.getElementById('dcTab-anlatim').classList.add('active');
            document.getElementById('dcAnlatimIcerik').innerHTML = `<div style="text-align:center; color:#94a3b8; padding:20px;">Yükleniyor...</div>`;
            dcAnlatimTimerBaslat();

            fetch(`${apiURL}?islem=dersKonuDetayGetir&seviye=${dcAktifSeviye}&kategori=${dcAktifKategori}&konu=${encodeURIComponent(konuAdi)}`)
            .then(res => res.json())
            .then(detay => { if(detayIstekNo === dcDetayIstekNo && detayOgrenci === aktifOgrenciAdi && dcAktifKonu === konuAdi) dcKonuDetayiCiz(detay, r.accent); })
            .catch(() => { document.getElementById('dcAnlatimIcerik').innerHTML = `<div>Yüklenirken hata oluştu.</div>`; });

            dcIleriGit('dcScreenDetail');
        }

        function dcKelimeleriIsle(text, sozlukObj) {
            if (!text) return "";
            let anahtarlar = Object.keys(sozlukObj || {}).sort((a,b) => b.length - a.length);
            anahtarlar.forEach(kelime => {
                let veri = sozlukObj[kelime];
                let regex = new RegExp('\\b(' + kelime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b', 'gi');
                text = text.replace(regex, function(match) {
                    return `<span class="dc-word" data-tr="${(veri.tr||'').replace(/"/g,'&quot;')}" data-alt="${(veri.alt||'').replace(/"/g,'&quot;')}" onclick="dcSesOku('${match.replace(/'/g,"")}')">${match}</span>`;
                });
            });
            return text;
        }

        let dcSonYuklenenSozluk = {};
        function dcKonuDetayiCiz(detay, accent) {
            let sozluk = {};
            try { sozluk = JSON.parse(detay.kelimeSozlugu || "{}"); } catch(e) {}
            dcSonYuklenenSozluk = sozluk;

            document.getElementById('dcAnlatimIcerik').innerHTML = dcKelimeleriIsle(detay.anlatimHTML || "İçerik yakında eklenecek.", sozluk);

            let img = document.getElementById('dcTopicImg');
            if (detay.gorselLink && detay.gorselLink.trim()) { img.src = detay.gorselLink; img.style.display = 'block'; }
            else { img.style.display = 'none'; }

              let ornekler = [];
            try { ornekler = JSON.parse(detay.ornekler || "[]"); } catch(e) {}
            dcOrnekDinlenenSet = new Set();
            dcOrnekToplamSayisi = ornekler.length;
            let ornekHtml = ornekler.map((o, idx) => `
                <div class="dc-example-row">
                    <button class="dc-ex-play" id="dcExPlay${idx}" onclick="dcOrnekSesOku(${idx}, '${(o.en||"").replace(/'/g,"")}')">🔊</button>
                    <div class="dc-ex-en">${dcKelimeleriIsle(o.en, sozluk)}</div>
                    <div class="dc-ex-tr">${o.tr || ''}</div>
                </div>
            `).join('');
            let ilerlemeHtml = dcOrnekToplamSayisi > 0
                ? `<div id="dcOrnekIlerleme" style="font-size:10.5px; font-weight:800; color:#94a3b8; margin-bottom:10px;">🔊 0 / ${dcOrnekToplamSayisi} cümle dinlendi</div>`
                : '';
            document.getElementById('dcOrnekIcerik').innerHTML = `<h3>Örnek Cümleler</h3>` + ilerlemeHtml + (ornekHtml || '<p>Örnek yakında eklenecek.</p>');

               let test = [];
            try { test = JSON.parse(detay.testJSON || "[]"); } catch(e) {}
            dcTestCiz(test, accent);

            document.querySelectorAll('.dc-tab-btn').forEach(b => b.style.setProperty('--accent', accent));

            // Hover sözlük balonu
            document.querySelectorAll('.dc-word').forEach(el => {
                el.addEventListener('mouseenter', function(evt) {
                    let balon = document.getElementById('dcHoverBalon');
                    let tr = this.dataset.tr, alt = this.dataset.alt;
                    balon.innerHTML = `<div>${tr}</div>` + (alt ? `<div class="dc-alt">alt: ${alt}</div>` : '');
                    let rect = this.getBoundingClientRect();
                    balon.style.left = rect.left + 'px';
                    balon.style.top = (rect.top - 42) + 'px';
                    balon.style.display = 'block';
                });
                el.addEventListener('mouseleave', function() { document.getElementById('dcHoverBalon').style.display = 'none'; });
            });
        }



        let dcAktifTestSorulari = [];
        let dcAktifTestAccent = '';
        function dcTestCiz(sorular, accent) {
            dcAktifTestSorulari = sorular;
            dcAktifTestAccent = accent;
            let alan = document.getElementById('dcTestIcerik');
            dcQuizCevaplari = new Array(sorular.length).fill(-1);
            dcQuizDogruSayisi = 0;
            if (sorular.length === 0) { alan.innerHTML = `<div class="dc-content-card"><h3>Test</h3><p>Test soruları yakında eklenecek.</p></div>`; return; }
            let html = "";
            sorular.forEach((s, qi) => {
                html += `<div class="dc-quiz-q"><div class="dc-quiz-q-text">${qi+1}. ${s.soru}</div>`;
                s.secenekler.forEach((sec, si) => {
                    html += `<button class="dc-quiz-opt" id="dcQOpt${qi}_${si}" onclick="dcQuizCevapVer(${qi},${si},${s.dogru})">${sec}</button>`;
                });
                html += `</div>`;
            });
            html += `<button class="dc-quiz-bitir-btn" onclick='dcTestiBitir(${sorular.length})'>🏆 Testi Bitir</button>`;
            alan.innerHTML = html;
        }
        function dcQuizCevapVer(qi, secilenIndex, dogruIndex) {
            if (dcQuizCevaplari[qi] !== -1) return;
            dcQuizCevaplari[qi] = secilenIndex;
            document.getElementById(`dcQOpt${qi}_${secilenIndex}`).classList.add(secilenIndex === dogruIndex ? 'dogru' : 'yanlis');

            if (secilenIndex !== dogruIndex) {
                document.getElementById(`dcQOpt${qi}_${dogruIndex}`).classList.add('dogru');
                document.querySelectorAll('.dc-quiz-opt').forEach(o => o.style.pointerEvents = 'none');
                dcToastGoster('❌ Yanlış cevap! Test baştan başlıyor...');
                setTimeout(() => { dcTestCiz(dcAktifTestSorulari, dcAktifTestAccent); }, 1900);
                return;
            }
            dcQuizDogruSayisi++;
            window.DijiMeduPapiFeedback?.correct({anchor:document.getElementById(`dcQOpt${qi}_${secilenIndex}`),duration:900});
        }
        let dcTestBitiriliyor = false, dcKonuBaslangicZamani = 0;
        function dcTestiBitir(toplamSoru) {
            if (dcTestBitiriliyor) return;
            let cevaplanan = dcQuizCevaplari.filter(c => c !== -1).length;
            if (cevaplanan < toplamSoru) { alert("Lütfen tüm soruları cevapla!"); return; }
            if (dcQuizDogruSayisi !== toplamSoru) { dcToastGoster('Tekrar deneyelim'); return; }

            dcTestBitiriliyor = true;
            let btn = document.querySelector('#dcTestIcerik .dc-quiz-bitir-btn');
            if (btn) { btn.disabled = true; btn.innerText = '✅ Tamamlandı'; }

            let konuAdi = dcAktifKonu;
            let zatenTamamMi = dcAktifKonuTamamlanmisMi;
            let sure = Math.round((Date.now() - (dcKonuBaslangicZamani || Date.now())) / 1000);

            if (!zatenTamamMi) {
                fetch(apiURL, { method: "POST", body: JSON.stringify({ islem: "dersTestSonucKaydet", ogrenci: aktifOgrenciAdi, seviye: dcAktifSeviye, kategori: dcAktifKategori, konuAdi: konuAdi, basariliMi: true }) }).catch(() => {});
                let k = dcTumKonularCache.find(x => x.seviye === dcAktifSeviye && x.kategori === dcAktifKategori && x.konuAdi === konuAdi);
                if (k) k.durum = 'tamamlandi';
                dcAktifKonuTamamlanmisMi = true;
            }

            genelSonucEkraniGoster({
                oyunAdi: '📘 ' + konuAdi,
                baslik: zatenTamamMi ? 'Tekrar harikaydın!' : 'Konu tamamlandı!',
                isim: aktifOgrenciAdi,
                puan: zatenTamamMi ? '—' : '+0.2',
                dogru: toplamSoru, yanlis: 0, sureSaniye: sure,
                siralamaYok: true,
                devamFn: function() { dcTestBitiriliyor = false; dcTestSonrasiKonuListesineDon(); }
            });
        }

        function dcTestSonrasiKonuListesineDon() {
            dcSesDurdur();
            if (dcGecmis[dcGecmis.length - 1] === 'dcScreenDetail') {
                dcGecmis.pop();
            }
            dcEkranGoster(dcGecmis[dcGecmis.length - 1] || 'dcScreenTopics');
            dcCrumbGuncelle();
            dcKategoriIcerikCiz(dcAktifKategori);
        }

        function dcBilmiyordumToggle() {
            fetch(apiURL, {
                method: "POST",
                body: JSON.stringify({ islem: "dersBilmiyordumToggle", ogrenci: aktifOgrenciAdi, seviye: dcAktifSeviye, kategori: dcAktifKategori, konuAdi: dcAktifKonu })
            })
            .then(res => res.json())
            .then(data => {
                document.getElementById('dcBilmiyordumBtn').classList.toggle('aktif', data.isaretli);
                let k = dcTumKonularCache.find(x => x.seviye === dcAktifSeviye && x.kategori === dcAktifKategori && x.konuAdi === dcAktifKonu);
                if (k) k.bilmiyordum = data.isaretli;
            })
            .catch(() => {});
        }

        function dcSekmeSec(tab, btn) {
            dcSesDurdur();
            if (!dcAktifKonuTamamlanmisMi) {
                if (tab === 'ornek' && !dcAnlatimOnaylandiMi) {
                    dcToastGoster('⏳ Önce Anlatım kısmını oku ve "Okudum, Anladım" butonuna bas!');
                    return;
                }
                if (tab === 'test' && dcOrnekDinlenenSet.size < dcOrnekToplamSayisi) {
                    dcToastGoster(`🔊 Önce tüm örnek cümleleri dinlemelisin (${dcOrnekDinlenenSet.size}/${dcOrnekToplamSayisi})`);
                    return;
                }
            }
            let r = dcKategoriRenkleri[dcAktifKategori];
            document.querySelectorAll('.dc-tab-btn').forEach(b => { b.classList.remove('active'); b.style.background = 'transparent'; });
            document.querySelectorAll('.dc-tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active'); btn.style.background = r.accent;
            document.getElementById('dcTab-' + tab).classList.add('active');
        }

        // ===== ARAMA =====
        function dcAramaYap(deger) {
            let sonucAlani = document.getElementById('dcAramaSonuclari');
            if (!deger || deger.trim().length < 2) { sonucAlani.style.display = 'none'; return; }
            let aranan = deger.trim().toLowerCase();
            let eslesenler = dcTumKonularCache.filter(k => k.konuAdi.toLowerCase().includes(aranan));
            if (eslesenler.length === 0) {
                sonucAlani.innerHTML = `<div style="padding:10px; font-size:11px; color:#94a3b8; text-align:center;">Sonuç bulunamadı.</div>`;
            } else {
                sonucAlani.innerHTML = eslesenler.slice(0, 20).map(k => `
                    <div class="dc-arama-satir" onclick="dcAramaSonucundanGit('${k.seviye}','${k.kategori}','${k.konuAdi.replace(/'/g,"\\'")}')">
                        <span>${k.konuAdi}</span>
                        <span class="dc-arama-etiket">${k.seviye} · ${dcKategoriRenkleri[k.kategori].label}</span>
                    </div>
                `).join('');
            }
            sonucAlani.style.display = 'block';
        }
        function dcAramaSonucundanGit(seviye, kategori, konuAdi) {
            document.getElementById('dcAramaInput').value = "";
            document.getElementById('dcAramaSonuclari').style.display = 'none';
            dcGecmis = ['dcScreenLevels'];
            dcAktifSeviye = seviye;
            let renkler = { A1:'#16a34a', A2:'#2563eb', B1:'#7c3aed', B2:'#ea580c' };
            document.getElementById('dcLevelBadge').style.background = renkler[seviye];
            document.getElementById('dcLevelBadge').innerText = seviye;
            dcGecmis.push('dcScreenCats');
            dcAktifKategori = kategori;
            let r = dcKategoriRenkleri[kategori];
            document.getElementById('dcCatBadge').style.background = r.accent;
            document.getElementById('dcCatBadge').innerText = `${seviye} · ${r.label}`;
                 let konular = dcTumKonularCache.filter(k => k.seviye === seviye && k.kategori === kategori).sort((a,b) => a.siraNo - b.siraNo);
            let tamamlananAS = konular.filter(k => k.durum === 'tamamlandi').length;
            document.getElementById('dcGridProgressText').innerText = `${tamamlananAS} / ${konular.length} konu`;
            document.getElementById('dcGridBarFill').style.width = `${konular.length ? Math.round((tamamlananAS / konular.length) * 100) : 0}%`;
            document.getElementById('dcTopicListArea').innerHTML = konular.map((k, i) => {
                let ds = k.durum === 'tamamlandi' ? 'done' : k.durum === 'basarisiz' ? 'retry' : 'yeni';
                let ikon = k.durum === 'tamamlandi'
                    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
                    : k.durum === 'basarisiz'
                    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>`
                    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>`;
                return `<div class="dc-card ${ds}" onclick="dcKonuAc('${k.konuAdi.replace(/'/g,"\\'")}')">
                    <div class="dc-card-top">
                        <div class="dc-card-icon ${ds}">${ikon}</div>
                        <span class="dc-card-num">${i+1}</span>
                    </div>
                    <div class="dc-card-title">${k.konuAdi}</div>
                </div>`;
            }).join('');
            dcGecmis.push('dcScreenTopics');
            dcKonuAc(konuAdi);
        }

        // ===== PDF İNDİRME =====


                function sayfayiYenile() {
            let btn = document.getElementById('sayfaYenileBtn');
            if (btn) btn.classList.add('donuyor');
            setTimeout(() => { window.location.reload(); }, 150);
        }

                function performansEmojisiGetir(puan) {
                    if (puan >= 95) return "🏆 Harika!";
                    if (puan >= 90) return "🌟 Mükemmel";
                    if (puan >= 85) return "🚀 Süper";
                    if (puan >= 80) return "🔥 Hararetli";
                    if (puan >= 75) return "🎯 Çok İyi";
                    if (puan >= 70) return "💪 Güçlü";
                    if (puan >= 65) return "👏 Başarılı";
                    if (puan >= 60) return "📈 Yükselişte";
                    if (puan >= 55) return "👍 İyi";
                    if (puan >= 50) return "💡 İstikrarlı";
                    return "🌱 Gelişiyor";
                }

                function skorRenkSinifiVer(puan) {
                    if (puan >= 70) return "score-green";
                    if (puan >= 45) return "score-yellow";
                    return "score-red";
                }

                function haftalikRenkTonuVer(index) {
                    let paletler = [
                        { bg: "#f0fdf4", border: "#bbf7d0" },
                        { bg: "#eff6ff", border: "#bfdbfe" },
                        { bg: "#fefce8", border: "#fef08a" },
                        { bg: "#fdf2f8", border: "#fbcfe8" },
                        { bg: "#f5f3ff", border: "#ddd6fe" }
                    ];
                    return paletler[index % paletler.length];
                }

                function haftalikYorumOlustur(row, ad) {
                    let puan = row.genel;
                    let okuma = row.okuma;
                    let yazma = row.yazma;
                    let vocab = row.vocabulary;
                    let konusma = row.konusma;
                    let grammar = row.grammar;
                    let deneme = row.deneme;

                    let cumleler = [];
                    if (puan >= 80) {
                        cumleler.push(`Bu hafta ${ad} ile oldukça disiplinli ve verimli bir ders döngüsünü geride bıraktık. Değerlendirmeler sonucunda öğrencimiz bu hafta **${puan} / 100** genel başarı puanına ulaştı. Ders içi odaklanması ve kavrama hızı son derece üst düzeyde seyretti. 🌟`);
                    } else if (puan >= 50) {
                        cumleler.push(`Sevgili velimiz, öğrencimiz ${ad} bu haftaki çalışma sürecinde gösterdiği gayretle **${puan} / 100** genel başarı puanı elde etti. Çalışmalarımızda ufak tekrarlarla bu puanı çok daha yukarı taşıyacağımıza inanıyoruz. 🚀`);
                    } else {
                        cumleler.push(`Bu hafta ${ad} için biraz tempolu bir dönem oldu ve genel başarı puanı **${puan} / 100** olarak kaydedildi. Önümüzdeki haftalarda pratik yaparak bu tabloyu hızla toparlayacağız! 💪`);
                    }

                    cumleler.push(`5 Kriter dağılımında Okuma (${okuma}), Yazma (${yazma}), Kelime (${vocab}), Konuşma (${konusma}) ve Grammar (${grammar}) becerileri ölçüldü.`);
                    if (deneme > 0) {
                        cumleler.push(`Ayrıca bu haftaki son deneme sınavı sonucu **${deneme}** olarak hanesine yazıldı.`);
                    }
                    cumleler.push(`Destekleriniz ve bu güzel iş birliği için çok teşekkür ederiz. Sevgiyle kalın! 🌻`);

                    return `"${cumleler.join(" ")}"`;
                }

                function tarihiDuzelt(tarihStr) {
                    if (!tarihStr) return "--.--.----";
                    let d = new Date(tarihStr);
                    if (!isNaN(d.getTime())) {
                        return String(d.getDate()).padStart(2,'0') + "." + String(d.getMonth()+1).padStart(2,'0') + "." + d.getFullYear();
                    }
                    return tarihStr;
                }

                function dersTakviminiIsle(derslerDizisi) {
                    let gecen = "--.--.----", gelecek = "--.--.----";
                    if (derslerDizisi && derslerDizisi.length > 0) {
                        if (derslerDizisi.length >= 1) gecen = tarihiDuzelt(derslerDizisi[0].tarih);
                        if (derslerDizisi.length >= 2) gelecek = tarihiDuzelt(derslerDizisi[1].tarih);
                    }
                    document.getElementById('miniGecenTarih').innerText = gecen;
                    document.getElementById('miniGelecekTarih').innerText = gelecek;
                }

                function dersRaporlariniOlustur(arsivListesi, kitapBilgi) {
                    let konteyner = document.getElementById('arsivKartlariKonteyner');
                    konteyner.innerHTML = "";
                    if (!arsivListesi || arsivListesi.length === 0) {
                        konteyner.innerHTML = `<p style="color: #718096; text-align: center; padding: 12px;">Arşiv verisi bulunmuyor.</p>`;
                        return;
                    }
                    arsivListesi.forEach((row, index) => {
                        let formatliTarih = tarihiDuzelt(row.tarih);
                        let yorumMetni = haftalikYorumOlustur(row, aktifOgrenciAdi);
                        let renkSkoruSinif = skorRenkSinifiVer(row.genel);
                        let temaTonu = haftalikRenkTonuVer(index);

                                       let kitapHtml = (kitapBilgi && kitapBilgi.kitapAdi) ? `<span>📚 Kitap: <b>${kitapBilgi.kitapAdi}</b> (Okunan: ${kitapBilgi.sayfa} / Hedef: ${kitapBilgi.hedef} sayfa)</span>` : `<span></span>`;
                        let denemeHtml = (row.deneme && row.deneme > 0) ? `<div class="report-deneme-badge">🎯 Son Deneme Puanı: ${row.deneme}</div>` : '';

                        konteyner.innerHTML += `
                            <div class="report-card" style="background-color: ${temaTonu.bg}; border-color: ${temaTonu.border};">
                                <div class="report-card-top">
                                    <div class="report-date">📅 Ders Tarihi: ${formatliTarih}</div>
                                    <div class="report-badge-score ${renkSkoruSinif}">Haftalık Genel Puan: ${row.genel} / 100</div>
                                </div>
                                <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">🍎 O HAFTA NE YAPILDI & GÖZLEM:</div>
                                <div class="report-comment-box">${yorumMetni}</div>
                                <div class="report-criteria-bar">
                                    <span>📖 Okuma: ${row.okuma}/100</span>
                                    <span>✍️ Yazma: ${row.yazma}/100</span>
                                    <span>💡 Kelime: ${row.vocabulary}/100</span>
                                    <span>🗣️ Konuşma: ${row.konusma}/100</span>
                                    <span>📐 Grammar: ${row.grammar}/100</span>
                                </div>
                                <div class="report-footer-info">
                                    ${kitapHtml}
                                    ${denemeHtml}
                                </div>
                            </div>
                        `;
                    });
                }

                const SINIF_ICI_ETIKETLER = ["Katılım", "Ödev Eksik", "Davranış", "Yardımsever", "Derse Geç Kaldı", "Genel"];
        let sinifIciAktifEtiket = "Genel";
        let sinifIciSonIslemZamani = null;
        let sinifIciSonIslemOgrencileri = [];

        function ogretmenMenuSinifIciAc() {
            document.getElementById('ogretmenMenuModal').style.display = 'none';
            document.getElementById('sinifIciModal').style.display = 'flex';
            sinifIciEtiketleriCiz();
            sinifIciSinifSubeDoldur();
            document.getElementById('sinifIciGeriAlBtn').style.display = 'none';
        }

        function sinifIciKapat() {
            document.getElementById('sinifIciModal').style.display = 'none';
            document.getElementById('ogretmenMenuModal').style.display = 'flex';
        }

        function sinifIciEtiketleriCiz() {
            let alan = document.getElementById('sinifIciEtiketAlani');
            alan.innerHTML = "";
            SINIF_ICI_ETIKETLER.forEach(etiket => {
                let chip = document.createElement('button');
                chip.type = 'button';
                chip.innerText = etiket;
                chip.className = 'unite-chip' + (etiket === sinifIciAktifEtiket ? ' selected' : '');
                chip.onclick = function() {
                    sinifIciAktifEtiket = etiket;
                    sinifIciEtiketleriCiz();
                };
                alan.appendChild(chip);
            });
        }

        function sinifIciSinifSubeDoldur() {
            let sel = document.getElementById('sinifIciSinifSubeSelect');
            let kombinasyonlar = new Set();
            globalDataCache.forEach(u => {
                let sinif = String(u.Sinif || "").trim();
                let sube = String(u.Sube || "").trim();
                if (sinif) kombinasyonlar.add(sinif + "|" + sube);
            });
            sel.innerHTML = '<option value="">-- Sınıf/Şube Seçin --</option>';
            Array.from(kombinasyonlar).sort().forEach(k => {
                let parcalar = k.split("|");
                let etiket = parcalar[1] ? (parcalar[0] + "-" + parcalar[1]) : parcalar[0];
                sel.innerHTML += `<option value="${k}">${etiket}</option>`;
            });
        }

        function sinifIciOgrencileriListele() {
            let secim = document.getElementById('sinifIciSinifSubeSelect').value;
            let alan = document.getElementById('sinifIciOgrenciListesi');
            alan.innerHTML = "";
            if (!secim) return;

            let parcalar = secim.split("|");
            let sinif = parcalar[0], sube = parcalar[1] || "";
            let ogrenciler = globalDataCache.filter(u => String(u.Sinif || "").trim() === sinif && String(u.Sube || "").trim() === sube);

            let enYuksekBugun = 0;
            ogrenciler.forEach(u => { if ((u.sinifIciBugun || 0) > enYuksekBugun) enYuksekBugun = u.sinifIciBugun || 0; });

            ogrenciler.forEach(u => {
                let efektifPuan = u.genelOrtalama || 0;
                let yildizMi = enYuksekBugun > 0 && (u.sinifIciBugun || 0) === enYuksekBugun;

                let kart = document.createElement('div');
                kart.style.cssText = "display:flex; align-items:center; gap:8px; background:#f8fafc; border:2px solid #e2e8f0; border-radius:10px; padding:8px 10px;";

                kart.innerHTML = `
                    <input type="checkbox" class="sinif-ici-cb" value="${guvenliMetin(u.ogrenci)}" style="width:18px; height:18px; flex-shrink:0;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:800; font-size:12.5px; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${yildizMi ? '⭐ ' : ''}${guvenliMetin(u.ogrenci)}</div>
                        <div style="font-size:10px; color:#64748b;">Genel Puan: ${efektifPuan}</div>
                    </div>
                    <button type="button" onclick="sinifIciTekilUygula('${guvenliMetin(u.ogrenci)}', -1)" style="background:#fee2e2; color:#991b1b; border:none; width:34px; height:34px; border-radius:8px; font-weight:900; font-size:18px; cursor:pointer;">−</button>
                    <button type="button" onclick="sinifIciTekilUygula('${guvenliMetin(u.ogrenci)}', 1)" style="background:#dcfce7; color:#166534; border:none; width:34px; height:34px; border-radius:8px; font-weight:900; font-size:18px; cursor:pointer;">+</button>
                `;
                alan.appendChild(kart);
            });
        }

        function sinifIciTumunuSecToggle() {
            let checkboxlar = document.querySelectorAll('.sinif-ici-cb');
            let hepsiSecili = Array.from(checkboxlar).every(cb => cb.checked);
            checkboxlar.forEach(cb => { cb.checked = !hepsiSecili; });
        }

        async function sinifIciTekilUygula(ogrenciAdi, yon) {
            await sinifIciPuanGonder([ogrenciAdi], yon);
        }

        async function sinifIciTopluUygula(yon) {
            let checkboxlar = document.querySelectorAll('.sinif-ici-cb:checked');
            let ogrenciler = Array.from(checkboxlar).map(cb => cb.value);
            if (ogrenciler.length === 0) { alert("Lütfen en az bir öğrenci seçin!"); return; }
            await sinifIciPuanGonder(ogrenciler, yon);
        }

        async function sinifIciPuanGonder(ogrenciler, yon) {
            try {
                let res = await fetch(apiURL, {
                    method: "POST",
                    body: JSON.stringify({
                        islem: "sinifIciPuanVer",
                        ogrenciler: ogrenciler,
                        degisim: yon,
                        sebep: sinifIciAktifEtiket
                    })
                });
                let data = await res.json();
                if (data.status === "success") {
                    if (data.atlanan && data.atlanan.length > 0) {
                        alert((yon > 0 ? "Zaten 100 puanda: " : "Zaten 0 puanda: ") + data.atlanan.join(", "));
                    }
                    if (data.uygulanan && data.uygulanan.length > 0) {
                        sinifIciSonIslemZamani = data.zamanDamgasi;
                        sinifIciSonIslemOgrencileri = data.uygulanan;
                        document.getElementById('sinifIciGeriAlBtn').style.display = 'inline-block';

                                        data.uygulanan.forEach(ogrAdi => {
                            let user = globalDataCache.find(u => u.ogrenci === ogrAdi);
                            if (user) {
                                let gercekDeger = yon > 0 ? 0.3 : -2;
                                user.genelOrtalama = Math.round(Math.max(0, Math.min(100, (user.genelOrtalama || 0) + gercekDeger)));
                            }
                        });
                        sinifIciOgrencileriListele();
                    }
                }
            } catch (e) {
                alert("Bağlantı hatası: " + e);
            }
        }

        async function sinifIciSonIslemiGeriAl() {
            if (!sinifIciSonIslemZamani) return;
            try {
                let res = await fetch(apiURL, {
                    method: "POST",
                    body: JSON.stringify({
                        islem: "sinifIciGeriAl",
                        zamanDamgasi: sinifIciSonIslemZamani,
                        ogrenciler: sinifIciSonIslemOgrencileri
                    })
                });
                let data = await res.json();
                if (data.status === "success") {
                    document.getElementById('sinifIciGeriAlBtn').style.display = 'none';
                    sinifIciSonIslemZamani = null;
                    sinifIciSonIslemOgrencileri = [];
                    let res2 = await fetch(apiURL);
                    globalDataCache = await res2.json();
                    sinifIciOgrencileriListele();
                }
            } catch (e) {
                alert("Bağlantı hatası: " + e);
            }
        }

                        function kitapTakibiniIsle(kitap) {
                    window._kitapVarMi = !!(kitap && kitap.kitapAdi);
                    if (!kitap || !kitap.kitapAdi) return;
                    document.getElementById('valKitapAdi').innerText = kitap.kitapAdi || "Kitap Yok";
                    document.getElementById('valKitapSkoru').innerText = kitap.okunanSayisi || 5;
                    let sayfa = kitap.sayfa || 0, hedef = kitap.hedef || 40;
                    let yuzde = hedef > 0 ? Math.min(Math.round((sayfa / hedef) * 100), 100) : 0;
                    document.getElementById('valKitapYuzde').innerText = `%${yuzde}`;
                    document.getElementById('valKitapBar').style.width = yuzde + "%";
                    document.getElementById('valKitapSayfa').innerText = `Okunan: ${sayfa} sayfa`;
                    document.getElementById('valKitapHedef').innerText = `Hedef: ${hedef} sayfa`;
                }
                function grafikliCiz(grafikGecmis, user, denemeGecmis) {
                    // Chart.js is loaded only when charts are first drawn (keeps 200 KB off app startup).
                    if(typeof Chart!=='function'){
                        window.__dmChartArgs=[grafikGecmis,user,denemeGecmis];
                        if(!window.__dmChartLoad)window.__dmChartLoad=new Promise((ok,fail)=>{const s=document.createElement('script');s.src='vendor/chart-4.4.1.min.js';s.onload=ok;s.onerror=()=>{window.__dmChartLoad=null;s.remove();fail();};document.head.appendChild(s);});
                        window.__dmChartLoad.then(()=>{if(typeof Chart==='function'&&window.__dmChartArgs){const a=window.__dmChartArgs;window.__dmChartArgs=null;grafikliCiz(...a);}},()=>{});
                        return;
                    }
                    if(!['gelisimGrafik','kriterGrafik','denemeGrafik'].every(id=>document.getElementById(id)?.getContext('2d')))return;
                    let labels = grafikGecmis.map(item => tarihiDuzelt(item.tarih));
                    let veriler = grafikGecmis.map(item => item.genel);
                    if (gelisimChartInstance) gelisimChartInstance.destroy();
                    gelisimChartInstance = new Chart(document.getElementById('gelisimGrafik').getContext('2d'), {
                        type: 'line',
                        data: { labels: labels.length ? labels : ["Yok"], datasets: [{ data: veriler.length ? veriler : [0], borderColor: '#16a34a', backgroundColor: 'rgba(22, 163, 74, 0.1)', fill: true, tension: 0.3, pointRadius: 2 }] },
                        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
                    });

                    if (kriterChartInstance) kriterChartInstance.destroy();
                    kriterChartInstance = new Chart(document.getElementById('kriterGrafik').getContext('2d'), {
                        type: 'bar',
                        data: { labels: ['Okuma', 'Yazma', 'Kelime', 'Konuşma', 'Grammar'], datasets: [{ data: [user.okumaOrt||0, user.yazmaOrt||0, user.vocabOrt||0, user.konusmaOrt||0, user.grammarOrt||0], backgroundColor: ['#4ade80', '#38bdf8', '#fbbf24', '#c084fc', '#f43f5e'], borderRadius: 4 }] },
                        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
                    });

                    if (denemeChartInstance) denemeChartInstance.destroy();
                    denemeChartInstance = new Chart(document.getElementById('denemeGrafik').getContext('2d'), {
                        type: 'bar',
                        data: { labels: denemeGecmis.map(i => tarihiDuzelt(i.tarih)), datasets: [{ data: denemeGecmis.map(i => i.deneme), backgroundColor: '#f43f5e', borderRadius: 4 }] },
                        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
                    });
                }

                // Legacy general-score badges retired; teacher assessment charts remain.

               // --- AKICI OKUMA VE HIZ ÖLÇER STÜDYOSU MİMARİSİ (İNGİLİZCE - ZENGİNLEŞTİRİLMİŞ HAVUZ) ---
        const sinirsizMetinHavuzu = {
            1: [
                { baslik: "My Red Ball", metin: "My ball is red, shiny, and round. I play happily with my friend Can in the school yard. The bell rings, and we run into the classroom. Our teacher gives us new story books. Learning to read is a wonderful feeling." },
                { baslik: "The Little Cat", metin: "The little yellow cat in the garden loves drinking milk. When the sun goes down, it curls up in its house and sleeps sweetly. When I pet it, it starts purring immediately. It is the sweetest joy of our home." },
                { baslik: "On the Way to School", metin: "I woke up early in the morning and prepared my backpack. Together with my mom, we happily set off on the school road. On the way, we saw colorful flowers and cute dogs. We entered our classroom and wished our friends a bright day." },
                { baslik: "The Beautiful Garden", metin: "There is a huge green garden behind our house. Sweet-smelling roses and sweet apple trees grow in the garden. Every evening, I skip rope there and sing songs cheerfully." },
                { baslik: "Kite Festival", metin: "The wind is blowing very nicely today. Colorful kites are gliding in the blue sky. My tailed kite, which I made with my own hands, reached the highest points." },
                { baslik: "My Sweet Friend", metin: "My dog Pamuk greets me at the door by shaking its head. Playing catch with it makes me very happy. In the evenings, we rest together next to my bed." },
                { baslik: "Drawing Pictures", metin: "I opened my colored pencils and drew a huge house picture. Smoke is coming out of the chimney of the house, and happy children are running in the garden. My teacher liked my picture very much." },
                { baslik: "After the Rain", metin: "The rain stopped, and there is the smell of soil in the air. When I looked outside through our window, I saw a huge colorful rainbow. I ran outside and jumped with joy." },
                { baslik: "Starry Night", metin: "At night, I watched the shining bright stars in the sky from my window. The moon seemed to smile at me and wished me sweet dreams. I wrapped myself in my blanket and slept peacefully." },
                { baslik: "Bird Nest", metin: "Two tiny birds built a nest on the branch of our walnut tree. Every day, I throw bread crumbs to them. I wake up happily to their chirping every morning." }
            ],
            2: [
                { baslik: "Our Forest Adventure", metin: "Over the weekend, we went to a lush green forest far away from the city with our family. While walking under the huge pine trees, we noticed squirrels hiding nuts. We took a deep breath of fresh air and went for a walk. Nature gave us peace and happiness. Birds were singing beautiful melodies on the branches, and tiny butterflies were dancing around colorful wild flowers. We sat near a small flowing stream to eat our sandwiches. My little brother discovered an interesting stone shaped like a star. We collected dry pine cones to show our grandmother. When the afternoon sun started to sink behind the hills, we packed our bags and returned home with unforgettable smiling memories of our weekend adventure." },
                { baslik: "Journey of the Little Seed", metin: "The tiny seed hidden deep in the soil woke up from its sleep with the spring rains. When it felt the warm rays of the sun, it slowly stretched upward. It sprouted and opened tiny green leaves. Now it had become a huge plant. Earthworms helped loosen the ground so its roots could breathe easily. Drops of morning dew refreshed its petals every single dawn. Soon, bees and butterflies started visiting its bright yellow flowers to drink sweet nectar. The little seed realized how wonderful life truly is when you grow with patience, love, and courage under the bright blue sky." },
                { baslik: "Watching the Stars", metin: "On summer evenings, we set up our chairs on the grass in the garden of our village house. While watching the billions of stars in the sky, we make wishes on shooting stars. The depths of space have always seemed like a great secret to me. My grandfather tells old stories about constellations and brave space explorers. We use a small old telescope to look closer at the glowing moon craters. Crickets sing a quiet nighttime lullaby in the background. Breathing the cool night breeze clears all our daily tiredness. Gazing at the infinite universe reminds us how small yet special we are inside this vast and magnificent cosmic creation." },
                { baslik: "Grandpa's Farm", metin: "There are cows, sheep, and cute ducks on my grandfather's farm in the village. I wake up early in the morning and collect fresh eggs from the coop. Running around in natural life gives me amazing energy. The friendly farm dog always joins me during my morning walks near the old wooden barn. We feed the fluffy white sheep with fresh green grass. In the afternoon, I help grandfather water the vegetable garden where juicy tomatoes and cucumbers grow. Country life teaches us the true value of hard work and simplicity. Every sunset paints the farm sky in gorgeous shades of orange and purple." },
                { baslik: "Seaside", metin: "During the summer vacation, I went to the beach and built huge sandcastles. Listening to the sound of waves hitting the shore relaxes a person. I collected seashells and kept them as souvenirs. Seagulls flew gracefully above the turquoise water searching for small fish. My father taught me how to swim safely near the shallow shorelines. Eating cold watermelon under a colorful beach umbrella after swimming is the best feeling ever. As evening arrived, we walked along the sandy coastline collecting smooth pebbles. The ocean breeze carried the salty scent of adventure and endless freedom into our happy hearts." },
                { baslik: "Library Day", metin: "There are thousands of interesting books in our school library. I sat quietly at the table and turned pages full of space and adventure. Reading books opens the door to new worlds. The friendly librarian helped me find a fascinating book about dinosaur fossils. Outside, rain tapped softly against the tall glass windows while I explored ancient history. Reading in a quiet room brings deep inner peace and expands our imagination infinitely. I borrowed two new storybooks to finish before the weekend arrives. Books are truly our most loyal and silent friends that never leave us alone." },
                { baslik: "Making Biscuits", metin: "Today, we went into the kitchen with my mother and baked sweet-smelling cookies. I had a lot of fun shaping the dough. We happily ate the hot cookies coming out of the oven with milk. Vanilla and chocolate aromas filled every corner of our cozy home. My younger sister spilled some flour on the floor, and we laughed together loudly. Baking together creates sweet bonds and wonderful family memories. We packed half of the cookies in a pretty tin box to share with our lovely neighbors. Homemade treats always taste much better because they are made with pure love." },
                { baslik: "Dance of the Snowflake", metin: "While watching outside through the window on a winter day, it started to snow thickly. Each snowflake performed a flawless dance as it drifted to the ground. We went outside and built a snowman. Its nose was made of a bright orange carrot, and we gave it an old woolen scarf. Neighborhood kids gathered around for an exciting snowball fight filled with laughter. My cheeks turned rosy red from the freezing cold wind, but my heart felt warm and joyful. Winter brings magical white landscapes that transform ordinary streets into enchanted fairy tale kingdoms full of pure childhood wonder." },
                { baslik: "Bicycle Tour", metin: "I went out for a tour in the park with my new blue bicycle. As the wind hit my face, I felt as free as a bird. Learning to balance is a wonderful thing. I pedaled smoothly along the paved green path lined with tall oak trees. Passing by the children's playground, I waved at my school friends playing on the swings. Riding a bike requires full attention and steady coordination. When I reached the top of the hill, the view of the entire neighborhood looked breathtaking. Cycling is both a healthy exercise and an incredible outdoor adventure that I look forward to every afternoon." },
                { baslik: "History in the Museum", metin: "When we visited the old museum in the city center, I imagined what happened in the past. Swords used by kings and old coins fascinated me. Learning history is very exciting. A knowledgeable guide explained how ancient people lived thousands of years ago in stone houses. We saw colorful pottery vessels decorated with unique geometric patterns. Standing in front of a giant mammoth skeleton made me realize how much our planet has changed over time. Museums are time machines preserving our cultural heritage for future generations. Exploring historical artifacts connects our present identity deeply with the mysterious roots of human civilization." }
            ],
            3: [
                { baslik: "SCIENCE AND CURIOSITY", metin: "Throughout human history, the greatest force driving us forward has been the feeling of curiosity. If Isaac Newton had not questioned the falling apple, gravity might have been discovered much later. Scientists work day and night in laboratories to make our lives easier. We must also question the events around us, read, and constantly research. Knowledge is power and changes the world. Every single invention that modern society relies upon started with a simple, childlike question asked by someone who dared to wonder why things happen. Curiosity breaks down walls of ignorance and opens doors to infinite possibilities. Encouraging young minds to explore scientific principles ensures continuous progress, medical breakthroughs, and technological evolution for all of humanity." },
                { baslik: "THE VALUE OF TIME", metin: "The scarcest and most unrecoverable resource we have is time. When money is lost, it can be earned again, but a second that passes never comes back. Therefore, we must live our days in a planned and efficient manner. Focusing while studying and giving proper time to rest creates life balance. Procrastination is the biggest enemy of personal success and inner peace. By prioritizing our daily tasks and eliminating unnecessary distractions, we can achieve remarkable goals without feeling constantly overwhelmed. Wise individuals treat every single hour as a precious investment in their future. Learning how to manage time effectively during childhood builds a strong foundation for a disciplined, successful, and deeply fulfilling adult life." },
                { baslik: "THE POWER OF FRIENDSHIP", metin: "A true friend is someone who cries with us on our bad days and shares our laughter on our good days. Having a reliable friend to share troubles with is the greatest luxury in the world. Mutual trust, open communication, and unconditional support form the unbreakable pillars of lasting relationships. In times of crisis, a genuine friend stands firmly beside us like an unshakeable mountain. Building strong social bonds teaches us empathy, patience, and the art of compromise. We must choose our companions wisely, keeping close to those who inspire us to become better versions of ourselves. Cherishing our friends brings warmth, joy, and deep emotional resilience through every unexpected challenge that life presents." },
                { baslik: "RECYCLING", metin: "To protect our world, we must sort our garbage and reduce plastic use. Every piece of plastic thrown into nature does not decay for centuries. We can save our future with recycling. Industrial waste and careless consumption habits are pushing our natural ecosystems toward a dangerous collapse. Governments, communities, and individuals must work hand in hand to promote zero-waste policies. Simple daily habits, such as carrying cloth bags, reusing glass containers, and saving water, make a massive collective difference. Earth is our only habitable home in the cold and silent expanse of space. Preserving its pristine beauty, clean oceans, and green forests is a moral responsibility that we owe to all future generations." },
                { baslik: "SMELL OF OLD BOOKS", metin: "When you enter second-hand book shops, that old paper smell surrounding you comes from the depths of history. Inside every book lies a secret soul left behind by someone who read it before. The slight yellowing of pages and worn-out leather covers tell silent stories of countless quiet afternoons spent reading. Unlike modern digital screens, physical books carry a tangible warmth and emotional connection that transcends decades. Bibliophiles find unmatched comfort among towering shelves filled with forgotten poetry, historical accounts, and classic novels. Every turn of a page releases microscopic fragments of aging ink and organic compounds that stimulate our nostalgia. Preserving traditional libraries ensures that the tactile magic of literature remains alive." },
                { baslik: "IMPACT OF TECHNOLOGY", metin: "Thanks to smart devices, we can reach information on the other side of the world in seconds. However, spending too much time in front of screens can weaken our health and social bonds. Digital addiction creates silent barriers between family members living under the same roof. While technological innovations simplify complex industrial tasks, they also demand conscious self-regulation from users. Balancing online learning with outdoor physical activities is crucial for maintaining mental and ocular health. We should master digital tools rather than letting algorithms control our daily habits and attention spans. Using technology wisely empowers our education while preserving our fundamental human capacity for deep, uninterrupted concentration and genuine face-to-face interaction." },
                { baslik: "WORLD OF PLANETS", metin: "In our solar system, Mercury is the planet closest to the sun. The largest gas giant is Jupiter. These giant spheres spinning in the vacuum of space have always been the focus of astronomers. Venus shines brightly like a morning star despite having a crushing atmosphere of carbon dioxide. Mars features rusty red deserts and towering volcanoes that invite future human exploration. Farther out, icy giants like Uranus and Neptune rotate in perpetual darkness and freezing temperatures. Studying planetary formation helps scientists understand the origins of Earth and the rare conditions required to support biological life. The universe remains an endless gallery of breathtaking cosmic wonders waiting to be discovered by curious space explorers." },
                { baslik: "SPIRITUAL POWER OF MUSIC", metin: "Wandering among note clouds is the most effective method to relax the human soul. While listening to Mozart or Beethoven, we feel our minds clearing and focusing. Melodies have the mysterious ability to express deep emotions that ordinary human words fail to capture. Throughout history, music has accompanied religious ceremonies, military victories, and joyful cultural celebrations. Playing an instrument trains the brain, enhances mathematical intuition, and fosters profound emotional intelligence. Whether listening to soft acoustic rhythms or powerful orchestral symphonies, art elevates our consciousness. Incorporating daily musical appreciation into our routines provides an essential sanctuary of peace amidst the rushing noise, constant stress, and heavy pressures of modern civilization." },
                { baslik: "PLACE OF SPORTS IN LIFE", metin: "Doing regular exercise strengthens our muscles, refreshes our minds, and protects our immune system. Individuals who start the day with sports are more energetic and happy all day long. Team sports teach valuable lessons regarding leadership, discipline, tactical collaboration, and graceful sportsmanship. Physical activity stimulates the release of endorphins, which naturally reduce anxiety and elevate our general mood. Sedentary lifestyles lead to numerous health complications that can easily be avoided through consistent movement. Whether playing basketball, swimming laps, or practicing martial arts, finding a sport we genuinely love transforms fitness into a joyful hobby. Investing time in physical health guarantees a vibrant, resilient, and long-lasting quality of life." },
                { baslik: "SMALL KINDNESSES", metin: "Giving water to a stray animal we meet while walking on the street or helping an elderly neighbor makes the world a beautiful place. Love is a rare emotion that grows as it is shared. Small gestures often leave profound, permanent impacts on someone struggling through a difficult day. Compassion requires no special financial wealth, only an open heart and genuine willingness to care. When we practice empathy consistently, our communities transform into safe, supportive havens of mutual respect. Kind words act like healing medicine for wounded spirits and lonely souls. Cultivating altruism from an early age builds a compassionate society where cooperation triumphs over selfishness, spreading boundless light across humanity." }
            ],
            4: [
                { baslik: "ANATOLIAN CIVILIZATIONS", metin: "Anatolian lands have hosted many ancient civilizations for thousands of years. From Hittites to Phrygians, Lydians to Byzantines and Ottomans, every culture has left its mark on these lands. When we examine historical ruins, we admire how advanced our ancestors were in art, trade, and architecture. This cultural heritage is our common treasure that everyone must protect. Archaeological excavations continuously unearth astonishing artifacts that rewrite historical textbooks and reveal forgotten secrets of early urban life. Hittite cuneiform tablets detail sophisticated legal systems, while Lydian merchants invented the very first metallic coinage to simplify commerce. Preserving these magnificent open-air museums connects modern societies directly to the rich historical roots of human civilization." },
                { baslik: "BALANCE OF ECOSYSTEM", metin: "Living things in nature form a chain woven with invisible ties. Bees pollinating flowers ensures plant reproduction, which becomes a food source for herbivorous animals. In this delicate balance, the extinction of a single species can shake the entire ecosystem. Predators keep herbivore populations under control, preventing overgrazing and subsequent soil erosion. Forests act as giant carbon sinks that purify atmospheric air and regulate global rainfall patterns. Human industrial expansion, deforestation, and pollution threaten these vital ecological interdependencies severely. Protecting endangered wildlife habitats and enforcing strict environmental protection laws is mandatory to maintain planetary stability. Every organism plays an irreplaceable role in keeping Earth's magnificent biological network thriving." },
                { baslik: "EVOLUTION OF COMMUNICATION", metin: "In the past, people used pigeons to communicate or lit fires on mountains. With the invention of the printing press, information was printed on paper, followed by the phone and internet era. Today, information is at our fingertips. Johannes Gutenberg's revolutionary printing press liberated knowledge from exclusive monastery walls, making books accessible to ordinary citizens. Later, telegraph cables spanned across oceans, shrinking global distances and accelerating international trade. Digital revolution transformed human interaction entirely, connecting billions of people instantaneously across continents. While modern connectivity offers unprecedented educational advantages, it also raises serious concerns regarding data privacy, misinformation, and the decline of deep face-to-face dialogue in contemporary society." },
                { baslik: "ENERGY SAVING", metin: "The depletion of fossil fuels and global warming are the biggest threats endangering our world. Turning off unnecessary lights at home and not wasting water is the biggest investment we can make for our future. Transitioning toward renewable energy sources like solar power and wind turbines is an urgent international priority. Energy efficiency in industrial manufacturing and domestic appliances significantly reduces carbon footprints without sacrificing modern living standards. Public awareness campaigns educate citizens about the catastrophic economic and environmental costs of wasteful habits. Conserving natural resources preserves planetary health and ensures sustainable economic prosperity for upcoming generations. Every individual action contributes directly to saving our shared global environment from permanent ecological degradation." },
                { baslik: "EFFECT OF ART ON HUMAN SOUL", metin: "Paints poured onto a canvas or a sculpture carved from marble express human emotions beyond words. Art is the realm where the soul is liberated and aesthetic perception reaches its peak. Masterpieces created by legendary painters capture historical trauma, spiritual euphoria, and profound existential questions in visual form. Art therapy successfully heals psychological wounds that traditional clinical treatments struggle to reach. Visiting art galleries exposes minds to diverse cultural perspectives and challenges conventional ways of thinking. Creative expression nurtures empathy by allowing viewers to feel the innermost sorrows and joys of strangers. Fostering artistic education in schools cultivates imaginative, emotionally mature, and deeply reflective individuals capable of transforming society." },
                { baslik: "MYSTERY OF MAPS", metin: "Piri Reis's world map, drawn centuries ago, still amazes modern scientists. Compasses and maps guided sailors to discover unknown continents. Cartography has evolved from crude drawings on animal skins to satellite-guided digital GPS navigators. Ancient mapmakers relied on adventurous traveler accounts, celestial observations, and sheer intuition to chart uncharted oceans. These historical documents represent monumental achievements of human observation and fearless geographical exploration. Today, digital maps provide real-time traffic updates and detailed three-dimensional terrain views instantly. Yet, looking at vintage parchment maps awakens a romantic sense of discovery and mystery regarding the vast, unexplored territories of our fascinating planet." },
                { baslik: "DEPTHS OF THE OCEANS", metin: "Two-thirds of our world is covered by water, but very little of the ocean floors has been explored. In dark waters where sunlight cannot reach, strange and magnificent creatures live. Deep-sea trenches like the Mariana Trench harbor bizarre life forms adapted to extreme pressure and freezing temperatures. Hydrothermal vents spew mineral-rich hot water, supporting unique ecosystems independent of solar energy. Ocean currents circulate immense volumes of heat across the globe, regulating weather patterns and marine life distribution. Overfishing and plastic pollution pose grave dangers to fragile marine biodiversity. Intensive scientific research and international conservation treaties are vital to safeguard the mysterious, uncharted depths of our planet's magnificent oceans." },
                { baslik: "PHILOSOPHICAL THOUGHT AND QUESTIONING", metin: "In ancient Greece, philosophers like Socrates and Plato enlightened the human mind with the philosophy of 'Know thyself'. A life without questioning leads a person to routine. Critical thinking allows individuals to examine underlying assumptions, evaluate evidence objectively, and avoid dogmatic fallacies. Philosophy encourages deep reflection concerning justice, morality, truth, and the fundamental meaning of human existence. Socratic method uses probing dialogue to stimulate rational thinking and expose contradictions in arguments. Engaging with philosophical texts strengthens logical reasoning and intellectual humility. Cultivating a questioning mindset transforms passive observers into active, wise participants capable of guiding society toward ethical progress and profound intellectual clarity." },
                { baslik: "POWER OF BOOKS TO CHANGE THE WORLD", metin: "Throughout history, certain books have ignited revolutions and led masses. Ideas put on paper are much sharper and more permanent than a sword. Literature has challenged oppressive political regimes, exposed social injustices, and inspired universal human rights movements. When an author captures a universal truth, their words transcend cultural and temporal boundaries to unite readers globally. Censorship regimes always target books because they recognize the liberating power of independent thought. Reading expansive literature broadens our vocabulary, sharpens analytical skills, and deepens psychological empathy toward marginalized communities. Books serve as timeless beacons of wisdom illuminating the darkest corridors of human history with enduring hope." },
                { baslik: "CLIMATE CHANGE AND FUTURE", metin: "The melting of polar ice caps and the shifting of seasons are clear indicators that our world is sounding the alarm. All countries of the world must take and implement joint decisions to reduce carbon emissions. Extreme weather events, prolonged droughts, and devastating forest fires demonstrate the immediate severity of ecological imbalance. Scientists warn that crossing critical tipping points will cause irreversible damage to global food security and human habitats. Transitioning away from carbon-heavy industries requires massive financial investments and political cooperation. Educating young people about sustainability ensures that future leaders prioritize environmental stewardship over short-term economic gains. Saving our climate is the ultimate test of human wisdom and global solidarity." }
            ],
            5: [
                { baslik: "DEPTHS OF SPACE AND DISCOVERY", metin: "The stars we see when we look at the sky are only a small part of the universe's immense magnitude. Thanks to the James Webb Space Telescope, we can examine the birth of galaxies billions of light-years away. Developments in the space race and rocket technology are turning humanity's dream of one day establishing colonies on different planets into reality. Scientists continue to discover new galaxies and exoplanets every day to solve the secrets of the universe. Astrophysics combines quantum mechanics with general relativity to explain cosmic phenomena like black holes and dark matter. International cooperation in space exploration unites nations beyond terrestrial conflicts, inspiring humanity toward a shared interstellar destiny of boundless discovery." },
                { baslik: "THE ERA OF ARTIFICIAL INTELLIGENCE", metin: "Revolutionary developments in computer science have enabled machines to think like humans. Artificial intelligence systems are rapidly transforming our lives in health, education, and industry. Machine learning algorithms analyze massive datasets instantly, diagnosing complex medical diseases far quicker than human doctors. Natural language processing models facilitate seamless cross-cultural communication and automated translation services globally. However, rapid automation raises ethical concerns regarding workforce displacement, algorithmic bias, and autonomous weapon systems. Establishing robust international regulatory frameworks ensures that artificial intelligence serves human well-being safely and equitably. Balancing technological innovation with moral responsibility defines the defining challenge of our modern digital era." },
                { baslik: "GLOBALIZATION AND CULTURE", metin: "Thanks to the internet, the world has now become a global village where borders have been lifted. The recognition of different cultures by each other increases tolerance while making the protection of local values compulsory. Multinational corporations, international travel, and digital media facilitate rapid exchange of ideas, music, and culinary traditions. While cultural globalization fosters cosmopolitan awareness, it simultaneously threatens indigenous languages and traditional lifestyles with homogenization. Maintaining local heritage requires conscious community efforts, educational programs, and institutional support. Embracing multiculturalism without losing authentic cultural identity enriches human society, creating a harmonious balance between global connectivity and cherished local traditions." },
                { baslik: "ARCHAEOLOGICAL DISCOVERIES", metin: "Gobeklitepe excavations turned the known chronology of human history upside down. The architecture of the temples and reliefs on the stelae shed light on the belief world of our ancestors. Archaeologists utilize advanced technologies like ground-penetrating radar and carbon dating to locate hidden ruins without excavation. Unearthing ancient cities reveals complex social hierarchies, long-distance trade networks, and sophisticated engineering practices. Every preserved artifact acts as a silent witness to forgotten epochs of human creativity and survival. Protecting historical sites from looting, war destruction, and industrial encroachment is a vital cultural obligation. Archaeology restores lost chapters of our shared human narrative, deepening our appreciation for ancestral resilience and cultural achievement." },
                { baslik: "BIOTECHNOLOGY AND GENETICS", metin: "Decoding the DNA structure broke new ground in medicine. Thanks to genetic engineering, promising studies are being conducted on the treatment of hereditary diseases and the development of resilient agricultural products. CRISPR gene-editing technology allows scientists to modify specific genetic sequences with unprecedented precision. Agricultural biotechnology engineers drought-resistant crops capable of feeding growing populations in arid climate zones. Nevertheless, ethical dilemmas surrounding human embryo modification and genetically modified organisms provoke fierce global debates. Strict bioethics regulations must govern genetic research to prevent misuse while maximizing medical benefits. Biotechnology holds miraculous potential to eradicate chronic illnesses and revolutionize sustainable food production worldwide." },
                { baslik: "OCEAN CURRENTS", metin: "The biggest element regulating world climate is ocean currents. Warm water currents such as the Gulf Stream protect the climate balance of continents, making them habitable. These massive underwater rivers transport thermal energy from tropical regions toward polar zones, stabilizing planetary temperatures. Disruptions in ocean circulation caused by melting glaciers can trigger abrupt, catastrophic climate shifts. Marine biologists study thermohaline circulation patterns to predict long-term meteorological trends accurately. Protecting marine ecosystems from industrial pollution and acidification is crucial for maintaining global climatic stability. Understanding ocean dynamics reveals the intricate physical mechanisms sustaining life across our remarkable, water-covered blue planet." },
                { baslik: "EFFECTS OF THE INDUSTRIAL REVOLUTION", metin: "Starting with the invention of the steam engine, the Industrial Revolution enabled machines to replace human labor. While this great transformation increased production speed, it also brought environmental problems. Mass manufacturing shifted populations rapidly from agricultural rural villages to crowded industrial cities. Coal-powered factories released unprecedented volumes of pollutants into the atmosphere, initiating modern climate change. Labor unions emerged to protect workers from grueling factory conditions and hazardous exploitation. Technological advancements created immense economic wealth while reshaping global geopolitics entirely. Analyzing industrial history helps contemporary policymakers navigate current automation transitions safely, ensuring equitable economic progress and sustainable labor practices." },
                { baslik: "CRYPTOLOGY AND ENCRYPTION", metin: "Throughout history, states developed encryption methods for secret communication. Today, our digital security is entirely entrusted to complex mathematical algorithms and cryptology. Advanced cryptographic protocols protect online financial transactions, classified military communications, and personal data privacy. Modern computers utilize asymmetric encryption keys that take millennia for unauthorized hackers to crack. The emergence of quantum computing poses both revolutionary opportunities and severe security threats to existing encryption standards. Cybersecurity experts continually develop post-quantum cryptographic algorithms to safeguard digital infrastructure against future breaches. Protecting sensitive information is an indispensable pillar of national security and economic stability in the interconnected digital world." },
                { baslik: "HISTORY OF PHOTOGRAPHY", metin: "Since the day the first photograph was taken, our way of immortalizing memories has completely changed. Thanks to digital sensors and cameras, we can record the farthest corners of the universe with high resolution. Early photographic plates required long exposure times and hazardous chemical development processes. Photojournalism transformed public perception of historical events, exposing war horrors, social injustices, and human triumphs vividly. Today, smartphones put powerful cameras in every pocket, generating billions of digital images daily. Photography bridges cultural divides instantly, capturing fleeting human emotions and natural splendor with permanent clarity. Preserving photographic archives safeguards our collective visual memory against the erosion of time." },
                { baslik: "ECOLOGICAL BALANCE AND SUSTAINABILITY", metin: "Considering the rights of future generations while consuming natural resources is the basis of sustainable development. Investing in renewable energy sources is the only way to protect the ecosystem. Overconsumption, habitat destruction, and biodiversity loss threaten the ecological foundations of human civilization. Sustainable architecture incorporates energy-efficient designs, recycled materials, and green urban spaces to minimize environmental impact. Circular economy models eliminate waste by repurposing industrial byproducts continuously. Governments and corporate enterprises must internalize ecological costs rather than externalizing environmental damage. Achieving global sustainability requires a profound paradigm shift in human values, prioritizing long-term planetary health over infinite material growth." }
            ],
            6: [
                { baslik: "ANATOLIA CROSSROADS OF CIVILIZATIONS", metin: "Anatolia, due to its geographical location, is located at the intersection point of the Asian, European, and African continents. This unique location has witnessed many migration movements, trade routes, and imperial struggles throughout history. The passage of the Silk Road through these lands carried not only trade but also cultural interaction between East and West to the highest level. The artifacts exhibited in our museums today are the most reputable proof of this rich civilization synthesis. From Neolithic settlements like Catalhoyuk to magnificent Seljuk and Ottoman architecture, Anatolian soil preserves layers of human history compactly. Geological diversity combined with rich cultural heritage makes this region an unparalleled open-air laboratory for historians and archaeologists worldwide." },
                { baslik: "NANOTECHNOLOGY REVOLUTION", metin: "Nanotechnology, which enables the control of matter at the atomic and molecular level, has brought a new dimension to medicine, electronics, and materials science. Microscopic robots will be able to destroy cancer cells in the future. Engineers manipulate carbon nanotubes to create materials hundred times stronger than steel yet remarkably lightweight. In electronics, quantum dots enhance display resolutions while reducing energy consumption significantly. Medical nanobots can travel through human bloodstreams to deliver targeted pharmaceutical drugs directly to diseased tissues. Despite these phenomenal advancements, toxicological risks of nanoparticles require rigorous safety testing. Nanotechnology represents a microscopic frontier with macroscopic potential to transform human capabilities entirely." },
                { baslik: "CLIMATE CRISIS AND GLOBAL WARMING", metin: "Greenhouse gases accumulating in the atmosphere are rapidly increasing the average temperature of the earth. The melting of glaciers and rising sea levels are a massive ecological crisis threatening coastal cities and agricultural areas. Unprecedented heatwaves, prolonged droughts, and severe storms disrupt global food supply chains and displace climate refugees. International climate summits strive to enforce binding emission reductions, yet political disagreements hinder decisive action. Transitioning to green economies demands massive financial investments and radical lifestyle adjustments from citizens worldwide. Safeguarding our planet's climatic stability is an existential imperative that transcends national borders, political ideologies, and short-term economic interests." },
                { baslik: "INVENTION OF WRITING AND HISTORY", metin: "Cuneiform writing invented by the Sumerians around 3200 BC became a turning point for humanity. Making thoughts and trade accounts permanent started the ages of history. Clay tablets recorded commercial contracts, religious hymns, and royal decrees, replacing unreliable oral traditions. Hieroglyphs in Egypt and alphabet systems developed by Phoenicians democratized written communication progressively. Writing enabled civilizations to accumulate scientific knowledge, philosophical treaties, and literature across generations. Without written records, human memory would remain restricted to fleeting generational folklore. The invention of writing stands alongside fire and agriculture as one of the supreme milestones of human cognitive evolution." },
                { baslik: "BASICS OF PSYCHOLOGY", metin: "Psychology science, which examines human behaviors, mental processes, and the subconscious, enables individuals to know themselves better. Empathy and emotional intelligence are the basis of social relationships. Cognitive psychology analyzes how people perceive information, solve problems, and store memories. Psychoanalytic theories explore hidden childhood influences and internal emotional conflicts driving human motivation. Understanding psychological principles helps educators design effective learning environments and assists clinicians in treating mental health disorders. Emotional regulation and resilience training empower individuals to navigate personal stress successfully. Psychology bridges biological neuroscience with subjective human experience, illuminating the intricate workings of the human mind." },
                { baslik: "WONDERS OF THE ANCIENT WORLD", metin: "Ancient works such as the Pyramids of Giza, the Hanging Gardens of Babylon, and the Colossus of Rhodes are magnificent structures pushing the limits of human engineering and imagination. These monumental achievements were constructed without modern machinery, relying entirely on human labor, mathematical precision, and raw determination. The Great Pyramid remained the tallest human-made structure on Earth for millennia. Exploring these wonders reveals how ancient societies mobilized immense resources for religious devotion and royal prestige. While most ancient wonders have vanished due to earthquakes and wars, their enduring legacy inspires modern architects. Preserving archaeological evidence of these marvels celebrates human ingenuity across antiquity." },
                { baslik: "POWER OF LANGUAGE AND COMMUNICATION", metin: "Words can unite people as well as cause destructive conflicts. Effective rhetoric and proper communication are the greatest weapons of leaders and successful individuals. Mastery of vocabulary and articulate expression enables individuals to convey complex ideas persuasively. Non-verbal body language, active listening, and empathetic tone amplify the emotional impact of spoken messages. In diplomatic relations, precise wording prevents misunderstandings and averts international crises. Educational curricula emphasize linguistic proficiency to foster critical thinking and social cohesion. Language is not merely a tool for information transfer; it is the fundamental medium through which human culture, identity, and shared consciousness are constructed." },
                { baslik: "RENEWABLE ENERGY SOURCES", metin: "Solar panels, wind turbines, and geothermal energy reduce our dependence on fossil fuels. Clean energy is the guarantee of our future green world. Technological innovations in photovoltaic cells have drastically lowered solar power installation costs globally. Offshore wind farms harness powerful marine gales to generate abundant electricity for coastal metropolises. Geothermal power taps into subterranean heat reserves, providing reliable, continuous baseload power. Transitioning energy grids toward 100% renewable sources eliminates billions of tons of carbon dioxide emissions annually. Investing in clean energy infrastructure creates millions of green jobs while securing sustainable economic growth. Renewable energy represents humanity's most practical defense against catastrophic climate change." },
                { baslik: "EVOLUTION OF ECONOMIC SYSTEMS", metin: "The history of trade, extending from barter systems to metallic coins, paper money to digital crypto assets, is a summary of humanity's quest for trust and value. Mercantilism gave way to industrial capitalism, which later faced critiques prompting mixed economic models. Central banks regulate monetary policy to control inflation and stimulate employment during economic downturns. Globalization integrated national markets into complex financial networks vulnerable to international contagion. Understanding economic principles helps citizens make informed decisions regarding personal finance, taxation, and investments. Economics explores how societies allocate scarce resources to satisfy unlimited human wants through organized production and distribution." },
                { baslik: "SCIENTIFIC REVOLUTIONS AND PARADIGM", metin: "According to Thomas Kuhn, science progresses by leaps through the shaking of accepted theories and the construction of new paradigms. Questioning is the engine of scientific development. When accumulated anomalies contradict existing scientific frameworks, visionary researchers propose radical alternative theories. Heliocentric astronomy replaced geocentric models, and relativity revolutionized Newtonian physics through profound conceptual shifts. Scientific progress is not linear; it involves fierce intellectual debates, skepticism, and institutional resistance before new paradigms triumph. Fostering a culture of open inquiry and tolerance for unorthodox hypotheses ensures continuous intellectual vitality. Paradigm shifts expand human understanding, reshaping our philosophical perspective of reality completely." }
            ],
            7: [
                { baslik: "SOCIOLOGICAL TRANSFORMATION AND SOCIETY", metin: "Societies are not static structures but are in a constant state of change and transformation throughout historical processes. Large migration waves from villages to cities with industrialization have fundamentally changed family structures, neighborly relations, and economic models. While sociology science examines these changes, it analyzes the individual's relationship with social institutions and group dynamics. In our age, with digitalization, social interaction forms have also moved to virtual environments, gaining a new dimension. Urbanization creates diverse multicultural communities while sometimes causing social isolation and alienation. Sociological research helps policymakers address inequality, poverty, and institutional reform effectively. Understanding collective behavior enables communities to manage cultural shifts harmoniously and promote inclusive social justice." },
                { baslik: "NEUROCONSCIOUSNESS AND SECRETS OF THE BRAIN", metin: "The human brain is accepted as the most complex structure in the universe. Synaptic networks formed by billions of neurons manage our learning, memory, and consciousness processes. Recent developments in neuroscience focus on solving the mind-body relationship. Functional neuroimaging allows researchers to observe active brain regions during decision-making, emotional processing, and language comprehension. Neuroplasticity proves that the brain can reorganize neural pathways throughout life in response to learning and experience. Neurological disorders like Alzheimer's disease motivate intensive research to discover restorative therapies. Unlocking the deep mysteries of neuroconsciousness illuminates the biological basis of human subjective awareness, personality, and intelligence." },
                { baslik: "GLOBAL ECONOMY AND SUPPLY CHAIN", metin: "Parts of a smartphone are produced in different countries of the world and assembled somewhere else. When the global supply chain is disrupted, the entire world economy is shaken. International trade interdependencies optimize production costs but expose markets to geopolitical tensions and shipping bottlenecks. Just-in-time manufacturing models prioritize efficiency over redundancy, increasing vulnerability during sudden crises like pandemics. Governments now pursue supply chain diversification and domestic manufacturing resilience to protect national security. Economic globalization requires robust international trade agreements and cooperative logistics management. Navigating global economic complexities demands strategic foresight, financial adaptability, and resilient industrial infrastructure from all trading nations." },
                { baslik: "RULE OF LAW AND DEMOCRACY", metin: "The establishment of a fair social order depends on the full implementation of the rule of law principle. The principle of separation of powers acts as a vital shield in protecting democracies. Independent judiciaries ensure that government officials and ordinary citizens remain equally accountable under established statutes. Constitutional protections safeguard freedom of speech, press independence, and minority rights against authoritarian encroachment. Corruption undermines public trust in democratic institutions, necessitating transparent governance and anti-corruption oversight. Civic education cultivates informed citizens who actively participate in democratic processes. The rule of law guarantees civil liberties, social stability, and equitable justice essential for flourishing, civilized societies." },
                { baslik: "ETHICS AND MORALITY IN PHILOSOPHY", metin: "Ethics philosophy, which questions what is good and evil, guides the human conscience. Kant's duty ethics and utilitarian theories discuss the basis of moral decisions. Deontological ethics argues that certain actions are inherently right or wrong regardless of their consequences. Utilitarianism evaluates moral worth based on maximizing overall happiness and minimizing suffering for the greatest number. Applied ethics examines complex modern dilemmas in bioethics, artificial intelligence, and environmental conservation. Moral reasoning challenges individuals to transcend self-interest and consider universal justice. Philosophical ethics provides rigorous intellectual frameworks for navigating the ambiguous moral choices defining professional and personal life." },
                { baslik: "SECURITY IN THE AGE OF INFORMATION", metin: "Cyber espionage and data breaches are next-generation warfare methods threatening the national security of nations. The concept of digital sovereignty is at the center of modern politics. State-sponsored hackers target critical infrastructure like power grids, financial institutions, and communication networks. Hybrid warfare combines disinformation campaigns with cyber attacks to destabilize rival governments covertly. National defense agencies invest heavily in offensive and defensive cyber capabilities to protect strategic assets. International treaties governing cyberspace norms remain weak and difficult to enforce. Ensuring digital security requires unprecedented cooperation between government intelligence agencies, private tech enterprises, and international cybersecurity alliances." },
                { baslik: "GLOBAL MIGRATIONS AND DEMOGRAPHY", metin: "Wars, economic inequalities, and climate crises cause millions of people to be displaced. The phenomenon of migration is transforming demographic structure and international politics. Receiving nations experience cultural enrichment alongside social integration challenges and political debates regarding border control. Demographic aging in developed countries increases labor demands, making migrant workers economically indispensable. Humanitarian organizations strive to protect refugee rights amidst complex geopolitical restrictions. Comprehensive migration management requires addressing root causes like poverty, conflict, and environmental collapse in origin countries. Global migration shapes the cultural mosaic of modern nations, demanding compassionate and pragmatic international policies." },
                { baslik: "MOVEMENTS IN ART HISTORY", metin: "From the perspective understanding of the Renaissance to the light plays of impressionism and the abstract forms of modern art, art movements reflect the spirit of the period. Renaissance masters mastered linear perspective and anatomical realism, reviving classical Greco-Roman ideals. Impressionists abandoned dark studio painting to capture transient effects of natural sunlight outdoors. Cubism fragmented objects into geometric planes, challenging traditional notions of visual representation. Surrealism explored dream states and the subconscious mind, inspired by psychoanalysis. Art history chronicles humanity's relentless quest for aesthetic innovation and emotional expression. Each artistic revolution redefines visual culture, offering profound insights into the changing philosophical outlook of successive generations." },
                { baslik: "EVOLUTIONARY BIOLOGY AND ADAPTATION", metin: "The ability of living things to adapt to environmental conditions occurs through the natural selection mechanism. Biodiversity is the work of millions of years of adaptation process. Charles Darwin's theory of evolution explained how advantageous genetic traits increase survival and reproductive success across generations. Fossil records document the gradual divergence of species and transitional forms throughout geological epochs. Modern genetics incorporates molecular biology into evolutionary theory, tracing ancestral lineages through DNA sequencing. Understanding evolutionary biology illuminates how pathogens develop antibiotic resistance and how ecosystems respond to climate change. Evolution represents the unifying grand framework of modern biological science, explaining the breathtaking diversity of life on Earth." },
                { baslik: "STRATEGIC THINKING AND PROBLEM SOLVING", metin: "Being able to think analytically in complex crisis situations and produce alternative scenarios is the key to both individual and institutional success. Strategic planning involves evaluating internal strengths, external threats, and long-term objectives systematically. Effective problem solvers decompose massive challenges into manageable components, testing hypotheses methodically. Cognitive flexibility allows leaders to pivot strategies when unexpected obstacles emerge. Decision-making frameworks minimize emotional bias and leverage data-driven insights. Cultivating strategic acumen requires continuous learning, intellectual curiosity, and rigorous post-project evaluation. Mastering problem-solving methodologies empowers individuals to navigate professional uncertainty with unwavering confidence and exceptional competence." }
            ],
            8: [
                { baslik: "GLOBAL ORDER AND GEOSTRATEGY", metin: "In the twenty-first century, international relations present a multi-polar and extremely dynamic structure. Traditional diplomacy methods have been replaced by cyber security, technological superiority, and economic integration strategies. Countries wage global power struggles over energy corridors, maritime trade routes, and artificial intelligence investments. It is a critical necessity for young generations to read these complex geopolitical balances correctly, gain an analytical perspective, and develop critical thinking skills in order to have a say in the world of the future. Multilateral institutions struggle to maintain global peace amidst rising nationalist sentiments and superpower rivalries. Understanding geostrategy requires mastering history, economics, and political science simultaneously. Empowering youth with robust geopolitical awareness ensures future leadership capable of fostering international cooperation and sustainable global stability." },
                { baslik: "PHILOSOPHICAL QUESTIONING AND EXISTENTIALISM", metin: "Existentialist philosophers like Sartre and Camus argue that human freedom and meaning must be created by the individual themselves. The purposefulness of life is shaped by the individual's own choices. Existentialism rejects predetermined destinies, emphasizing radical personal responsibility and authenticity in an indifferent universe. Confronting mortality and absurdity drives individuals to define their own core values through courageous action. This philosophical tradition resonates deeply with modern youth navigating identity crises and societal pressures. Embracing existential freedom empowers people to live passionately, resist conformity, and author their unique life stories with integrity. Philosophy provides vital intellectual tools for examining human purpose, cultivating self-awareness, and mastering personal autonomy." },
                { baslik: "QUANTUM PHYSICS AND REALITY", metin: "In the quantum world, where classical physics rules do not apply, particles can exist in multiple locations at the same time. This mysterious universe radically shakes our perception. Quantum superposition and entanglement defy intuitive logic, demonstrating that subatomic reality operates on probabilistic principles. Physicists harness quantum mechanics to develop ultra-fast supercomputers and unbreakable encryption systems. Exploring the subatomic realm bridges physics with philosophical questions regarding the nature of objective reality and observation. While counterintuitive, quantum theory stands as the most experimentally verified framework in scientific history. Understanding quantum principles expands human imagination, unlocking revolutionary technological horizons that will redefine computing, medicine, and energy generation." },
                { baslik: "STRATEGIC COMMUNICATION AND MEDIA LITERACY", metin: "In the digital age, information pollution and manipulation are the biggest threats. Media literacy is an indispensable shield for individuals to distinguish truth from falsehood. Algorithmic echo chambers and sensationalized headlines distort public discourse, polarizing democratic societies. Critical media consumers evaluate source credibility, cross-reference data, and recognize emotional propaganda techniques. Educational institutions prioritize media literacy training to cultivate discerning, independent thinkers. Strategic communication professionals utilize narrative frameworks to shape public policy and corporate branding ethically. Safeguarding truth in the information age requires eternal vigilance, rigorous fact-checking, and a cultural commitment to intellectual honesty and objective journalism." },
                { baslik: "SUSTAINABLE CITIES AND SMART CITIES", metin: "Metropolises of the future are equipped with energy-saving smart buildings, zero-waste systems, and autonomous public transport networks. Cities protecting ecological balance are essential. Internet of Things sensors monitor traffic flow, air quality, and energy consumption in real-time to optimize urban management. Green roofs, vertical forests, and permeable pavements mitigate urban heat island effects and manage stormwater runoff. Smart urban planning prioritizes pedestrian accessibility and cycling infrastructure over private automobile dependency. As global urban populations expand rapidly, transitioning toward smart sustainability prevents environmental collapse. Innovative municipal engineering transforms crowded cities into livable, eco-friendly hubs of technological efficiency and human well-being." },
                { baslik: "BIOMIMETICS AND INSPIRATION FROM NATURE", metin: "Technologies designed by engineers by mimicking the flawless mechanisms of living things in nature are called biomimetics. Trains inspired by the kingfisher bird are one of them. Shinkansen bullet trains eliminated disruptive sonic booms by adopting the aerodynamic beak shape of kingfishers diving into water. Velcro fasteners were invented by observing how burdock plant burs cling to animal fur. Sharkskin-inspired swimsuit textures reduce hydrodynamic drag, enhancing athletic swimming speeds. Nature has spent billions of years perfecting energy-efficient, sustainable designs through evolutionary trial and error. Biomimetics accelerates technological innovation by learning from biological wisdom, creating eco-friendly engineering solutions that harmonize seamlessly with natural ecosystems." },
                { baslik: "MACHINE LEARNING AND BIG DATA", metin: "Analyzing billions of data instantly enables companies and governments to make strategic decisions. Privacy is the most valuable treasure in the big data era. Machine learning models identify subtle behavioral patterns across vast datasets, predicting consumer trends and medical diagnoses accurately. Massive data collection practices raise profound ethical questions regarding corporate surveillance and individual privacy rights. Governments enforce strict data protection regulations like GDPR to control unauthorized data harvesting. Balancing technological utility with civil liberties requires transparent data governance and robust encryption standards. Mastering big data analytics while protecting personal privacy is a defining governance challenge of the contemporary information economy." },
                { baslik: "INTERNATIONAL LAW AND HUMAN RIGHTS", metin: "The Universal Declaration of Human Rights is the document of the common human will aimed at guaranteeing the fundamental rights and freedoms of all individuals in the world. International tribunals prosecute war crimes, genocide, and crimes against humanity, holding rogue leaders accountable. Global human rights conventions protect refugees, eliminate discrimination, and abolish cruel punishment practices. Enforcing international law remains challenging due to national sovereignty principles and powerful state resistance. Civil society organizations and human rights advocates play vital roles in exposing abuses and pressuring governments. Upholding universal human rights standards reflects humanity's highest moral aspirations, fostering global dignity, justice, and lasting peace." },
                { baslik: "FUTURISM AND FUTURE SCIENCE", metin: "Anticipating possible scenarios awaiting us in tomorrow's world from today is the subject of futuristic studies. Space tourism and immortality research are at the door. Futurists analyze technological convergence, demographic shifts, and environmental trends to construct plausible long-term forecasts. Commercial spaceflight initiatives are transforming orbital travel into an accessible reality for private citizens. Biotechnology research explores radical life extension and cellular rejuvenation therapies. Anticipating future disruptions allows societies to adapt educational curricula, labor markets, and legal frameworks proactively. Embracing future science with optimistic caution empowers humanity to shape tomorrow's technological landscape consciously, ethically, and for the benefit of all." },
                { baslik: "LEERSHIP AND VISIONARY PERSPECTIVE", metin: "A true leader means a visionary human who can keep their cool in times of crisis, inspire their team, and build the future from today. Visionary leaders articulate compelling long-term goals while empowering subordinates through trust and mentorship. Emotional intelligence, active listening, and ethical integrity distinguish exceptional leaders from tyrannical bosses. During organizational crises, effective leaders provide steady reassurance and decisive strategic direction. Developing leadership capacity involves continuous self-reflection, resilience training, and a genuine commitment to serving others. Cultivating visionary leadership in youth ensures that future institutions are guided by wisdom, empathy, and an unwavering dedication to positive societal transformation." }
            ]
        };

                let okumaTimer = null;
                let okumaSaniye = 0;
                let secilenMetinObjesi = null;
                let okunanKelimeSayisi = 0;

                function okumaModaliniAc() {
                    document.getElementById('okumaModalOverlay').style.display = 'flex';
                    yeniMetinGetir();
                    okumaGecmisiniYukle();
                }

                function okumaModaliniKapat() {
                    document.getElementById('okumaModalOverlay').style.display = 'none';
                    if (okumaTimer) clearInterval(okumaTimer);
                    okumaTimer = null;
                }

              // --- KAPSAMLI AKILLI KELİME SÖZLÜĞÜ (TÜM SINIFLARIN METİNLERİNİ KAPSAR) ---
        const kelimeSozlugu = {
            "my": "benim", "ball": "top", "red": "kırmızı", "shiny": "parlak", "and": "ve", "round": "yuvarlak",
            "i": "ben", "play": "oynamak", "happily": "mutlulukla", "with": "ile", "friend": "arkadaş", "school": "okul",
            "yard": "bahçe", "the": "o / -i", "bell": "zil", "rings": "çalmak", "we": "biz", "run": "koşmak", "into": "içine",
            "classroom": "sınıf", "our": "bizim", "teacher": "öğretmen", "gives": "vermek", "us": "bize", "new": "yeni",
            "story": "hikaye", "books": "kitaplar", "learning": "öğrenmek", "to": "-e / mak", "read": "okumak", "is": "dır / dir",
            "wonderful": "harika", "feeling": "duygu", "little": "küçük", "yellow": "sarı", "cat": "kedi", "garden": "bahçe",
            "loves": "sevmek", "drinking": "içmek", "milk": "süt", "when": "ne zaman", "sun": "güneş", "goes": "gitmek",
            "down": "aşağı", "curls": "kıvrılmak", "up": "yukarı", "house": "ev", "sleeps": "uyumak", "sweetly": "tatlı tatlı",
            "pet": "okşamak", "it": "o", "starts": "başlamak", "purring": "mırıldanmak", "immediately": "derhal", "sweetest": "en tatlı",
            "joy": "neşe", "home": "ev", "woke": "uyanmak", "early": "erken", "morning": "sabah", "prepared": "hazırlamak",
            "backpack": "sırt çantası", "together": "birlikte", "mom": "anne", "set": "kurmak / yola çıkmak", "off": "uzak",
            "road": "yol", "way": "yol", "saw": "görmek", "colorful": "renkli", "flowers": "çiçekler", "cute": "sevimli",
            "dogs": "köpekler", "entered": "girmek", "wished": "dilemek", "bright": "parlak", "day": "gün", "huge": "kocaman",
            "green": "yeşil", "behind": "arkasında", "smelling": "kokan", "roses": "güller", "apple": "elma", "trees": "ağaçlar",
            "grow": "yetişmek", "every": "her", "evening": "akşam", "skip": "atlamak", "rope": "ip", "sing": "şarkı söylemek",
            "songs": "şarkılar", "cheerfully": "neşeyle", "wind": "rüzgar", "blowing": "esmek", "very": "çok", "nicely": "güzelce",
            "today": "bugün", "kites": "uçurtmalar", "gliding": "süzülmek", "blue": "mavi", "sky": "gökyüzü", "tailed": "kuyruklu",
            "kite": "uçurtma", "made": "yapmak", "own": "kendi", "hands": "eller", "reached": "ulaşmak", "highest": "en yüksek",
            "points": "noktalar", "dog": "köpek", "pamuk": "pamuk", "greets": "selamlamak", "door": "kapı", "shaking": "sallamak",
            "head": "baş", "catch": "yakalamak", "makes": "yapmak", "rest": "dinlenmek", "next": "yanında", "bed": "yatak",
            "opened": "açmak", "colored": "renkli", "pencils": "kalemler", "drew": "çizmek", "picture": "resim", "smoke": "duman",
            "coming": "gelmek", "out": "dışarı", "chimney": "baca", "children": "çocuklar", "liked": "beğenmek", "rain": "yağmur",
            "stopped": "durmak", "smell": "koku", "soil": "toprak", "air": "hava", "looked": "bakmak", "outside": "dışarıda",
            "through": "vasıtasıyla", "window": "pencere", "rainbow": "gökkuşağı", "jumped": "atlamak", "night": "gece",
            "watched": "izlemek", "shining": "parlayan", "stars": "yıldızlar", "moon": "ay", "seemed": "gibi görünmek",
            "smile": "gülümsemek", "dreams": "rüyalar", "wrapped": "sarmak", "blanket": "battaniye", "slept": "uyumak",
            "peacefully": "huzurla", "birds": "kuşlar", "nest": "yuva", "branch": "dal", "walnut": "ceviz", "throw": "atmak",
            "bread": "ekmek", "crumbs": "kırıntılar", "chirping": "cıvıltı", "weekend": "hafta sonu", "lush": "gür", "far": "uzak",
            "city": "şehir", "family": "aile", "walking": "yürümek", "pine": "çam", "noticed": "fark etmek", "squirrels": "sincaplar",
            "hiding": "saklamak", "nuts": "fındık", "took": "almak", "deep": "derin", "breath": "nefes", "fresh": "taze",
            "nature": "doğa", "peace": "huzur", "happiness": "mutluluk", "tiny": "minik", "seed": "tohum", "hidden": "gizli",
            "sleep": "uyku", "spring": "ilkbahar", "rains": "yağmurlar", "felt": "hissetmek", "warm": "ılık", "rays": "ışınlar",
            "slowly": "yavaşça", "stretched": "uzanmak", "upward": "yukarı", "sprouted": "filizlenmek", "leaves": "yapraklar",
            "plant": "bitki", "earthworms": "solucanlar", "loosened": "gevşetmek", "ground": "zemin", "roots": "kökler",
            "breathe": "nefes almak", "easily": "kolayca", "drops": "damlalar", "dew": "çiy", "refreshed": "tazelenmek",
            "petals": "taç yapraklar", "dawn": "şafak", "soon": "yakında", "bees": "arılar", "nectar": "nektar", "realized": "fark etmek",
            "truly": "gerçekten", "grow": "büyümek", "patience": "sabır", "love": "sevgi", "courage": "cesaret", "grass": "çimen",
            "billions": "milyarlarca", "wishes": "dilekler", "shooting": "kayan", "depths": "derinlikler", "space": "uzay",
            "secret": "sır", "grandfather": "büyükbaba", "tells": "anlatmak", "old": "eski", "stories": "hikayeler",
            "constellations": "takımyıldızları", "explorers": "kaşifler", "telescope": "teleskop", "craters": "kraterler",
            "crickets": "cırcır böcekleri", "quiet": "sessiz", "nighttime": "gece vakti", "lullaby": "ninni", "background": "arka plan",
            "clears": "temizlemek", "daily": "günlük", "tiredness": "yorgunluk", "gazing": "bakakalmak", "infinite": "sonsuz",
            "universe": "evren", "reminds": "hatırlatmak", "small": "küçük", "special": "özel", "vast": "geniş", "magnificent": "muhteşem",
            "creation": "yaratılış", "cows": "inekler", "sheep": "koyunlar", "ducks": "ördekler", "collect": "toplamak",
            "eggs": "yumurtalar", "coop": "kümes", "running": "koşmak", "amazing": "şaşırtıcı", "energy": "enerji",
            "friendly": "dost", "joins": "katılmak", "wooden": "ahşap", "barn": "ahır", "feed": "beslemek", "fluffy": "tüylü",
            "white": "beyaz", "afternoon": "öğleden sonra", "help": "yardım etmek", "water": "su / sulamak", "vegetable": "sebze",
            "juicy": "sulu", "tomatoes": "domatesler", "cucumbers": "salatalıklar", "country": "kırsal", "teaches": "öğretmek",
            "value": "değer", "simplicity": "sadelik", "sunset": "gün batımı", "paints": "boyamak", "shades": "tonlar",
            "orange": "turuncu", "purple": "mor", "vacation": "tatil", "beach": "plaj", "sandcastles": "kumdan kaleler",
            "listening": "dinlemek", "sound": "ses", "waves": "dalgalar", "shore": "sahil", "relaxes": "rahatlatmak",
            "person": "kişi", "collected": "toplamak", "seashells": "deniz kabukları", "kept": "saklamak", "souvenirs": "hatıra",
            "seagulls": "martılar", "flew": "uçmak", "gracefully": "zarifçe", "above": "üzerinde", "turquoise": "turkuaz",
            "searching": "aramak", "father": "baba", "taught": "öğretmek", "swim": "yüzmek", "safely": "güvenle", "shallow": "sığ",
            "shorelines": "kıyı şeridi", "eating": "yemek", "cold": "soğuk", "watermelon": "karpuz", "umbrella": "şemsiye",
            "arrived": "varmak", "walked": "yürümek", "along": "boyunca", "sandy": "kumlu", "coastline": "sahil şeridi",
            "smooth": "pürüzsüz", "pebbles": "çakıl taşları", "breeze": "rüzgar", "carried": "taşımak", "salty": "tuzlu",
            "scent": "koku", "adventure": "macera", "endless": "sonsuz", "freedom": "özgürlük", "hearts": "kalpler",
            "thousands": "binlerce", "interesting": "ilginç", "library": "kütüphane", "sat": "oturmak", "quietly": "sessizce",
            "table": "masa", "turned": "çevirmek", "pages": "sayfalar", "full": "dolu", "librarian": "kütüphaneci",
            "finding": "bulmak", "fascinating": "büyüleyici", "dinosaur": "dinozor", "fossils": "fosiller", "tapped": "vurmak",
            "softly": "yumuşakça", "tall": "uzun", "glass": "cam", "explored": "keşfetmek", "ancient": "antik", "history": "tarih",
            "room": "oda", "brings": "getirmek", "inner": "iç", "expands": "genişletmek", "imagination": "hayal gücü",
            "borrowed": "ödünç almak", "finish": "bitirmek", "loyal": "sadık", "silent": "sessiz", "leave": "terk etmek",
            "alone": "yalnız", "thickly": "yoğun", "drifted": "sürüklenmek", "snowman": "kardan adam", "nose": "burun",
            "carrot": "havuç", "woolen": "yünlü", "scarf": "atkı", "neighborhood": "mahalle", "kids": "çocuklar", "gathered": "toplanmak",
            "exciting": "heyecan verici", "snowball": "kartopu", "fight": "oyun", "filled": "dolu", "laughter": "gülüş",
            "cheeks": "yanaklar", "rosy": "pembe", "freezing": "dondurucu", "heart": "kalp", "warm": "sıcak", "joyful": "neşeli",
            "magical": "sihirli", "landscapes": "manzaralar", "transform": "dönüştürmek", "ordinary": "sıradan", "streets": "sokaklar",
            "enchanted": "büyülü", "fairy": "peri", "tale": "masal", "kingdoms": "krallıklar", "pure": "saf", "childhood": "çocukluk",
            "wonder": "merak", "tour": "tur", "park": "park", "bicycle": "bisiklet", "hit": "çarpmak", "face": "yüz",
            "free": "özgür", "balance": "denge", "pedaled": "pedal çevirmek", "smoothly": "düzgünce", "paved": "asfalt",
            "path": "patika", "lined": "sıralanmış", "oak": "meşe", "passing": "geçerken", "playground": "oyun alanı",
            "waved": "el sallamak", "swings": "salıncaklar", "requires": "gerektirmek", "attention": "dikkat", "steady": "istikrarlı",
            "coordination": "koordinasyon", "top": "zirve", "hill": "tepe", "view": "manzara", "entire": "bütün",
            "breathtaking": "nefes kesici", "cycling": "bisiklet sürmek", "healthy": "sağlıklı", "exercise": "egzersiz",
            "incredible": "inanılmaz", "outdoor": "açık hava", "museum": "müze", "center": "merkez", "imagined": "hayal etmek",
            "happened": "olmak", "past": "geçmiş", "swords": "kılıçlar", "kings": "krallar", "coins": "paralar",
            "knowledgeable": "bilgili", "guide": "rehber", "explained": "açıklamak", "people": "insanlar", "stone": "taş",
            "pottery": "çömlek", "vessels": "kaplar", "decorated": "bezeli", "unique": "eşsiz", "geometric": "geometrik",
            "patterns": "desenler", "standing": "durmak", "front": "ön", "giant": "dev", "mammoth": "mamut", "skeleton": "iskelet",
            "realize": "fark etmek", "planet": "gezegeni", "changed": "değişmek", "over": "boyunca", "preserving": "korumak",
            "cultural": "kültürel", "heritage": "miras", "future": "gelecek", "generations": "nesiller", "exploring": "keşfetmek",
            "artifacts": "eserler", "connects": "bağlamak", "present": "şimdiki", "identity": "kimlik", "deeply": "derinden",
            "roots": "kökler", "civilization": "medeniyet", "throughout": "boyunca", "human": "insan", "greatest": "en büyük",
            "force": "güç", "driving": "iten", "forward": "ileri", "curiosity": "merak", "if": "eğer", "not": "değil",
            "questioned": "sorgulamak", "falling": "düşen", "gravity": "yerçekimi", "might": "möknep/olabilir", "discovered": "keşfetmek",
            "much": "çok", "later": "sonra", "scientists": "bilim insanları", "work": "çalışmak", "night": "gece",
            "laboratories": "laboratuvarlar", "lives": "yaşamlar", "easier": "daha kolay", "must": "zorunda olmak",
            "also": "ayrıca", "events": "olaylar", "around": "etrafında", "constantly": "sürekli", "research": "araştırma yapmak",
            "knowledge": "bilgi", "power": "güç", "changes": "değiştirmek", "world": "dünya", "single": "tek", "invention": "icat",
            "modern": "modern", "society": "toplum", "relies": "güvenmek/dayanmak", "upon": "üzerine", "started": "başlamak",
            "simple": "basit", "childlike": "çocuksu", "asked": "sormak", "someone": "biri", "dared": "cesaret etmek",
            "why": "neden", "happen": "olmak", "breaks": "kırmak", "walls": "duvarlar", "ignorance": "cehalet", "opens": "açmak",
            "doors": "kapılar", "infinite": "sonsuz", "possibilities": "olasılıklar", "encouraging": "teşvik etmek",
            "young": "genç", "minds": "zihinler", "explore": "keşfetmek", "scientific": "bilimsel", "principles": "ilkeler",
            "ensures": "sağlamak", "continuous": "sürekli", "progress": "gelişme", "medical": "tıbbi", "breakthroughs": "atılımlar",
            "technological": "teknolojik", "evolution": "evrim", "humanity": "insanlık", "scarcest": "en kıt", "unrecoverable": "geri alınamaz",
            "resource": "kaynak", "money": "para", "lost": "kayıp", "earned": "kazanılmak", "second": "saniye", "passes": "geçmek",
            "back": "geri", "therefore": "bu yüzden", "live": "yaşamak", "days": "günler", "planned": "planlı",
            "efficient": "verimli", "manner": "biçim", "focusing": "odaklanmak", "studying": "ders çalışmak", "giving": "vermek",
            "proper": "uygun", "creates": "oluşturmak", "balance": "denge", "procrastination": "erteleme", "enemy": "düşman",
            "personal": "kişisel", "success": "başarı", "inner": "iç", "prioritizing": "önceliklendirmek", "tasks": "görevler",
            "eliminating": "ortadan kaldırmak", "unnecessary": "gereksiz", "distractions": "dikkat dağıtıcılar", "achieve": "elde etmek",
            "remarkable": "dikkat çekici", "goals": "hedefler", "feeling": "hissetmek", "constantly": "sürekli", "overwhelmed": "bunalmış",
            "wise": "bilge", "individuals": "bireyler", "treat": "davranmak / ele almak", "hour": "saat", "precious": "değerli",
            "investment": "yatırım", "managing": "yönetmek", "effectively": "etkili bir şekilde", "childhood": "çocukluk",
            "builds": "inşa etmek", "strong": "güçlü", "foundation": "temel", "disciplined": "disiplinli", "fulfilling": "doyurucu",
            "adult": "yetişkin", "true": "gerçek", "cries": "ağlamak", "bad": "kötü", "shares": "paylaşmak", "laughter": "gülüş",
            "reliable": "güvenilir", "troubles": "sorunlar", "luxury": "lüks", "mutual": "karşılıklı", "trust": "güven",
            "open": "açık", "communication": "iletişim", "unconditional": "koşulsuz", "support": "destek", "form": "oluşturmak",
            "unbreakable": "kırılmaz", "pillars": "direkler", "lasting": "kalıcı", "relationships": "ilişkiler", "crisis": "kriz",
            "genuine": "samimi", "stands": "durmak", "firmly": "sıkıca", "beside": "yanında", "like": "gibi", "unshakeable": "sarsılmaz",
            "mountain": "dağ", "social": "sosyal", "bonds": "bağlar", "teaches": "öğretmek", "empathy": "empati", "patience": "sabır",
            "art": "sanat", "compromise": "uzlaşma", "choose": "seçmek", "companions": "arkadaşlar", "wisely": "akıllıca",
            "keeping": "tutmak", "close": "yakın", "inspire": "ilham vermek", "versions": "versiyonlar", "cherishing": "değer bilmek",
            "warmth": "sıcaklık", "emotional": "duygusal", "resilience": "direnç", "unexpected": "beklenmedik", "challenge": "zorluk",
            "presents": "sunmak", "protect": "korumak", "sort": "ayıklamak", "garbage": "çöp", "reduce": "azaltmak", "plastic": "plastik",
            "use": "kullanım", "piece": "parça", "thrown": "atılmış", "decay": "çürümek", "centuries": "yüzyıllar", "future": "gelecek",
            "recycling": "geri dönüşüm", "industrial": "endüstriyel", "waste": "atık", "careless": "dikkatsiz", "consumption": "tüketim",
            "habits": "alışkanlıklar", "pushing": "itmek", "natural": "doğal", "ecosystems": "ekosistemler", "toward": "doğru",
            "dangerous": "tehlikeli", "collapse": "çöküş", "governments": "hükümetler", "communities": "topluluklar", "promote": "teşvik etmek",
            "zero": "sıfır", "policies": "politikalar", "carrying": "taşımak", "bags": "çantalar", "reusing": "tekrar kullanmak",
            "glass": "cam", "containers": "kaplar", "saving": "tasarruf etmek", "massive": "devasa", "collective": "kolektif",
            "difference": "fark", "earth": "dünya", "habitable": "yaşanabilir", "cold": "soğuk", "expanse": "genişlik",
            "preserving": "korumak", "pristine": "dokunulmemiş", "beauty": "güzellik", "oceans": "okyanuslar", "forests": "ormanlar",
            "moral": "ahlaki", "responsibility": "sorumluluk", "owe": "borçlu olmak", "enter": "girmek", "second": "ikinci",
            "hand": "el", "shops": "dükkanlar", "paper": "kağıt", "surrounding": "çevreleyen", "comes": "gelmek", "yellowing": "sararma",
            "worn": "yıpranmış", "leather": "deri", "covers": "kapaklar", "tell": "anlatmak", "countless": "sayısız",
            "afternoons": "öğleden sonraları", "spent": "harcanmış", "unlike": "aksine", "digital": "dijital", "screens": "ekranlar",
            "physical": "fiziksel", "carry": "taşımak", "tangible": "somut", "connection": "bağlantı", "transcends": "ötesine geçmek",
            "decades": "on yıllar", "bibliophiles": "kitap kurtları", "unmatched": "eşsiz", "comfort": "konfor", "towering": "yükselen",
            "shelves": "raflar", "filled": "dolu", "forgotten": "unutulmuş", "poetry": "şiir", "accounts": "hesaplar",
            "classic": "klasik", "novels": "romanlar", "turn": "dönüş / sayfa çevirmek", "releases": "salmak", "microscopic": "mikroskobik",
            "fragments": "parçalar", "aging": "yaşlanan", "ink": "mürekkep", "organic": "organik", "compounds": "bileşikler",
            "stimulate": "uyarmak", "nostalgia": "nostalji", "traditional": "geleneksel", "libraries": "kütüphaneler", "ensures": "garantilemek",
            "tactile": "dokunulabilir", "magic": "sihir", "literature": "edebiyat", "remains": "kalmak", "alive": "canlı",
            "smart": "akıllı", "devices": "cihazlar", "reach": "ulaşmak", "information": "bilgi", "side": "taraf", "seconds": "saniye",
            "however": "ancak", "spending": "harcamak", "weaken": "zayıflatmak", "health": "sağlık", "addiction": "bağımlılık",
            "barriers": "engeller", "members": "üyeler", "living": "yaşayan", "roof": "çatı", "innovations": "yenilikler",
            "simplify": "basitleştirmek", "complex": "karmaşık", "demand": "talep etmek", "conscious": "bilinçli", "regulation": "düzenleme",
            "users": "kullanıcılar", "balancing": "dengelemek", "online": "çevrimiçi", "activities": "aktiviteler", "crucial": "çok önemli",
            "maintaining": "sürdürmek", "mental": "zihinsel", "ocular": "göz", "master": "ustalaşmak", "tools": "araçlar",
            "letting": "izin vermek", "algorithms": "algoritmalar", "control": "kontrol etmek", "attention": "dikkat", "spans": "süreler",
            "using": "kullanmak", "empowers": "güçlendirmek", "education": "eğitim", "preserving": "korumak", "fundamental": "temel",
            "capacity": "kapasite", "uninterrupted": "kesintisiz", "concentration": "odaklanma", "genuine": "gerçek", "face": "yüz",
            "solar": "güneş", "system": "sistem", "mercury": "merkür", "closest": "en yakın", "largest": "en büyük", "gas": "gaz",
            "giant": "dev", "jupiter": "jüpiter", "spheres": "küreler", "spinning": "dönen", "vacuum": "boşluk", "focus": "odak",
            "astronomers": "gökbilimciler", "venus": "venüs", "shines": "parlamak", "brightly": "parlak bir şekilde", "star": "yıldız",
            "despite": "rağmen", "crushing": "ezici", "atmosphere": "atmosfer", "carbon": "karbon", "dioxide": "dioksit",
            "mars": "mars", "features": "barındırmak", "rusty": "paslı", "deserts": "çöller", "towering": "yükselen", "volcanoes": "volkanlar",
            "invite": "davet etmek", "exploration": "keşif", "farther": "daha uzak", "icy": "buzlu", "uranus": "uranüs", "neptune": "neptün",
            "rotate": "dönmek", "perpetual": "daimi", "darkness": "karanlık", "freezing": "dondurucu", "temperatures": "sıcaklıklar",
            "studying": "incelemek", "planetary": "gezegensel", "formation": "oluşum", "helps": "yardım etmek", "understand": "anlamak",
            "origins": "kökenler", "rare": "nadir", "conditions": "koşullar", "required": "gerekli", "support": "desteklemek",
            "biological": "biyolojik", "endless": "sonsuz", "gallery": "galeri", "breathtaking": "nefes kesici", "cosmic": "kozmik",
            "wonders": "harikalar", "waiting": "beklemek", "curious": "meraklı", "wandering": "dolaşmak", "note": "nota",
            "clouds": "bulutlar", "effective": "etkili", "method": "yöntem", "relax": "rahatlatmak", "soul": "ruh", "mozart": "mozart",
            "beethoven": "beethoven", "minds": "zihinler", "clearing": "arındırmak", "focusing": "odaklanmak", "melodies": "melodiler",
            "mysterious": "gizemli", "ability": "yetenek", "express": "ifade etmek", "emotions": "duygular", "ordinary": "sıradan",
            "words": "kelimeler", "fail": "başarısız olmak", "capture": "yakalamak", "music": "müzik", "accompanied": "eşlik etmek",
            "religious": "dini", "ceremonies": "törenler", "military": "askeri", "victories": "zaferler", "joyful": "neşeli",
            "cultural": "kültürel", "celebrations": "kutlamalar", "playing": "çalmak", "instrument": "enstrüman", "trains": "eğitmek",
            "brain": "beyin", "enhances": "geliştirmek", "mathematical": "matematiksel", "intuition": "sezgi", "fosters": "teşvik etmek",
            "profound": "derin", "intelligence": "zeka", "whether": "ister", "soft": "yumuşak", "acoustic": "akustik", "rhythms": "ritimler",
            "powerful": "güçlü", "orchestral": "orkestra", "symphonies": "senfoniler", "elevates": "yükseltmek", "consciousness": "bilinç",
            "incorporating": "dahil etmek", "appreciation": "takdir", "routines": "rutinler", "sanctuary": "sığınak", "rushing": "koşuşturmaca",
            "noise": "gürültü", "constant": "sabit", "stress": "stres", "heavy": "ağır", "pressures": "baskılar", "civilization": "medeniyet",
            "regular": "düzenli", "exercise": "egzersiz", "strengthens": "güçlendirmek", "muscles": "kaslar", "refreshes": "tazele",
            "protects": "korumak", "immune": "bağışıklık", "system": "sistem", "individuals": "bireyler", "energetic": "enerjik",
            "happy": "mutlu", "team": "takım", "lessons": "dersler", "regarding": "ile ilgili", "leadership": "liderlik",
            "discipline": "disiplin", "tactical": "taktik", "collaboration": "işbirliği", "graceful": "zarif", "sportsmanship": "sportmenlik",
            "activity": "aktivite", "stimulates": "tetiklemek", "release": "salgılamak", "endorphins": "endorfin", "naturally": "doğal olarak",
            "reduce": "azaltmak", "anxiety": "kaygı", "elevate": "yükseltmek", "general": "genel", "mood": "ruh hali", "sedentary": "sedanter/hareketsiz",
            "lifestyles": "yaşam tarzları", "lead": "yol açmak", "numerous": "sayısız", "complications": "komplikasyonlar", "easily": "kolayca",
            "avoided": "kaçınılmak", "consistent": "tutarlı", "movement": "hareket", "playing": "oynamak", "basketball": "basketbol",
            "swimming": "yüzmek", "laps": "tur", "practicing": "pratik yapmak", "martial": "dövüş", "arts": "sanatlar", "finding": "bulmak",
            "genuinely": "gerçekten", "transforms": "dönüştürmek", "fitness": "zindelik", "hobby": "hobi", "investing": "yatırım yapmak",
            "guarantees": "garanti etmek", "vibrant": "canlı", "resilient": "dirençli", "long": "uzun", "lasting": "kalıcı",
            "quality": "kalite", "stray": "sahipsiz", "animal": "hayvan", "meet": "karşılaşmak", "elderly": "yaşlı", "neighbor": "komşu",
            "love": "sevgi", "rare": "nadir", "emotion": "duygu", "grows": "büyümek", "shared": "paylaşılan", "gestures": "jestler",
            "leave": "bırakmak", "permanent": "kalıcı", "impacts": "etkiler", "someone": "biri", "struggling": "mücadele etmek",
            "difficult": "zor", "compassion": "şefkat", "requires": "gerektirmek", "special": "özel", "financial": "maddi",
            "wealth": "servet", "open": "açık", "heart": "kalp", "willingness": "isteklilik", "care": "önemsemek", "practice": "pratik yapmak",
            "consistently": "istikrarlı bir şekilde", "transform": "dönüştürmek", "safe": "güvenli", "supportive": "destekleyici",
            "havens": "sığınaklar", "respect": "saygı", "kind": "nazik", "act": "davranmak", "healing": "iyileştirici", "medicine": "ilaç",
            "wounded": "yaralı", "spirits": "ruhlar", "lonely": "yalnız", "cultivating": "geliştirmek", "altruism": "diğerkâmlık",
            "cooperation": "işbirliği", "triumphs": "zafer kazanmak", "selfishness": "bencillik", "spreading": "yaymak", "boundless": "sınırsız",
            "light": "ışık", "lands": "topraklar", "hosted": "ev sahipliği yapmak", "civilizations": "medeniyetler", "thousands": "binlerce",
            "years": "yıllar", "hittites": "hititler", "phrygians": "frigler", "lydians": "lidyalısı", "byzantines": "bizanslılar",
            "ottomans": "osmanlılar", "culture": "kültür", "left": "bırakmak", "mark": "iz", "examine": "incelemek", "historical": "tarihi",
            "ruins": "kalıntılar", "admire": "hayran olmak", "advanced": "gelişmiş", "ancestors": "atalar", "trade": "ticaret",
            "architecture": "mimari", "heritage": "miras", "common": "ortak", "treasure": "hazine", "protect": "korumak",
            "archaeological": "arkeolojik", "excavations": "kazılar", "continuously": "sürekli", "unearth": "ortaya çıkarmak",
            "astonishing": "şaşırtıcı", "artifacts": "eserler", "rewrite": "yeniden yazmak", "textbooks": "ders kitapları",
            "reveal": "ortaya çıkarmak", "forgotten": "unutulmuş", "secrets": "sırlar", "early": "erken", "urban": "şehir",
            "cuneiform": "çivi yazısı", "tablets": "tabletler", "detail": "detaylandırmak", "sophisticated": "gelişmiş", "legal": "yasal",
            "systems": "sistemler", "merchants": "tüccarlar", "invented": "icat etmek", "very": "çok", "metallic": "metalik",
            "coinage": "madeni para", "simplify": "basitleştirmek", "commerce": "ticaret", "preserving": "korumak", "magnificent": "muhteşem",
            "open": "açık", "air": "hava", "museums": "müzeler", "connects": "bağlamak", "directly": "doğrudan", "rich": "zengin",
            "roots": "kökler", "living": "yaşayan", "things": "şeyler", "form": "oluşturmak", "chain": "zincir", "woven": "dokunmuş",
            "invisible": "görünmez", "ties": "bağlar", "bees": "arılar", "pollinating": "tozlaştıran", "reproduction": "üreme",
            "source": "kaynak", "herbivorous": "otçul", "delicate": "hassas", "extinction": "neslin tükenmesi", "species": "tür",
            "shake": "sarsmak", "ecosystem": "ekosistem", "predators": "yırtıcılar", "keep": "tutmak", "populations": "popülasyonlar",
            "control": "kontrol", "preventing": "önlemek", "overgrazing": "aşırı otlatma", "subsequent": "ardından gelen",
            "erosion": "erozyon", "forests": "ormanlar", "act": "gibi davranmak / rol oynamak", "giant": "dev", "sinks": "yutanlar",
            "purify": "arıtmak", "atmospheric": "atmosferik", "regulate": "düzenlemek", "global": "küresel", "rainfall": "yağış",
            "patterns": "modeller", "industrial": "endüstriyel", "expansion": "genişleme", "deforestation": "ormansızlaşma",
            "pollution": "kirlilik", "threaten": "tehdit etmek", "vital": "hayati", "interdependencies": "karşılıklı bağımlılık",
            "severely": "ciddi şekilde", "endangered": "nesli tükenmekte olan", "wildlife": "yaban hayatı", "habitats": "yaşam alanları",
            "enforcing": "uygulamak", "strict": "katı", "environmental": "çevresel", "laws": "yasalar", "mandatory": "zorunlu",
            "maintain": "sürdürmek", "stability": "istikrar", "organism": "organizma", "plays": "oynamak", "irreplaceable": "yeri doldurulamaz",
            "role": "rol", "keeping": "tutmak", "biological": "biyolojik", "network": "ağ", "thriving": "gelişen", "pigeons": "güvercinler",
            "lit": "yakmak", "fires": "ateşler", "mountains": "dağlar", "printing": "baskı", "press": "matbaa", "followed": "takip etmek",
            "phone": "telefon", "internet": "internet", "era": "çağ", "fingertips": "parmak uçlarının ucunda", "revolutionary": "devrim niteliğinde",
            "liberated": "özgürleştirmek", "exclusive": "özel", "monastery": "manastır", "walls": "duvarlar", "accessible": "erişilebilir",
            "ordinary": "sıradan", "citizens": "vatandaşlar", "telegraph": "telgraf", "cables": "kablolar", "spanned": "uzanmak",
            "oceans": "okyanuslar", "shrinking": "daraltmak", "distances": "mesafeler", "accelerating": "hızlandırmak", "international": "uluslararası",
            "digital": "dijital", "revolution": "devrim", "interaction": "etkileşim", "entirely": "tamamen", "connecting": "bağlamak",
            "instantaneously": "anında", "continents": "kıta", "while": "iken", "connectivity": "bağlanabilirlik", "unprecedented": "görülmemiş",
            "educational": "eğitsel", "advantages": "avantajlar", "raises": "ortaya çıkarmak", "serious": "ciddi", "concerns": "endişeler",
            "privacy": "gizlilik", "misinformation": "yanlış bilgi", "decline": "düşüş", "dialogue": "diyalog", "contemporary": "çağdaş",
            "depletion": "tükenme", "fossil": "fosil", "fuels": "yakıtlar", "warming": "ısınma", "biggest": "en büyük", "threats": "tehditler",
            "endangering": "tehlikeye atmak", "turning": "kapatmak", "unnecessary": "gereksiz", "lights": "ışıklar", "wasting": "israf etmek",
            "transitioning": "geçiş yapmak", "renewable": "yenilenebilir", "power": "güç", "turbines": "türbinler", "urgent": "acil",
            "priority": "öncelik", "efficiency": "verimlilik", "manufacturing": "üretim", "domestic": "evsel", "appliances": "cihazlar",
            "significantly": "önemli ölçüde", "footprints": "ayak izleri", "sacrificing": "fedakarlık yapmak", "standards": "standartlar",
            "public": "kamu", "awareness": "farkındalık", "campaigns": "kampanyalar", "educate": "eğitmek", "catastrophic": "felaket niteliğinde",
            "economic": "ekonomik", "costs": "maliyetler", "wasteful": "israfçı", "conserving": "korumak", "ensures": "garantilemek",
            "prosperity": "refah", "upcoming": "yaklaşan", "individual": "bireysel", "action": "eylem", "contributes": "katkıda bulunmak",
            "shared": "paylaşılan", "permanent": "kalıcı", "degradation": "bozulma", "paints": "boyamak", "poured": "dökülmüş",
            "canvas": "tuval", "sculpture": "heykel", "carved": "oyulmuş", "marble": "mermer", "express": "ifade etmek",
            "beyond": "ötesinde", "realm": "diyar", "liberated": "özgürleşmiş", "aesthetic": "estetik", "perception": "algı",
            "peak": "zirve", "masterpieces": "başyapıtlar", "legendary": "efsanevi", "painters": "ressamlar", "capture": "yakalamak",
            "trauma": "travma", "spiritual": "ruhsal", "euphoria": "coşku", "existential": "varoluşsal", "questions": "sorular",
            "visual": "görsel", "form": "biçim", "therapy": "terapi", "successfully": "başarıyla", "heals": "iyileştirmek",
            "psychological": "psikolojik", "wounds": "yaralar", "traditional": "geleneksel", "clinical": "klinik", "treatments": "tedaviler",
            "struggle": "mücadele etmek", "visiting": "ziyaret etmek", "galleries": "galeriler", "exposes": "maruz bırakmak",
            "diverse": "çeşitli", "perspectives": "perspektifler", "challenges": "meydan okumak", "conventional": "geleneksel",
            "thinking": "düşünme", "creative": "yaratıcı", "expression": "ifade", "nurtures": "beslemek", "viewers": "izleyiciler",
            "innermost": "en içteki", "sorrows": "üzüntüler", "strangers": "yabancılar", "fostering": "teşvik etmek", "schools": "okullar",
            "cultivates": "yetiştirmek", "imaginative": "hayal güçleri yüksek", "emotionally": "duygusal olarak", "mature": "olgun",
            "reflective": "düşünceli", "capable": "kadir", "transforming": "dönüştürmek", "piri": "piri", "reis": "reis",
            "drawn": "çizilmiş", "centuries": "yüzyıllar", "ago": "önce", "amazes": "şaşırtmak", "compasses": "pusulalar",
            "guided": "rehberlik etmek", "sailors": "denizciler", "unknown": "bilinmeyen", "cartography": "haritacılık",
            "evolved": "evrilmek", "crude": "ilkel", "drawings": "çizimler", "skins": "deriler", "satellite": "uydu",
            "navigators": "gezginler / navigatörler", "mapmakers": "haritacılar", "relied": "güvenmek", "adventurous": "maceracı",
            "traveler": "gezgin", "celestial": "göksel", "observations": "gözlemler", "sheer": "saf", "intuition": "sezgi",
            "chart": "haritalamak", "uncharted": "haritası çıkarılmamış", "documents": "belgeler", "represent": "temsil etmek",
            "monumental": "anıtsal", "achievements": "başarılar", "observation": "gözlem", "fearless": "korkusuz", "geographical": "coğrafi",
            "digital": "dijital", "real": "gerçek", "time": "zaman", "traffic": "trafik", "updates": "güncellemeler",
            "detailed": "detaylı", "three": "üç", "dimensional": "boyutlu", "terrain": "arazi", "instantly": "anında",
            "yet": "yine de", "vintage": "nostaljik / antika", "parchment": "parşömen", "awakens": "uyandırmak", "romantic": "romantik",
            "sense": "his", "mystery": "gizem", "territories": "topraklar", "fascinating": "büyüleyici", "two": "iki",
            "thirds": "üçte biri", "covered": "kaplı", "water": "su", "little": "çok az", "floors": "zeminler", "dark": "karanlık",
            "sunlight": "güneş ışığı", "reach": "ulaşmak", "strange": "garip", "creatures": "canlılar", "deep": "derin",
            "sea": "deniz", "trenches": "hendekler", "mariana": "mariana", "harbor": "barındırmak", "bizarre": "tuhaf",
            "forms": "formlar", "adapted": "adapte olmuş", "extreme": "aşırı", "pressure": "basınç", "hydrothermal": "hidrotermal",
            "vents": "bacalar", "spew": "püskürtmek", "mineral": "mineral", "rich": "zengin", "supporting": "desteklemek",
            "independent": "bağımsız", "currents": "akıntılar", "circulate": "dolaşmak", "immense": "muazzam", "volumes": "hacimler",
            "heat": "ısı", "globe": "küre", "regulating": "düzenleyen", "weather": "hava durumu", "distribution": "dağılım",
            "overfishing": "aşırı avlanma", "pose": "oluşturmak", "grave": "ciddi", "dangers": "tehlikeler", "fragile": "kırılgan",
            "biodiversity": "biyoçeşitlilik", "intensive": "yoğun", "scientific": "bilimsel", "research": "araştırma",
            "conservation": "koruma", "treaty": "anlaşma", "vital": "hayati", "safeguard": "güvenceye almak", "greece": "yunanistan",
            "philosophers": "filozoflar", "socrates": "sokrat", "plato": "platon", "enlightened": "aydınlatmak", "mind": "zihin",
            "philosophy": "felsefe", "know": "bilmek", "thyself": "kendini", "routine": "rutin", "critical": "eleştirel",
            "allows": "izin vermek", "examine": "incelemek", "underlying": "temel", "assumptions": "varsayımlar", "evaluate": "değerlendirmek",
            "evidence": "kanıt", "objectively": "nesnel olarak", "avoid": "kaçınmak", "dogmatic": "dogmatik", "fallacies": "yanılgılar",
            "encourages": "teşvik etmek", "reflection": "düşünce", "concerning": "ilgili", "justice": "adalet", "morality": "ahlak",
            "truth": "gerçek", "meaning": "anlam", "existence": "varoluş", "socratic": "sokratik", "method": "yöntem", "uses": "kullanmak",
            "probing": "derinlemesine", "dialogue": "diyalog", "stimulate": "teşvik etmek", "rational": "rasyonel", "expose": "ortaya çıkarmak",
            "contradictions": "çelişkiler", "arguments": "argümanlar", "engaging": "meşgul olmak", "texts": "metinler",
            "strengthens": "güçlendirmek", "logical": "mantıksal", "reasoning": "akıl yürütme", "intellectual": "entelektüel",
            "humility": "alçakgönüllülük", "cultivating": "geliştirmek", "mindset": "zihniyet", "transforms": "dönüştürmek",
            "passive": "pasif", "observers": "gözlemciler", "active": "aktif", "wise": "bilge", "participants": "katılımcılar",
            "capable": "kadir", "guiding": "rehberlik etmek", "ethical": "etik", "progress": "ilerleme", "profound": "derin",
            "clarity": "açıklık", "history": "tarih", "certain": "belirli", "ignited": "ateşlemek", "revolutions": "devrimler",
            "led": "yönlendirmek", "masses": "kitleler", "ideas": "fikirler", "sharper": "daha keskin", "sword": "kılıç",
            "literature": "edebiyat", "challenged": "meydan okumak", "oppressive": "baskıcı", "regimes": "rejimler", "exposed": "ifşa etmek",
            "injustices": "adaletsizlikler", "inspired": "ilham vermek", "universal": "evrensel", "author": "yazar", "captures": "yakalamak",
            "words": "kelimeler", "transcend": "aşmak", "temporal": "zamansal", "boundaries": "sınırlar", "unite": "birleştirmek",
            "readers": "okuyucular", "globally": "küresel çapta", "censorship": "sansür", "target": "hedef almak", "recognize": "tanımak",
            "independent": "bağımsız", "thought": "düşünce", "expansive": "geniş", "broadens": "genişletmek", "vocabulary": "kelime hazinesi",
            "sharpens": "keskinleştirmek", "skills": "beceriler", "deepens": "derinleştirmek", "psychological": "psikolojik",
            "empathy": "empati", "marginalized": "ötekileştirilmiş", "communities": "topluluklar", "serve": "hizmet etmek",
            "timeless": "zamansız", "beacons": "fenerler", "wisdom": "bilgelik", "illuminating": "aydınlatan", "darkest": "en karanlık",
            "corridors": "koridorlar", "enduring": "kalıcı", "hope": "umut", "melting": "erime", "polar": "kutup", "ice": "buz",
            "caps": "tabakaları", "shifting": "değişen", "seasons": "mevsimler", "clear": "net", "indicators": "göstergeler",
            "sounding": "alarm vermek", "alarm": "alarm", "countries": "ülkeler", "take": "almak", "implement": "uygulamak",
            "joint": "ortak", "decisions": "kararlar", "emissions": "emisyonlar", "extreme": "aşırı", "weather": "hava",
            "prolonged": "uzun süreli", "droughts": "kuraklıklar", "devastating": "yıkıcı", "fires": "yangınlar", "demonstrate": "göstermek",
            "immediate": "acil", "severity": "şiddet", "imbalance": "dengesizlik", "warn": "uyarmak", "crossing": "aşmak",
            "tipping": "kritik eşik", "points": "noktalar", "cause": "sebep olmak", "irreversible": "geri dönülemez", "damage": "zarar",
            "food": "gıda", "security": "güvenlik", "habitats": "yaşam alanları", "transitioning": "geçiş yapmak", "away": "uzak",
            "heavy": "ağır", "industries": "endüstriler", "requires": "gerektirmek", "massive": "devasa", "financial": "maddi",
            "investments": "yatırımlar", "political": "siyasi", "cooperation": "işbirliği", "educating": "eğitmek", "ensures": "garantilemek",
            "leaders": "liderler", "prioritize": "öncelik vermek", "environmental": "çevresel", "stewardship": "sahiplenme",
            "short": "kısa", "term": "vade", "gains": "kazançlar", "saving": "kurtarmak", "ultimate": "nihai", "test": "test",
            "solidarity": "dayanışma", "stars": "yıldızlar", "look": "bakmak", "part": "parça", "immense": "muazzam",
            "magnitude": "büyüklük", "thanks": "sayesinde", "james": "james", "webb": "webb", "telescope": "teleskop",
            "examine": "incelemek", "birth": "doğuş", "galaxies": "galaksiler", "billions": "milyarlarca", "light": "ışık",
            "years": "yıllar", "away": "uzak", "developments": "gelişmeler", "race": "yarış", "rocket": "roket", "technology": "teknoloji",
            "turning": "dönüştürmek", "humanity": "insanlık", "dream": "rüya", "one": "bir", "day": "gün", "establishing": "kurmak",
            "colonies": "koloniler", "different": "farklı", "planets": "gezegenler", "reality": "gerçeklik", "continue": "devam etmek",
            "discover": "keşfetmek", "exoplanets": "ötegezegenler", "solve": "çözmek", "astrophysics": "astrofizik", "combines": "birleştirmek",
            "quantum": "kuantum", "mechanics": "mekanik", "general": "genel", "relativity": "görelilik", "explain": "açıklamak",
            "cosmic": "kozmik", "phenomena": "olgular", "black": "kara", "holes": "delikler", "dark": "karanlık", "matter": "madde",
            "unites": "birleştirmek", "nations": "milletler", "beyond": "ötesinde", "terrestrial": "dünyevi", "conflicts": "çatışmalar",
            "inspiring": "ilham vermek", "shared": "paylaşılan", "interstellar": "yıldızlararası", "destiny": "kader", "boundless": "sınırsız",
            "revolutionary": "devrim niteliğinde", "computer": "bilgisayar", "science": "bilim", "enabled": "olanak tanımak",
            "machines": "makineler", "think": "düşünmek", "artificial": "yapay", "intelligence": "zeka", "systems": "sistemler",
            "rapidly": "hızla", "transforming": "dönüştürmek", "health": "sağlık", "industry": "sanayi", "machine": "makine",
            "algorithms": "algoritmalar", "analyze": "analiz etmek", "datasets": "veri setleri", "instantly": "anında", "diagnosing": "teşhis etmek",
            "medical": "tıbbi", "diseases": "hastalıklar", "far": "çok", "quicker": "daha hızlı", "doctors": "doktorlar", "natural": "doğal",
            "language": "dil", "processing": "işleme", "models": "modeller", "facilitate": "kolaylaştırmak", "seamless": "kusursuz",
            "cross": "kültürlerarası", "cultural": "kültürel", "communication": "iletişim", "automated": "otomatik", "translation": "çeviri",
            "services": "hizmetler", "globally": "küresel çapta", "however": "ancak", "rapid": "hızlı", "automation": "otomasyon",
            "raises": "artırmak", "ethical": "etik", "concerns": "kaygılar", "workforce": "iş gücü", "displacement": "yerinden edilme",
            "algorithmic": "algoritmik", "bias": "önyargı", "autonomous": "otonom", "weapon": "silah", "establishing": "kurmak",
            "robust": "sağlam", "regulatory": "düzenleyici", "frameworks": "çerçeveler", "ensures": "garantilemek", "serves": "hizmet etmek",
            "well": "iyi", "being": "varlık", "safely": "güvenle", "equitably": "adil bir şekilde", "balancing": "dengelemek",
            "innovation": "inovasyon", "responsibility": "sorumluluk", "defines": "tanımlamak", "challenge": "zorluk", "modern": "modern",
            "internet": "internet", "become": "olmak", "global": "küresel", "village": "köy", "borders": "sınırlar", "lifted": "kaldırılmış",
            "recognition": "tanıma", "increases": "artırmak", "tolerance": "hoşgörü", "making": "yapmak", "protection": "koruma",
            "local": "yerel", "values": "değerler", "compulsory": "zorunlu", "multinational": "çok uluslu", "corporations": "şirketler",
            "travel": "seyahat", "media": "medya", "rapid": "hızlı", "exchange": "değişimsel", "ideas": "fikirler", "music": "müzik",
            "culinary": "mutfak", "traditions": "gelenekler", "fosters": "teşvik etmek", "cosmopolitan": "kozmopolit", "awareness": "farkındalık",
            "simultaneously": "aynı anda", "threatens": "tehdit etmek", "indigenous": "yerli", "languages": "diller", "traditional": "geleneksel",
            "lifestyles": "yaşam tarzları", "homogenization": "tekdüzeleşme", "maintaining": "korumak", "requires": "gerektirmek",
            "conscious": "bilinçli", "community": "topluluk", "efforts": "çabalar", "educational": "eğitsel", "programs": "programlar",
            "institutional": "kurumsal", "support": "destek", "embracing": "benimsemek", "multiculturalism": "çok kültürlülük",
            "losing": "kaybetmek", "authentic": "otantik", "identity": "kimlik", "enriches": "zenginleştirmek", "harmonious": "uyumlu",
            "connectivity": "bağlantı", "cherished": "değer verilen", "gobeklitepe": "göbeklitepe", "excavations": "kazılar",
            "turned": "çevirmek", "known": "bilinen", "chronology": "kronoloji", "upside": "tersine", "down": "aşağı", "architecture": "mimari",
            "temples": "tapınaklar", "reliefs": "kabartmalar", "stelae": "stel", "shed": "ışık tutmak", "light": "ışık", "belief": "inanç",
            "ancestors": "atalar", "archaeologists": "arkeologlar", "utilize": "kullanmak", "advanced": "gelişmiş", "technologies": "teknolojiler",
            "ground": "yer", "penetrating": "nüfuz eden", "radar": "radar", "carbon": "karbon", "dating": "tarihlendirme",
            "locate": "bulmak", "hidden": "gizli", "ruins": "kalıntılar", "excavation": "kazı", "unearthing": "gün ışığına çıkarma",
            "cities": "şehirler", "reveals": "ortaya koymak", "complex": "karmaşık", "social": "sosyal", "hierarchies": "hiyerarşiler",
            "long": "uzun", "distance": "mesafe", "trade": "ticaret", "networks": "ağlar", "sophisticated": "gelişmiş",
            "engineering": "mühendislik", "practices": "uygulamalar", "preserved": "korunmuş", "artifact": "eser", "acts": "gibi davranmak",
            "silent": "sessiz", "witness": "tanık", "forgotten": "unutulmuş", "epochs": "dönemler", "creativity": "yaratıcılık",
            "survival": "hayatta kalma", "protecting": "korumak", "sites": "alanlar", "looting": "yağma", "war": "savaş",
            "destruction": "yıkım", "industrial": "endüstriyel", "encroachment": "tecavüz/yayılma", "obligation": "zorunluluk",
            "archaeology": "arkeoloji", "restores": "geri getirmek", "chapters": "bölümler", "narrative": "anlatı", "deepening": "derinleştirmek",
            "appreciation": "takdir", "ancestral": "atalardan kalma", "resilience": "direnç", "achievement": "başarı", "decoding": "şözümleme",
            "dna": "dna", "structure": "yapı", "broke": "kırmak", "ground": "zemin", "medicine": "tıp", "genetic": "genetik",
            "engineering": "mühendislik", "promising": "umut vadeden", "studies": "çalışmalar", "conducted": "yürütülen", "treatment": "tedavi",
            "hereditary": "kalıtsal", "diseases": "hastalıklar", "development": "geliştirme", "resilient": "dirençli", "agricultural": "tarımsal",
            "products": "ürünler", "crispr": "crispr", "editing": "düzenleme", "allows": "izin vermek", "scientists": "bilim insanları",
            "modify": "değiştirmek", "specific": "belirli", "sequences": "diziler", "unprecedented": "görülmemiş", "precision": "hassasiyet",
            "drought": "kuraklık", "resistant": "dayanıklı", "crops": "ekinler", "capable": "kadir", "feeding": "beslemek",
            "growing": "büyüyen", "populations": "popülasyonlar", "arid": "kurak", "climate": "iklim", "zones": "bölgeler",
            "nevertheless": "yine de", "ethical": "etik", "dilemmas": "ikilemler", "surrounding": "çevreleyen", "human": "insan",
            "embryo": "embriyo", "modification": "modifikasyon", "genetically": "genetik olarak", "modified": "değiştirilmiş",
            "organisms": "organizmalar", "provoke": "kışkırtmak", "fierce": "şiddetli", "debates": "tartışmalar", "strict": "katı",
            "bioethics": "biyoetik", "regulations": "düzenlemeler", "govern": "yönetmek", "research": "araştırma", "prevent": "önlemek",
            "misuse": "kötüye kullanım", "maximizing": "maksimize etmek", "benefits": "faydalar", "miraculous": "mucizevi",
            "potential": "potansiyel", "eradicate": "kökünü kazımak", "chronic": "kronik", "illnesses": "hastalıklar", "revolutionize": "devrim yaratmak",
            "sustainable": "sürdürülebilir", "production": "üretim", "worldwide": "dünya çapında", "biggest": "en büyük",
            "element": "unsur", "regulating": "düzenleyen", "warm": "ılık", "currents": "akıntılar", "such": "gibi", "gulf": "gulf",
            "stream": "akıntı", "protect": "korumak", "balance": "denge", "continents": "kıta", "making": "yapmak", "habitable": "yaşanabilir",
            "massive": "devasa", "underwater": "su altı", "rivers": "nehirler", "transport": "taşımak", "thermal": "termal",
            "energy": "enerji", "tropical": "tropikal", "regions": "bölgeler", "polar": "kutup", "zones": "bölgeler", "stabilizing": "istikrarlı hale getirmek",
            "temperatures": "sıcaklıklar", "disruptions": "kesintiler", "circulation": "sirkülasyon", "caused": "sebep olunan",
            "melting": "eriyen", "glaciers": "buzullar", "trigger": "tetiklemek", "abrupt": "ani", "catastrophic": "felaket",
            "shifts": "kaymalar", "marine": "deniz", "biologists": "biyologlar", "thermohaline": "termohalin", "predict": "tahmin etmek",
            "long": "uzun", "term": "vade", "meteorological": "meteorolojik", "trends": "eğilimler", "accurately": "doğru bir şekilde",
            "ecosystems": "ekosistemler", "acidification": "asitlenme", "crucial": "çok önemli", "understanding": "anlamak",
            "dynamics": "dinamikler", "intricate": "karmaşık", "physical": "fiziksel", "mechanisms": "mekanizmalar", "sustaining": "sürdüren",
            "across": "boyunca", "remarkable": "dikkat çekici", "covered": "kaplı", "blue": "mavi", "starting": "başlayarak",
            "invention": "icat", "steam": "buhar", "engine": "motor", "enabled": "olanak tanımak", "replace": "değiştirmek",
            "labor": "emek", "transformation": "dönüşüm", "increased": "artırmak", "speed": "hız", "brought": "getirmek",
            "environmental": "çevresel", "problems": "sorunlar", "mass": "kütlesel", "manufacturing": "imalat", "shifted": "kaydırmak",
            "rapidly": "hızla", "agricultural": "tarımsal", "rural": "kırsal", "villages": "köyler", "crowded": "kalabalık",
            "coal": "kömür", "powered": "güçle çalışan", "factories": "fabrikalar", "released": "salıvermek", "unprecedented": "görülmemiş",
            "volumes": "hacimler", "pollutants": "kirleticiler", "atmosphere": "atmosfer", "initiating": "başlatmak", "change": "değişmek",
            "labor": "emek", "unions": "sendikalar", "emerged": "ortaya çıkmak", "protect": "korumak", "workers": "işçiler",
            "grueling": "yorucu", "conditions": "koşullar", "hazardous": "tehlikeli", "exploitation": "sömürü", "advancements": "gelişmeler",
            "created": "yaratmak", "immense": "muazzam", "wealth": "servet", "reshaping": "yeniden şekillendirmek", "geopolitics": "jeopolitik",
            "entirely": "tamamen", "analyzing": "analiz etmek", "policymakers": "politikacılar", "navigate": "gezmek / yönetmek",
            "transitions": "geçişler", "equitable": "adil", "practices": "uygulamalar", "states": "devletler", "developed": "geliştirmek",
            "encryption": "şifreleme", "methods": "yöntemler", "secret": "gizli", "communication": "iletişim", "entrusted": "emanet",
            "complex": "karmaşık", "mathematical": "matematiksel", "algorithms": "algoritmalar", "cryptology": "kriptoloji",
            "advanced": "gelişmiş", "cryptographic": "kriptografik", "protocols": "protokoller", "protect": "korumak", "online": "çevrimiçi",
            "financial": "finansal", "transactions": "işlemler", "classified": "gizli", "military": "askeri", "personal": "kişisel",
            "data": "veri", "modern": "modern", "computers": "bilgisayarlar", "utilize": "kullanmak", "asymmetric": "asimetrik",
            "keys": "anahtarlar", "take": "almak", "millennia": "milenyumlar", "unauthorized": "yetkisiz", "hackers": "saldırganlar",
            "crack": "kırmak", "emergence": "ortaya çıkış", "quantum": "kuantum", "computing": "bilgi işlem", "poses": "oluşturmak",
            "severe": "şiddetli", "threats": "tehditler", "existing": "mevcut", "standards": "standartlar", "experts": "uzmanlar",
            "continually": "sürekli", "post": "sonrası", "algorithms": "algoritmalar", "safeguard": "korumak", "infrastructure": "altyapı",
            "future": "gelecek", "breaches": "ihlaller", "sensitive": "hassas", "information": "bilgi", "indispensable": "vazgeçilmez",
            "pillar": "direk", "national": "ulusal", "stability": "istikrar", "interconnected": "birbirine bağlı", "day": "gün",
            "first": "ilk", "photograph": "fotoğraf", "taken": "alınmış", "way": "yol", "immortalizing": "ölümsüzleştirmek",
            "memories": "anılar", "completely": "tamamen", "changed": "değişmek", "thanks": "sayesinde", "sensors": "sensörler",
            "cameras": "kameralar", "record": "kaydetmek", "farthest": "en uzak", "corners": "köşeler", "resolution": "çözünürlük",
            "early": "erken", "plates": "plakalar", "required": "gerekli", "long": "uzun", "exposure": "pozlama", "hazardous": "tehlikeli",
            "chemical": "kimyasal", "processes": "süreçler", "photojournalism": "fotojurnalizm", "transformed": "dönüştürmek",
            "public": "kamu", "perception": "algı", "events": "olaylar", "exposing": "ifşa etmek", "war": "savaş", "horrors": "korkular",
            "injustices": "adaletsizlikler", "triumphs": "zaferler", "vividly": "canlı bir şekilde", "smartphones": "akıllı telefonlar",
            "put": "koymak", "pocket": "cep", "generating": "üretmek", "billions": "milyarlarca", "images": "görseller",
            "daily": "günlük", "photography": "fotoğrafçılık", "bridges": "köprü kurmak", "cultural": "kültürel", "divides": "bölünmeler",
            "capturing": "yakalamak", "fleeting": "gelip geçici", "emotions": "duygular", "natural": "doğal", "splendor": "ihtişam",
            "permanent": "kalıcı", "clarity": "netlik",
            "considering": "dikkate almak", "rights": "haklar", "future": "gelecek", "generations": "nesiller", "consuming": "tüketmek",
            "natural": "doğal", "resources": "kaynaklar", "basis": "temel", "sustainable": "sürdürülebilir", "development": "kalkınma",
            "investing": "yatırım yapmak", "renewable": "yenilenebilir", "energy": "enerji", "sources": "kaynaklar", "only": "sadece",
            "way": "yol", "protect": "korumak", "ecosystem": "ekosistem", "overconsumption": "aşırı tüketim", "habitat": "yaşam alanı",
            "destruction": "yıkım", "biodiversity": "biyoçeşitlilik", "loss": "kayıp", "threaten": "tehdit etmek", "ecological": "ekolojik",
            "foundations": "temeller", "civilization": "medeniyet", "architecture": "mimari", "incorporates": "içermek", "efficient": "verimli",
            "designs": "tasarımlar", "recycled": "geri dönüştürülmüş", "materials": "malzemeler", "green": "yeşil", "urban": "kentsel",
            "spaces": "alanlar", "minimize": "en aza indirmek", "impact": "etki", "circular": "döngüsel", "economy": "ekonomi",
            "models": "modeller", "eliminate": "ortadan kaldırmak", "waste": "atık", "repurposing": "yeniden amaca uygun hale getirmek",
            "byproducts": "yan ürünler", "continuously": "sürekli", "governments": "hükümetler", "corporate": "şirket", "enterprises": "girişimler",
            "internalize": "içselleştirmek", "costs": "maliyetler", "externalizing": "dışsallaştırmak", "damage": "zarar", "achieving": "elde etmek",
            "global": "küresel", "sustainability": "sürdürülebilirlik", "profound": "derin", "paradigm": "paradigma", "shift": "değişim",
            "human": "insan", "values": "değerler", "prioritizing": "önceliklendirmek", "long": "uzun", "term": "vade", "planetary": "gezegensel",
            "infinite": "sonsuz", "material": "maddi", "growth": "büyüme", "geographical": "coğrafi", "location": "konum",
            "located": "bulunmak", "intersection": "kesişim", "point": "nokta", "asian": "asya", "european": "avrupa", "african": "afrika",
            "continents": "kıta", "unique": "eşsiz", "witnessed": "şahit olmak", "migration": "göç", "movements": "hareketler",
            "routes": "rotalar", "imperial": "emperyal", "struggles": "mücadeleler", "passage": "geçiş", "silk": "ipek", "road": "yol",
            "carried": "taşımak", "not": "değil", "trade": "ticaret", "cultural": "kültürel", "interaction": "etkileşim", "east": "doğu",
            "west": "batı", "highest": "en yüksek", "level": "seviye", "artifacts": "eserler", "exhibited": "sergilenmek",
            "museums": "müzeler", "reputable": "saygın", "proof": "kanıt", "synthesis": "sentez", "neolithic": "neolitik",
            "settlements": "yerleşimler", "catalhoyuk": "çatalhöyük", "magnificent": "muhteşem", "seljuk": "selçuklu", "ottoman": "osmanlı",
            "soil": "toprak", "preserves": "korumak", "layers": "katmanlar", "compactly": "kompakt bir şekilde", "geological": "jeolojik",
            "diversity": "çeşitlilik", "combined": "birleştirilmiş", "region": "bölge", "unparalleled": "benzeri görülmemiş",
            "open": "açık", "laboratory": "laboratuvar", "historians": "tarihçiler", "archaeologists": "arkeologlar", "worldwide": "dünya çapında",
            "nanotechnology": "nanoteknoloji", "enables": "olanak tanımak", "control": "kontrol", "matter": "madde", "atomic": "atomik",
            "molecular": "moleküler", "brought": "getirmek", "dimension": "boyut", "medicine": "tıp", "electronics": "elektronik",
            "materials": "malzemeler", "microscopic": "mikroskobik", "robots": "robotlar", "destroy": "yok etmek", "cancer": "kanser",
            "cells": "hücreler", "future": "gelecek", "engineers": "mühendisler", "manipulate": "müdahale etmek", "carbon": "karbon",
            "nanotubes": "nanotüpler", "create": "yaratmak", "hundred": "yüz", "times": "kez", "stronger": "daha güçlü", "steel": "çelik",
            "yet": "yine de", "remarkably": "dikkat çekici şekilde", "lightweight": "hafif", "quantum": "kuantum", "dots": "noktalar",
            "enhance": "geliştirmek", "display": "ekran", "resolutions": "çözünürlükler", "reducing": "azaltmak", "consumption": "tüketim",
            "significantly": "önemli ölçüde", "medical": "tıbbi", "nanobots": "nanobotlar", "travel": "seyahat etmek", "bloodstreams": "kan akışı",
            "deliver": "ulaştırmak", "targeted": "hedef alınan", "pharmaceutical": "ilaç", "drugs": "ilaçlar", "directly": "doğrudan",
            "diseased": "hasta", "tissues": "dokular", "phenomenal": "fenomenal", "advancements": "gelişmeler", "toxicological": "toksikolojik",
            "risks": "riskler", "nanoparticles": "nanopartiküller", "require": "gerektirmek", "rigorous": "titiz", "safety": "güvenlik",
            "testing": "test etme", "microscopic": "mikroskobik", "frontier": "sınır", "macroscopic": "makroskobik", "potential": "potansiyel",
            "transform": "dönüştürmek", "capabilities": "yetenekler", "entirely": "tamamen", "greenhouse": "sera", "gases": "gazlar",
            "accumulating": "biriken", "rapidly": "hızla", "increasing": "artırmak", "average": "ortalama", "temperature": "sıcaklık",
            "earth": "dünya", "melting": "eriyen", "glaciers": "buzullar", "rising": "yükselen", "sea": "deniz", "levels": "seviyeler",
            "massive": "devasa", "ecological": "ekolojik", "crisis": "kriz", "threatening": "tehdit eden", "coastal": "kıyı",
            "agricultural": "tarımsal", "areas": "alanlar", "unprecedented": "görülmemiş", "heatwaves": "sıcak hava dalgaları",
            "prolonged": "uzun süreli", "droughts": "kuraklıklar", "severe": "şiddetli", "storms": "fırtınalar", "disrupt": "aksatmak",
            "supply": "tedarik", "chains": "zincirler", "displace": "yerinden etmek", "refugees": "mülteciler", "summits": "zirveler",
            "strive": "çabalamak", "enforce": "uygulamak", "binding": "bağlayıcı", "emission": "emisyon", "reductions": "azaltmalar",
            "political": "siyasi", "disagreements": "anlaşmazlıklar", "hinder": "engel olmak", "decisive": "kararlı", "action": "eylem",
            "transitioning": "geçiş yapmak", "economies": "ekonomiler", "demands": "talep etmek", "financial": "maddi", "investments": "yatırımlar",
            "radical": "radikal", "lifestyle": "yaşam tarzı", "adjustments": "düzenlemeler", "safeguarding": "korumak", "climatic": "iklimsel",
            "existential": "varoluşsal", "imperative": "zorunluluk", "transcends": "aşmak", "ideologies": "ideolojiler",
            "short": "kısa", "term": "vade", "economic": "ekonomik", "interests": "çıkarlar", "cuneiform": "çivi yazısı",
            "invented": "icat etmek", "sumerians": "sümerler", "around": "civarında", "bc": "m.ö.", "turning": "dönüş",
            "point": "nokta", "thoughts": "düşünceler", "permanent": "kalıcı", "ages": "çağlar", "clay": "kil", "tablets": "tabletler",
            "recorded": "kaydetmek", "commercial": "ticari", "contracts": "sözleşmeler", "religious": "dini", "hymns": "ilahiler",
            "royal": "kraliyet", "decrees": "kararnameler", "replacing": "değiştirmek", "unreliable": "güvenilmez", "oral": "sözlü",
            "traditions": "gelenekler", "hieroglyphs": "hiyeroglif", "egypt": "mısır", "alphabet": "alfabe", "developed": "geliştirmek",
            "phoenicians": "fenikeliler", "democratized": "demokratikleştirmek", "written": "yazılı", "progressively": "aşamalı olarak",
            "writing": "yazı", "enabled": "olanak tanımak", "accumulate": "biriktirmek", "scientific": "bilimsel", "treaties": "antlaşmalar",
            "literature": "edebiyat", "generations": "nesiller", "without": "olmaksızın", "records": "kayıtlar", "memory": "hafıza",
            "restricted": "kısıtlı", "fleeting": "gelip geçici", "folklore": "folklor", "stands": "durmak", "alongside": "yanında",
            "fire": "ateş", "agriculture": "tarım", "supreme": "yüce", "milestones": "kilometre taşları", "cognitive": "bilişsel",
            "evolution": "evrim", "psychology": "psikoloji", "examines": "incelemek", "behaviors": "davranışlar", "processes": "süreçler",
            "subconscious": "bilinçaltı", "know": "bilmek", "themselves": "kendileri", "empathy": "empati", "emotional": "duygusal",
            "intelligence": "zeka", "social": "sosyal", "relationships": "ilişkiler", "cognitive": "bilişsel", "analyzes": "analiz etmek",
            "people": "insanlar", "perceive": "algılamak", "information": "bilgi", "solve": "çözmek", "problems": "sorunlar",
            "store": "saklamak", "memories": "anılar", "psychoanalytic": "psikanalitik", "theories": "teoriler", "explore": "keşfetmek",
            "hidden": "gizli", "childhood": "çocukluk", "influences": "etkiler", "internal": "iç", "conflicts": "çatışmalar",
            "driving": "süren", "motivation": "motivasyon", "understanding": "anlamak", "principles": "ilkeler", "educators": "eğiticiler",
            "design": "tasarlamak", "environments": "ortamlar", "assists": "yardım etmek", "clinicians": "klinisyenler", "treating": "tedavi etmek",
            "disorders": "bozukluklar", "regulation": "düzenleme", "resilience": "direnç", "training": "eğitim", "empower": "güçlendirmek",
            "navigate": "üstesinden gelmek", "stress": "stres", "successfully": "başarıyla", "bridges": "köprü kurmak", "biological": "biyolojik",
            "neuroscience": "nörobilim", "subjective": "öznel", "experience": "deneyim", "illuminating": "aydınlatan", "intricate": "karmaşık",
            "workings": "çalışma mekanizmaları", "works": "eserler", "pyramids": "piramitler", "giza": "giza", "hanging": "asma",
            "gardens": "bahçeler", "babylon": "babil", "colossus": "kolossos", "rhodes": "rodos", "structures": "yapılar",
            "pushing": "zorlamak", "limits": "sınırlar", "engineering": "mühendislik", "imagination": "hayal gücü", "monumental": "anıtsal",
            "constructed": "inşa edilmiş", "machinery": "makine", "relying": "dayanmak", "entirely": "tamamen", "manual": "manuel",
            "precision": "hassasiyet", "raw": "ham", "determination": "kararlılık", "great": "büyük", "remained": "kalmak",
            "tallest": "en uzun", "made": "yapılmış", "millennia": "milenyumlar", "exploring": "keşfetmek", "societies": "toplumlar",
            "mobilized": "harekete geçirmek", "resources": "kaynaklar", "religious": "dini", "devotion": "bağlılık", "royal": "kraliyet",
            "prestige": "prestij", "vanished": "yok olmak", "due": "-den dolayı", "earthquakes": "depremler", "wars": "savaşlar",
            "enduring": "kalıcı", "legacy": "miras", "inspire": "ilham vermek", "architects": "mimar", "evidence": "kanıt",
            "marvels": "harikalar", "celebrates": "kutlamak", "ingenuity": "deha", "antiquity": "antik çağ", "words": "kelimeler",
            "unite": "birleştirmek", "destructive": "yıkıcı", "effective": "etkili", "rhetoric": "hitabet", "weapons": "silahlar",
            "leaders": "liderler", "successful": "başarılı", "mastery": "ustalık", "vocabulary": "kelime hazinesi", "articulate": "ifade edebilir",
            "expression": "ifade", "convey": "aktarmak", "persuasively": "ikna edici bir şekilde", "non": "olmayan", "verbal": "sözel",
            "body": "vücut", "active": "aktif", "listening": "dinleme", "empathetic": "empatik", "tone": "ton", "amplify": "güçlendirmek",
            "impact": "etki", "spoken": "konuşulan", "messages": "mesajlar", "diplomatic": "diplomatik", "relations": "ilişkiler",
            "precise": "kesin", "wording": "ifade seçimi", "prevents": "önlemek", "misunderstandings": "yanlış anlaşılmalar",
            "averts": "engellemek", "curricula": "müfredat", "emphasize": "vurgulamak", "linguistic": "dilsel", "proficiency": "yeterlilik",
            "foster": "teşvik etmek", "cohesion": "uyum", "merely": "sadece", "transfer": "aktarım", "medium": "araç",
            "constructed": "inşa edilmek", "panels": "paneller", "turbines": "türbinler", "geothermal": "jeotermal", "reduce": "azaltmak",
            "dependence": "bağımlılık", "clean": "temiz", "guarantee": "garanti", "technological": "teknolojik", "photovoltaic": "fotovoltaik",
            "cells": "hücreler", "drastically": "büyük ölçüde", "lowered": "düşürmek", "installation": "kurulum", "costs": "maliyetler",
            "offshore": "açık deniz", "harness": "yararlanmak", "marine": "deniz", "gales": "fırtınalar", "generate": "üretmek",
            "abundant": "bol", "electricity": "elektrik", "metropolises": "metropoller", "taps": "yararlanmak", "subterranean": "yer altı",
            "reserves": "rezervler", "providing": "sağlamak", "reliable": "güvenilir", "continuous": "kesintisiz", "baseload": "taban yük",
            "grids": "şebekeler", "eliminates": "ortadan kaldırmak", "tons": "ton", "dioxide": "dioksit", "annually": "yıllık olarak",
            "investing": "yatırım yapmak", "infrastructure": "altyapı", "millions": "milyonlar", "jobs": "işler", "securing": "güvence altına almak",
            "growth": "büyüme", "defense": "savunma", "practical": "pratik", "change": "değişiklik", "history": "tarih",
            "extending": "uzanan", "barter": "takas", "coins": "madeni paralar", "money": "para", "digital": "dijital",
            "assets": "varlıklar", "summary": "özet", "quest": "arayış", "trust": "güven", "mercantilism": "merkantilizm",
            "gave": "vermek", "way": "yol", "capitalism": "kapitalizm", "faced": "karşılaşmak", "critiques": "eleştiriler",
            "prompting": "tetiklemek", "mixed": "karma", "banks": "bankalar", "regulate": "düzenlemek", "monetary": "parasal",
            "policy": "politika", "control": "kontrol etmek", "inflation": "enflasyon", "stimulate": "teşvik etmek", "employment": "istihdam",
            "downturns": "durgunluklar", "integrated": "bütünleştirmek", "markets": "piyasalar", "financial": "finansal",
            "networks": "ağlar", "vulnerable": "savunmasız", "contagion": "bulaşma", "principles": "ilkeler", "citizens": "vatandaşlar",
            "informed": "bilinçli", "decisions": "kararlar", "personal": "kişisel", "finance": "finans", "taxation": "vergilendirme",
            "investments": "yatırımlar", "economics": "ekonomi", "explores": "keşfetmek", "allocate": "tahsis etmek", "scarce": "kıt",
            "satisfy": "tatmin etmek", "unlimited": "sınırsız", "wants": "istekler", "organized": "düzenli", "production": "üretim",
            "distribution": "dağıtım", "according": "göre", "thomas": "thomas", "kuhn": "kuhn", "science": "bilim", "progresses": "ilerlemek",
            "leaps": "sıçramalar", "shaking": "sarsmak", "accepted": "kabul edilmiş", "theories": "teoriler", "construction": "inşa",
            "paradigms": "paradigmalar", "questioning": "sorgulama", "engine": "motor", "development": "gelişim", "accumulated": "birikmiş",
            "anomalies": "anormallikler", "contradict": "çelişmek", "existing": "mevcut", "frameworks": "çerçeveler", "visionary": "vizyoner",
            "researchers": "araştırmacılar", "propose": "önermek", "radical": "radikal", "alternative": "alternatif", "heliocentric": "güneş merkezli",
            "astronomy": "astronomi", "replaced": "değiştirmek", "geocentric": "yer merkezli", "relativity": "görelilik", "revolutionized": "devrim yaratmak",
            "newtonian": "newtonyen", "physics": "fizik", "profound": "derin", "conceptual": "kavramsal", "shifts": "kaymalar",
            "linear": "doğrusal", "involves": "içermek", "fierce": "şiddetli", "debates": "tartışmalar", "skepticism": "şüphecilik",
            "institutional": "kurumsal", "resistance": "direnç", "triumph": "zafer kazanmak", "fostering": "teşvik etmek",
            "culture": "kültür", "inquiry": "araştırma", "tolerance": "hoşgörü", "unorthodox": "sıra dışı", "hypotheses": "hipotezler",
            "vitality": "canlılık", "reshaping": "yeniden şekillendirmek", "perspective": "perspektif", "completely": "tamamen",
            "societies": "toplumlar", "static": "statik", "constant": "sabit", "state": "durum", "historical": "tarihi",
            "processes": "süreçler", "migration": "göç", "waves": "dalgalar", "villages": "köyler", "cities": "şehirler",
            "industrialization": "sanayileşme", "fundamentally": "kökten", "family": "aile", "structures": "yapılar", "neighborly": "komşuluk",
            "relations": "ilişkiler", "models": "modeller", "sociology": "sosyoloji", "examines": "incelemek", "analyzes": "analiz etmek",
            "individual": "birey", "institutions": "kurumlar", "group": "grup", "dynamics": "dinamikler", "digitalization": "dijitalleşme",
            "forms": "formlar", "moved": "taşımak", "virtual": "sanal", "environments": "ortamlar", "gaining": "kazanmak",
            "urbanization": "kentleşme", "diverse": "çeşitli", "multicultural": "çok kültürlü", "communities": "topluluklar",
            "causing": "sebep olmak", "isolation": "izolasyon", "alienation": "yabancılaşma", "research": "araştırma", "policymakers": "politikacılar",
            "address": "hitap etmek / ele almak", "inequality": "eşitsizlik", "poverty": "yoksulluk", "reform": "reform",
            "effectively": "etkili bir şekilde", "collective": "kolektif", "behavior": "davranış", "manage": "yönetmek", "shifts": "değişimler",
            "harmoniously": "uyumlu bir şekilde", "promote": "teşvik etmek", "inclusive": "kapsayıcı", "social": "sosyal", "justice": "adalet",
            "accepted": "kabul edilmek", "complex": "karmaşık", "structure": "yapı", "synaptic": "sinaptik", "networks": "ağlar",
            "formed": "oluşturulmuş", "neurons": "nöronlar", "manage": "yönetmek", "learning": "öğrenme", "memory": "hafıza",
            "consciousness": "bilinç", "recent": "son", "neuroscience": "nörobilim", "focus": "odaklanmak", "solving": "çözmek",
            "mind": "zihin", "body": "vücut", "functional": "fonksiyonel", "neuroimaging": "nörogörüntüleme", "allow": "izin vermek",
            "observe": "gözlemlemek", "active": "aktif", "regions": "bölgeler", "decision": "karar", "making": "verme",
            "emotional": "duygusal", "processing": "işleme", "comprehension": "anlama", "neuroplasticity": "nöroplastisite",
            "proves": "kanıtlamak", "reorganize": "yeniden organize etmek", "pathways": "yollar", "response": "tepki", "experience": "deneyim",
            "neurological": "nörolojik", "disorders": "bozukluklar", "alzheimer": "alzheimer", "disease": "hastalık", "motivate": "motive etmek",
            "intensive": "yoğun", "discover": "keşfetmek", "restorative": "iyileştirici", "therapies": "tedaviler", "unlocking": "kilidini açmak",
            "mysteries": "gizemler", "illuminates": "aydınlatmak", "biological": "biyolojik", "basis": "temel", "subjective": "öznel",
            "awareness": "farkındalık", "personality": "kişilik", "intelligence": "zeka", "parts": "parçalar", "smartphone": "akıllı telefon",
            "produced": "üretilmiş", "assembled": "monte edilmiş", "disrupted": "aksamak", "economy": "ekonomi", "shaken": "sarsılmak",
            "interdependencies": "karşılıklı bağımlılıklar", "optimize": "optimize etmek", "costs": "maliyetler", "expose": "maruz bırakmak",
            "geopolitical": "jeopolitik", "tensions": "gerginlikler", "shipping": "nakliye", "bottlenecks": "darboğazlar", "just": "sadece",
            "time": "zaman", "prioritize": "öncelik vermek", "redundancy": "yedeklilik", "increasing": "artırmak", "vulnerability": "savunmasızlık",
            "sudden": "ani", "pandemics": "pandemiler", "pursue": "izlemek", "diversification": "çeşitlendirme", "domestic": "yerli",
            "resilience": "direnç", "protect": "korumak", "national": "ulusal", "security": "güvenlik", "robust": "sağlam",
            "agreements": "anlaşmalar", "cooperative": "işbirlikçi", "logistics": "lojistik", "navigating": "yönetmek", "demands": "talep etmek",
            "strategic": "stratejik", "foresight": "öngörü", "adaptability": "uyum yeteneği",
            "establishment": "kuruluş", "fair": "adil", "order": "düzen", "depends": "bağlı olmak", "full": "tam", "implementation": "uygulama",
            "rule": "kural", "law": "yasa", "democracy": "demokrasi", "separation": "güçler ayrılığı", "powers": "güçler",
            "acts": "rol oynamak", "vital": "hayati", "shield": "kalkan", "protecting": "korumak", "independent": "bağımsız",
            "judiciaries": "yargı", "ensure": "garanti etmek", "government": "hükümet", "officials": "yetkililer", "ordinary": "sıradan",
            "remain": "kalmak", "equally": "eşit şekilde", "accountable": "sorumlu", "established": "kurulmuş", "statutes": "yasalar",
            "constitutional": "anayasal", "protections": "korumalar", "safeguard": "güvenceye almak", "freedom": "özgürlük", "speech": "konuşma",
            "press": "basın", "minority": "azınlık", "authoritarian": "otokratik", "encroachment": "ihlal", "corruption": "yolsuzluk",
            "undermines": "altını oymak", "public": "kamu", "trust": "güven", "necessitating": "gerektirmek", "transparent": "şeffaf",
            "governance": "yönetişim", "anti": "karşıtı", "oversight": "denetim", "civic": "vatandaşlık", "cultivates": "yetiştirmek",
            "actively": "aktif olarak", "participate": "katılmak", "guarantees": "garanti etmek", "civil": "sivil", "liberties": "özgürlükler",
            "social": "sosyal", "stability": "istikrar", "equitable": "adil", "essential": "gerekli", "flourishing": "gelişen",
            "civilized": "uygar", "ethics": "etik", "morality": "ahlak", "questions": "sorgulamak", "good": "iyi", "evil": "kötü",
            "guides": "rehberlik etmek", "conscience": "vicdan", "kant": "kant", "duty": "ödev", "utilitarian": "faydacı",
            "theories": "teoriler", "discuss": "tartışmak", "basis": "temel", "decisions": "kararlar", "deontological": "ödev ahlakı",
            "argues": "savunmak", "certain": "belirli", "actions": "eylemler", "inherently": "doğası gereği", "right": "doğru",
            "wrong": "yanlış", "regardless": "bakılmaksızın", "consequences": "sonuçlar", "utilitarianism": "faydacılık", "evaluates": "değerlendirmek",
            "worth": "değer", "based": "dayanan", "maximizing": "maksimize etmek", "overall": "genel", "happiness": "mutluluk",
            "minimizing": "en aza indirmek", "suffering": "acı", "greatest": "en büyük", "number": "sayı", "applied": "uygulamalı",
            "examines": "incelemek", "modern": "modern", "dilemmas": "ikilemler", "bioethics": "biyoetik", "artificial": "yapay",
            "intelligence": "zeka", "environmental": "çevresel", "conservation": "koruma", "reasoning": "akıl yürütme", "challenges": "zorlamak",
            "transcend": "aşmak", "self": "öz", "interest": "çıkar", "consider": "göz önüne almak", "universal": "evrensel",
            "rigorous": "titiz", "intellectual": "entelektüel", "frameworks": "çerçeveler", "navigating": "yönlendirmek", "ambiguous": "belirsiz",
            "choices": "seçimler", "defining": "tanımlayan", "professional": "profesyonel", "personal": "kişisel", "cyber": "siber",
            "espionage": "casusluk", "data": "veri", "breaches": "ihlaller", "next": "gelecek", "generation": "nesil", "warfare": "savaş",
            "methods": "yöntemler", "threatening": "tehdit eden", "concept": "kavram", "sovereignty": "egemenlik", "center": "merkez",
            "politics": "siyaset", "state": "devlet", "sponsored": "destekli", "hackers": "saldırganlar", "target": "hedef almak",
            "critical": "kritik", "infrastructure": "altyapı", "power": "güç", "grids": "şebekeler", "financial": "finansal",
            "institutions": "kurumlar", "communication": "iletişim", "networks": "ağlar", "hybrid": "melez", "combines": "birleştirmek",
            "disinformation": "dezenformasyon", "campaigns": "kampanyalar", "attacks": "saldırlar", "destabilize": "istikrarsızlaştırmak",
            "rival": "rakip", "covertly": "gizlice", "defense": "savunma", "agencies": "ajanslar", "invest": "yatırım yapmak",
            "heavily": "yoğun şekilde", "offensive": "saldırı", "defensive": "savunma", "capabilities": "yetenekler", "protect": "korumak",
            "strategic": "stratejik", "assets": "varlıklar", "treaties": "antlaşmalar", "governing": "yöneten", "cyberspace": "siber uzay",
            "norms": "normlar", "remain": "kalmak", "weak": "zayıf", "difficult": "zor", "enforce": "uygulamak", "ensuring": "sağlamak",
            "unprecedented": "görülmemiş", "cooperation": "işbirliği", "private": "özel", "enterprises": "girişimler", "alliances": "ittifaklar",
            "wars": "savaşlar", "economic": "ekonomik", "inequalities": "eşitsizlikler", "climate": "iklim", "crises": "krizler",
            "cause": "sebep olmak", "millions": "milyonlar", "displaced": "yerinden edilmiş", "phenomenon": "olgu", "transforming": "dönüştürmek",
            "demographic": "demografik", "receiving": "alan", "nations": "milletler", "experience": "deneyimlemek", "enrichment": "zenginleşme",
            "alongside": "yanında", "integration": "entegrasyon", "challenges": "zorluklar", "debates": "tartışmalar", "border": "sınır",
            "control": "kontrol", "aging": "yaşlanma", "developed": "gelişmiş", "countries": "ülkeler", "increases": "artırmak",
            "labor": "emek", "demands": "talepler", "migrant": "göçmen", "workers": "işçiler", "indispensable": "vazgeçilmez",
            "humanitarian": "insani", "organizations": "kuruluşlar", "strive": "çabalamak", "protect": "korumak", "refugee": "mülteci",
            "amidst": "ortasında", "restrictions": "kısıtlamalar", "comprehensive": "kapsamlı", "management": "yönetim", "addressing": "ele almak",
            "root": "köken", "causes": "nedenler", "poverty": "yoksulluk", "conflict": "çatışma", "collapse": "çöküş", "origin": "menşe",
            "shapes": "şekillendirmek", "mosaic": "mozaik", "demanding": "talep eden", "compassionate": "şefkatli", "pragmatic": "pragmatik",
            "perspective": "perspektif", "understanding": "anlayış", "renaissance": "rönesans", "light": "ışık", "plays": "oyun",
            "impressionism": "izlenimcilik", "abstract": "soyut", "forms": "formlar", "reflect": "yansıtmak", "spirit": "ruh",
            "period": "dönem", "masters": "ustalar", "mastered": "ustalaşmak", "linear": "doğrusal", "anatomical": "anatomik",
            "realism": "gerçekçilik", "reviving": "canlandırmak", "classical": "klasik", "greco": "greko", "roman": "romen",
            "ideals": "idealler", "impressionists": "izlenimciler", "abandoned": "terk edilmiş", "dark": "karanlık", "studio": "stüdyo",
            "painting": "resim", "capture": "yakalamak", "transient": "geçici", "effects": "etkiler", "natural": "doğal",
            "sunlight": "güneş ışığı", "outdoors": "açık havada", "cubism": "kübizm", "fragmented": "parçalamak", "objects": "nesneler",
            "geometric": "geometrik", "planes": "düzlemler", "challenging": "meydan okumak", "traditional": "geleneksel", "notions": "kavramlar",
            "visual": "görsel", "representation": "temsil", "surrealism": "sürrealizm", "explored": "keşfetmek", "dream": "rüya",
            "states": "durumlar", "subconscious": "bilinçaltı", "inspired": "ilham vermek", "psychoanalysis": "psikanaliz",
            "history": "tarih", "chronicles": "kronikleştirmek", "relentless": "durmaksızın", "quest": "arayış", "aesthetic": "estetik",
            "innovation": "inovasyon", "expression": "ifade", "artistic": "sanatsal", "revolution": "devrim", "redefines": "yeniden tanımlamak",
            "culture": "kültür", "offering": "sunmak", "profound": "derin", "insights": "görüşler", "changing": "değişen",
            "outlook": "bakış açısı", "successive": "ardışık", "ability": "yetenek", "living": "yaşayan", "things": "şeyler",
            "adapt": "adapte olmak", "environmental": "çevresel", "conditions": "koşullar", "occurs": "meydana gelmek", "natural": "doğal",
            "selection": "seçilim", "mechanism": "mekanizma", "biodiversity": "biyoçeşitlilik", "work": "eser", "millions": "milyonlar",
            "process": "süreç", "charles": "charles", "darwin": "darwin", "theory": "teori", "evolution": "evrim", "explained": "açıklamak",
            "advantageous": "avantajlı", "genetic": "genetik", "traits": "özellikler", "increase": "artırmak", "survival": "hayatta kalma",
            "reproductive": "üreme", "success": "başarı", "fossil": "fosil", "records": "kayıtlar", "document": "belgelemek",
            "gradual": "kademeli", "divergence": "uzaklaşma / sapma", "transitional": "geçiş", "geological": "jeolojik", "epochs": "dönemler",
            "modern": "modern", "genetics": "genetik", "incorporates": "dahil etmek", "molecular": "moleküler", "biology": "biyoloji",
            "tracing": "izlemek", "ancestral": "atalardan kalma", "lineages": "soylar", "sequencing": "dizileme", "illuminates": "aydınlatmak",
            "pathogens": "patojenler", "develop": "geliştirmek", "antibiotic": "antibiyotik", "resistance": "direnç", "respond": "yanıt vermek",
            "represents": "temsil etmek", "unifying": "birleştirici", "grand": "büyük", "framework": "çerçeve", "explaining": "açıklamak",
            "breathtaking": "nefes kesici", "diversity": "çeşitlilik", "life": "yaşam", "analytically": "analitik olarak",
            "complex": "karmaşık", "crisis": "kriz", "situations": "durumlar", "produce": "üretmek", "alternative": "alternatif",
            "scenarios": "senaryolar", "key": "anahtar", "institutional": "kurumsal", "strategic": "stratejik", "planning": "planlama",
            "involves": "içermek", "evaluating": "değerlendirmek", "internal": "iç", "strengths": "güçlü yönler", "external": "dış",
            "threats": "tehditler", "objectives": "hedefler", "systematically": "sistematik olarak", "effective": "etkili", "solvers": "çözenler",
            "decompose": "parçalamak", "massive": "devasa", "challenges": "zorluklar", "manageable": "yönetilebilir", "components": "bileşenler",
            "testing": "test etmek", "hypotheses": "hipotezler", "methodically": "metodik olarak", "cognitive": "bilişsel", "flexibility": "esneklik",
            "leaders": "liderler", "pivot": "yön değiştirmek", "strategies": "stratejiler", "unexpected": "beklenmedik", "obstacles": "engeller",
            "emerge": "ortaya çıkmak", "decision": "karar", "making": "verme", "frameworks": "çerçeveler", "minimize": "en aza indirmek",
            "emotional": "duygusal", "bias": "önyargı", "leverage": "kullanmak", "insights": "içgörüler", "cultivating": "geliştirmek",
            "acumen": "anlayış / zeka", "continuous": "sürekli", "learning": "öğrenme", "intellectual": "entelektüel", "curiosity": "merak",
            "rigorous": "titiz", "evaluation": "değerlendirme", "mastering": "ustalaşmak", "methodologies": "metodolojiler",
            "empowers": "güçlendirmek", "navigate": "gezmek / üstesinden gelmek", "professional": "profesyonel", "uncertainty": "belirsizlik",
            "unwavering": "sarsmaz", "confidence": "özgüven", "exceptional": "istisnai", "competence": "yetkinlik", "twenty": "yirmi",
            "first": "birinci", "century": "yüzyıl", "present": "sunmak / mevcut", "multi": "çok", "polar": "kutuplu", "extremely": "aşırı",
            "dynamic": "dinamik", "traditional": "geleneksel", "diplomacy": "diplomasi", "replaced": "değiştirilmek", "cyber": "siber",
            "superiority": "üstünlük", "integration": "entegrasyon", "countries": "ülkeler", "wage": "sürdürmek / yürütmek",
            "corridors": "koridorlar", "maritime": "denizcilik", "investments": "yatırımlar", "critical": "kritik", "necessity": "zorunluluk",
            "read": "okumak", "geopolitical": "jeopolitik", "balances": "denge", "correctly": "doğru bir şekilde", "gain": "kazanmak",
            "analytical": "analitik", "develop": "geliştirmek", "skills": "beceriler", "order": "sıra / düzen",
            "say": "söz sahibi olmak", "multilateral": "çok taraflı", "institutions": "kurumlar", "amidst": "ortasında",
            "rising": "yükselen", "nationalist": "milliyetçi", "sentiments": "duygular", "rivalries": "rekabetler", "geostrategy": "jeostrateji",
            "mastering": "ustalaşmak", "simultaneously": "aynı anda", "empowering": "güçlendirmek", "youth": "gençlik", "robust": "sağlam",
            "awareness": "farkındalık", "ensures": "garantilemek", "leadership": "liderlik", "fostering": "teşvik etmek", "sustainable": "sürdürülebilir",
            "existentialist": "varoluşçu", "philosophers": "filozoflar", "sartre": "sartre", "camus": "camus", "argue": "savunmak",
            "freedom": "özgürlük", "created": "yaratılmak", "individual": "birey", "purposefulness": "amaçlılık", "shaped": "şekillendirilmiş",
            "choices": "seçimler", "rejects": "reddetmek", "predetermined": "önceden belirlenmiş", "destinies": "kaderler", "emphasizing": "vurgulamak",
            "radical": "radikal", "personal": "kişisel", "responsibility": "sorumluluk", "authenticity": "özgünlük", "indifferent": "kayıtsız",
            "confronting": "yüzleşmek", "mortality": "ölümlülük", "absurdity": "saçmalık", "drives": "itmek", "define": "tanımlamak",
            "core": "çekirdek", "courageous": "cesur", "action": "eylem", "tradition": "gelenek", "resonates": "yankı uyandırmak",
            "deeply": "derinden", "navigating": "yönelmek", "identity": "kimlik", "pressures": "baskılar", "embracing": "kucaklamak",
            "passionate": "tutkulu", "resist": "direnmek", "conformity": "uyum", "author": "yazmak", "unique": "benzersiz",
            "integrity": "bütünlük", "vital": "hayati", "examining": "incelemek", "purpose": "amaç", "cultivating": "geliştirmek",
            "self": "öz", "awareness": "farkındalık", "mastering": "ustalaşmak", "autonomy": "özerklik", "rules": "kurallar",
            "apply": "uygulamak", "particles": "parçacıklar", "exist": "var olmak", "multiple": "birden fazla", "locations": "konumlar",
            "simultaneously": "aynı anda", "mysterious": "gizemli", "shakes": "sarsmak", "perception": "algı", "superposition": "süperpozisyon",
            "entanglement": "dolanıklık", "defy": "meydan okumak", "intuitive": "sezgisel", "logic": "mantık", "demonstrating": "göstermek",
            "subatomic": "alt atomik", "operates": "çalışmak", "probabilistic": "olasılıksal",
            "physicists": "fizikçiler", "harness": "yararlanmak", "ultra": "ultra", "fast": "hızlı", "supercomputers": "süper bilgisayarlar",
            "unbreakable": "kırılmaz", "encryption": "şifreleme", "subatomic": "alt atomik", "realm": "alem", "bridges": "köprü kurmak",
            "physics": "fizik", "objective": "nesnel", "observation": "gözlem", "counterintuitive": "sezgiye aykırı", "verified": "doğrulanmış",
            "framework": "çerçeve", "scientific": "bilimsel", "expands": "genişletmek", "imagination": "hayal gücü", "unlocking": "kilidini açmak",
            "revolutionary": "devrim niteliğinde", "horizons": "ufuklar", "redefine": "yeniden tanımlamak", "computing": "bilgi işlem",
            "generation": "üretim", "pollution": "kirlilik", "manipulation": "manipülasyon", "shield": "kalkan", "disguise": "gizlemek",
            "distinguish": "ayırt etmek", "algorithmic": "algoritmik", "echo": "yankı", "chambers": "odalar", "sensationalized": "sansasyonelleştirilmiş",
            "headlines": "manşetler", "distort": "çarpıtmak", "discourse": "söylem", "polarizing": "kutuplaştıran", "consumers": "tüketiciler",
            "credibility": "güvenilirlik", "cross": "çapraz", "reference": "referans", "recognize": "tanımak", "propaganda": "propaganda",
            "institutions": "kurumlar", "prioritize": "öncelik vermek", "training": "eğitim", "discerning": "seçici", "thinkers": "düşünürler",
            "professionals": "profesyoneller", "utilize": "kullanmak", "narrative": "anlatı", "shape": "şekillendirmek", "corporate": "şirket",
            "branding": "markalaşma", "ethically": "etik olarak", "safeguarding": "korumak", "eternal": "ebedi", "vigilance": "uyanıklık",
            "fact": "gerçek", "checking": "kontrol etme", "commitment": "bağlılık", "honesty": "dürüstlük", "objective": "nesnel",
            "journalism": "gazetecilik", "metropolises": "metropoller", "equipped": "donatılmış", "saving": "tasarruf", "zero": "sıfır",
            "autonomous": "otonom", "public": "kamu", "transport": "taşımacılık", "networks": "ağlar", "essential": "gerekli",
            "internet": "internet", "things": "şeyler", "sensors": "sensörler", "monitor": "izlemek", "flow": "akış",
            "quality": "kalite", "real": "gerçek", "optimize": "optimize etmek", "management": "yönetim", "roofs": "çatılar",
            "vertical": "dikey", "forests": "ormanlar", "permeable": "geçirgen", "pavements": "kaldırımlar", "mitigate": "hafifletmek",
            "island": "ada", "manage": "yönetmek", "stormwater": "yağmur suyu", "runoff": "akıntı", "planning": "planlama",
            "prioritizes": "öncelik vermek", "pedestrian": "yaya", "accessibility": "erişilebilirlik", "cycling": "bisiklet",
            "infrastructure": "altyapı", "private": "özel", "automobile": "otomobil", "dependency": "bağımlılık", "expand": "genişlemek",
            "rapidly": "hızla", "transitioning": "geçiş yapmak", "prevents": "önlemek", "municipal": "belediye", "transforms": "dönüştürmek",
            "livable": "yaşanabilir", "eco": "çevre dostu", "friendly": "dostu", "hubs": "merkezler", "efficiency": "verimlilik",
            "well": "iyi", "being": "varlık", "mimicking": "taklit etmek", "flawless": "kusursuz", "mechanisms": "mekanizmalar",
            "bullet": "mermi", "trains": "trenler", "eliminated": "ortadan kaldırmak", "disruptive": "rahatsız edici", "sonic": "sonik",
            "booms": "patlamalar", "adopting": "benimsemek", "aerodynamic": "aerodinamik", "beak": "gaga", "shape": "şekil",
            "diving": "dalmak", "velcro": "cırt cırt", "fasteners": "bağlantı elemanları", "observing": "gözlemlemek", "burdock": "duvarkağıdı/pıtrak",
            "plant": "bitki", "burs": "pıtrak", "cling": "tutunmak", "animal": "hayvan", "fur": "kürk", "sharkskin": "köpekbalığı derisi",
            "inspired": "ilham alan", "swimsuit": "mayo", "textures": "dokular", "reduce": "azaltmak", "hydrodynamic": "hidrodinamik",
            "drag": "direnç", "enhancing": "geliştirmek", "athletic": "atletik", "speeds": "hızlar", "spent": "harcamak",
            "perfecting": "mükemmelleştirmek", "evolutionary": "evrimsel", "trial": "deneme", "error": "hata", "accelerates": "hızlandırmak",
            "solutions": "çözümler", "harmonize": "uyum sağlamak",
            "analyzing": "analiz etmek", "billions": "milyarlarca", "data": "veri", "instantly": "anında", "enables": "olanak tanımak",
            "companies": "şirketler", "governments": "hükümetler", "strategic": "stratejik", "decisions": "kararlar", "privacy": "gizlilik",
            "valuable": "değerli", "treasure": "hazine", "identify": "tanımlamak", "subtle": "ince", "behavioral": "davranışsal",
            "patterns": "modeller", "datasets": "veri setleri", "predicting": "tahmin etmek", "trends": "eğilimler", "medical": "tıbbi",
            "diagnoses": "teşhisler", "accurately": "doğru bir şekilde", "massive": "devasa", "collection": "toplama",
            "practices": "uygulamalar", "raise": "ortaya çıkarmak", "profound": "derin", "ethical": "etik", "surveillance": "gözetim",
            "individual": "bireysel", "rights": "haklar", "enforce": "uygulamak", "strict": "katı", "protection": "koruma",
            "regulations": "düzenlemeler", "gdpr": "gdpr", "control": "kontrol etmek", "unauthorized": "yetkisiz", "harvesting": "toplama",
            "balancing": "dengelemek", "utility": "fayda", "civil": "sivil", "liberties": "özgürlükler", "transparent": "şeffaf",
            "governance": "yönetişim", "robust": "sağlam", "standards": "standartlar", "analytics": "analitik", "defining": "tanımlayan",
            "challenge": "zorluk", "contemporary": "çağdaş", "economy": "ekonomi",
            "universal": "evrensel", "declaration": "bildiri", "document": "belge", "common": "ortak", "will": "irade",
            "aimed": "amaçlayan", "guaranteeing": "garanti etmek", "fundamental": "temel", "freedoms": "özgürlükler", "individuals": "bireyler",
            "international": "uluslararası", "tribunals": "mahkemeler", "prosecute": "kovuşturmak", "war": "savaş", "crimes": "suçlar",
            "genocide": "soykırım", "humanity": "insanlık", "holding": "tutmak", "rogue": "sorumsuz/zorba", "accountable": "sorumlu",
            "conventions": "sözleşmeler", "protect": "korumak", "refugees": "mülteciler", "eliminate": "ortadan kaldırmak",
            "discrimination": "ayrımcılık", "abolish": "kaldırmak", "cruel": "zalim", "punishment": "ceza", "enforcing": "uygulamak",
            "law": "yasa", "remains": "kalmak", "challenging": "zor", "due": "-den dolayı", "national": "ulusal", "sovereignty": "egemenlik",
            "powerful": "güçlü", "state": "devlet", "resistance": "direniş", "civil": "sivil", "society": "toplum", "advocates": "savunucular",
            "play": "oynamak", "vital": "hayati", "roles": "roller", "exposing": "ifşa etmek", "abuses": "suistimaller",
            "pressuring": "baskı yapmak", "upholding": "savunmak", "standards": "standartlar", "reflects": "yansıtmak", "highest": "en yüksek",
            "moral": "ahlaki", "aspirations": "özlemler", "fostering": "teşvik etmek", "dignity": "onur", "justice": "adalet",
            "lasting": "kalıcı", "peace": "barış",
            "anticipating": "öngörmek", "possible": "olası", "scenarios": "senaryolar", "awaiting": "bekleyen", "tomorrow": "yarın",
            "world": "dünya", "subject": "konu", "futuristic": "fütüristik", "studies": "çalışmalar", "space": "uzay", "tourism": "turizm",
            "immortality": "ölümsüzlük", "research": "araştırma", "door": "kapı", "futurists": "fütüristler", "converging": "yakınsama",
            "demographic": "demografik", "shifts": "kaymalar", "environmental": "çevresel", "construct": "inşa etmek", "plausible": "akla yatkın",
            "forecasts": "tahminler", "commercial": "ticari", "initiatives": "girişimler", "transforming": "dönüştürmek", "orbital": "yörünge",
            "travel": "seyahat", "accessible": "erişilebilir", "private": "özel", "citizens": "vatandaşlar", "biotechnology": "biyoteknoloji",
            "explores": "keşfetmek", "radical": "radikal", "life": "yaşam", "extension": "uzatma", "cellular": "hücresel",
            "rejuvenation": "gençleşme", "therapies": "tedaviler", "disruptions": "kesintiler", "allow": "izin vermek", "adapt": "adapte olmak",
            "curricula": "müfredatlar", "labor": "emek", "markets": "piyasalar", "legal": "yasal", "frameworks": "çerçeveler",
            "proactively": "proaktif olarak", "embracing": "kucaklamak", "optimistic": "iyimser", "caution": "temkin", "empowers": "güçlendirmek",
            "shape": "şekillendirmek", "landscape": "manzara", "consciously": "bilinçli olarak", "ethically": "etik olarak", "benefit": "fayda",
            "true": "gerçek", "leader": "lider", "means": "anlamına gelmek", "visionary": "vizyoner", "keep": "tutmak", "cool": "sakin",
            "times": "zamanlar", "crisis": "kriz", "inspire": "ilham vermek", "team": "ekip", "build": "inşa etmek", "today": "bugün",
            "articulate": "dile getirmek", "compelling": "ikna edici", "long": "uzun", "term": "vade", "goals": "hedefler",
            "empowering": "güçlendirmek", "subordinates": "astlar", "trust": "güven", "mentorship": "rehberlik", "emotional": "duygusal",
            "intelligence": "zeka", "active": "aktif", "listening": "dinleme", "integrity": "bütünlük", "distinguish": "ayırt etmek",
            "exceptional": "istisnai", "tyrannical": "zorba", "bosses": "patronlar", "organizational": "örgütsel", "effective": "etkili",
            "provide": "sağlamak", "steady": "istikrarlı", "reassurance": "güvence", "decisive": "kararlı", "direction": "yön",
            "developing": "geliştirmek", "capacity": "kapasite", "involves": "içermek", "continuous": "sürekli", "reflection": "düşünce",
            "resilience": "direnç", "genuine": "gerçek", "commitment": "bağlılık", "serving": "hizmet etmek", "others": "diğerleri",
            "cultivating": "geliştirmek", "ensures": "garantilemek", "institutions": "kurumlar", "guided": "rehberlik edilmek",
            "wisdom": "bilgelik", "empathy": "empati", "unwavering": "sarsılmaz", "dedication": "adanmışlık", "positive": "olumlu",
            "societal": "toplumsal", "transformation": "dönüşüm"
        };

        let okumaTestiBittiMi = false;

        function yeniMetinGetir() {
            if (okumaTimer) { clearInterval(okumaTimer); okumaTimer = null; }
            okumaSaniye = 0;
            okunanKelimeSayisi = 0;
            okumaTestiBittiMi = false;

            document.getElementById('okumaKronometre').innerText = "00:00";
            document.getElementById('okunanKelimeSayac').innerText = "0";
            document.getElementById('wpmGosterge').innerText = "0";
                document.getElementById('okumaBaslatBtn').innerText = "▶ Süreyi Başlat";

            document.getElementById('kelimeCeviriKutusu').style.display = 'none';
            document.getElementById('metinTurkceCeviriKutusu').style.display = 'none';
            document.getElementById('secilenKelimeBilgi').innerText = "Bir kelimeye tıklayın";

            let sinif = document.getElementById('okumaSinifSelect').value;
            let liste = sinirsizMetinHavuzu[sinif] || sinirsizMetinHavuzu[1];
            secilenMetinObjesi = liste[Math.floor(Math.random() * liste.length)];

            let alan = document.getElementById('prompterMetinAlani');
            alan.innerHTML = "";
            let kelimeler = secilenMetinObjesi.metin.split(" ");

            kelimeler.forEach((kelime, idx) => {
                let span = document.createElement('span');
                span.innerText = kelime;
                span.dataset.index = idx;
                span.style.cssText = "cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: all 0.2s; user-select: none;";

                span.onclick = function() {
                    if (okumaTimer && !okumaTestiBittiMi) {
                        let clickedIdx = parseInt(span.dataset.index);
                        let allSpans = alan.querySelectorAll('span');

                        allSpans.forEach((s, sIdx) => {
                            if (sIdx <= clickedIdx) {
                                s.classList.add('secildi');
                                s.style.background = "#16a34a";
                                s.style.color = "#ffffff";
                            } else {
                                s.classList.remove('secildi');
                                s.style.background = "transparent";
                                s.style.color = "#1e293b";
                            }
                        });

                        okunanKelimeSayisi = clickedIdx + 1;
                        document.getElementById('okunanKelimeSayac').innerText = okunanKelimeSayisi;
                        wpmHesapla();
                    } else {
                        let hamKelime = kelime.replace(/[^a-zA-Z]/g, "").toLowerCase();
                        let anlami = kelimeSozlugu[hamKelime] || "Bu kelimenin sözlük karşılığı henüz eklenmemiş.";

                        document.getElementById('kelimeCeviriKutusu').style.display = 'block';
                        document.getElementById('secilenKelimeBilgi').innerHTML = `<b>${kelime}</b> = <span style="color:#0284c7;">${anlami}</span>`;
                    }
                };
                alan.appendChild(span);
            });
        }

        function okumaKronometreBaslat() {
            if (okumaTimer) {
                clearInterval(okumaTimer);
                okumaTimer = null;
                okumaTestiBittiMi = true;
                document.getElementById('okumaBaslatBtn').innerText = "▶ Süreyi Başlat";
                metinTurkceCevirisiniGoster();
                return;
            }

            okumaSaniye = 0;
            okunanKelimeSayisi = 0;
            okumaTestiBittiMi = false;

            document.getElementById('okunanKelimeSayac').innerText = "0";
            document.getElementById('wpmGosterge').innerText = "0";
            document.getElementById('kelimeCeviriKutusu').style.display = 'none';
            document.getElementById('metinTurkceCeviriKutusu').style.display = 'none';

            document.querySelectorAll('#prompterMetinAlani span').forEach(s => {
                s.classList.remove('secildi');
                s.style.background = "transparent";
                s.style.color = "#1e293b";
            });

            document.getElementById('okumaBaslatBtn').innerText = "⏸ Duraklat / Bitir";
            okumaTimer = setInterval(() => {    
                okumaSaniye++;
                let dk = String(Math.floor(okumaSaniye / 60)).padStart(2, '0');
                let sn = String(okumaSaniye % 60).padStart(2, '0');
                document.getElementById('okumaKronometre').innerText = `${dk}:${sn}`;
                wpmHesapla();
            }, 1000);
        }

        function metinTurkceCevirisiniGoster() {
            if (!secilenMetinObjesi) return;

            let cevirilerSozlugu = {
                "My Red Ball": "Topum kırmızı, parlak ve yuvarlak. Okul bahçesinde arkadaşım Can ile mutlu bir şekilde oynuyorum. Zil çalar, ve sınıfa koşarız. Öğretmenimiz bize yeni hikaye kitapları verir. Okumayı öğrenmek harika bir duygu.",
                "The Little Cat": "Bahçedeki küçük sarı kedi süt içmeyi çok sever. Güneş batarken evine kıvrılır ve tatlı tatlı uyur. Onu okşadığımda hemen mırıldanmaya başlar. Evimizin en tatlı neşesidir.",
                "On the Way to School": "Sabah erkenden uyandım ve sırt çantamı hazırladım. Annemle birlikte mutlu bir şekilde okul yoluna koyulduk. Yolda renkli çiçekler ve sevimli köpeklere gördük. Sınıfımıza girdik ve arkadaşlarımıza parlak bir gün diledik.",
                "The Beautiful Garden": "Evimizin arkasında kocaman yeşil bir bahçe var. Bahçede güzel kokan güller ve tatlı elma ağaçları yetişiyor. Her akşam orada ip atlıyor ve neşeyle şarkılar söylüyorum.",
                "Kite Festival": "Bugün rüzgar çok güzel esiyor. Renkli uçurtmalar mavi gökyüzünde süzülüyor. Kendi ellerimle yaptığım kuyruklu uçurtmam en yüksek noktalara ulaştı.",
                "My Sweet Friend": "Pamuk isimli köpeğim başını sallayarak beni kapıda karşılar. Onunla yakalamaç oynamak beni çok mutlu ediyor. Akşamları yatağımın yanında birlikte dinleniyoruz.",
                "Drawing Pictures": "Renkli kalemlerimi açtım ve koca bir ev resmi çizdim. Evin bacasından duman tütüyor ve mutlu çocuklar bahçede koşuyor. Öğretmenim resmimi çok beğendi.",
                "After the Rain": "Yağmur dindi ve havada toprak kokusu var. Penceremizden dışarı baktığımda devasa renkli bir gökkuşağı gördüm. Dışarı koştum ve sevinçle zıpladım.",
                "Starry Night": "Gece pencereden gökyüzündeki parlayan parlak yıldızları izledim. Ay bana gülümser gibiydi ve tatlı rüyalar diledi. Battaniyeme sarıldım ve huzurla uyudum.",
                "Bird Nest": "Ceviz ağacımızın dalına iki minik kuş yuva yaptı. Her gün onlara ekmek kırıntıları atıyorum. Her sabah onların cıvıltısıyla mutlu bir şekilde uyanıyorum."
            };

            let turkceMetin = cevirilerSozlugu[secilenMetinObjesi.baslik] || "Bu metnin tam Türkçe çevirisi yakında sisteme eklenecektir. Kelimelerin üzerine tıklayarak tek tek anlamlarını öğrenebilirsiniz.";

            document.getElementById('metinTurkceCeviriKutusu').style.display = 'block';
            document.getElementById('metinTurkceIcerik').innerText = turkceMetin;
        }

        async function okumaSonucuKaydet() {
            if (okunanKelimeSayisi <= 0 || okumaSaniye <= 0) {
                alert("Lütfen önce süreyi başlatıp okumayı bitirdiğiniz son kelimenin üzerine tıklayın!");
                return;
            }
                if (okumaTimer) { clearInterval(okumaTimer); okumaTimer = null; }
            okumaTestiBittiMi = true;
            document.getElementById('okumaBaslatBtn').innerText = "▶ Süreyi Başlat";
            metinTurkceCevirisiniGoster();

            let sinifVal = document.getElementById('okumaSinifSelect').value + ". Sınıf";
            let wpmVal = parseInt(document.getElementById('wpmGosterge').innerText) || 0;
            let tarihStr = new Date().toISOString();

            let payload = {
                islem: "okumaHiziKaydet",
                ogrenci: aktifOgrenciAdi || "Misafir Ziyaretçi",
                tarih: tarihStr,
                sinif: sinifVal,
                okunanKelime: okunanKelimeSayisi,
                gecenSure: okumaSaniye,
                wpm: wpmVal,
                metinBasligi: secilenMetinObjesi ? secilenMetinObjesi.baslik : "Reading Text"
            };

            try {
                let res = await fetch(apiURL, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                let data = await res.json();
                if (data.status === "success") {
                    alert("Okuma hızı sonucu başarıyla kaydedildi! 🎉");
                    okumaGecmisiniYukle();
                } else {
                    alert("Kaydetme sırasında hata oluştu.");
                }
            } catch (err) {
                console.error(err);
                alert("Bağlantı hatası oluştu.");
            }
        }

                function wpmHesapla() {
            if (okumaSaniye <= 0 || okunanKelimeSayisi <= 0) {
                let wpmGosterge = document.getElementById('wpmGosterge');
                if (wpmGosterge) wpmGosterge.innerText = "0";
                return;
            }
            let dakika = okumaSaniye / 60;
            let wpm = Math.round(okunanKelimeSayisi / dakika);
            let wpmGosterge = document.getElementById('wpmGosterge');
            if (wpmGosterge) {
                wpmGosterge.innerText = wpm;
            }
        }

                        async function okumaGecmisiniYukle() {
                    let konteyner = document.getElementById('okumaGecmisKonteyner');
                    konteyner.innerHTML = `<div style="font-size: 10.5px; color: #64748b; text-align: center;">Geçmiş yükleniyor...</div>`;
                    try {
                        let res = await fetch(`${apiURL}?islem=okumaGecmisGetir&ogrenci=${encodeURIComponent(aktifOgrenciAdi || "Misafir Ziyaretçi")}`);
                        let liste = await res.json();
                        konteyner.innerHTML = "";
                        if (!liste || liste.length === 0) {
                            konteyner.innerHTML = `<div style="font-size: 10.5px; color: #64748b; text-align: center;">Henüz kayıtlı okuma testi yok.</div>`;
                            return;
                        }
                        liste.reverse().forEach(item => {
                            let tarihFormatted = tarihiDuzelt(item.tarih);
                            konteyner.innerHTML += `
                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; font-size: 11px;">
                                    <div style="display: flex; justify-content: space-between; font-weight: 800; color: #1e293b; margin-bottom: 2px;">
                                        <span>📅 ${tarihFormatted} — ${item.metinBasligi} (${item.sinif})</span>
                                        <span style="color: #16a34a;">⚡ ${item.wpm} WPM</span>
                                    </div>
                                    <div style="color: #64748b; font-size: 10px;">📖 Kelime: ${item.okunanKelime} | ⏱️ Süre: ${item.gecenSure} sn</div>
                                </div>
                            `;
                        });
                    } catch(err) {
                        console.error(err);
                        konteyner.innerHTML = `<div style="font-size: 10.5px; color: #dc2626; text-align: center;">Geçmiş yüklenirken hata oluştu.</div>`;
                    }
                }


                       async function girisYap(event) {
                    event.preventDefault();
                    const ogr = guvenliMetin(document.getElementById('ogrenci').value.trim());
                    const sifre = guvenliMetin(document.getElementById('sifre').value.trim());
                    let m = document.getElementById('mesaj');

                    if(!ogr || !sifre) { m.className="error"; m.innerText="Tüm alanları doldurun."; return; }

                    // Giriş tıklandığı an baykuş animasyonunu göster
                    document.getElementById('login-container').style.display = 'none';
                    document.getElementById('oturumYuklemeOverlay').style.display = 'flex';

                    // Eğer global veri henüz gelmediyse biraz bekle
                               let denemeSayisi = 0;
                    while ((!globalDataCache || globalDataCache.length === 0) && denemeSayisi < 20) {
                        await new Promise(r => setTimeout(r, 300));
                        denemeSayisi++;
                    }

                    // YENİ: 6 saniye sonunda hâlâ veri gelmediyse, son bir kez doğrudan tekrar dene
                    if (!globalDataCache || globalDataCache.length === 0) {
    await dijiGlobalVeriYukle();
}

                                let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === ogr.toLowerCase() && String(u.sifre).trim() === sifre);

                    if (user) {
                        let durumVal = String(user.durum || "").trim().toLowerCase();
                        if (durumVal === "onay bekliyor") {
                            document.getElementById('oturumYuklemeOverlay').style.display = 'none';
                            document.getElementById('login-container').style.display = 'block';
                            m.className = "error";
                            m.innerText = "Hesabın henüz öğretmen onayı bekliyor. Onaylandığında giriş yapabilirsin.";
                            return;
                        }
                    }

                    // Eğer özel "teacher" veya veri tabanında eşleşen bir kullanıcı varsa
                    if(user || ogr.toLowerCase() === "teacher") {
                        m.className="success"; 
                        m.innerText="Giriş başarılı!";
                        aktifOgrenciAdi = ogr; 
                        toplamSaniye = user ? (Number(user.toplamsure) || 0) : 0;

                                        localStorage.setItem("ing_oturumAcik", "true"); 
        localStorage.setItem("ing_aktifOgrenci", aktifOgrenciAdi); 
        localStorage.setItem("ing_toplamSaniye", toplamSaniye);
                                        fetch(`${apiURL}?islem=sonGirisGuncelle&ogrenci=${encodeURIComponent(aktifOgrenciAdi)}`).catch(() => {});

                        document.getElementById('ogrenciAdiText').innerText = aktifOgrenciAdi;
                        document.getElementById('userAvatarLetter').innerText = ogrenciMaskotSec(aktifOgrenciAdi);


                        if (user) {
                            veriArayuzeIsle(user);
                        }

                        // Kısa bir gecikme ekleyerek animasyonun akıcı görünmesini sağla ve paneli aç
                                                                                                                                                                   setTimeout(() => {
                            document.getElementById('oturumYuklemeOverlay').style.display = 'none';
                            document.getElementById('panel-alani').style.display = 'block';
                            girisSerisiGuncelleVeGetir();
baslatSayac();
arkaPlanVeriYenilemeBaslat();

setTimeout(() => {
    puanBildirimKontrolEt();
}, 1500);

setTimeout(() => {
    anaPanelDuyuruBildirimleriYukle();
}, 2500);

setTimeout(() => {
    (window.dmOtomatikAkisAc || meduAkisAc)();
}, 3200);

setTimeout(() => {
    gunlukEnerjiBonusuKontrolEt();
}, 4000);
                    }, 600);
                    } else {
                        // Hatalı giriş durumunda tekrar giriş ekranına dön
                        document.getElementById('oturumYuklemeOverlay').style.display = 'none';
                        document.getElementById('login-container').style.display = 'block';
                        m.className="error"; 
                        m.innerText="Hatalı kullanıcı adı veya şifre!";
                    }
                }



                        let arkaPlanVeriYenilemePolling = null;

                      function arkaPlanVeriYenilemeBaslat() {
    if (arkaPlanVeriYenilemePolling) {
        clearInterval(arkaPlanVeriYenilemePolling);
    }

    let calisiyor = false;
    let hataSayisi = 0;
    let sonrakiDeneme = 0;

    async function yenile() {
        if (
            !aktifOgrenciAdi ||
            calisiyor ||
            document.hidden ||
            Date.now() < sonrakiDeneme
        ) {
            return;
        }

        if (Date.now() - (window._dijiSonYenileme || 0) < 60000) return;

        window._dijiSonYenileme = Date.now();

        calisiyor = true;

        let kontrol = new AbortController();
        let zamanAsimi = setTimeout(() => kontrol.abort(), 20000);

        try {
            let res = window.dmIncrementalReads ? new Response(JSON.stringify(await window.dmIncrementalReads.profile({signal:kontrol.signal}))) : await fetch(apiURL,{signal:kontrol.signal,cache:'no-store'});

            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            let yeniVeri = await res.json();

            if (!Array.isArray(yeniVeri)) {
                throw new Error('Beklenmeyen yanıt');
            }

            globalDataCache = yeniVeri;
            if (typeof dijiGlobalCacheYaz === "function") dijiGlobalCacheYaz(yeniVeri);

            let user = globalDataCache.find(
                u =>
                    String(u.ogrenci).trim().toLowerCase() ===
                    String(aktifOgrenciAdi).trim().toLowerCase()
            );

            if (user) {
                veriArayuzeIsle(user);
            }

            hataSayisi = 0;
            sonrakiDeneme = 0;

        } catch (err) {
            hataSayisi++;

            sonrakiDeneme =
                Date.now() +
                Math.min(300000, 30000 * hataSayisi);

            if (hataSayisi >= 3) {
                console.warn(
                    'Arka plan yenileme ' +
                    hataSayisi +
                    ' kez üst üste başarısız:',
                    err && err.message
                );
            }

        } finally {
            clearTimeout(zamanAsimi);
            calisiyor = false;
        }
    }

    /* İlk açılışta bekleme yapmadan bir kez kontrol et */
    setTimeout(yenile, 3000);

    /* Sonrasında 5 dakikada bir */
    arkaPlanVeriYenilemePolling = setInterval(yenile, 300000);

    /* Kullanıcı sekmeye geri döndüğünde ayrıca kontrol et */
    document.addEventListener(
        'visibilitychange',
        () => {
            if (!document.hidden) {
                yenile();
            }
        },
        { passive: true }
    );
}

                      function baslatSayac() {
                    clearInterval(timerInterval);
                    guncelleArayuz();
                    dcSayacDurumGuncelle();
                    timerInterval = setInterval(() => {
                        if (document.hidden || Date.now()-(window.dmLastActiveAt||Date.now())>90000) return;
                        toplamSaniye++; sessionStorage.setItem("toplamSaniye", toplamSaniye); guncelleArayuz();
                        if(toplamSaniye % 300 === 0) googleSheetseKaydet();   /* 5 dakikada bir; sekme gizlenince ve sayfa kapanırken de kaydedilir */
                    }, 1000);
                }

                function guncelleArayuz() {
                    let s = Math.floor(toplamSaniye/3600), d = Math.floor((toplamSaniye%3600)/60), sn = toplamSaniye%60;
                    document.getElementById('sureGosterge').innerText = `${s<10?'0'+s:s}:${d<10?'0'+d:d}:${sn<10?'0'+sn:sn}`;
                    let rozet = Math.floor(toplamSaniye/600);
                    document.getElementById('rozetBilgi').innerText = `🥉 Kazanılan: ${rozet} 🌟`;
                    document.getElementById('sonrakiRozet').innerText = `Sonraki: ${Math.ceil((600-(toplamSaniye%600))/60)} dk`;
                    document.getElementById('progressBar').style.width = `${((toplamSaniye%600)/600)*100}%`;
                }

                document.addEventListener('visibilitychange', function () { if (document.hidden && typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && toplamSaniye > 0) googleSheetseKaydet(); });
                window.addEventListener('pagehide', function () { if (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && toplamSaniye > 0) googleSheetseKaydet(); });
                function googleSheetseKaydet() {
                    fetch(`${apiURL}?islem=kaydet&ogrenci=${encodeURIComponent(aktifOgrenciAdi)}&toplamsure=${toplamSaniye}&rozet=${Math.floor(toplamSaniye/600)}`, { keepalive: true }).catch(()=>{});
                }

                // --- YILLIK PLAN TAKİP SİSTEMİ ---
                                function planKartiniGuncelle(user) {
                    let box = document.getElementById('planTrackerBox');
                    if (!box) { console.warn("planTrackerBox elementi bulunamadı, HTML eklemesini kontrol et."); return; }
                    if (!user.atananPlanlar || user.atananPlanlar.length === 0) {
                        box.style.display = 'none';
                        return;
                    }
                    box.style.display = 'flex';
                    let yuzde = user.planIlerlemeYuzdesi || 0;
                    document.getElementById('planYuzdeText').innerText = `%${yuzde}`;
                    document.getElementById('planHaftaText').innerText = `${user.planTamamlananHafta || 0}/${user.planToplamHafta || 0} hafta`;
                }

                        function planModaliniAc() {
                    let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === aktifOgrenciAdi.toLowerCase());
                    if (!user || !user.atananPlanlar) return;
                    let konteyner = document.getElementById('planHaftaListesi');
                    konteyner.innerHTML = "";

                    if (user.atananPlanlar.length === 0) {
                        konteyner.innerHTML = `<p style="text-align:center; color:#64748b; font-size:11px;">Henüz atanmış bir plan bulunmuyor.</p>`;
                    } else {
                        user.atananPlanlar.forEach((plan) => {
                            let durumEtiket = plan.tamamlandiMi
                                ? `<span style="background:#16a34a; color:#fff; font-size:9.5px; font-weight:700; padding:4px 9px; border-radius:12px; white-space:nowrap;">✅ İşlendi</span>`
                                : `<span style="background:#e2e8f0; color:#64748b; font-size:9.5px; font-weight:700; padding:4px 9px; border-radius:12px; white-space:nowrap;">İşlenmedi</span>`;
                            konteyner.innerHTML += `
                                <div class="plan-week-row ${plan.tamamlandiMi ? 'tamamlandi' : ''}">
                                    <div class="plan-week-info">
                                        <div class="plan-week-hafta">Hafta ${plan.hafta} <span style="color:#94a3b8; font-weight:600;">(${plan.planKodu})</span></div>
                                        <div class="plan-week-aciklama">${plan.aciklama || '-'}</div>
                                    </div>
                                    ${durumEtiket}
                                </div>
                            `;
                        });
                    }
                    document.getElementById('planModal').style.display = 'flex';
                }



                             // --- ÖĞRETMEN PANELİNDEN KAZANIM (PLAN) TAKİBİ (AÇILIR LİSTE) ---
                let rubricAktifOgrenciAdi = "";

                let rubricSeciliEtkinlikler = [];
        let rubricSeciliVideolar = [];

                function ogretmenPlanListesiniOlustur(user) {
                    rubricAktifOgrenciAdi = user.ogrenci;
                    let haftaSelect = document.getElementById('rubricPlanHaftaSelect');
                    let planAlani = document.getElementById('rubricPlanAlani');
                    let bosMesaj = document.getElementById('rubricPlanBosMesaj');

                    haftaSelect.innerHTML = "";

                    if (!user.atananPlanlar || user.atananPlanlar.length === 0) {
                        planAlani.style.display = 'none';
                        bosMesaj.style.display = 'block';
                        bosMesaj.innerText = "Bu öğrenciye atanmış bir plan bulunmuyor.";
                        return;
                    }

                    planAlani.style.display = 'block';
                    bosMesaj.style.display = 'none';

                    user.atananPlanlar.forEach((plan, idx) => {
                        let opt = document.createElement('option');
                        opt.value = idx;
                        opt.innerText = `Hafta ${plan.hafta} (${plan.planKodu}) ${plan.tamamlandiMi ? '✅' : ''}`;
                        haftaSelect.appendChild(opt);
                    });

                    rubricPlanHaftaSecildi();
                }

                function rubricPlanHaftaSecildi() {
                    let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === rubricAktifOgrenciAdi.toLowerCase());
                    if (!user || !user.atananPlanlar) return;

                    let idx = document.getElementById('rubricPlanHaftaSelect').value;
                    let plan = user.atananPlanlar[idx];
                    if (!plan) return;

                    document.getElementById('rubricPlanDurumSelect').value = plan.tamamlandiMi ? "isaretli" : "isaretsiz";
                    document.getElementById('rubricPlanAciklamaGoster').innerText = plan.aciklama || "Açıklama girilmemiş.";
                }

                async function rubricPlanDurumKaydet() {
                    let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === rubricAktifOgrenciAdi.toLowerCase());
                    if (!user || !user.atananPlanlar) return;

                    let idx = document.getElementById('rubricPlanHaftaSelect').value;
                    let plan = user.atananPlanlar[idx];
                    if (!plan) return;

                    let deger = document.getElementById('rubricPlanDurumSelect').value;
                    let isaretli = deger === "isaretli";

                    try {
                        let url = `${apiURL}?islem=planTikGuncelle&plankodu=${encodeURIComponent(plan.planKodu)}&hafta=${encodeURIComponent(String(plan.hafta))}&ogrenci=${encodeURIComponent(user.ogrenci)}&isaretli=${isaretli}`;
                        let res = await fetch(url);
                        let data = await res.json();

                        if (data.status === "success") {
                            plan.tamamlandiMi = isaretli;

                            let toplam = user.atananPlanlar.length;
                            let tamamlanan = user.atananPlanlar.filter(p => p.tamamlandiMi).length;
                            user.planToplamHafta = toplam;
                            user.planTamamlananHafta = tamamlanan;
                            user.planIlerlemeYuzdesi = toplam > 0 ? Math.round((tamamlanan / toplam) * 100) : 0;

                            document.getElementById('rubricPlanHaftaSelect').options[idx].innerText = `Hafta ${plan.hafta} (${plan.planKodu}) ${isaretli ? '✅' : ''}`;

                            if (aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() === user.ogrenci.toLowerCase()) {
                                planKartiniGuncelle(user);
                            }
                        } else {
                            alert("Güncelleme sırasında hata oluştu.");
                        }
                    } catch (e) {
                        alert("Bağlantı hatası: " + e);
                    }
                }

                        // --- RAPOR VERİ ÇEKME VE YORUM ÜRETME ---
                let raporMevcutVeri = null;
                let raporMevcutOgrenci = null;

                async function raporVerileriniGetirVeYorumOlustur() {
                    let ogrenciAdi = document.getElementById('raporOgrenciSelect').value;
                    let baslangic = document.getElementById('raporBaslangicTarih').value;
                    let bitis = document.getElementById('raporBitisTarih').value;

                    if (!ogrenciAdi) { alert("Lütfen bir öğrenci seçiniz!"); return; }
                    if (!baslangic || !bitis) { alert("Lütfen başlangıç ve bitiş tarihlerini seçiniz!"); return; }
                    if (new Date(baslangic) > new Date(bitis)) { alert("Başlangıç tarihi, bitiş tarihinden sonra olamaz!"); return; }

                    let btn = document.getElementById('raporVeriGetirBtn');
                    btn.disabled = true;
                    btn.innerText = "⏳ Veriler getiriliyor...";

                    try {
                        let url = `${apiURL}?islem=raporVeriGetir&ogrenci=${encodeURIComponent(ogrenciAdi)}&baslangic=${baslangic}&bitis=${bitis}`;
                        let res = await fetch(url);
                        let data = await res.json();

                        raporMevcutVeri = data;
                        raporMevcutOgrenci = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === ogrenciAdi.toLowerCase());

                        document.getElementById('raporYorumAlani').style.display = 'block';
                        raporYorumuYenidenOlustur();

                    } catch (e) {
                        alert("Veri çekme sırasında hata oluştu: " + e);
                    } finally {
                        btn.disabled = false;
                        btn.innerText = "🔍 Verileri Getir";
                    }
                }

                function raporYorumuYenidenOlustur() {
            if (!raporMevcutVeri || !raporMevcutOgrenci) return;

            let ad = raporMevcutOgrenci.ogrenci;
            let d = raporMevcutVeri;
            let puan = d.ortalamalar.genel;
            let ders = d.dersSayisiAralikta;
            let kayitSayisi = d.kayitSayisi;

            let gelisimYonu = "sabit";
            if (d.gelisimSerisi && d.gelisimSerisi.length >= 2) {
                let ilk = d.gelisimSerisi[0].genel;
                let son = d.gelisimSerisi[d.gelisimSerisi.length - 1].genel;
                if (son - ilk >= 5) gelisimYonu = "yukselen";
                else if (ilk - son >= 5) gelisimYonu = "dusen";
            }

            if (kayitSayisi === 0) {
                document.getElementById('raporOgretmenYorumu').value =
                    `Bu raporlama döneminde ${ad} için henüz aktif bir ders değerlendirme kaydı girilmemiştir. Önümüzdeki süreçte gerçekleştirilecek dersler ve çalışmalar sonrasında detaylı gelişim raporu paylaşılacaktır.`;
                return;
            }

            let detayliMetin = `Değerli Velimiz, \n\nBu rapor döneminde öğrencimiz ${ad} ile son derece verimli, disiplinli ve istikrarlı bir İngilizce öğrenim süreci geride bıraktık. Seçilen tarih aralığında toplam ${ders} ders başarıyla tamamlanmış olup, öğrencimizin genel başarı ortalaması ${puan} / 100 olarak kaydedilmiştir.\n\n` +
                (gelisimYonu === "yukselen" ? "Ders içi performans ve puan seyrinde gözlenen düzenli yükseliş trendi, öğrencinin çalışma disiplinine sadık kaldığını ve konuları kalıcı olarak kavradığını açıkça göstermektedir. 📈\n" : 
                 gelisimYonu === "dusen" ? "Dönem içerisinde ufak çaplı dalgalanmalar gözlenmiş olup, eksik kalan beceri başlıklarının pekiştirilmesi amacıyla özel tekrarlar planlanmaktadır.\n" : 
                 "Öğrencimiz dönem boyunca istikrarlı çizgisini koruyarak tüm çalışmalara gereken özeni göstermiştir.\n") +
                `Ayrıca kelime bilgisi, okuma, yazma ve konuşma modüllerinde gerçekleştirilen dijital aktivite ve oyun maratonlarında aktif rol oynayarak becerilerini pratik etmiştir. Öğrencimizin dil gelişimine verdiği katkıdan ötürü tebrik eder, değerli destekleriniz ve iş birliğiniz için teşekkür ederiz. 🌻`;

            document.getElementById('raporOgretmenYorumu').value = detayliMetin;
        }

                // Temizleme fonksiyonunu dışarıda bağımsız bir fonksiyon yapıyoruz
        function pdfIcinMetinTemizle(str) {
            if (!str) return "";
            return str.toString().replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, "").trim();
        }

        function turkceyiDuzelt(str) {
            if (!str) return "";
            return str.toString()
                .replace(/ı/g,"i").replace(/İ/g,"I")
                .replace(/ğ/g,"g").replace(/Ğ/g,"G")
                .replace(/ü/g,"u").replace(/Ü/g,"U")
                .replace(/ş/g,"s").replace(/Ş/g,"S")
                .replace(/ö/g,"o").replace(/Ö/g,"O")
                .replace(/ç/g,"c").replace(/Ç/g,"C");
        }

                        // --- PDF RAPORU OLUŞTURMA ---
                function raporPuanRengiVer(puan) {
                    if (puan >= 80) return [22, 163, 74];
                    if (puan >= 50) return [180, 83, 9];
                    return [225, 29, 72];
                }

                     function raporPdfOlustur() {
            if (!raporMevcutVeri || !raporMevcutOgrenci) { alert("Önce verileri getiriniz!"); return; }

            let btn = document.getElementById('raporPdfOlusturBtn');
            btn.disabled = true;
            btn.innerText = "⏳ PDF oluşturuluyor...";

            try {
                let { jsPDF } = window.jspdf;
                let doc = new jsPDF('p', 'mm', 'a4');
                let W = 210, H = 297, M = 10, CW = W - 2 * M, GAP = 3;
                let y = M;
                let d = raporMevcutVeri;
                let user = raporMevcutOgrenci;
                let baslangic = document.getElementById('raporBaslangicTarih').value;
                let bitis = document.getElementById('raporBitisTarih').value;
                let baslangicStr = tarihiDuzelt(baslangic);
                let bitisStr = tarihiDuzelt(bitis);
                let yorum = turkceyiDuzelt(pdfIcinMetinTemizle(document.getElementById('raporOgretmenYorumu').value));
                let ogrenciAdi = turkceyiDuzelt(user.ogrenci);

                function kutu(x, yy, w, h, r, g, b, radius) {
                    doc.setFillColor(r, g, b);
                    doc.roundedRect(x, yy, w, h, radius || 2, radius || 2, 'F');
                }
                function cerceve(x, yy, w, h, r, g, b, radius) {
                    doc.setDrawColor(r, g, b);
                    doc.setLineWidth(0.3);
                    doc.roundedRect(x, yy, w, h, radius || 2, radius || 2, 'S');
                }
                function baslikCiz(metin, customY) {
                    let targetY = customY !== undefined ? customY : y;
                    doc.setFillColor(51, 65, 85);
                    doc.roundedRect(M, targetY, 2.2, 4.2, 0.6, 0.6, 'F');
                    doc.setTextColor(30, 41, 59);
                    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
                    doc.text(turkceyiDuzelt(metin), M + 4, targetY + 3.2);
                    if (customY === undefined) y += 5.5;
                }

                // ===== 1. ÜST BAŞLIK ŞERİDİ =====
                kutu(M, y, CW, 16, 22, 101, 52, 3);
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold"); doc.setFontSize(13);
                doc.text("Ingilizce Maceram", M + 5, y + 7);
                doc.setFont("helvetica", "normal"); doc.setFontSize(7);
                doc.text(`${ogrenciAdi} icin hazirlanan gelisim raporu`, M + 5, y + 11.5);
                doc.setFont("helvetica", "bold"); doc.setFontSize(9);
                doc.text(`${baslangicStr} - ${bitisStr}`, W - M - 5, y + 7, { align: 'right' });
                doc.setFont("helvetica", "normal"); doc.setFontSize(6);
                doc.text("RAPOR DONEMI", W - M - 5, y + 11.5, { align: 'right' });
                y += 16 + GAP;

                // ===== 2. ÖĞRENCİ ŞERİDİ =====
                kutu(M, y, CW, 9, 240, 253, 244, 2);
                cerceve(M, y, CW, 9, 187, 247, 208, 2);
                doc.setFillColor(22, 101, 52); doc.circle(M + 6.5, y + 4.5, 2.8, 'F');
                doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
                doc.text(ogrenciAdi.charAt(0).toUpperCase(), M + 6.5, y + 5.5, { align: 'center' });
                doc.setTextColor(22, 101, 52); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
                doc.text(ogrenciAdi, M + 12, y + 4.5);
                doc.setTextColor(21, 128, 61); doc.setFont("helvetica", "normal"); doc.setFontSize(5.5);
                doc.text(`Tamamlanan ders: ${d.dersSayisiAralikta}  |  Kayit sayisi: ${d.kayitSayisi}`, M + 12, y + 7.5);
                y += 9 + GAP;

                // ===== 3. 4 İSTATİSTİK KARTI =====
                let kartW = (CW - 3 * 2.5) / 4;
                let kartlar = [
                    ["GENEL PUAN", String(d.ortalamalar.genel), [22, 101, 52], [240, 253, 244]],
                    ["SON DENEME", String(d.sonDenemeAralikta), [180, 83, 9], [255, 251, 235]],
                    ["KAYIT SAYISI", String(d.kayitSayisi), [14, 116, 144], [236, 254, 255]],
                    ["DERS SAYISI", String(d.dersSayisiAralikta), [190, 18, 60], [255, 241, 242]]
                ];
                let x = M;
                kartlar.forEach(k => {
                    kutu(x, y, kartW, 10, k[3][0], k[3][1], k[3][2], 2);
                    cerceve(x, y, kartW, 10, k[2][0], k[2][1], k[2][2], 2);
                    doc.setTextColor(k[2][0], k[2][1], k[2][2]);
                    doc.setFont("helvetica", "bold"); doc.setFontSize(5.2);
                    doc.text(k[0], x + 2.5, y + 3.5);
                    doc.setFontSize(11);
                    doc.text(k[1], x + 2.5, y + 8.2);
                    x += kartW + 2.5;
                });
                y += 10 + GAP;

                // ===== 4. 5 KRİTER BAR GRAFİĞİ =====
                baslikCiz("Beceri Kriterleri (Donem Ortalamasi)");
                let kriterler = [
                    ["Okuma", d.ortalamalar.okuma, [34, 197, 94]],
                    ["Yazma", d.ortalamalar.yazma, [14, 165, 233]],
                    ["Kelime", d.ortalamalar.vocabulary, [217, 119, 6]],
                    ["Konusma", d.ortalamalar.konusma, [168, 85, 247]],
                    ["Grammar", d.ortalamalar.grammar, [225, 29, 72]]
                ];
                let barLabelW = 20, barNumW = 7, barW = CW - barLabelW - barNumW;
                kriterler.forEach(k => {
                    doc.setTextColor(51, 65, 85); doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
                    doc.text(k[0], M, y + 2.5);
                    doc.setFillColor(226, 232, 240);
                    doc.roundedRect(M + barLabelW, y + 0.6, barW, 2.2, 0.6, 0.6, 'F');
                    doc.setFillColor(k[2][0], k[2][1], k[2][2]);
                    doc.roundedRect(M + barLabelW, y + 0.6, barW * Math.max(k[1], 3) / 100, 2.2, 0.6, 0.6, 'F');
                    doc.setTextColor(k[2][0], k[2][1], k[2][2]); doc.setFont("helvetica", "bold"); doc.setFontSize(6.5);
                    doc.text(String(k[1]), M + barLabelW + barW + 2, y + 2.5);
                    y += 4;
                });
                y += GAP - 1;

                // ===== 5. YAN YANA İKİ GRAFİK (Başlıklar çakışmayacak şekilde hizalandı) =====
                let grafikW = (CW - 4) / 2;
                let grafikH = 19;
                let baslikY = y;

                // Başlıklar aynı hizada çiziliyor
                baslikCiz("Genel Gelisim Grafigi", baslikY);
                baslikCiz("Deneme Sinavi Gelisimi", baslikY);
                y = baslikY + 5; // Kutuların başlayacağı Y koordinatı

                let solX = M;
                let sagX = M + grafikW + 4;

                // Sol Grafik Kutusu
                kutu(solX, y, grafikW, grafikH, 248, 250, 252, 2);
                cerceve(solX, y, grafikW, grafikH, 226, 232, 240, 2);
                if (d.gelisimSerisi && d.gelisimSerisi.length > 0) {
                    raporCizgiGrafikCiz(doc, d.gelisimSerisi.map(g => g.genel), d.gelisimSerisi.map(g => g.tarih), solX + 4, y + 2, grafikW - 8, grafikH - 7, [22, 163, 74]);
                } else {
                    doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "italic"); doc.setFontSize(6);
                    doc.text("Puan kaydi yok.", solX + grafikW / 2, y + grafikH / 2, { align: 'center' });
                }

                // Sağ Grafik Kutusu
                kutu(sagX, y, grafikW, grafikH, 255, 241, 242, 2);
                cerceve(sagX, y, grafikW, grafikH, 254, 205, 211, 2);
                if (d.denemeSerisi && d.denemeSerisi.length > 0) {
                    raporCizgiGrafikCiz(doc, d.denemeSerisi.map(g => g.deneme), d.denemeSerisi.map(g => g.tarih), sagX + 4, y + 2, grafikW - 8, grafikH - 7, [225, 29, 72]);
                } else {
                    doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "italic"); doc.setFontSize(6);
                    doc.text("Deneme kaydi yok.", sagX + grafikW / 2, y + grafikH / 2, { align: 'center' });
                }
                y += grafikH + GAP;

                // ===== 6. KİTAP TAKİBİ =====
                baslikCiz("Okuma Kulturu (Guncel Durum)");
                let kitap = user.kitapBilgi || { kitapAdi: "Yok", sayfa: 0, hedef: 40 };
                let kitapAdiTemiz = turkceyiDuzelt(kitap.kitapAdi || "Yok");
                let kitapYuzde = kitap.hedef > 0 ? Math.min(Math.round((kitap.sayfa / kitap.hedef) * 100), 100) : 0;
                kutu(M, y, CW, 9.5, 255, 251, 235, 2);
                cerceve(M, y, CW, 9.5, 253, 230, 138, 2);
                doc.setTextColor(180, 83, 9); doc.setFont("helvetica", "bold"); doc.setFontSize(5.2);
                doc.text("SU AN OKUNAN KITAP", M + 3, y + 3.5);
                doc.setTextColor(30, 41, 59); doc.setFontSize(7.5);
                doc.text(kitapAdiTemiz, M + 3, y + 7.2);
                doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal"); doc.setFontSize(5.5);
                doc.text(`Ilerleme: ${kitap.sayfa} / ${kitap.hedef} sayfa (%${kitapYuzde})`, M + 60, y + 3.5);
                doc.setFillColor(226, 232, 240); doc.roundedRect(M + 60, y + 5, CW - 64, 1.8, 0.6, 0.6, 'F');
                doc.setFillColor(245, 158, 11); doc.roundedRect(M + 60, y + 5, (CW - 64) * (kitapYuzde / 100), 1.8, 0.6, 0.6, 'F');
                y += 9.5 + GAP;

                // ===== 7. AKTİVİTE TABLOSU =====
                baslikCiz("Aktivite ve Oyun Basarilari (Bu Donem)");
                let toplamOyunSayisi = (d.oyunOzet.klasik.oyunSayisi || 0) + (d.oyunOzet.jeopardy.oyunSayisi || 0) + (d.oyunOzet.cekilis.oyunSayisi || 0);

                if (toplamOyunSayisi === 0) {
                    kutu(M, y, CW, 6.5, 248, 250, 252, 2);
                    doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "italic"); doc.setFontSize(6.5);
                    doc.text("Bu donemde aktivite kaydi yok.", W / 2, y + 4, { align: 'center' });
                    y += 6.5 + GAP;
                } else {
                    let basliklar = ["Aktivite", "Oyun Sayisi", "Dogru", "Yanlis", "Toplam Puan"];
                    let colW = [CW * 0.34, CW * 0.18, CW * 0.16, CW * 0.16, CW * 0.16];
                    let tx = M;
                    doc.setFillColor(51, 65, 85); doc.roundedRect(M, y, CW, 4.2, 1, 1, 'F');
                    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(5.5);
                    basliklar.forEach((b, i) => { doc.text(b, tx + 2, y + 2.8); tx += colW[i]; });
                    y += 4.2;

                    let oyunSatirlar = [
                        ["Klasik Kelime Yarismasi", d.oyunOzet.klasik],
                        ["Risk Balonları", d.oyunOzet.jeopardy],
                        ["Zar Cekilisi", d.oyunOzet.cekilis]
                    ];
                    oyunSatirlar.forEach((satir, idx) => {
                        let bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
                        doc.setFillColor(bg[0], bg[1], bg[2]);
                        doc.rect(M, y, CW, 4.2, 'F');
                        let tx2 = M;
                        doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "normal"); doc.setFontSize(6);
                        let veri = [satir[0], String(satir[1].oyunSayisi || 0), String(satir[1].dogru || 0), String(satir[1].yanlis || 0), String(satir[1].puan || 0)];
                        veri.forEach((v, i) => { doc.text(v, tx2 + 2, y + 2.8); tx2 += colW[i]; });
                        y += 4.2;
                    });
                    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
                    doc.roundedRect(M, y - 12.6, CW, 12.6, 1.2, 1.2, 'S');
                    y += GAP;
                }

                // ===== 8. PROFESYONEL ÖĞRETMEN YORUMU (Daha Dolgun, Alt Boşluğu Doldurur) =====
                let yorumFontBoyutu = 6.2;
                let satirAraligi = 2.7;
                doc.setFont("helvetica", "normal"); doc.setFontSize(yorumFontBoyutu);
                let yorumSatirlari = doc.splitTextToSize(yorum, CW - 5);
                let yorumH = Math.max(16, yorumSatirlari.length * satirAraligi + 6); // Alt boşluğu ortalamak için min yükseklik artırıldı

                kutu(M, y, CW, yorumH, 250, 245, 255, 2);
                cerceve(M, y, CW, yorumH, 221, 214, 254, 2);
                doc.setTextColor(109, 40, 217); doc.setFont("helvetica", "bold"); doc.setFontSize(7);
                doc.text("Ogretmen Degerlendirmesi", M + 2.5, y + 3.5);
                doc.setTextColor(51, 65, 85); doc.setFont("helvetica", "normal"); doc.setFontSize(yorumFontBoyutu);
                let yy = y + 6.5;
                yorumSatirlari.forEach(satir => { 
                    doc.text(satir, M + 2.5, yy); 
                    yy += satirAraligi; 
                });
                y += yorumH + GAP - 0.5;

                // ===== 9. ALT BİLGİ =====
                doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
                doc.line(M, y, W - M, y);
                y += 2.5;
                doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "normal"); doc.setFontSize(5.5);
                doc.text("Bu rapor Ingilizce Ogrenci Portali tarafindan hazirlanmistir.", M, y);
                doc.text("app.dijimedu.com", W - M, y, { align: 'right' });

                let dosyaAdi = `${ogrenciAdi.replace(/\s+/g, '_')}_Rapor_${baslangic}_${bitis}.pdf`;
                doc.save(dosyaAdi);

            } catch (e) {
                alert("PDF oluşturma sırasında hata oluştu: " + e);
                console.error(e);
            } finally {
                btn.disabled = false;
                btn.innerText = "📄 PDF Raporu Oluştur & İndir";
            }
        }
                function raporCizgiGrafikCiz(doc, veriler, etiketler, x, y, w, h, renk) {
                    if (veriler.length === 0) return;
                    let maxV = Math.max(...veriler, 10);
                    let minV = 0;

                    // Yatay ızgara çizgileri + eksen etiketleri (0, 50, 100)
                    [0, 50, 100].forEach(ref => {
                        if (ref > maxV + 10) return;
                        let gy = y + h - ((ref - minV) / (maxV - minV || 1)) * h;
                        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
                        doc.line(x, gy, x + w, gy);
                        doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "normal"); doc.setFontSize(5.5);
                        doc.text(String(ref), x - 2, gy + 1, { align: 'right' });
                    });

                    let araGenislik = veriler.length > 1 ? w / (veriler.length - 1) : 0;
                    let noktalar = veriler.map((v, i) => {
                        let px = veriler.length > 1 ? x + i * araGenislik : x + w / 2;
                        let py = y + h - ((v - minV) / (maxV - minV || 1)) * h;
                        return [px, py];
                    });

                    doc.setDrawColor(renk[0], renk[1], renk[2]);
                    doc.setLineWidth(0.7);
                    for (let i = 0; i < noktalar.length - 1; i++) {
                        doc.line(noktalar[i][0], noktalar[i][1], noktalar[i + 1][0], noktalar[i + 1][1]);
                    }
                    doc.setFillColor(renk[0], renk[1], renk[2]);
                    noktalar.forEach((p, i) => {
                        doc.circle(p[0], p[1], 1.2, 'F');
                        if (veriler.length <= 10 || i % 2 === 0 || i === noktalar.length - 1) {
                            doc.setTextColor(renk[0], renk[1], renk[2]);
                            doc.setFont("helvetica", "bold"); doc.setFontSize(6);
                            doc.text(String(veriler[i]), p[0], p[1] - 2.5, { align: 'center' });
                        }
                    });

                    if (etiketler && etiketler.length > 0) {
                        doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal"); doc.setFontSize(5.5);
                        doc.text(String(tarihiDuzelt(etiketler[0])), x, y + h + 4);
                        doc.text(String(tarihiDuzelt(etiketler[etiketler.length - 1])), x + w, y + h + 4, { align: 'right' });
                    }
                }
                // --- ÖĞRETMEN RAPOR PANELİ (SADECE "teacher" KULLANICISI GÖRÜR) ---
                function teacherPaneliKontrolEt() {
                    let banner = document.getElementById('raporTeacherBanner');
                    if (!banner) return;

                    if (aktifOgrenciAdi && aktifOgrenciAdi.trim().toLowerCase() === "teacher") {
                        banner.style.display = 'block';
                        let sel = document.getElementById('raporOgrenciSelect');
                        sel.innerHTML = '<option value="">-- Öğrenci Seçin --</option>';
                        globalDataCache.forEach(u => {
                            if (String(u.ogrenci).trim().toLowerCase() === "teacher") return;
                            let opt = document.createElement('option');
                            opt.value = u.ogrenci;
                            opt.innerText = u.ogrenci;
                            sel.appendChild(opt);
                        });
                        let bugun = new Date();
                        let birAyOnce = new Date();
                        birAyOnce.setMonth(birAyOnce.getMonth() - 1);
                        document.getElementById('raporBitisTarih').value = bugun.toISOString().split('T')[0];
                        document.getElementById('raporBaslangicTarih').value = birAyOnce.toISOString().split('T')[0];
                    } else {
                        banner.style.display = 'none';
                    }
                }



        function veriArayuzeIsle(user) {
            if (!user) return;

            // Son girilen puan yerine her zaman tüm puanların ortalaması (genelOrtalama) baz alınır
            let genelPuan = user.genelOrtalama !== undefined ? user.genelOrtalama : (user.genelPuan || 0);
            let etkinlik = user.etkinlikBasarisi || 0;
            let sonDeneme = user.sonDeneme || 0;

            document.getElementById('valGenelPuan').innerText = genelPuan;
            document.getElementById('valEtkinlikBasarisi').innerText = etkinlik;
            document.getElementById('valSonDeneme').innerText = sonDeneme;
            document.getElementById('valPerformansEmoji').innerText = performansEmojisiGetir(genelPuan);

                if (user.kelimeHavuzu) masterKelimeHavuzu = user.kelimeHavuzu;

            kitapTakibiniIsle(user.kitapBilgi || {});
            dersRaporlariniOlustur(user.arsivListesi || user.dersler || [], user.kitapBilgi || {});
            dersTakviminiIsle(user.dersler || []);
            grafikliCiz(user.gelisimSerisi || user.arsivListesi || [], user, user.denemeSerisi || user.arsivListesi || []);
            planKartiniGuncelle(user);
            teacherPaneliKontrolEt();
                      ozellikGorunurlukleriniUygula(user.izinler || {});
            headerEnerjiYukle();
        }

        function headerEnerjiYukle() {
            if (!aktifOgrenciAdi) return;
            fetch(`${apiURL}?islem=enerjiDurumuGetir&ogrenci=${encodeURIComponent(aktifOgrenciAdi)}`)
            .then(res => res.json())
            .then(d => { headerEnerjiGoster(d.enerjiKalan, d.enerjiMax); window._kpEnerjiCache = d; })
            .catch(() => {});
        }
        function genelEnerjiDegisimGoster(fark) {
            if (!fark) return;
            let badge = document.getElementById('headerEnerjiBadge');
            if (!badge) return;
            let el = document.createElement('div');
            el.className = 'enerji-degisim-ucan';
            el.innerText = (fark > 0 ? '+' : '') + fark + ' ⚡';
            el.style.color = fark > 0 ? '#4ade80' : '#f87171';
            badge.appendChild(el);
            setTimeout(() => el.remove(), 1000);
        }
        function headerEnerjiGoster(kalan, max) {
            // Plan kapasitesi sunucudan gelir: Free 25, Pro 40, Premium Pro 60 (sınırsız).
            max = [25,40,60].includes(Number(max)) ? Number(max) : 25; kalan = Math.max(0, Math.min(max, Number(kalan) || 0));
            let pct = max > 0 ? Math.round((kalan / max) * 100) : 0;
            let bar = document.getElementById('headerEnerjiBar');
            let onceki = window.genelEnerjiKalan;
            if (bar) {
                bar.style.width = pct + '%';
                if (onceki !== undefined && kalan !== onceki) {
                    bar.classList.remove('enerji-doldu', 'enerji-azaldi');
                    void bar.offsetWidth;
                    bar.classList.add(kalan > onceki ? 'enerji-doldu' : 'enerji-azaldi');
                }
            }
            let num = document.getElementById('headerEnerjiNum');
            if (num) num.innerText = max === 60 ? '∞' : kalan + '/' + max;
            window._kpEnerjiCache = { enerjiKalan: kalan, enerjiMax: max };
            window.genelEnerjiKalan = kalan;
            window.genelEnerjiMax = max;
            const priorEnergy=window.dmLastEnergyValue??onceki;window.dmLastEnergyValue=kalan;
            if(priorEnergy>0&&kalan===0&&!window.dmTeacherPortalMode&&(typeof aktifOgrenciAdi==='undefined'||String(aktifOgrenciAdi).toLowerCase()!=='teacher')&&!(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci)&&!window.dmOdevEnerjiMuaf?.())window.DijiMeduPapiFeedback?.energy();
        }
        function ozellikGorunurlukAyarla(elementId, aciksaGoster) {
            let el = document.getElementById(elementId);
            if (el) el.style.display = aciksaGoster ? '' : 'none';
        }

        function ozellikGorunurlukleriniUygula(izinler) {
            ozellikGorunurlukAyarla('tabBtnRaporlar', izinler.raporlar_sekmesi !== false);
               ozellikGorunurlukAyarla('rozetlerBolumu', izinler.rozetler_sekmesi !== false);
            ozellikGorunurlukAyarla('takvimAlani', izinler.takvim !== false);
                ozellikGorunurlukAyarla('okumaKulturuKutusu', izinler.okuma_kulturu !== false && window._kitapVarMi);
            ozellikGorunurlukAyarla('gelisimGrafikKutusu', izinler.gelisim_grafikleri !== false);
            ozellikGorunurlukAyarla('kriterGrafikKutusu', izinler.gelisim_grafikleri !== false);
                ozellikGorunurlukAyarla('kartKelimeYolculugu', izinler.kelime_yolculugu !== false);
            ozellikGorunurlukAyarla('kartKelimeYarismasi', izinler.kelime_yarismasi !== false);
            ozellikGorunurlukAyarla('kartJeopardy', izinler.jeopardy_oyunu !== false);
            ozellikGorunurlukAyarla('kartBoslukDoldurma', izinler.bosluk_doldurma !== false);
            ozellikGorunurlukAyarla('kartOkumaStudyosu', izinler.okuma_studyosu !== false);
            ozellikGorunurlukAyarla('kartPomodoro', izinler.pomodoro_sayaci !== false);
              ozellikGorunurlukAyarla('kartRaporlarim', izinler.raporlar_sekmesi !== false);

        }    
               function cikisYap() { 
            googleSheetseKaydet(); 
            clearInterval(timerInterval); 

            // Sadece kendi oturum verilerini temizle, diğer uygulamalara (Eğitim Koçum vb.) dokunma
            localStorage.removeItem("ing_oturumAcik");
            localStorage.removeItem("ing_aktifOgrenci");
            localStorage.removeItem("ing_toplamSaniye");

            window.location.reload(); 
        }

        // --- JEOPARDY BALONLARI OYUN MİMARİSİ (DÜZELTİLMİŞ) ---
        let jpAktifSinif = 1;
        let jpSecilenUniteler = [];
        let jpBalonlarListesi = [];
        let jpAktifSoru = null;
        let jpDogruSayisi = 0;
        let jpYanlisSayisi = 0;
        let jpToplamPuan = 0;
        let jpBaslangicZamani = 0;
        let jpGecenSaniye = 0;
        let jpTimerInterval = null;
        let jpMuzikAcik = true;
        let jpAudioElement = null;
                let jpSoruBaslangicZamani = 0;
        let jpKombo = 0;
        let jpGeriDonTimeout = null;

        function jpOyunAc() {
            if (genelOyunGirisEngelliMi()) return;
            clearTimeout(jpGeriDonTimeout);
            if (jpTimerInterval) clearInterval(jpTimerInterval);
            jpAktifSoru = null;
            let modal = document.getElementById('jpOyunOverlay');
            if (!modal) return;

            document.body.appendChild(modal);
            modal.style.setProperty('display', 'flex', 'important');
                    jeopardyMuzikBaslat();
            modal.style.setProperty('z-index', '9999999', 'important');

            let giris = document.getElementById('jpGirisEkrani');
            if (giris) giris.style.setProperty('display', 'block', 'important');

            let balon = document.getElementById('jpBalonEkrani');
            if (balon) balon.style.display = 'none';

            let soru = document.getElementById('jpSoruEkrani');
            if (soru) soru.style.display = 'none';

            let bitis = document.getElementById('jpBitisEkrani');
            if (bitis) bitis.style.display = 'none';

                // Sınıfta oynatılıyorsa ismi kilitle, değilse normal davran
            let isimInput = document.getElementById('jpIsimInput');
            if (isimInput) {
                if (siniftaOynananOgrenci) {
                    isimInput.value = siniftaOynananOgrenci;
                    isimInput.disabled = true;
                } else if (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== "teacher") {
                    isimInput.value = aktifOgrenciAdi;
                    isimInput.disabled = false;
                } else {
                    isimInput.value = "";
                    isimInput.disabled = false;
                }
            }

                    jpSinifKisitlamaUygulaVeBaslat();
        }

        // İster jpOyunKapat ister jpOyunuKapat çağrılsın, ikisi de çalışır
        function jpOyunKapat() {
            if (liderlikKilitliMiKontrolEt('jp', 'jpBitisEkrani')) return;
            clearTimeout(jpGeriDonTimeout);
            jpAktifSoru = null;
            let modal = document.getElementById('jpOyunOverlay');
            if (modal) {
                modal.style.display = 'none';
                modal.style.setProperty('display', 'none', 'important');
            }
            if (typeof jeopardyMuzikDurdur === 'function') {
                jeopardyMuzikDurdur();
            }
            if (typeof jpTimerInterval !== 'undefined' && jpTimerInterval) {
                clearInterval(jpTimerInterval);
            }
        }
        // Çift isim desteği
        const jpOyunuKapat = jpOyunKapat;

        function jpSinifSec(sinif, btnElement) {
            jpAktifSinif = sinif;
            let grid = document.getElementById('jpSinifGrid');
            if (grid) {
                grid.querySelectorAll('.sinif-btn').forEach(b => b.classList.remove('active'));
            }
            if (btnElement) btnElement.classList.add('active');
            jpSinifGuncelle(sinif);
        }

        function jpSinifGuncelle(sinif) {
            let havuz = window.masterKelimeHavuzu || [];
            let sinifKelimeleri = havuz.filter(k => Number(k.sinif) === Number(sinif));
            let uniteler = [...new Set(sinifKelimeleri.map(k => Number(k.unite)))].sort((a, b) => a - b);

            if (uniteler.length === 0) uniteler = (Number(sinif)===3||Number(sinif)===4)?Array.from({length:10},(_,i)=>i+1):Array.from({length:8},(_,i)=>i+1);

            let uniteBox = document.getElementById('jpUniteBox');
            uniteBox.innerHTML = "";
            jpSecilenUniteler = [];

            uniteler.forEach((u, idx) => {
                let chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'unite-chip' + (idx === 0 ? ' selected' : '');
                chip.innerText = u + '.Ü';
                chip.onclick = function() {
                    chip.classList.toggle('selected');
                    jpUniteSecimleriniGuncelle();
                };
                uniteBox.appendChild(chip);
                if (idx === 0) jpSecilenUniteler.push(u);
            });
        }

        function jpUniteSecimleriniGuncelle() {
            jpSecilenUniteler = [];
            document.querySelectorAll('#jpUniteBox .unite-chip').forEach((chip, idx) => {
                if (chip.classList.contains('selected')) {
                    jpSecilenUniteler.push(idx + 1);
                }
            });
        }

        function jeopardyMuzikBaslat() {
            if (!jpMuzikAcik) return;
            if (!jpAudioElement) {
                jpAudioElement = new Audio('ozgun/tema-2.mp3');
                jpAudioElement.loop = true;
                jpAudioElement.volume = 0.10;
            }
            jpAudioElement.play().catch(() => {});
        }

        function jeopardyMuzikDurdur() {
            if (jpAudioElement) {
                jpAudioElement.pause();
                jpAudioElement.currentTime = 0;
            }
        }

        function jeopardyMuzikToggle() {
            jpMuzikAcik = !jpMuzikAcik;
            let btn = document.getElementById('jeopardyMuzikBtn');
            if (jpMuzikAcik) {
                btn.innerText = "🔊 Müzik: Açık";
                jeopardyMuzikBaslat();
            } else {
                btn.innerText = "🔇 Müzik: Kapalı";
                jeopardyMuzikDurdur();
            }
        }

        function jeopardyOyunuBaslat() {
            if (genelOyunGirisEngelliMi()) return;
            let isim = document.getElementById('jpIsimInput').value.trim();
            if (!isim) { alert("Lütfen adınızı giriniz!"); return; }
            if (jpSecilenUniteler.length === 0) { alert("Lütfen en az bir ünite seçiniz!"); return; }
            let havuz = window.masterKelimeHavuzu || [];
            let filtrelenmis = havuz.filter(k => Number(k.sinif) === Number(jpAktifSinif) && jpSecilenUniteler.includes(Number(k.unite)));

            if (filtrelenmis.length < 5) {
                alert("Seçtiğiniz kriterlere uygun yeterli kelime bulunamadı. Lütfen farklı üniteler seçin.");
                return;
            }

            jpBalonlarListesi = OC.kelimeSec('jp', filtrelenmis, OC.SORU).map((k, i) => ({ ...k, _jpNo: i + 1 })); OC.basla('jp'); genelEnerjiHarca(-3);
            clearTimeout(jpGeriDonTimeout);
            jpAktifSoru = null;

               jpDogruSayisi = 0;
            jpYanlisSayisi = 0;
            jpToplamPuan = 0;
            jpKombo = 0;
            jpBaslangicZamani = Date.now();
            jpGecenSaniye = 0;

            document.getElementById('jpGirisEkrani').style.display = 'none';
            document.getElementById('jpBalonEkrani').style.display = 'block';
                jokerTuruBaslat('jp', 'jpSoruEkrani');

            if (jpTimerInterval) clearInterval(jpTimerInterval);
            jpTimerInterval = setInterval(() => {
                jpGecenSaniye = Math.floor(OC.sure());
                jpDurumCiz();
            }, 1000);

            jpBalonlariCiz();
        }

        function jpDurumCiz() {
            jpToplamPuan = OC.puan();
            document.querySelectorAll('[data-jp-clock]').forEach(e => e.textContent = Math.floor(OC.sure()) + ' sn');
            const score = document.getElementById('jpAnlikPuan');
            if (score) score.textContent = jpToplamPuan;
            const remaining = document.getElementById('jpBalonKalan');
            if (remaining) remaining.textContent = jpBalonlarListesi.length;
        }
        function jpBalonlariCiz() {
            const grid = document.getElementById('jpBalonlarGrid');
            grid.replaceChildren();
            jpDurumCiz();
            if (jpBalonlarListesi.length === 0) { jeopardyOyunuBitir(); return; }
            jpBalonlarListesi.forEach((kelimeObj, index) => {
                const balonBtn = document.createElement('button');
                const no = kelimeObj._jpNo || index + 1;
                balonBtn.type = 'button';
                balonBtn.className = 'dm-risk-balloon';
                balonBtn.dataset.color = (no - 1) % 4;
                balonBtn.style.setProperty('--float-delay', '-' + (no % 4) + 's');
                balonBtn.setAttribute('aria-label', no + '. balonu aç');
                balonBtn.innerHTML = '<span class="dm-balloon-body" aria-hidden="true"><span class="dm-balloon-star">✦</span><b>' + no + '</b></span><svg class="dm-balloon-string" viewBox="0 0 40 35" aria-hidden="true"><path d="M20 0C7 12 34 19 18 35"/></svg>';
                balonBtn.onclick = () => jpBalonSecildi(index, 100);
                grid.appendChild(balonBtn);
            });
        }

        function jpBalonSecildi(index, puanDegeri) {
            if (jpAktifSoru || !Number.isInteger(index) || !jpBalonlarListesi[index]) return;
            let kelimeObj = jpBalonlarListesi.splice(index, 1)[0];

            // Doğru anahtar adlarını güvenli bir şekilde alıyoruz (ingilizce / turkce)
            let ingKelime = kelimeObj.ingilizce || kelimeObj.en || "";
            let turkKelime = kelimeObj.turkce || kelimeObj.tr || "";

            jpAktifSoru = { 
                ingilizce: ingKelime, 
                turkce: turkKelime, 
                puanDegeri: puanDegeri 
            };

            document.getElementById('jpBalonEkrani').style.display = 'none';
            document.getElementById('jpSoruEkrani').style.display = 'block';

            document.getElementById('jpSoruPuanBadge').innerText = `İlk denemede 100 puan`; window.jpOcIkinci = false;
            document.getElementById('jpKalanBalonInfo').innerText = `Kalan balon: ${jpBalonlarListesi.length}`;

            let ingilizceMi = Math.random() > 0.5;
            if (ingilizceMi) {
                document.getElementById('jpSoruYonEtiket').innerText = "Bu kelimenin Türkçe anlamı nedir?";
                document.getElementById('jpSoruKelimeText').innerText = jpAktifSoru.ingilizce;
                jpAktifSoru._dogruCevap = jpAktifSoru.turkce;
            } else {
                document.getElementById('jpSoruYonEtiket').innerText = "Bu kelimenin İngilizce karşılığı nedir?";
                document.getElementById('jpSoruKelimeText').innerText = jpAktifSoru.turkce;
                jpAktifSoru._dogruCevap = jpAktifSoru.ingilizce;
            }

            let havuz = window.masterKelimeHavuzu || [];
            let yanlisAdaylar = havuz.filter(k => {
                let kIng = k.ingilizce || k.en || "";
                let kTur = k.turkce || k.tr || "";
                return ingilizceMi ? kTur !== jpAktifSoru.turkce : kIng !== jpAktifSoru.ingilizce;
            });

            let karisikYanlislar = [...yanlisAdaylar].sort(() => Math.random() - 0.5).slice(0, 3);

            let secenekler = [jpAktifSoru._dogruCevap];
            karisikYanlislar.forEach(y => {
                secenekler.push(ingilizceMi ? (y.turkce || y.tr) : (y.ingilizce || y.en));
            });

            while(secenekler.length < 4) {
                secenekler.push("Alternatif Şık");
            }

            secenekler.sort(() => Math.random() - 0.5);
            jpAktifSoru._secenekler = secenekler;
            jpAktifSoru._dogruIndex = secenekler.indexOf(jpAktifSoru._dogruCevap);

            for (let i = 0; i < 4; i++) {
                let btn = document.getElementById('jpSik' + i);
                btn.innerText = secenekler[i];
                btn.disabled = false;
                btn.style.background = "#ffffff";
                btn.style.color = "#334155";
                btn.style.borderColor = "#cbd5e1";
            }
            jpSoruBaslangicZamani = Date.now();
                    jokerSoruTemizle();
        }

        function jpCevapVer(secilenIndex) {
            if (!jpAktifSoru || !Number.isInteger(secilenIndex) || secilenIndex < 0 || secilenIndex > 3 || document.getElementById('jpSik' + secilenIndex).disabled) return;
            window.dmVerifiedGames?.record(jpAktifSoru,document.getElementById('jpSik'+secilenIndex).textContent);
            let dogruIdx = jpAktifSoru._dogruIndex;
                    if (secilenIndex !== dogruIdx && jokerIkinciTuket()) {
                let b = document.getElementById('jpSik' + secilenIndex);
                b.disabled = true; b.style.background = '#fee2e2'; b.style.borderColor = '#dc2626'; b.style.color = '#7f1d1d';
                genelSesEfektiCal('yanlis');
                jokerMesaj('🎯 İkinci şans! Bir kez daha dene.');
                window.jpOcIkinci = true;
                return;
            }
            let gecenSaniyeSoru = Math.floor((Date.now() - jpSoruBaslangicZamani) / 1000);

            for (let i = 0; i < 4; i++) {
                document.getElementById('jpSik' + i).disabled = true;
            }

               if (secilenIndex === dogruIdx) {
                jpDogruSayisi++;
                OC.dogru(window.jpOcIkinci ? 0.5 : 1, !window.jpOcIkinci); jpKombo++; jpToplamPuan = OC.puan();
                              genelSesEfektiCal('dogru');
                genelKomboGoster(jpKombo, document.querySelector('#jpOyunOverlay .game-modal-content'));
                document.getElementById('jpSik' + secilenIndex).style.background = "#16a34a";
                document.getElementById('jpSik' + secilenIndex).style.color = "#ffffff";
                document.getElementById('jpSik' + secilenIndex).style.borderColor = "#15803d";
                } else {
                genelSesEfektiCal('yanlis');
                jpYanlisSayisi++;
                let ocKor = jokerKalkanTuket(); if (!ocKor) jpKombo = 0; OC.yanlis(ocKor); jpToplamPuan = OC.puan();
                document.getElementById('jpSik' + secilenIndex).style.background = "#dc2626";
                document.getElementById('jpSik' + secilenIndex).style.color = "#ffffff";
                document.getElementById('jpSik' + secilenIndex).style.borderColor = "#b91c1c";

                document.getElementById('jpSik' + dogruIdx).style.background = "#16a34a";
                document.getElementById('jpSik' + dogruIdx).style.color = "#ffffff";
                document.getElementById('jpSik' + dogruIdx).style.borderColor = "#15803d";
            }

            jpDurumCiz();
            clearTimeout(jpGeriDonTimeout);
            jpGeriDonTimeout = setTimeout(() => {
                jpAktifSoru = null;
                document.getElementById('jpSoruEkrani').style.display = 'none';
                document.getElementById('jpBalonEkrani').style.display = 'block';
                jpBalonlariCiz();
            }, 1000);
        }

        async function jeopardyOyunuBitir() {
            clearTimeout(jpGeriDonTimeout);
            jpAktifSoru = null;
            if (jpTimerInterval) clearInterval(jpTimerInterval);
            if (typeof jeopardyMuzikDurdur === 'function') {
                jeopardyMuzikDurdur();
            }

            document.getElementById('jpSoruEkrani').style.display = 'none';
            document.getElementById('jpBalonEkrani').style.display = 'none';
            document.getElementById('jpBitisEkrani').style.display = 'block';

            let isim = document.getElementById('jpIsimInput').value.trim() || "Misafir";
            let sinifStr = jpAktifSinif + ". Sınıf";
            let uniteStr = jpSecilenUniteler.join(",") + ". Ünite";
            let tarihStr = new Date().toISOString().split('T')[0];

            document.getElementById('jpResIsim').innerText = isim;
            document.getElementById('jpResSinifUnite').innerText = `${sinifStr} (${uniteStr})`;
            document.getElementById('jpResDogruYanlis').innerText = `${jpDogruSayisi} Doğru / ${jpYanlisSayisi} Yanlış`;
            document.getElementById('jpResSure').innerText = `${jpGecenSaniye} saniye`;
            document.getElementById('jpResPuan').innerText = `${jpToplamPuan} Puan`;
            genelSonucEkraniGoster({ oyunAdi:'🎈 Risk Balonları', isim:isim, puan:jpToplamPuan, dogru:jpDogruSayisi, yanlis:jpYanlisSayisi, sureSaniye:jpGecenSaniye, oyunKey:'jp', devamFn:jpOyunKapat, tekrarFn:jpOyunAc });
             liderlikKilitBaslat('jp');
            let tabloKonum = document.getElementById('jpGecmisSkorlarListesi');
            tabloKonum.innerHTML = "<div>Liderlik tablosu güncelleniyor...</div>";

            // Google Sheets'e POST isteği ile Jeopardy_Liderlik sekmesine kayıt
            let kayitPayload = {
                islem: "jeopardyLiderlikKaydet",
                tarih: tarihStr,
                isim: isim,
                sinif: sinifStr,
                unite: uniteStr,
                dogru: jpDogruSayisi,
                yanlis: jpYanlisSayisi,
                sure: jpGecenSaniye + "s",
                suresaniye: jpGecenSaniye,
                puan: jpToplamPuan
            };

            try {
                await fetch(apiURL, {
                    method: "POST",
                    body: JSON.stringify(kayitPayload)
                });
            } catch(e) {
                console.error("Jeopardy liderlik kaydı gönderilemedi:", e);
            }

                // Liderlik tablosunu çek ve ekrana bas (otomatik yeniden deneme ile)
            oyunLiderlikGosterDetayli('jeopardyLiderlikTumunuGetir', sinifStr, isim, 'jpGecmisSkorlarListesi', 'Risk Balonları', 'jp');
        }

                // Jeopardy butonunu ve modalını güvenli bir şekilde birbirine bağlar
        document.addEventListener('DOMContentLoaded', function() {
            let btn = document.getElementById('jpMenuBtn');
            if (btn) {
                btn.onclick = function() {
                    jpOyunAc();
                };
            }
        });

                // --- BOŞLUK DOLDURMA OYUN MİMARİSİ ---
        let boslukAktifSinif = 1;
        let boslukSecilenUniteler = [];
        let boslukAktifKelimeler = [];
        let boslukBaslangicZamani = 0;
        let boslukGecenSaniye = 0;
        let boslukTimerInterval = null;
        let boslukMuzikAcik = true;
        let boslukAudioElement = null;
        let boslukKomboBonus = 0;

        function boslukOyunAc() {
            if (genelOyunGirisEngelliMi()) return;
            let modal = document.getElementById('boslukOyunOverlay');
            if (modal) {
                document.body.appendChild(modal);
                modal.style.setProperty('display', 'flex', 'important');
                modal.style.setProperty('z-index', '9999999', 'important');
            }

            document.getElementById('boslukGirisEkrani').style.display = 'block';
            document.getElementById('boslukOyunEkrani').style.display = 'none';
            document.getElementById('boslukBitisEkrani').style.display = 'none';

             // Sınıfta oynatılıyorsa ismi kilitle, değilse normal davran
            let isimInput = document.getElementById('boslukIsimInput');
            if (isimInput) {
                if (siniftaOynananOgrenci) {
                    isimInput.value = siniftaOynananOgrenci;
                    isimInput.disabled = true;
                } else if (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== "teacher") {
                    isimInput.value = aktifOgrenciAdi;
                    isimInput.disabled = false;
                } else {
                    isimInput.value = "";
                    isimInput.disabled = false;
                }
            }
                // YENİ: "Kontrol Et" butonunu bir önceki oyundan kalan kilitli/değişmiş halinden sıfırla
            let kontrolButonuSifirla = document.querySelector('#boslukOyunEkrani .btn-giris');
            if (kontrolButonuSifirla) {
                kontrolButonuSifirla.disabled = false;
                kontrolButonuSifirla.innerText = "🎯 Kontrol Et";
            }

            boslukSinifKisitlamaUygulaVeBaslat();
            boslukMuzikBaslat();
        }

        function boslukOyunKapat() {
            if (liderlikKilitliMiKontrolEt('bosluk', 'boslukBitisEkrani')) return;
            let modal = document.getElementById('boslukOyunOverlay');
            if (modal) {
                modal.style.display = 'none';
                modal.style.setProperty('display', 'none', 'important');
            }
            boslukMuzikDurdur();
            if (boslukTimerInterval) clearInterval(boslukTimerInterval);
        }



        function boslukSinifSec(sinif, btnElement) {
            boslukAktifSinif = sinif;
            let grid = document.getElementById('boslukSinifGrid');
            if (grid) {
                grid.querySelectorAll('.sinif-btn').forEach(b => b.classList.remove('active'));
            }
            if (btnElement) btnElement.classList.add('active');
            boslukSinifGuncelle(sinif);
        }

        function boslukSinifGuncelle(sinif) {
            let havuz = window.masterKelimeHavuzu || [];
            let sinifKelimeleri = havuz.filter(k => Number(k.sinif) === Number(sinif));
            let uniteler = [...new Set(sinifKelimeleri.map(k => Number(k.unite)))].sort((a, b) => a - b);

            if (uniteler.length === 0) uniteler = (Number(sinif)===3||Number(sinif)===4)?Array.from({length:10},(_,i)=>i+1):Array.from({length:8},(_,i)=>i+1);

            let uniteBox = document.getElementById('boslukUniteBox');
            uniteBox.innerHTML = "";
            boslukSecilenUniteler = [];

            uniteler.forEach((u, idx) => {
                let chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'unite-chip' + (idx === 0 ? ' selected' : '');
                chip.innerText = u + '.Ü';
                chip.onclick = function() {
                    chip.classList.toggle('selected');
                    boslukUniteSecimGuncelle();
                };
                uniteBox.appendChild(chip);
                if (idx === 0) boslukSecilenUniteler.push(u);
            });
        }

        function boslukUniteSecimGuncelle() {
            boslukSecilenUniteler = [];
            document.querySelectorAll('#boslukUniteBox .unite-chip').forEach((chip, idx) => {
                if (chip.classList.contains('selected')) {
                    boslukSecilenUniteler.push(idx + 1);
                }
            });
        }

        function boslukMuzikBaslat() {
            if (!boslukMuzikAcik) return;
            if (!boslukAudioElement) {
                boslukAudioElement = new Audio('ozgun/tema-3.mp3');
                boslukAudioElement.loop = true;
                boslukAudioElement.volume = 0.10;
            }
            boslukAudioElement.play().catch(() => {});
        }

        function boslukMuzikDurdur() {
            if (boslukAudioElement) {
                boslukAudioElement.pause();
                boslukAudioElement.currentTime = 0;
            }
        }

        function boslukMuzikToggle() {
            boslukMuzikAcik = !boslukMuzikAcik;
            let btn = document.getElementById('boslukMuzikBtn');
            if (boslukMuzikAcik) {
                btn.innerText = "🔊 Müzik: Açık";
                boslukMuzikBaslat();
            } else {
                btn.innerText = "🔇 Müzik: Kapalı";
                boslukMuzikDurdur();
            }
        }

        function boslukOyunuBaslat() {
            let isim = document.getElementById('boslukIsimInput').value.trim();
            if (!isim) { alert("Lütfen adınızı giriniz!"); return; }
            if (boslukSecilenUniteler.length === 0) { alert("Lütfen en az bir ünite seçiniz!"); return; }

            let havuz = window.masterKelimeHavuzu || [];
            // Seçilen sınıf ve ünitelere ait kelimeleri filtrele
            let filtrelenmis = havuz.filter(k => Number(k.sinif) === Number(boslukAktifSinif) && boslukSecilenUniteler.includes(Number(k.unite)));

            // Sadece düzgün, tek kelimelik ve boşluksuz olanları al
            let uygunlar = filtrelenmis.filter(k => {
                let en = (k.ingilizce || k.en || "").trim();
                return en.length >= 3 && !en.includes(" ") && !en.includes("'");
            });

            if (uygunlar.length < 5) {
                uygunlar = filtrelenmis; 
            }

            if (uygunlar.length < 4) {
                alert("Seçtiğiniz kriterlere uygun yeterli kelime bulunamadı. Lütfen farklı üniteler seçin.");
                return;
            }

            // Her seferinde tamamen rastgele (karışık) sıralayıp ilk 8 tanesini seçiyoruz
            boslukAktifKelimeler = OC.kelimeSec('bosluk', uygunlar, OC.SORU); OC.basla('bosluk'); window.boslukIlkYanlis = null; genelEnerjiHarca(-3);

               boslukBaslangicZamani = Date.now();
            boslukGecenSaniye = 0;
            boslukKomboBonus = 0;

            document.getElementById('boslukGirisEkrani').style.display = 'none';
            document.getElementById('boslukOyunEkrani').style.display = 'block';
                jokerTuruBaslat('bosluk', 'boslukOyunEkrani');

            if (boslukTimerInterval) clearInterval(boslukTimerInterval);
            boslukTimerInterval = setInterval(() => {
                if (OC.aktif?.pauseAt) return;
                boslukGecenSaniye++;
                let dk = Math.floor(boslukGecenSaniye / 60);
                let sn = boslukGecenSaniye % 60;
                document.getElementById('boslukTimerText').innerText = `⏱️ ${String(dk).padStart(2,'0')}:${String(sn).padStart(2,'0')}`;
            }, 1000);

            boslukBulmacayiCiz();
        }

        let boslukRound=null;
        function boslukBulmacayiCiz(){
            const words=boslukAktifKelimeler.map(w=>({en:String(w.ingilizce||w.en||'').trim().toUpperCase(),tr:w.turkce||w.tr||''}));
            boslukRound={words,index:0,results:[],wrong:0,combo:0,turn:Symbol(),advancing:false};window.boslukSonucDetaylari=[];
            const control=document.querySelector('#boslukOyunEkrani .btn-giris');if(control){control.hidden=true;control.disabled=false;}
            boslukTurCiz();
        }
        function boslukTurCiz(){
            const state=boslukRound,box=document.getElementById('boslukSatirlarContainer');box.replaceChildren();box.className='dm-letter-round';
            const batch=state.words.slice(state.index,state.index+1);let completed=0;
            for(const [n,w] of batch.entries()){
                const row=document.createElement('section');row.className='dm-letter-word';row.dataset.word=w.en;const title=document.createElement('strong');title.textContent=w.tr;const number=document.createElement('span');number.className='dm-letter-number';number.textContent=state.index+n+1;row.append(number,title);
                const word=document.createElement('div');word.className='dm-letter-slots';row.append(word);
                const candidates=[...w.en].map((c,i)=>/[A-Z]/.test(c)?i:-1).filter(i=>i>=0).sort(()=>Math.random()-.5);const gaps=new Set(candidates.slice(0,w.en.length>4?2:1));let remaining=gaps.size,hadWrong=false;
                const options=document.createElement('div');options.className='dm-letter-options';const note=document.createElement('small');note.setAttribute('role','status');let chosen=null;row.append(options,note);
                function pick(slot){chosen=slot;word.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===slot));options.replaceChildren();const correct=slot.dataset.answer;const letters=new Set([correct]);while(letters.size<5)letters.add('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random()*26)]);for(const c of [...letters].sort(()=>Math.random()-.5)){const b=document.createElement('button');b.type='button';b.textContent=c;b.onclick=()=>{
                    if(!chosen||chosen.disabled)return;
                    window.dmVerifiedGames?.record(w.en,{letter:c,index:Number(chosen.dataset.position)});
                    if(c!==chosen.dataset.answer){hadWrong=true;state.wrong++;OC.yanlis(false);chosen.textContent=c;chosen.classList.add('wrong');note.textContent='Yanlış harf. Geri alıp yeniden seçebilirsin.';window.dmLetterFeedback?.('wrong');return;}
                    chosen.textContent=c;chosen.disabled=true;chosen.classList.remove('wrong','selected');chosen.classList.add('correct');remaining--;window.dmLetterFeedback?.('letter');note.textContent='✓ Doğru harf';
                    const next=[...word.querySelectorAll('button')].find(x=>!x.disabled);if(next)pick(next);else{options.replaceChildren();completed++;setTimeout(()=>{if(row.isConnected&&document.getElementById('boslukOyunEkrani').style.display!=='none')window.dmLetterFeedback?.('word');},150);state.results.push({kelime:w.en,turkce:w.tr,dogruMu:!hadWrong});window.dmVerifiedGames?.record(w.en,[...word.children].map(x=>x.textContent).join(''));OC.dogru(hadWrong?.5:1);document.getElementById('boslukSayacInfo').textContent=(state.index+completed)+' / '+state.words.length+' · Tek kelimelik tur';state.combo++;row.classList.add('complete');
                       if(completed===batch.length&&!state.advancing){state.advancing=true;const turn=state.turn;setTimeout(()=>{if(boslukRound?.turn!==turn||document.getElementById('boslukOyunEkrani').style.display==='none')return;state.index+=batch.length;state.advancing=false;if(state.index<state.words.length)boslukTurCiz();else{window.boslukSonucDetaylari=state.results;window.boslukSonKombo=state.combo;boslukOyunuBitir(state.results.filter(x=>x.dogruMu).length,state.results.filter(x=>!x.dogruMu).length);}},650);}
                    }
                };options.append(b);}const undo=document.createElement('button');undo.type='button';undo.textContent='⤨';undo.setAttribute('aria-label','Seçilen harfi geri al');undo.onclick=()=>{if(chosen&&!chosen.disabled){chosen.textContent='_';chosen.classList.remove('wrong');note.textContent='Bir harf seç.';}};options.append(undo);}
                [...w.en].forEach((c,i)=>{const el=document.createElement(gaps.has(i)?'button':'span');el.textContent=gaps.has(i)?'_':c;if(gaps.has(i)){el.type='button';el.dataset.answer=c;el.dataset.position=i;el.setAttribute('aria-label',(i+1)+'. harfi seç');el.onclick=()=>pick(el);el.dmReveal=()=>{pick(el);[...options.querySelectorAll('button')].find(b=>b.textContent===el.dataset.answer)?.click();};}word.append(el);});
                if(!remaining){completed++;state.results.push({kelime:w.en,turkce:w.tr,dogruMu:true});window.dmVerifiedGames?.record(w.en,w.en);OC.dogru(1);}else pick(word.querySelector('button'));
                box.append(row);
            }
            document.getElementById('boslukSayacInfo').textContent=state.index+' / '+state.words.length+' · Tek kelimelik tur';
        }
        function boslukKontrolEt(){/* Each letter is now checked immediately. */}

        async function boslukOyunuBitir(dogruSayisi, yanlisSayisi) {
            if (boslukTimerInterval) clearInterval(boslukTimerInterval);
            boslukMuzikDurdur();

            document.getElementById('boslukOyunEkrani').style.display = 'none';
            document.getElementById('boslukBitisEkrani').style.display = 'block';

            let isim = document.getElementById('boslukIsimInput').value.trim() || "Misafir";
            let sinifStr = boslukAktifSinif + ". Sınıf";
            let uniteStr = boslukSecilenUniteler.join(",") + ". Ünite";
            let tarihStr = new Date().toISOString().split('T')[0];
                       let puan = OC.puan();
               genelSesEfektiCal(dogruSayisi >= yanlisSayisi ? 'dogru' : 'yanlis');
                let boslukSonKombo = window.boslukSonKombo || 0;
            if (boslukSonKombo >= 5) genelKomboGoster(boslukSonKombo, document.querySelector('#boslukOyunOverlay .game-modal-content'));
            document.getElementById('bpResIsim').innerText = isim;
            document.getElementById('bpResSinifUnite').innerText = `${sinifStr} (${uniteStr})`;
            document.getElementById('bpResDogruYanlis').innerText = `${dogruSayisi} Doğru / ${yanlisSayisi} Hata`;
            document.getElementById('bpResSure').innerText = `${boslukGecenSaniye} saniye`;
            document.getElementById('bpResPuan').innerText = `${puan} Puan`;
                    genelSonucEkraniGoster({ oyunAdi:'✏️ Eksik Harf', isim:isim, puan:puan, dogru:dogruSayisi, yanlis:yanlisSayisi, sureSaniye:boslukGecenSaniye, oyunKey:'bosluk', devamFn:boslukOyunKapat, tekrarFn:boslukOyunAc });

            // YENİ: Kelime kelime doğru/yanlış listesini bitiş ekranında göster
        let detayKonum = document.getElementById('bpKelimeDetayListesi');
        if (detayKonum) {
            let liste = window.boslukSonucDetaylari || [];
            detayKonum.innerHTML = "";
            liste.forEach(item => {
                let renk = item.dogruMu ? "#166534" : "#991b1b";
                let arkaplan = item.dogruMu ? "#f0fdf4" : "#fef2f2";
                let ikon = item.dogruMu ? "✅" : "❌";
                detayKonum.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:${arkaplan}; border-radius:6px; padding:4px 8px;">
                        <span style="font-weight:800; color:${renk};">${ikon} ${item.kelime}</span>
                        <span style="color:#64748b;">${item.turkce}</span>
                    </div>
                `;
            });
        }
            liderlikKilitBaslat('bosluk');
            let tabloKonum = document.getElementById('bpGecmisSkorlarListesi');
            tabloKonum.innerHTML = "<div>Liderlik tablosu güncelleniyor...</div>";

            // Google Sheets'in Bosluk_Tablosu sekmesine kayıt gönderimi
            let kayitPayload = {
                islem: "boslukLiderlikKaydet",
                tarih: tarihStr,
                isim: isim,
                sinif: sinifStr,
                unite: uniteStr,
                dogru: dogruSayisi,
                yanlis: yanlisSayisi,
                sure: boslukGecenSaniye + "s",
                suresaniye: boslukGecenSaniye,
                puan: puan
            };

            try {
                await fetch(apiURL, {
                    method: "POST",
                    body: JSON.stringify(kayitPayload)
                });
            } catch(e) {
                console.error("Boşluk liderlik kaydı gönderilemedi:", e);
            }

                // Bosluk_Tablosu verilerini çek ve ekrandaki liderlik listesini doldur (otomatik yeniden deneme ile)
            oyunLiderlikGosterDetayli('boslukLiderlikTumunuGetir', sinifStr, isim, 'bpGecmisSkorlarListesi', 'Eksik Harf', 'bosluk');
        }

               // --- KELİME KARTLARI YOLCULUĞU BAĞLANTISI ---
        function yolculuguAc() {
            if (typeof seviyeHaritasiAc === 'function') {
                seviyeHaritasiAc();
            } else {
                alert("Kelime Kartları Yolculuğu modülü yüklenemedi.");
            }
        }

        // --- AKICI OKUMA STÜDYOSU BAĞLANTISI ---
        function okumaStudyosunuAc() {
            if (typeof okumaModaliniAc === 'function') {
                okumaModaliniAc();
            } else {
                let modal = document.getElementById('okumaModalOverlay');
                if (modal) {
                    document.body.appendChild(modal);
                    modal.style.setProperty('display', 'flex', 'important');
                    modal.style.setProperty('z-index', '9999999', 'important');
                } else {
                    alert("Okuma Stüdyosu modülü bulunamadı.");
                }
            }
        }

        // --- GÜVENLİ SEKME DEĞİŞTİRME (Rozetler ve Diğerleri İçin) ---
        function sekmeDegistir(tabName, btnElement) {
            // Tüm sekme içeriklerini ve butonları güvenli bir şekilde temizle
            document.querySelectorAll('.tab-content').forEach(el => {
                el.classList.remove('active');
                el.style.display = 'none';
            });
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

            // Hedef sekme varsa aktif yap ve görünür kıl (Rozetler dahil)
            let hedefTab = document.getElementById('tab-' + tabName);
            if (hedefTab) {
                hedefTab.classList.add('active');
                hedefTab.style.display = 'block';
            }

            // Tıklanan buton varsa aktif yap
            if (btnElement) {
                btnElement.classList.add('active');
            }

            // Aktif oyun müziklerini durdur
            let muzikIdleri = ['jeopardyMuzik', 'kelimeMuzik', 'boslukMuzik'];
            muzikIdleri.forEach(function(id) {
                let m = document.getElementById(id);
                if (m) { m.pause(); m.currentTime = 0; }
            });
        }

                // ===================================================================
        // ETKİNLİKLER ALTYAPISI
        // ===================================================================
        // YENİ BİR ETKİNLİK EKLEMEK İSTEDİĞİNDE:
        // 1) Google Sheets "Etkinlikler" sekmesine yeni satır ekle
        //    (etkinlikKodu, gorunenAd, kategori, siraNo, ogrenciAdi)
        // 2) Oyunun gerçek JS motorunu (fonksiyonlarını) kodun başka bir yerine yaz
        // 3) Aşağıdaki ETKINLIK_KOD_HARITASI objesine, kodunla eşleşen bir satır ekle. Örnek:
        //    "kelebek_cicek": function(satirIndex) { etkinlikYapildiIsaretleCagir(satirIndex); etk1Ac(); }
        //    (fonksiyonun İÇİNDE oyunu bitirdiğinde etkinlikYapildiIsaretleCagir(satirIndex) çağırman,
        //     "yapıldı" rozetinin doğru anda işaretlenmesini sağlar — istersen oyunun başında da çağırabilirsin)
        const ETKINLIK_KOD_HARITASI = {
            "dogru_yanlis_1": function(satirIndex) { dogruYanlisOyunAc("dogru_yanlis_1", satirIndex); }
        };

        function etkinliklerModalAc() {
            let alan = document.getElementById('etkinlikKategoriListeAlani');
            alan.innerHTML = `<div style="text-align:center; color:#4338ca; font-size:12px; padding:10px;">Yükleniyor...</div>`;
            document.getElementById('etkinliklerModal').style.display = 'flex';

            fetch(`${apiURL}?islem=etkinlikleriGetir&ogrenci=${encodeURIComponent(aktifOgrenciAdi || "")}`)
            .then(res => res.json())
            .then(liste => {
                tumEtkinliklerCache = liste || [];
                if (tumEtkinliklerCache.length === 0) {
                    alan.innerHTML = `<div style="text-align:center; color:#4338ca; font-size:12px; padding:10px;">Henüz atanmış bir etkinlik yok. Öğretmenin yakında ekleyecek! 🎯</div>`;
                    return;
                }
                let kategoriMap = {};
                tumEtkinliklerCache.forEach(e => {
                    if (!kategoriMap[e.kategori]) kategoriMap[e.kategori] = [];
                    kategoriMap[e.kategori].push(e);
                });
                alan.innerHTML = "";
                Object.keys(kategoriMap).forEach(kat => {
                    let grup = kategoriMap[kat];
                    let yapilanSayisi = grup.filter(g => g.yapildiMi).length;
                    let btn = document.createElement('button');
                    btn.className = "ogretmen-menu-btn";
                    btn.innerHTML = `<span>🎯 ${guvenliMetin(kat)}</span><span class="ogretmen-menu-rozet" style="display:inline-block; background:#6366f1;">${yapilanSayisi}/${grup.length}</span>`;
                    btn.onclick = function () { etkinlikAltListeAc(kat); };
                    alan.appendChild(btn);
                });
            })
            .catch(() => {
                alan.innerHTML = `<div style="text-align:center; color:#dc2626; font-size:12px; padding:10px;">Etkinlikler yüklenirken hata oluştu.</div>`;
            });
        }

        let tumEtkinliklerCache = [];

        function etkinlikAltListeAc(kategoriAdi) {
            document.getElementById('etkinliklerModal').style.display = 'none';
            document.getElementById('etkinlikAltListeBaslik').innerText = "🎯 " + kategoriAdi;
            let liste = tumEtkinliklerCache.filter(e => e.kategori === kategoriAdi);
            liste.sort((a, b) => a.siraNo - b.siraNo);

            let alan = document.getElementById('etkinlikAltListeAlani');
            alan.innerHTML = "";
            liste.forEach(e => {
                let btn = document.createElement('button');
                btn.className = "ogretmen-menu-btn";
                let rozet = e.yapildiMi
                    ? `<span class="ogretmen-menu-rozet" style="display:inline-block; background:#16a34a;">✅ Yapıldı</span>`
                    : `<span class="ogretmen-menu-rozet" style="display:inline-block; background:#f59e0b;">🆕 Yeni</span>`;
                        let ikon = (e.disLink && e.disLink.trim()) ? "↗️" : "▶️";
                btn.innerHTML = `<span>${ikon} ${guvenliMetin(e.gorunenAd || e.etkinlikKodu)}</span>${rozet}`;
                       btn.onclick = function () {
                    document.getElementById('etkinlikAltListeModal').style.display = 'none';
                    if (e.disLink && e.disLink.trim()) {
                        disLinkOyunAc(e.disLink, e.gorunenAd, e.ogretmenYorumu, e.satirIndex);
                        return;
                    }
                    let fonk = ETKINLIK_KOD_HARITASI[e.etkinlikKodu];
                    if (typeof fonk === "function") {
                        fonk(e.satirIndex);
                    } else {
                        alert("Bu etkinlik çok yakında eklenecek! 🚀");
                    }
                };        alan.appendChild(btn);
            });
            document.getElementById('etkinlikAltListeModal').style.display = 'flex';
        }

        function etkinlikKategoriListesineDon() {
            document.getElementById('etkinlikAltListeModal').style.display = 'none';
            document.getElementById('etkinliklerModal').style.display = 'flex';
        }

        // Bir oyun bitince (veya başlarken) bunu çağırarak "yapıldı" olarak işaretleyebilirsin
        function etkinlikYapildiIsaretleCagir(satirIndex) {
            if (!satirIndex || !aktifOgrenciAdi) return;
            fetch(`${apiURL}?islem=etkinlikYapildiIsaretle&satirIndex=${satirIndex}&ogrenci=${encodeURIComponent(aktifOgrenciAdi)}`)
            .then(() => {
                let e = tumEtkinliklerCache.find(x => x.satirIndex === satirIndex);
                if (!e || !e.yapildiMi) { genelEnerjiHarca(1); genelEnerjiKazanimAnimasyonuGoster(1, '🎯 Etkinlik bonusu!'); }
                if (e) e.yapildiMi = true;
            })
            .catch(() => {});
        }

        // ===================================================================
        // VİDEOLAR SİSTEMİ (tam çalışır)
        // ===================================================================
        let tumVideolarCache = [];

        function videolarModalAc() {
            let alan = document.getElementById('videoKategoriListeAlani');
            alan.innerHTML = `<div style="text-align:center; color:#0e7490; font-size:12px; padding:10px;">Yükleniyor...</div>`;
            document.getElementById('videolarModal').style.display = 'flex';

            fetch(`${apiURL}?islem=videolariGetir&ogrenci=${encodeURIComponent(aktifOgrenciAdi || "")}`)
            .then(res => res.json())
            .then(liste => {
                tumVideolarCache = liste || [];
                if (tumVideolarCache.length === 0) {
                    alan.innerHTML = `<div style="text-align:center; color:#0e7490; font-size:12px; padding:10px;">Henüz sana özel video eklenmemiş.</div>`;
                    return;
                }
                let kategoriMap = {};
                tumVideolarCache.forEach(v => {
                    let kat = v.kategori || "Genel";
                    if (!kategoriMap[kat]) kategoriMap[kat] = { toplam: 0, izlenen: 0 };
                    kategoriMap[kat].toplam++;
                    if (v.izlendiMi) kategoriMap[kat].izlenen++;
                });
                alan.innerHTML = "";
                Object.keys(kategoriMap).forEach(kat => {
                    let bilgi = kategoriMap[kat];
                    let btn = document.createElement('button');
                    btn.className = "ogretmen-menu-btn";
                    btn.innerHTML = `<span>📂 ${guvenliMetin(kat)}</span><span class="ogretmen-menu-rozet" style="display:inline-block; background:#0891b2;">${bilgi.izlenen}/${bilgi.toplam}</span>`;
                    btn.onclick = function () { videoAltListeAc(kat); };
                    alan.appendChild(btn);
                });
            })
            .catch(() => {
                alan.innerHTML = `<div style="text-align:center; color:#dc2626; font-size:12px; padding:10px;">Videolar yüklenirken hata oluştu.</div>`;
            });
        }

        function videoAltListeAc(kategoriAdi) {
            document.getElementById('videolarModal').style.display = 'none';
            document.getElementById('videoAltListeBaslik').innerText = "📂 " + kategoriAdi;
            let liste = tumVideolarCache.filter(v => (v.kategori || "Genel") === kategoriAdi);
            liste.sort((a, b) => a.siraNo - b.siraNo);

            let alan = document.getElementById('videoAltListeAlani');
            alan.innerHTML = "";
            liste.forEach(v => {
                let btn = document.createElement('button');
                btn.className = "ogretmen-menu-btn";
                let rozet = v.izlendiMi
                    ? `<span class="ogretmen-menu-rozet" style="display:inline-block; background:#16a34a;">✅ İzlendi</span>`
                    : `<span class="ogretmen-menu-rozet" style="display:inline-block; background:#f59e0b;">🆕 Yeni</span>`;
                btn.innerHTML = `
                    <span style="display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
                        <span>▶️ ${guvenliMetin(v.baslik)}</span>
                        ${v.aciklama ? `<span style="font-size:10px; font-weight:500; color:#0e7490;">${guvenliMetin(v.aciklama)}</span>` : ""}
                    </span>
                    ${rozet}
                `;
                btn.onclick = function () { videoOynaticiAc(v.baslik, v.videoLink, v.satirIndex); };
                alan.appendChild(btn);
            });
            document.getElementById('videoAltListeModal').style.display = 'flex';
        }

        function videoKategoriListesineDon() {
            document.getElementById('videoAltListeModal').style.display = 'none';
            document.getElementById('videolarModal').style.display = 'flex';
        }

        function videoEmbedBilgisiOlustur(link) {
            let temizLink = String(link || "").trim();
            let ytMatch = temizLink.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
            if (ytMatch) return { tip: "iframe", src: "https://www.youtube.com/embed/" + ytMatch[1] + "?rel=0&autoplay=1" };
            let driveMatch = temizLink.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (driveMatch) return { tip: "iframe", src: "https://drive.google.com/file/d/" + driveMatch[1] + "/preview" };
            if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(temizLink)) return { tip: "video", src: temizLink };
            return { tip: "iframe", src: temizLink };
        }

        function videoOynaticiAc(baslik, link, satirIndex) {
            genelSureKilitBaslat();
            document.getElementById('videoOynaticiBaslik').innerText = baslik || "Video";
            document.getElementById('videoYeniSekmeLink').href = link;

            let icerikAlani = document.getElementById('videoIcerikAlani');
            let embedBilgi = videoEmbedBilgisiOlustur(link);
            if (embedBilgi.tip === "video") {
                icerikAlani.innerHTML = `<video src="${embedBilgi.src}" controls autoplay style="max-width:100%; max-height:100%;"></video>`;
            } else {
                icerikAlani.innerHTML = `<iframe src="${embedBilgi.src}" style="width:100%; height:100%; border:none;" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
            }

            document.getElementById('videoOynaticiOverlay').style.display = 'flex';

               if (satirIndex && aktifOgrenciAdi) {
                fetch(`${apiURL}?islem=videoIzlendiIsaretle&satirIndex=${satirIndex}&ogrenci=${encodeURIComponent(aktifOgrenciAdi)}`)
                .then(() => {
                    let v = tumVideolarCache.find(x => x.satirIndex === satirIndex);
                    if (!v || !v.izlendiMi) { genelEnerjiHarca(1); genelEnerjiKazanimAnimasyonuGoster(1, '🎬 Video bonusu!'); }
                    if (v) v.izlendiMi = true;
                })
                .catch(() => {});
            }
        }

        function videoOynaticiKapat() {
            genelSureKontrolEtVeKapat(function() {
                document.getElementById('videoOynaticiOverlay').style.display = 'none';
                document.getElementById('videoIcerikAlani').innerHTML = "";
            });
        }

                // ===== RUBRİK PANELİ: ETKİNLİK & VİDEO ATAMA =====
        const DIJI_RUBRIC_CACHE_SURESI = 24 * 60 * 60 * 1000;

function rubricEtkinlikSecDoldur() {
    let sel = document.getElementById('rubricEtkinlikSec');
    if (!sel) return;

    sel.innerHTML = '<option value="">-- Etkinlik Seçin --</option>';

    const key = 'diji_rubric_etkinlik_v1';

    try {
        const ham = localStorage.getItem(key);

        if (ham) {
            const kayit = JSON.parse(ham);

            if (
                kayit &&
                kayit.zaman &&
                Array.isArray(kayit.veri)
            ) {
                window.rubricEtkinlikTanimlari = kayit.veri;
                rubricEtkinlikListesiFiltreliCiz();

                if (Date.now() - kayit.zaman < DIJI_RUBRIC_CACHE_SURESI) {
                    return;
                }
            }
        }
    } catch (e) {}

    fetch(`${apiURL}?islem=etkinlikTanimlariGetir`)
        .then(res => res.json())
        .then(liste => {
            window.rubricEtkinlikTanimlari = Array.isArray(liste) ? liste : [];

            try {
                localStorage.setItem(
                    key,
                    JSON.stringify({
                        zaman: Date.now(),
                        veri: window.rubricEtkinlikTanimlari
                    })
                );
            } catch (e) {}

            rubricEtkinlikListesiFiltreliCiz();
        })
        .catch(() => {
            if (!window.rubricEtkinlikTanimlari) {
                window.rubricEtkinlikTanimlari = [];
            }
            sel.innerHTML = '<option value="">Yüklenemedi</option>';
        });
}
             const DIJI_OZELLIK_CACHE_SURESI = 24 * 60 * 60 * 1000;

function ozellikSecDoldur() {
    let sel = document.getElementById('ozellikSec');
    if (!sel) return;

    const key = 'diji_ozellikler_v2';

    try {
        const ham = localStorage.getItem(key);

        if (ham) {
            const kayit = JSON.parse(ham);

            if (
                kayit &&
                kayit.zaman &&
                Array.isArray(kayit.veri)
            ) {
                sel.innerHTML = '<option value="">-- Özellik Seçin --</option>';

                kayit.veri.forEach(o => {
                    sel.innerHTML +=
                        `<option value="${o.kod}">${guvenliMetin(o.ad)}</option>`;
                });

                if (Date.now() - kayit.zaman < DIJI_OZELLIK_CACHE_SURESI) {
                    return;
                }
            }
        }
    } catch (e) {}

    /* [Kota] Liste yalnız öğretmen oturumunda gelir; öğrenci cihazları her açılışta boşuna sormasın. */
    try { if (!window.dmTeacherPortalMode && !sessionStorage.getItem('ing_ogr_token')) return; } catch (e) {}
    fetch(`${apiURL}?islem=ozellikListesiGetir`)
        .then(res => res.json())
        .then(liste => {
            if (!Array.isArray(liste)) return;   /* öğretmen oturumu yoksa sunucu liste vermez; boş listeyi önbelleğe yazma */

            sel.innerHTML = '<option value="">-- Özellik Seçin --</option>';

            liste.forEach(o => {
                sel.innerHTML +=
                    `<option value="${o.kod}">${guvenliMetin(o.ad)}</option>`;
            });

            try {
                localStorage.setItem(
                    key,
                    JSON.stringify({
                        zaman: Date.now(),
                        veri: liste
                    })
                );
            } catch (e) {}
        })
        .catch(() => {
            sel.innerHTML = '<option value="">Yüklenemedi</option>';
        });
}
        function ozellikHedefAlaniGuncelle() {
            let tip = document.getElementById('ozellikHedefTipiSec').value;
            document.getElementById('ozellikHedefDegeri').style.display = (tip === 'tumogrenciler') ? 'none' : 'block';
        }

        function ozellikIzniKaydet() {
            let kod = document.getElementById('ozellikSec').value;
            let tip = document.getElementById('ozellikHedefTipiSec').value;
            let deger = document.getElementById('ozellikHedefDegeri').value.trim();
            let durum = document.getElementById('ozellikDurumSec').value;
            let mesajDiv = document.getElementById('ozellikIzniSonucMesaj');

            if (!kod) { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Lütfen bir özellik seçin!"; return; }
            if (tip !== 'tumogrenciler' && !deger) { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Lütfen hedef değeri girin!"; return; }

            mesajDiv.style.color = "#334155";
            mesajDiv.innerText = "Kaydediliyor...";

            fetch(apiURL, {
                method: "POST",
                body: JSON.stringify({
                    islem: "ozellikIzniKaydet",
                    ozellikKodu: kod,
                    hedefTipi: tip,
                    hedefDegeri: tip === 'tumogrenciler' ? '' : deger,
                    durum: durum
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    mesajDiv.style.color = "#16a34a";
                    mesajDiv.innerText = "✅ Kural kaydedildi! (Öğrenciler yeni girişte/yenilemede görecek)";
                } else {
                    mesajDiv.style.color = "#dc2626";
                    mesajDiv.innerText = "Hata oluştu.";
                }
            })
            .catch(() => { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Bağlantı hatası."; });
        }
        function rubricEtkinlikAta() {
            let secilenOgrler = [];
            document.querySelectorAll('.rubric-ogr-cb:checked').forEach(cb => { secilenOgrler.push(cb.value); });

            let kod = document.getElementById('rubricEtkinlikSec').value;
            let mesajDiv = document.getElementById('rubricEtkinlikSonucMesaj');

            if (secilenOgrler.length === 0) { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Lütfen en az bir öğrenci veya 'Herkes' seçin!"; return; }
            if (!kod) { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Lütfen bir etkinlik seçin!"; return; }

            let tanim = (window.rubricEtkinlikTanimlari || []).find(e => e.kod === kod);
            let ad = tanim ? tanim.ad : kod;
            let kategori = tanim ? tanim.kategori : "Genel";

            mesajDiv.style.color = "#3730a3";
            mesajDiv.innerText = "Atanıyor...";

            fetch(apiURL, {
                method: "POST",
                body: JSON.stringify({
                    islem: "etkinlikAta",
                    ogrenciAdiListesi: secilenOgrler,
                    etkinlikKodu: kod,
                    gorunenAd: ad,
                    kategori: kategori,
                    disLink: tanim ? tanim.disLink : "",
                    ogretmenYorumu: tanim ? tanim.ogretmenYorumu : ""
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    mesajDiv.style.color = "#16a34a";
                    mesajDiv.innerText = "✅ Etkinlik başarıyla atandı!";
                    if (rubricSeciliEtkinlikler.indexOf(ad) === -1) rubricSeciliEtkinlikler.push(ad);
                    document.querySelectorAll('.rubric-ogr-cb').forEach(cb => { cb.checked = false; cb.disabled = false; });
                } else {
                    mesajDiv.style.color = "#dc2626";
                    mesajDiv.innerText = "Hata: " + (data.message || "Bilinmeyen hata");
                }
            })
            .catch(() => { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Bağlantı hatası oluştu."; });
        }
        function rubricVideoListesiYukleAta() {
            let alan = document.getElementById('rubricVideoListeAlani');
            if (!alan) return;
            alan.innerHTML = `<div style="font-size:10.5px; color:#0e7490; text-align:center;">Videolar yükleniyor...</div>`;

            fetch(`${apiURL}?islem=tumVideolariGetir`)
            .then(res => res.json())
            .then(liste => {
                window.rubricTumVideoTanimlari = liste || [];
                rubricVideoListesiFiltreliCiz();
            })
            .catch(() => { alan.innerHTML = `<div style="font-size:10.5px; color:#dc2626; text-align:center;">Videolar yüklenirken hata oluştu.</div>`; });
        }

        function rubricVideolariAta() {
            let secilenOgrler = [];
            document.querySelectorAll('.rubric-video-ogr-cb:checked').forEach(cb => { secilenOgrler.push(cb.value); });

            let mesajDiv = document.getElementById('rubricVideoSonucMesaj');
            if (secilenOgrler.length === 0) { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Lütfen en az bir öğrenci veya 'Herkes' seçin!"; return; }

            let secilenCheckboxlar = document.querySelectorAll('.rubric-video-checkbox:checked');
            let secilenler = Array.from(secilenCheckboxlar).map(cb => Number(cb.value));
            let secilenBasliklar = Array.from(secilenCheckboxlar).map(cb => cb.dataset.baslik);
            if (secilenler.length === 0) { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Lütfen en az bir video seçin!"; return; }

            mesajDiv.style.color = "#0e7490";
            mesajDiv.innerText = "Atanıyor...";

            fetch(apiURL, {
                method: "POST",
                body: JSON.stringify({
                    islem: "videoOgrenciEkle",
                    ogrenciAdiListesi: secilenOgrler,
                    satirIndexListesi: secilenler
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    mesajDiv.style.color = "#16a34a";
                    mesajDiv.innerText = `✅ ${secilenler.length} video, ${secilenOgrler.length} öğrenciye atandı!`;
                    secilenBasliklar.forEach(baslik => {
                        if (rubricSeciliVideolar.indexOf(baslik) === -1) rubricSeciliVideolar.push(baslik);
                    });
                    document.querySelectorAll('.rubric-video-checkbox:checked').forEach(cb => cb.checked = false);
                } else {
                    mesajDiv.style.color = "#dc2626";
                    mesajDiv.innerText = "Hata: " + (data.message || "Bilinmeyen hata");
                }
            })
            .catch(() => { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Bağlantı hatası oluştu."; });
        }
                // Sayfadaki hiçbir iframe'in native tam ekrana geçmesine izin verme (dış link etkinlikleri donmasın diye)
        document.addEventListener('fullscreenchange', function() {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
        });
        document.addEventListener('webkitfullscreenchange', function() {
            if (document.webkitFullscreenElement) {
                document.webkitExitFullscreen().catch(() => {});
            }
        });

                // ===== DOĞRU/YANLIŞ DİNLEME OYUNU =====
        let dySorular = [];
        let dyAktifIndex = 0;
        let dyDogruSayisi = 0;
        let dyAktifEtkinlikKodu = "";
        let dyAktifSatirIndex = 0;
        let dySesKaydi = null;

                function dyGorselLinkiDuzelt(link) {
            let temizLink = String(link || "").trim();
            let driveMatch = temizLink.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (driveMatch) {
                return "https://drive.google.com/uc?export=view&id=" + driveMatch[1];
            }
            let driveMatch2 = temizLink.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (driveMatch2 && temizLink.includes("drive.google.com")) {
                return "https://drive.google.com/uc?export=view&id=" + driveMatch2[1];
            }
            return temizLink;
        }

        function dogruYanlisOyunAc(etkinlikKodu, satirIndex) {
            dyAktifEtkinlikKodu = etkinlikKodu;
            dyAktifSatirIndex = satirIndex;

            document.getElementById('dyOyunOverlay').style.display = 'flex';
            document.getElementById('dyIcerikAlani').style.opacity = '0.4';

            fetch(`${apiURL}?islem=dogruYanlisSorulariGetir&etkinlikKodu=${encodeURIComponent(etkinlikKodu)}`)
            .then(res => res.json())
            .then(liste => {
                dySorular = liste || [];
                dyAktifIndex = 0;
                dyDogruSayisi = 0;
                document.getElementById('dyIcerikAlani').style.opacity = '1';

                if (dySorular.length === 0) {
                    alert("Bu etkinlik için henüz soru eklenmemiş.");
                    dyOyunKapat();
                    return;
                }

                dyIlerlemeCubuguCiz();
                dySoruGoster();
            })
            .catch(() => {
                alert("Sorular yüklenirken hata oluştu.");
                dyOyunKapat();
            });
        }

        function dyIlerlemeCubuguCiz() {
            let alan = document.getElementById('dyIlerlemeCubugu');
            alan.innerHTML = "";
            dySorular.forEach((s, idx) => {
                let cizgi = document.createElement('div');
                cizgi.style.cssText = `flex:1; height:5px; border-radius:3px; background:${idx === 0 ? '#2563eb' : '#e2e8f0'};`;
                cizgi.dataset.dyIndex = idx;
                alan.appendChild(cizgi);
            });
        }

        function dyIlerlemeCubuguGuncelle() {
            let alan = document.getElementById('dyIlerlemeCubugu');
            Array.from(alan.children).forEach((cizgi, idx) => {
                cizgi.style.background = idx <= dyAktifIndex ? '#2563eb' : '#e2e8f0';
            });
        }

        function dySoruGoster() {
            let soru = dySorular[dyAktifIndex];
            if (!soru) return;

                document.getElementById('dyGorselAlani').src = dyGorselLinkiDuzelt(soru.gorselLink);
            document.getElementById('dyTranscriptMetni').style.display = 'none';
            document.getElementById('dyTranscriptMetni').innerText = soru.dinlemeMetni;

            let dBtn = document.getElementById('dyDogruBtn');
            let yBtn = document.getElementById('dyYanlisBtn');
            [dBtn, yBtn].forEach(b => {
                b.disabled = false;
                b.style.background = '#fff';
                b.style.borderColor = '#cbd5e1';
                b.style.color = '#2563eb';
                b.style.cursor = 'pointer';
            });

            let sonrakiBtn = document.getElementById('dySonrakiBtn');
            sonrakiBtn.disabled = true;
            sonrakiBtn.style.background = '#cbd5e1';
            sonrakiBtn.style.cursor = 'not-allowed';
            sonrakiBtn.innerText = (dyAktifIndex === dySorular.length - 1) ? "Bitir ✓" : "Sonraki →";

            dyIlerlemeCubuguGuncelle();
            setTimeout(() => dySesiOku(), 400);
        }

        function dySesiOku() {
            let soru = dySorular[dyAktifIndex];
            if (!soru || !('speechSynthesis' in window)) return;
            window.speechSynthesis.cancel();
            let konusma = new SpeechSynthesisUtterance(soru.dinlemeMetni);
            konusma.lang = 'en-US';
            konusma.rate = 0.9;
            if (typeof sabitSesKaydi !== 'undefined' && sabitSesKaydi) konusma.voice = sabitSesKaydi;
            window.speechSynthesis.speak(konusma);
        }

        function dyTranscriptToggle() {
            let alan = document.getElementById('dyTranscriptMetni');
            alan.style.display = alan.style.display === 'none' ? 'block' : 'none';
        }

        function dyCevapVer(secilenCevap) {
            let soru = dySorular[dyAktifIndex];
            let dBtn = document.getElementById('dyDogruBtn');
            let yBtn = document.getElementById('dyYanlisBtn');
            let secilenBtn = secilenCevap === 'dogru' ? dBtn : yBtn;
            let digerBtn = secilenCevap === 'dogru' ? yBtn : dBtn;

            dBtn.disabled = true;
            yBtn.disabled = true;
            dBtn.style.cursor = 'default';
            yBtn.style.cursor = 'default';

            if (secilenCevap === soru.dogruCevap) {
                window.DijiMeduPapiFeedback?.correct({anchor:secilenBtn,duration:850});
                dyDogruSayisi++;
                secilenBtn.style.background = '#dcfce7';
                secilenBtn.style.borderColor = '#22c55e';
                secilenBtn.style.color = '#166534';
            } else {
                secilenBtn.style.background = '#fee2e2';
                secilenBtn.style.borderColor = '#ef4444';
                secilenBtn.style.color = '#991b1b';
                let dogruBtn = soru.dogruCevap === 'dogru' ? dBtn : yBtn;
                dogruBtn.style.background = '#dcfce7';
                dogruBtn.style.borderColor = '#22c55e';
                dogruBtn.style.color = '#166534';
            }
            digerBtn.style.opacity = '0.5';

            let sonrakiBtn = document.getElementById('dySonrakiBtn');
            sonrakiBtn.disabled = false;
            sonrakiBtn.style.background = '#2563eb';
            sonrakiBtn.style.cursor = 'pointer';
        }

        function dySonrakiSoru() {
            if (dyAktifIndex >= dySorular.length - 1) {
                dyOyunuBitir();
                return;
            }
            dyAktifIndex++;
            document.getElementById('dyDogruBtn').style.opacity = '1';
            document.getElementById('dyYanlisBtn').style.opacity = '1';
            dySoruGoster();
        }

        function dyOyunuBitir() {
            if (dyAktifSatirIndex && typeof etkinlikYapildiIsaretleCagir === 'function') {
                etkinlikYapildiIsaretleCagir(dyAktifSatirIndex);
            }
            window.speechSynthesis.cancel();
            document.getElementById('dyOyunOverlay').style.display = 'none';

            document.getElementById('dyTebrikDogru').innerText = dyDogruSayisi;
            document.getElementById('dyTebrikToplam').innerText = dySorular.length;
            document.getElementById('dyTebrikOverlay').style.display = 'flex';
        }

        function dyOyunKapat() {
            window.speechSynthesis.cancel();
            document.getElementById('dyOyunOverlay').style.display = 'none';
        }

                // ===== DIŞ LİNK ETKİNLİK SİSTEMİ =====
        let disLinkAktifSatirIndex = 0;
        let disLinkAktifUrl = "";

        let disLinkYuklemeZamanAsimi = null;
        let disLinkYuklendiMi = false;

        function disLinkOyunAc(url, baslik, yorum, satirIndex) {
            /* Sadece https bağlantıları açılır (javascript:, data: vb. engellenir) */
            try { if (new URL(String(url || ''), location.href).protocol !== 'https:') { if (typeof yoToast === 'function') yoToast('Bu etkinlik bağlantısı açılamıyor. Öğretmenine haber ver.'); return; } } catch (e) { return; }
            disLinkAktifSatirIndex = satirIndex;
            disLinkAktifUrl = url;
            genelSureKilitBaslat();

            document.getElementById('disLinkBaslikAlani').innerText = baslik || "";
            document.getElementById('disLinkYeniSekmeBtn').href = url;

            let yorumAlani = document.getElementById('disLinkYorumAlani');
            if (yorum && yorum.trim()) {
                yorumAlani.innerText = "📌 " + yorum;
                yorumAlani.style.display = 'block';
            } else {
                yorumAlani.style.display = 'none';
            }

            document.getElementById('disLinkOverlay').style.display = 'flex';
            disLinkIframeYukle(url);

            if (satirIndex && typeof etkinlikYapildiIsaretleCagir === 'function') {
                etkinlikYapildiIsaretleCagir(satirIndex);
            }
        }

        function disLinkIframeYukle(url) {
            disLinkYuklendiMi = false;
            document.getElementById('disLinkYukleniyorAlani').style.display = 'flex';
            document.getElementById('disLinkEngelliUyari').style.display = 'none';

            let iframe = document.getElementById('disLinkIframe');
            iframe.src = "";

            iframe.onload = function () {
                // about:blank yüklenince de onload tetiklenir, bu yüzden gerçek url atandıktan sonraki
                // onload'ı dikkate alıyoruz (küçük gecikmeyle kontrol ediyoruz)
                if (iframe.src && iframe.src !== "about:blank") {
                    disLinkYuklendiMi = true;
                    document.getElementById('disLinkYukleniyorAlani').style.display = 'none';
                }
            };

            setTimeout(() => {
                iframe.src = url;

                if (disLinkYuklemeZamanAsimi) clearTimeout(disLinkYuklemeZamanAsimi);
                disLinkYuklemeZamanAsimi = setTimeout(() => {
                    if (!disLinkYuklendiMi) {
                        document.getElementById('disLinkYukleniyorAlani').style.display = 'none';
                        document.getElementById('disLinkEngelliUyari').style.display = 'flex';
                    }
                }, 10000);
            }, 50);
        }

        function disLinkTekrarOyna() {
            disLinkIframeYukle(disLinkAktifUrl);
        }
        function disLinkKapat() {
            genelSureKontrolEtVeKapat(function() {
                if (disLinkYuklemeZamanAsimi) clearTimeout(disLinkYuklemeZamanAsimi);
                document.getElementById('disLinkIframe').src = "";
                document.getElementById('disLinkOverlay').style.display = 'none';
            });
        }

        // ===== RUBRİK PANELİ: DIŞ LİNK ETKİNLİK EKLEME =====
        function rubricDisLinkAta() {
            let secilenOgrler = [];
            document.querySelectorAll('.rubric-ogr-cb:checked').forEach(cb => {
                secilenOgrler.push(cb.value);
            });

            let kategori = document.getElementById('rubricDisLinkKategori').value;
            let ad = document.getElementById('rubricDisLinkAd').value.trim();
            let url = document.getElementById('rubricDisLinkUrl').value.trim();
            let yorum = document.getElementById('rubricDisLinkYorum').value.trim();
            let mesajDiv = document.getElementById('rubricDisLinkSonucMesaj');

            if (secilenOgrler.length === 0) { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Lütfen en az bir öğrenci veya 'Herkes' seçin!"; return; }
            if (!ad || !url) { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Etkinlik adı ve link zorunludur!"; return; }

            mesajDiv.style.color = "#a16207";
            mesajDiv.innerText = "Ekleniyor ve atanıyor...";

            fetch(apiURL, {
                method: "POST",
                body: JSON.stringify({
                    islem: "disLinkEtkinlikAta",
                    ogrenciAdiListesi: secilenOgrler, // Çoklu öğrenci dizisi gönderiliyor
                    gorunenAd: ad,
                    kategori: kategori,
                    disLink: url,
                    ogretmenYorumu: yorum
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    mesajDiv.style.color = "#16a34a";
                    mesajDiv.innerText = "✅ Başarıyla eklendi ve seçilen öğrencilere atandı!";
                    document.getElementById('rubricDisLinkAd').value = "";
                    document.getElementById('rubricDisLinkUrl').value = "";
                    document.getElementById('rubricDisLinkYorum').value = "";
                    document.querySelectorAll('.rubric-ogr-cb').forEach(cb => { cb.checked = false; cb.disabled = false; });
                } else {
                    mesajDiv.style.color = "#dc2626";
                    mesajDiv.innerText = "Hata: " + (data.message || "Bilinmeyen hata");
                }
            })
            .catch(() => { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Bağlantı hatası oluştu."; });
        }



                // ===== KELİME KARTLARI YOLCULUĞU — YENİ SİSTEM (DIŞ LİNK) =====
        let seviyeDisLinkAktifSinif = 0;
        let seviyeDisLinkAktifUnite = 0;
        let seviyeDisLinkAktifSeviye = 0;
        let seviyeDisLinkAktifUrl = "";
        let seviyeDisLinkZamanAsimi = null;
        let seviyeDisLinkYuklendiMi = false;

                let seviyeDisLinkAcilisZamani = 0;
                const SEVIYE_MIN_SANIYE = 60;

        function seviyeDisLinkAc(sinif, unite, seviye) {
            if (genelOyunGirisEngelliMi()) return;
            let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === oyunIcinAktifIsim().toLowerCase());
            if (!user) return;

            let kart = (user.aktiviteKartlari || []).find(k => k.sinif === sinif && k.unite === unite && k.seviye === seviye);
            if (!kart || !kart.disLink) {
                alert("Bu seviye için henüz bir etkinlik eklenmemiş.");
                return;
            }
            genelEnerjiHarca(-3);

            seviyeDisLinkAktifSinif = sinif;
            seviyeDisLinkAktifUnite = unite;
            seviyeDisLinkAktifSeviye = seviye;
            seviyeDisLinkAktifUrl = kart.disLink;
            seviyeDisLinkAcilisZamani = Date.now();

            document.getElementById('seviyeHaritaOverlay').style.display = 'none';
            document.getElementById('seviyeDisLinkBaslikAlani').innerText = kart.butonAdi || `Seviye ${seviye}`;
            document.getElementById('seviyeDisLinkYeniSekmeBtn').href = kart.disLink;
            document.getElementById('seviyeDisLinkOverlay').style.display = 'flex';

            seviyeDisLinkIframeYukle(kart.disLink);
        }

        function seviyeDisLinkIframeYukle(url) {
            seviyeDisLinkYuklendiMi = false;
            document.getElementById('seviyeDisLinkYukleniyorAlani').style.display = 'flex';
            document.getElementById('seviyeDisLinkEngelliUyari').style.display = 'none';

            let iframe = document.getElementById('seviyeDisLinkIframe');
            iframe.src = "";

            iframe.onload = function () {
                if (iframe.src && iframe.src !== "about:blank") {
                    seviyeDisLinkYuklendiMi = true;
                    document.getElementById('seviyeDisLinkYukleniyorAlani').style.display = 'none';
                }
            };

            setTimeout(() => {
                iframe.src = url;
                if (seviyeDisLinkZamanAsimi) clearTimeout(seviyeDisLinkZamanAsimi);
                seviyeDisLinkZamanAsimi = setTimeout(() => {
                    if (!seviyeDisLinkYuklendiMi) {
                        document.getElementById('seviyeDisLinkYukleniyorAlani').style.display = 'none';
                        document.getElementById('seviyeDisLinkEngelliUyari').style.display = 'flex';
                    }
                }, 3500);
            }, 50);
        }

        function seviyeDisLinkKapatOnaySor() {
            let gecenSaniye = Math.floor((Date.now() - seviyeDisLinkAcilisZamani) / 1000);
            if (gecenSaniye < SEVIYE_MIN_SANIYE) {
                let kalanSaniye = SEVIYE_MIN_SANIYE - gecenSaniye;
                document.getElementById('seviyeSureUyariMetni').innerText =
                    `Bu etkinlikte en az ${SEVIYE_MIN_SANIYE} saniye geçirmen gerekiyor. Kalan süre: ${kalanSaniye} saniye. Şimdi çıkarsan bu seviye puan olarak sayılmayacak.`;
                document.getElementById('seviyeSureUyariModal').style.display = 'flex';
                return;
            }
            document.getElementById('seviyeOnayModal').style.display = 'flex';
        }

        function seviyeSureYetersizDevamEt() {
            document.getElementById('seviyeSureUyariModal').style.display = 'none';
        }

        function seviyeSureYetersizCik() {
            document.getElementById('seviyeSureUyariModal').style.display = 'none';

            if (seviyeDisLinkZamanAsimi) clearTimeout(seviyeDisLinkZamanAsimi);
            document.getElementById('seviyeDisLinkIframe').src = "";
            document.getElementById('seviyeDisLinkOverlay').style.display = 'none';

            document.getElementById('seviyeHaritaOverlay').style.display = 'flex';
            seviyeHaritasiCiz();
        }

        function seviyeOnayVer(bitirdiMi) {
            document.getElementById('seviyeOnayModal').style.display = 'none';

            if (seviyeDisLinkZamanAsimi) clearTimeout(seviyeDisLinkZamanAsimi);
            document.getElementById('seviyeDisLinkIframe').src = "";
            document.getElementById('seviyeDisLinkOverlay').style.display = 'none';

               if (bitirdiMi) {
                fetch(`${apiURL}?islem=seviyeTamamla&ogrenci=${encodeURIComponent(oyunIcinAktifIsim())}&sinif=${seviyeDisLinkAktifSinif}&unite=${seviyeDisLinkAktifUnite}&seviye=${seviyeDisLinkAktifSeviye}`).catch(() => {});

                let user = globalDataCache.find(u => String(u.ogrenci).trim().toLowerCase() === oyunIcinAktifIsim().toLowerCase());
                if (user) {
                    if (!user.seviyeIlerleme) user.seviyeIlerleme = [];
                    user.seviyeIlerleme.push({ sinif: seviyeDisLinkAktifSinif, unite: seviyeDisLinkAktifUnite, seviye: seviyeDisLinkAktifSeviye, tamamlandi: true });
                }
            }

            document.getElementById('seviyeHaritaOverlay').style.display = 'flex';
            seviyeHaritasiCiz();
        }

                // Tarayıcı tam ekran modundan çıkılırsa (ESC ile), bizim overlay'lerin görünür kaldığından emin ol
        document.addEventListener('fullscreenchange', function() {
            if (!document.fullscreenElement) {
                // Tam ekrandan çıkıldı, overlay'ler zaten DOM'da olduğu için otomatik tekrar görünür/tıklanabilir olur
            }
        });

                // Kategorileri Google Sheets'ten çekip açılır menüye dolduran fonksiyon
        async function rubricKategorileriYukle() {
            let sel = document.getElementById('rubricDisLinkKategori');
            if (!sel) return;
            try {
                let res = await fetch(`${apiURL}?islem=kategorileriGetir`);
                let kategoriler = await res.json();
                sel.innerHTML = "";
                kategoriler.forEach(kat => {
                    let opt = document.createElement('option');
                    opt.value = kat;
                    opt.innerText = kat;
                    sel.appendChild(opt);
                });
            } catch (e) {
                sel.innerHTML = '<option value="Etkinlikler">Etkinlikler</option><option value="Videolar">Videolar</option>';
            }
        }

        // Öğrencileri ve "Herkes" seçeneğini checkbox olarak listeleyen fonksiyon
        function rubricOgrenciChecklistDoldurGenel(konteynerId, cbClass, filtreYenileFn) {
            let konteyner = document.getElementById(konteynerId);
            if (!konteyner) return;
            konteyner.innerHTML = "";

            let herkesLabel = document.createElement('label');
            herkesLabel.style.cssText = "display:flex; align-items:center; gap:6px; font-size:11px; font-weight:bold; cursor:pointer; color:#334155;";
            herkesLabel.innerHTML = `<input type="checkbox" value="Herkes" class="${cbClass}" onchange="rubricHerkesSecildiGenel(this, '${cbClass}')"> 🌟 Herkes (Tüm Öğrenciler)`;
            konteyner.appendChild(herkesLabel);

            globalDataCache.forEach(u => {
                let ogrAdi = String(u.ogrenci || "").trim();
                if (!ogrAdi || ogrAdi.toLowerCase() === "teacher") return;

                let label = document.createElement('label');
                label.style.cssText = "display:flex; align-items:center; gap:6px; font-size:11px; cursor:pointer; color:#334155;";
                label.innerHTML = `<input type="checkbox" value="${guvenliMetin(ogrAdi)}" class="${cbClass}"> ${guvenliMetin(ogrAdi)}`;
                konteyner.appendChild(label);
            });

            if (typeof filtreYenileFn === "function") {
                konteyner.querySelectorAll('.' + cbClass).forEach(cb => {
                    cb.addEventListener('change', filtreYenileFn);
                });
                filtreYenileFn();
            }
        }

        function rubricHerkesSecildiGenel(herkesCb, cbClass) {
            let digerCheckboxlar = document.querySelectorAll('.' + cbClass);
            digerCheckboxlar.forEach(cb => {
                if (cb !== herkesCb) {
                    cb.checked = herkesCb.checked;
                    cb.disabled = herkesCb.checked;
                }
            });
        }

        function rubricSeciliOgrencileriGetir(cbClass) {
            let herkesSecili = false;
            let secilenler = [];
            document.querySelectorAll('.' + cbClass + ':checked').forEach(cb => {
                if (cb.value === "Herkes") herkesSecili = true;
                else secilenler.push(cb.value.trim().toLowerCase());
            });
            return { herkesSecili: herkesSecili, secilenler: secilenler };
        }

        function rubricEtkinlikListesiFiltreliCiz() {
            let sel = document.getElementById('rubricEtkinlikSec');
            if (!sel) return;
            let tumListe = window.rubricEtkinlikTanimlari || [];
            let durum = rubricSeciliOgrencileriGetir('rubric-ogr-cb');
            let mevcutDeger = sel.value;

            if (tumListe.length === 0) {
                sel.innerHTML = '<option value="">Henüz tanımlı etkinlik yok</option>';
                return;
            }

            sel.innerHTML = '<option value="">-- Etkinlik Seçin --</option>';
            tumListe.forEach(e => {
                let atananlar = e.atananlar || [];
                let gizle = false;
                if (!durum.herkesSecili && durum.secilenler.length > 0) {
                    gizle = durum.secilenler.every(ogr => atananlar.indexOf(ogr) !== -1);
                }
                if (!gizle) sel.innerHTML += `<option value="${e.kod}">${guvenliMetin(e.ad)}</option>`;
            });

            if ([...sel.options].some(o => o.value === mevcutDeger)) sel.value = mevcutDeger;
        }

        function rubricVideoListesiFiltreliCiz() {
            let alan = document.getElementById('rubricVideoListeAlani');
            if (!alan) return;
            let tumListe = window.rubricTumVideoTanimlari || [];
            let durum = rubricSeciliOgrencileriGetir('rubric-video-ogr-cb');

            if (tumListe.length === 0) {
                alan.innerHTML = `<div style="font-size:10.5px; color:#0e7490; text-align:center;">Henüz hiç video eklenmemiş.</div>`;
                return;
            }

            alan.innerHTML = "";
            let gosterilenSayisi = 0;
            tumListe.forEach(v => {
                let atananlar = v.atananlar || [];
                let gizle = false;
                if (!durum.herkesSecili && durum.secilenler.length > 0) {
                    gizle = durum.secilenler.every(ogr => atananlar.indexOf(ogr) !== -1);
                }
                if (gizle) return;
                gosterilenSayisi++;
                let satir = document.createElement('label');
                satir.style.cssText = "display:flex; align-items:center; gap:6px; font-size:11px; padding:4px 2px; cursor:pointer;";
                satir.innerHTML = `
                    <input type="checkbox" value="${v.satirIndex}" data-baslik="${guvenliMetin(v.baslik)}" class="rubric-video-checkbox">
                    <span>${guvenliMetin(v.baslik)} <span style="color:#0e7490; font-size:9.5px;">(${guvenliMetin(v.kategori)})</span></span>
                `;
                alan.appendChild(satir);
            });

            if (gosterilenSayisi === 0) {
                alan.innerHTML = `<div style="font-size:10.5px; color:#0e7490; text-align:center;">Seçili öğrenci(ler)e atanabilecek yeni video kalmadı.</div>`;
            }
        }

        function rubricOgrenciChecklistDoldur() {
            rubricOgrenciChecklistDoldurGenel('rubricOgrenciCheckboxListesi', 'rubric-ogr-cb', rubricEtkinlikListesiFiltreliCiz);
        }

        function rubricVideoOgrenciChecklistDoldur() {
            rubricOgrenciChecklistDoldurGenel('rubricVideoOgrenciCheckboxListesi', 'rubric-video-ogr-cb', rubricVideoListesiFiltreliCiz);
        }

                               // ===== DUYURU SİSTEMİ (öğrenci tarafı) =====
                let duyuruAktifId = null;

                async function anaPanelDuyuruBildirimleriYukle(){const pa=document.getElementById("panel-alani");if(!pa)return;let box=document.getElementById("anaPanelSosyalOzet");if(!box){box=document.createElement("div");box.id="anaPanelSosyalOzet";const ref=pa.querySelector(".tabs-container");if(ref)pa.insertBefore(box,ref);else pa.prepend(box);}try{const dr=await fetch(apiURL+"?islem=duyurulariGetir&ogrenci="+encodeURIComponent(aktifOgrenciAdi||"")).then(r=>r.json()).catch(()=>null);const nr=await fetch(apiURL+"?islem=bildirimlerim&ogrenci="+encodeURIComponent(aktifOgrenciAdi||"")+"&tumu=1").then(r=>r.json()).catch(()=>({liste:[]}));const d=dr&&dr.baslik?dr:null,n=(nr&&nr.liste)||[];const duyuru=d?'<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px"><div style="font-weight:900;color:#334155">📢 '+guvenliMetin(d.baslik)+'</div><div style="font-size:12px;color:#64748b;margin-top:5px;line-height:1.45">'+guvenliMetin(d.mesaj||"")+'</div></div>':'<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;color:#64748b">📢 Şu anda duyuru yok.</div>';const bild=n.slice(0,5).map(x=>'<div style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569"><b>'+guvenliMetin(x.gonderen||"Diji-Medu")+'</b> '+guvenliMetin(x.metin||"Yeni bildirimin var")+'</div>').join("");box.innerHTML='<div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:10px;margin:0 0 12px">'+duyuru+'<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px 14px"><div style="font-weight:900;color:#334155;margin-bottom:5px">🔔 Bildirimlerin</div>'+(bild||'<div style="font-size:12px;color:#94a3b8;padding:6px 0">Yeni bildirim yok.</div>')+'</div></div>';}catch(e){box.innerHTML="";}}function duyuruKontrolEt() {
                    if (!aktifOgrenciAdi || aktifOgrenciAdi.toLowerCase() === "teacher") return;
                    /* [27 Eki 2026] Eski duyuru sistemi kaldırıldı; duyurular yeni duyuru kutusundan (announcements.js) gösterilir. */
                }

                        function duyuruGoster(duyuru) {
                    if(window.dmPapiNotices?.defer('announcement:'+duyuru.id,()=>duyuruGoster(duyuru)))return;
                    duyuruAktifId = duyuru.id;
                    let temalar = {
                        mavi:    { medal: 'linear-gradient(145deg,#60a5fa,#2563eb)', tagBg: 'rgba(96,165,250,.14)', tagBorder: 'rgba(96,165,250,.35)', tagColor: '#93c5fd', btn: 'linear-gradient(120deg,#60a5fa,#3b82f6)', glow1: 'rgba(96,165,250,.22)', glow2: 'rgba(37,99,235,.20)', icon: '📘' },
                        yesil:   { medal: 'linear-gradient(145deg,#4ade80,#16a34a)', tagBg: 'rgba(74,222,128,.14)', tagBorder: 'rgba(74,222,128,.35)', tagColor: '#86efac', btn: 'linear-gradient(120deg,#4ade80,#22c55e)', glow1: 'rgba(74,222,128,.22)', glow2: 'rgba(22,163,74,.20)', icon: '🌿' },
                        mor:     { medal: 'linear-gradient(145deg,#a78bfa,#7c3aed)', tagBg: 'rgba(167,139,250,.14)', tagBorder: 'rgba(167,139,250,.35)', tagColor: '#c4b5fd', btn: 'linear-gradient(120deg,#a78bfa,#8b5cf6)', glow1: 'rgba(167,139,250,.22)', glow2: 'rgba(124,58,237,.20)', icon: '🔮' },
                        turuncu: { medal: 'linear-gradient(145deg,#fbbf24,#f59e0b)', tagBg: 'rgba(251,191,36,.14)', tagBorder: 'rgba(251,191,36,.35)', tagColor: '#fde68a', btn: 'linear-gradient(120deg,#fbbf24,#f59e0b)', glow1: 'rgba(251,191,36,.22)', glow2: 'rgba(245,158,11,.20)', icon: '⭐' },
                        kirmizi: { medal: 'linear-gradient(145deg,#fb7185,#e11d48)', tagBg: 'rgba(251,113,133,.14)', tagBorder: 'rgba(251,113,133,.35)', tagColor: '#fda4af', btn: 'linear-gradient(120deg,#fb7185,#f43f5e)', glow1: 'rgba(251,113,133,.22)', glow2: 'rgba(225,29,72,.20)', icon: '🔔' }
                    };
                    let t = temalar[duyuru.tema] || temalar.mavi;

                    document.getElementById('duyuruBaslik').innerText = duyuru.baslik;
                    document.getElementById('duyuruMesaj').innerText = duyuru.mesaj;
                    document.getElementById('duyuruMedal').style.background = t.medal;
                    document.getElementById('duyuruMedal').innerHTML = '<img src="papi-loading.webp" class="dm-panel-mascot" width="1145" height="1374" alt="Diji-Medu papağanı seni karşılıyor">';
                    document.getElementById('duyuruTag').style.background = t.tagBg;
                    document.getElementById('duyuruTag').style.border = '1px solid ' + t.tagBorder;
                    document.getElementById('duyuruTag').style.color = t.tagColor;
                    document.getElementById('duyuruBtn').style.background = t.btn;
                    document.getElementById('duyuruGlow').style.background =
                        `radial-gradient(circle at 18% 18%, ${t.glow1}, transparent 42%), radial-gradient(circle at 85% 82%, ${t.glow2}, transparent 46%)`;

                    let gorselEl = document.getElementById('duyuruGorsel');
                    if (duyuru.gorselLink && duyuru.gorselLink.trim()) {
                        gorselEl.src = duyuru.gorselLink.trim();
                        gorselEl.style.display = 'block';
                    } else {
                        gorselEl.src = '';
                        gorselEl.style.display = 'none';
                    }

                    document.getElementById('duyuruOverlay').style.display = 'flex';
                    if(!window.dmAnnouncements)setTimeout(()=>{if(duyuruAktifId===duyuru.id)duyuruKapat();},10000);
                }

                function duyuruKapat() {
                    document.getElementById('duyuruOverlay').style.display = 'none';

                    if (duyuruAktifId && aktifOgrenciAdi) {
                        fetch(`${apiURL}?islem=duyuruGorulduIsaretle&duyuruId=${encodeURIComponent(duyuruAktifId)}&ogrenci=${encodeURIComponent(aktifOgrenciAdi)}`).catch(() => {});
                    }
                    duyuruAktifId = null;
                }

                function duyuruGecmisiniAc() {
                    if (!aktifOgrenciAdi) return;
                    document.getElementById('duyuruGecmisModal').style.display = 'flex';
                    let alan = document.getElementById('duyuruGecmisListeAlani');
                    alan.innerHTML = `<div style="font-size:11px; color:#64748b; text-align:center; padding:10px;">Yükleniyor...</div>`;

                    fetch(`${apiURL}?islem=duyuruGecmisiGetir&ogrenci=${encodeURIComponent(aktifOgrenciAdi)}`)
                    .then(res => res.json())
                    .then(liste => {
                        if (!liste || liste.length === 0) {
                            alan.innerHTML = `<div style="font-size:11px; color:#64748b; text-align:center; padding:14px;">Henüz sana ait bir duyuru bulunmuyor.</div>`;
                            return;
                        }
                        let temaRenkleri = {
                            mavi: '#2563eb', yesil: '#16a34a', mor: '#7c3aed', turuncu: '#f59e0b', kirmizi: '#e11d48'
                        };
                        alan.innerHTML = "";
                        liste.forEach(d => {
                            let renk = temaRenkleri[d.tema] || temaRenkleri.mavi;
                            let gorselHtml = d.gorselLink && d.gorselLink.trim()
                                ? `<img src="${d.gorselLink}" style="width:100%; max-height:140px; object-fit:cover; border-radius:8px; margin-bottom:8px;">`
                                : "";
                            let kart = document.createElement('div');
                            kart.style.cssText = `background:#fff; border:1px solid #e2e8f0; border-left:4px solid ${renk}; border-radius:10px; padding:12px;`;
                            kart.innerHTML = `
                                ${gorselHtml}
                                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:4px;">
                                    <div style="font-weight:800; font-size:12.5px; color:#1e293b;">${guvenliMetin(d.baslik)}</div>
                                    <div style="font-size:9.5px; color:#94a3b8; flex-shrink:0; white-space:nowrap;">${d.tarih}</div>
                                </div>
                                <div style="font-size:11.5px; color:#475569; line-height:1.5; white-space:pre-line;">${guvenliMetin(d.mesaj)}</div>
                            `;
                            alan.appendChild(kart);
                        });
                    })
                    .catch(() => {
                        alan.innerHTML = `<div style="font-size:11px; color:#dc2626; text-align:center;">Yüklenirken hata oluştu.</div>`;
                    });
                }

                // ===== DUYURU SİSTEMİ (öğretmen tarafı) =====
                function ogretmenMenuDuyuruAc() {
                    document.getElementById('ogretmenMenuModal').style.display = 'none';
                    document.getElementById('duyuruYonetimModal').style.display = 'flex';
                    duyuruListesiniYukle();
                    duyuruOgrenciChecklistDoldur();
                    document.getElementById('duyuruHerkesCb').checked = true;
                    document.getElementById('duyuruHedefSecimAlani').style.display = 'none';
                }

                function duyuruHerkesToggle() {
                    let herkesCb = document.getElementById('duyuruHerkesCb');
                    document.getElementById('duyuruHedefSecimAlani').style.display = herkesCb.checked ? 'none' : 'block';
                }

                function duyuruOgrenciChecklistDoldur() {
                    let konteyner = document.getElementById('duyuruOgrenciCheckboxListesi');
                    if (!konteyner) return;
                    konteyner.innerHTML = "";
                    globalDataCache.forEach(u => {
                        let ogrAdi = String(u.ogrenci || "").trim();
                        if (!ogrAdi || ogrAdi.toLowerCase() === "teacher") return;
                        let label = document.createElement('label');
                        label.style.cssText = "display:flex; align-items:center; gap:6px; font-size:11px; cursor:pointer; color:#334155;";
                        label.innerHTML = `<input type="checkbox" value="${guvenliMetin(ogrAdi)}" data-sinif="${guvenliMetin(String(u.Sinif || ''))}" class="duyuru-ogr-cb"> ${guvenliMetin(ogrAdi)}`;
                        konteyner.appendChild(label);
                    });
                }

                function duyuruSinifToplaSec() {
                    let sinif = document.getElementById('duyuruSinifToplu').value;
                    if (!sinif) return;
                    document.querySelectorAll('.duyuru-ogr-cb').forEach(cb => {
                        if (cb.dataset.sinif === sinif) cb.checked = true;
                    });
                }

                function duyuruListesiniYukle() {
                    let alan = document.getElementById('duyuruListeAlani');
                    alan.innerHTML = `<div style="font-size:11px; color:#64748b; text-align:center; padding:10px;">Yükleniyor...</div>`;
                    fetch(`${apiURL}?islem=duyuruListesiGetir`)
                    .then(res => res.json())
                    .then(liste => {
                        if (!liste || liste.length === 0) {
                            alan.innerHTML = `<div style="font-size:11px; color:#64748b; text-align:center; padding:10px;">Henüz duyuru oluşturulmamış.</div>`;
                            return;
                        }
                        alan.innerHTML = "";
                        liste.forEach(d => {
                            let aktifMi = String(d.aktif).trim().toLowerCase() === "evet";
                            let hedefEtiket = d.hedefTipi === "herkes" ? "🌟 Herkese" : "👤 Seçili Öğrenciler";
                            let sinirEtiket = d.gosterimSinir > 0 ? `İlk ${d.gosterimSinir} girişte` : "Her girişte";
                            let satir = document.createElement('div');
                            satir.style.cssText = `background:${aktifMi ? '#f8fafc' : '#f1f5f9'}; border:1px solid ${aktifMi ? '#e2e8f0' : '#cbd5e1'}; border-radius:8px; padding:10px; margin-bottom:8px; opacity:${aktifMi ? '1' : '0.6'};`;
                            satir.innerHTML = `
                                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                                    <div style="flex:1; min-width:0;">
                                        <div style="font-weight:800; font-size:12px; color:#1e293b;">${guvenliMetin(d.baslik)}</div>
                                        <div style="font-size:10px; color:#64748b; margin-top:2px;">${hedefEtiket} · ${sinirEtiket}</div>
                                    </div>
                                    <div style="display:flex; gap:4px; flex-shrink:0;">
                                        <button onclick="duyuruAktifPasifToggleYap('${d.id}', ${aktifMi})" style="background:${aktifMi ? '#fef3c7' : '#dcfce7'}; color:${aktifMi ? '#92400e' : '#166534'}; border:none; padding:4px 8px; border-radius:6px; font-size:9.5px; font-weight:700; cursor:pointer;">${aktifMi ? 'Durdur' : 'Aktif Et'}</button>
                                        <button onclick="duyuruSilOnayla('${d.id}')" style="background:#fee2e2; color:#991b1b; border:none; padding:4px 8px; border-radius:6px; font-size:9.5px; font-weight:700; cursor:pointer;">Sil</button>
                                    </div>
                                </div>
                            `;
                            alan.appendChild(satir);
                        });
                    })
                    .catch(() => { alan.innerHTML = `<div style="font-size:11px; color:#dc2626; text-align:center;">Yüklenirken hata oluştu.</div>`; });
                }

                function duyuruAktifPasifToggleYap(duyuruId, suAnAktifMi) {
                    let yeniDurum = suAnAktifMi ? "hayir" : "evet";
                    fetch(apiURL, { method: "POST", body: JSON.stringify({ islem: "duyuruAktifPasif", duyuruId: duyuruId, durum: yeniDurum }) })
                    .then(() => duyuruListesiniYukle())
                    .catch(() => {});
                }

                function duyuruSilOnayla(duyuruId) {
                    if (!confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) return;
                    fetch(apiURL, { method: "POST", body: JSON.stringify({ islem: "duyuruSil", duyuruId: duyuruId }) })
                    .then(() => duyuruListesiniYukle())
                    .catch(() => {});
                }

                        function duyuruEkleGonder() {
                    let baslik = document.getElementById('duyuruBaslikInput').value.trim();
                    let mesaj = document.getElementById('duyuruMesajInput').value.trim();
                    let gorselLink = document.getElementById('duyuruGorselInput').value.trim();
                    let tema = document.getElementById('duyuruTemaSelect').value;
                    let gosterimSinir = document.getElementById('duyuruGosterimSelect').value;
                    let herkesMi = document.getElementById('duyuruHerkesCb').checked;
                    let mesajDiv = document.getElementById('duyuruEkleSonucMesaj');

                    if (!baslik || !mesaj) { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Başlık ve mesaj zorunludur!"; return; }

                    let hedefTipi = "herkes";
                    let hedefListesi = [];
                    if (!herkesMi) {
                        document.querySelectorAll('.duyuru-ogr-cb:checked').forEach(cb => hedefListesi.push(cb.value));
                        if (hedefListesi.length === 0) { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Lütfen en az bir öğrenci seçin veya 'Herkes' işaretleyin!"; return; }
                        hedefTipi = "secili";
                    }

                    mesajDiv.style.color = "#334155";
                    mesajDiv.innerText = "Yayınlanıyor...";

                    fetch(apiURL, {
                        method: "POST",
                        body: JSON.stringify({
                            islem: "duyuruEkle",
                            baslik: baslik,
                            mesaj: mesaj,
                            gorselLink: gorselLink,
                            hedefTipi: hedefTipi,
                            hedefListesi: hedefListesi,
                            gosterimSinir: gosterimSinir,
                            tema: tema
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === "success") {
                            mesajDiv.style.color = "#16a34a";
                            mesajDiv.innerText = "✅ Duyuru yayınlandı!";
                                                document.getElementById('duyuruBaslikInput').value = "";
                            document.getElementById('duyuruMesajInput').value = "";
                            document.getElementById('duyuruGorselInput').value = "";
                            document.getElementById('duyuruHerkesCb').checked = true;
                            duyuruHerkesToggle();
                            document.querySelectorAll('.duyuru-ogr-cb').forEach(cb => cb.checked = false);
                            duyuruListesiniYukle();
                        } else {
                            mesajDiv.style.color = "#dc2626";
                            mesajDiv.innerText = "Hata: " + (data.message || "Bilinmeyen hata");
                        }
                    })
                    .catch(() => { mesajDiv.style.color = "#dc2626"; mesajDiv.innerText = "Bağlantı hatası."; });
                }

                function gununKonusuYukle() {
            if (!aktifOgrenciAdi) return;
            fetch(`${apiURL}?islem=gununKonusuGetir&ogrenci=${encodeURIComponent(aktifOgrenciAdi)}`)
            .then(res => res.json())
            .then(konu => {
                let kart = document.getElementById('kartGununKonusu');
                if (!konu) { kart.style.display = 'none'; return; }
                window._gununKonusuData = konu;
                document.getElementById('gununKonusuMetni').innerText = `Öğretmenin bugün "${konu.konuAdi}" konusunu çalışmanı öneriyor!`;
            })
            .catch(() => {});
        }
        function gununKonusunaGit() {
            let konu = window._gununKonusuData;
            if (!konu) return;
            dersCalisTamEkranAc();
            setTimeout(() => {
                if (dcTumKonularCache.length === 0) { setTimeout(() => dcAramaSonucundanGit(konu.seviye, konu.kategori, konu.konuAdi), 800); }
                else dcAramaSonucundanGit(konu.seviye, konu.kategori, konu.konuAdi);
            }, 300);
        }

                    function dersCalisTamEkranAc() {
            dcTumTamEkranlariKapat();
            const dcPanel = document.getElementById('tab-derscalis');
            // Kapatırken bırakılmış satır içi gizleme yeniden açılışta boş ekran bırakıyordu (4 Kas 2026).
            dcPanel.style.removeProperty('display');
            dcPanel.classList.add('active');
            dersCalisBaslat();
            dcBottomNavSenkronize();
        }
      function dersCalisTamEkranKapat() {
    if (typeof dcSesDurdur === 'function') dcSesDurdur();

    let dersCalisPanel = document.getElementById('tab-derscalis');
    if (dersCalisPanel) {
        dersCalisPanel.classList.remove('active');
        dersCalisPanel.style.removeProperty('display'); // active sınıfı kalkınca gizlenir; satır içi gizleme yeniden açılışı bozuyordu
    }

    // Test içeriğini ve aramayı tamamen temizle
    let testIcerik = document.getElementById('dcTestIcerik');
    if (testIcerik) testIcerik.innerHTML = "";

    let aramaSonuc = document.getElementById('dcAramaSonuclari');
    if (aramaSonuc) aramaSonuc.style.display = 'none';

    if (typeof dcBottomNavSenkronize === 'function') dcBottomNavSenkronize();
    if (typeof dcDurumuSifirla === 'function') dcDurumuSifirla();
}

        function dcDurumuSifirla() {
            document.querySelectorAll('.dc-screen').forEach(s => s.classList.remove('active'));
            let seviyeEkrani = document.getElementById('dcScreenLevels');
            if (seviyeEkrani) seviyeEkrani.classList.add('active');
            dcGecmis = ['dcScreenLevels'];
            dcAktifSeviye = null;
            dcAktifKategori = null;
            dcAktifKonu = null;
            let geriBtn = document.getElementById('dcBackBtn');
            if (geriBtn) geriBtn.classList.add('hidden');
            let crumb = document.getElementById('dcCrumb');
            if (crumb) crumb.innerText = '';
            let aramaInput = document.getElementById('dcAramaInput');
            if (aramaInput) aramaInput.value = '';
            let aramaSonuc = document.getElementById('dcAramaSonuclari');
            if (aramaSonuc) aramaSonuc.style.display = 'none';
        }



           function aktivitelerTamEkranAc() {
            const gamesTab = document.getElementById('tab-aktiviteler');
            const entering = !gamesTab.classList.contains('active');
            dcTumTamEkranlariKapat();
            gamesTab.classList.add('active');
            if (entering) window.dmGamesUI?.enter();
            dcBottomNavSenkronize();
        }
        function aktivitelerTamEkranKapat() {
            document.getElementById('tab-aktiviteler').classList.remove('active');
            dcBottomNavSenkronize();
        }
        function sanaOzelTamEkranAc() {
            dcTumTamEkranlariKapat();
            document.getElementById('tab-sanaozel').classList.add('active');
            if (typeof gununKonusuYukle === 'function') gununKonusuYukle();
            dcBottomNavSenkronize();
        }
        function sanaOzelTamEkranKapat() {
            document.getElementById('tab-sanaozel').classList.remove('active');
            dcBottomNavSenkronize();
        }

                function dcTumTamEkranlariKapat() {
            document.querySelectorAll('.dc-fullscreen-overlay').forEach(el => el.classList.remove('active'));
        }
        function dcBottomNavSenkronize() {
            let herhangiAcikMi = document.querySelector('.dc-fullscreen-overlay.active') !== null;
            let nav = document.getElementById('bottomNavMobile');
            if (nav) nav.classList.toggle('force-show-desktop', herhangiAcikMi);
        }




        // Not: dock zamanlayıcısı artık girişten hemen sonra (otomatik veya manuel) başlatılıyor.

                 function genelEnerjiKazanimAnimasyonuGoster(miktar, sebep) {
            let wrap = document.createElement('div');
            wrap.className = 'genel-enerji-kazanim-wrap';
            wrap.innerHTML = `
                <div class="gek-battery-row">
                    <div class="gek-battery"><div class="gek-fill"></div></div>
                    <div class="gek-mascot"><img src="papi-reward-v2.png" class="dm-panel-mascot" width="1145" height="1374" alt="Başarını kutlayan Diji-Medu papağanı" loading="lazy" decoding="async"></div>
                    <div class="gek-spark" style="top:10%; right:-6px; --sx:14px; --sy:-14px;">✨</div>
                    <div class="gek-spark" style="top:70%; right:-2px; --sx:10px; --sy:16px; animation-delay:.1s;">⭐</div>
                </div>
                <div class="gek-txt">${sebep} <b>+${miktar} ⚡</b></div>`;
            document.body.appendChild(wrap);
            setTimeout(() => wrap.remove(), 2200);
        }
                    // ========= KONUŞMA PRATİĞİ MODÜLÜ =========
        let kpAktifSinif = 1;
        let kpSecilenUniteler = [];
        let kpSoruListesi = [];
        let kpSoruIndex = 0;
        let kpDogruSayisi = 0;
        let kpYanlisSayisi = 0;
        let kpToplamPuan = 0;
        let kpKombo = 0;
        let kpBaslangicZamani = 0;
        let kpGecenSaniye = 0;
        let kpTimerInterval = null;
        let kpAktifSoru = null;
        let kpTanimaDesteklVar = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
        let kpRecognition = null;
        let kpDinliyorMu = false;

        let kpEnerjiKalan = 0;
        let kpEnerjiMax = 0;
        let kpArkaArkayaDogru = 0;

        let kpEsAnlamMap = {};
        let kpEsAnlamYukleme = null;
        async function kpEsAnlamlariYukle() {
            if (kpEsAnlamYukleme) return kpEsAnlamYukleme;
            kpEsAnlamYukleme = (async () => {
                const res = await fetch(`${apiURL}?islem=konusmaEsAnlamlarGetir`);
                if (!res.ok) throw new Error('Alternatif cevap veritabanı alınamadı');
                const liste = await res.json();
                if (!Array.isArray(liste)) throw new Error('Alternatif cevap verisi geçersiz');
                const next = Object.create(null);
                liste.forEach(item => {
                    const anahtar = kpNormallestir(item.kelime);
                    const altlar = String(item.alternatifler || '').split(/[,;|\n]+/).map(kpNormallestir).filter(Boolean);
                    if (anahtar) next[anahtar] = [...new Set([...(next[anahtar] || []), ...altlar])];
                });
                kpEsAnlamMap = next;
            })().catch(err => { kpEsAnlamYukleme = null; console.warn('Kelime Modu eş anlam verileri:', err); throw err; });
            return kpEsAnlamYukleme;
        }
        const KP_SEVIYE_BOYUTU = 8;
        const KP_SEVIYE_ISIMLERI = ["Sahil Başlangıcı","Mercan Koyu","Yelken Tepesi","Fırtına Burnu","Ada Gizemi","Deniz Feneri","Korsan Koyu","İnci Mağarası","Rüzgar Geçidi","Gün Batımı Limanı","Kayıp Hazine","Dalga Tepesi","Yıldız Adası","Mavi Lagün","Kaptan Köşkü","Gökkuşağı Resifi","Ejder Kayalıkları","Sis Denizi","Altın Kumsal","Okyanus Kalbi","Balina Yolu","Fener Adası","Kristal Koy","Bulut Limanı"];
        function kpSeviyeAdiGetir(index) {
            let taban = KP_SEVIYE_ISIMLERI[index % KP_SEVIYE_ISIMLERI.length];
            let tur = Math.floor(index / KP_SEVIYE_ISIMLERI.length);
            return tur > 0 ? taban + ' ' + (tur+1) : taban;
        }
        let kpTumSeviyeler = [];
        let kpTamamlananSeviyeler = new Set();
        let kpAktifSeviyeNo = null;

        function kpParkurHazirla() {
            let havuz = (window.masterKelimeHavuzu || []).filter(k => (k.ingilizce||k.en) && (k.turkce||k.tr));
            kpTumSeviyeler = [];
            for (let i = 0; i < havuz.length; i += KP_SEVIYE_BOYUTU) {
                let parca = havuz.slice(i, i + KP_SEVIYE_BOYUTU);
                let seviyeNo = kpTumSeviyeler.length + 1;
                kpTumSeviyeler.push({ seviyeNo: seviyeNo, isim: kpSeviyeAdiGetir(seviyeNo - 1), kelimeler: parca });
            }
        }

        async function kpTamamlananSeviyeleriYukle() {
            let isim = siniftaOynananOgrenci || aktifOgrenciAdi;
            kpTamamlananSeviyeler = new Set();
            if (!isim) return;
            try {
                let res = await fetch(`${apiURL}?islem=konusmaSeviyeIlerlemeGetir&ogrenci=${encodeURIComponent(isim)}`);
                let liste = await res.json();
                kpTamamlananSeviyeler = new Set(liste);
            } catch(e) {}
        }

        function kpParkurCiz() {
            let alan = document.getElementById('kpParkurAlani');
            if (!alan) return;
            if (kpTumSeviyeler.length === 0) {
                alan.innerHTML = '<p style="color:#9fdbe6; font-size:12px; text-align:center; padding:20px;">Kelime havuzu henüz yüklenmedi, birkaç saniye sonra tekrar dene.</p>';
                return;
            }
                let stil = `<style>
            #kpParkurKapsayici { position:relative; background:linear-gradient(180deg,#fef6ff 0%,#f3e8ff 55%,#eef3ff 100%); border:2px solid #e9d8ff; border-radius:20px; padding:22px 16px 18px; overflow:hidden; }
            #kpParkurKapsayici .kp-confetti-bg { position:absolute; font-size:16px; opacity:.5; animation:kpConfettiFloat 3.5s ease-in-out infinite; }
            @keyframes kpConfettiFloat { 0%,100%{transform:translateY(0) rotate(0deg);} 50%{transform:translateY(-8px) rotate(8deg);} }
            .kp-step-row { display:flex; align-items:center; gap:12px; margin-bottom:6px; position:relative; z-index:2; }
            .kp-step-row.right { flex-direction:row-reverse; text-align:right; }
            .kp-step-connector { position:absolute; left:27px; top:-6px; width:3px; height:36px; background:repeating-linear-gradient(180deg,#c9a6ff 0 6px, transparent 6px 12px); z-index:0; }
            .kp-step-row.right .kp-step-connector { left:auto; right:27px; }
            .kp-node-outer { width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative; z-index:2; cursor:pointer; }
            .kp-node-outer.locked { cursor:not-allowed; }
            .kp-node-inner { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:16px; color:#fff; box-shadow:0 4px 10px rgba(0,0,0,.15); position:relative; z-index:1; }
            .kp-node-outer.done .kp-node-inner { background:linear-gradient(135deg,#6bcb77,#38a169); }
            .kp-node-outer.active .kp-node-inner { background:#fff8f0; color:#7c3aed; }
            .kp-node-outer.locked .kp-node-inner { background:#e9e3fb; color:#b3a4d9; font-size:14px; }
            .kp-node-outer.active::before { content:''; position:absolute; inset:-4px; border-radius:50%; background:conic-gradient(from 0deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff,#a06bff,#ff6b6b); animation:kpRainbowSpin 5s linear infinite; z-index:0; }
            @keyframes kpRainbowSpin { to{ transform:rotate(360deg); } }
            .kp-node-outer.active::after { content:'🦜'; position:absolute; top:-26px; left:50%; transform:translateX(-50%); font-size:18px; animation:kpMascotBob2 1.4s ease-in-out infinite; z-index:2; }
            @keyframes kpMascotBob2 { 0%,100%{transform:translateX(-50%) translateY(0) rotate(-4deg);} 50%{transform:translateX(-50%) translateY(-6px) rotate(4deg);} }
            .kp-done-check { position:absolute; top:-3px; right:-2px; width:17px; height:17px; background:#38a169; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; color:#fff; border:2px solid #fff; z-index:2; }
            .kp-step-row.right .kp-done-check { right:auto; left:-2px; }
            .kp-step-info { flex:1; }
            .kp-step-num { font-size:9px; font-weight:800; color:#b794f6; text-transform:uppercase; letter-spacing:.4px; }
            .kp-step-name { font-size:12.5px; font-weight:900; color:#553c9a; margin-top:1px; }
            .kp-step-name.locked-txt { color:#b3a4d9; }
            .kp-step-sub { font-size:9.5px; color:#9f7aea; margin-top:1px; }
        
        
        .header-energy-badge { position:relative; }
        .header-energy-bar-fill.enerji-doldu { animation: enerjiDolduPulse .7s ease; }
        @keyframes enerjiDolduPulse { 0%{filter:brightness(1);} 40%{filter:brightness(1.9);} 100%{filter:brightness(1);} }
        .header-energy-bar-fill.enerji-azaldi { animation: enerjiAzaldiShake .4s ease; }
        @keyframes enerjiAzaldiShake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-2px);} 75%{transform:translateX(2px);} }
        .enerji-degisim-ucan { position:absolute; top:-6px; right:2px; font-size:11px; font-weight:900; animation: enerjiDegisimYuz 1s ease-out forwards; pointer-events:none; white-space:nowrap; }
        @keyframes enerjiDegisimYuz { 0%{opacity:0; transform:translateY(0);} 20%{opacity:1;} 100%{opacity:0; transform:translateY(-20px);} }
        
        .genel-enerji-kazanim-wrap { position:fixed; top:40%; left:50%; transform:translate(-50%,-50%); z-index:100000025; text-align:center; pointer-events:none; }
        .gek-battery-row { position:relative; display:inline-block; padding-right:34px; }
        .gek-battery { width:130px; height:60px; border:5px solid #fff; border-radius:10px; position:relative; padding:4px; background:#1e293b; box-shadow:0 14px 34px rgba(0,0,0,.4); }
        .gek-battery::after { content:''; position:absolute; top:50%; right:-11px; transform:translateY(-50%); width:8px; height:24px; background:#fff; border-radius:0 3px 3px 0; z-index:1; }
        .gek-fill { height:100%; border-radius:5px; background:linear-gradient(90deg,#fbbf24,#f59e0b); animation:gekRise 2s ease-out forwards; box-shadow:0 0 16px rgba(245,158,11,.8); }
        @keyframes gekRise { 0%{width:5%;} 60%{width:88%;} 100%{width:88%;} }
        .gek-mascot { position:absolute; top:50%; right:-40px; transform:translateY(-50%) scale(0); font-size:34px; z-index:3; animation:gekMascotPop 2s ease-out forwards; filter:drop-shadow(0 4px 8px rgba(0,0,0,.4)); }
        @keyframes gekMascotPop {
          0%,50% { transform:translateY(-50%) scale(0) rotate(-10deg); opacity:0; }
          62% { transform:translateY(-50%) scale(1.3) rotate(8deg); opacity:1; }
          72% { transform:translateY(-50%) scale(1) rotate(-4deg); }
          85% { transform:translateY(-58%) scale(1.05) rotate(3deg); }
          100% { transform:translateY(-50%) scale(1) rotate(0deg); opacity:1; }
        }
        .gek-spark { position:absolute; font-size:13px; opacity:0; animation:gekSparkPop 2s ease-out forwards; z-index:2; }
        @keyframes gekSparkPop { 0%,55%{opacity:0; transform:translate(0,0) scale(.4);} 65%{opacity:1;} 100%{opacity:0; transform:translate(var(--sx),var(--sy)) scale(1.1);} }
        .gek-txt { margin-top:16px; color:#fbbf24; font-weight:900; font-size:14px; background:rgba(0,0,0,.5); padding:6px 16px; border-radius:14px; display:inline-block; animation:gekTxtFade 2.2s ease-out forwards; }
        @keyframes gekTxtFade { 0%{opacity:0;} 15%{opacity:1;} 85%{opacity:1;} 100%{opacity:0;} }
        
        
        #tab-buyuakademisi .ba-sonuc-ekrani { text-align:center; padding:20px 16px; }
        #tab-buyuakademisi .ba-sonuc-mascot { font-size:70px; margin-bottom:8px; }
        #tab-buyuakademisi .ba-sonuc-title { font-size:22px; font-weight:900; color:#7c3aed; margin-bottom:4px; }
        #tab-buyuakademisi .ba-sonuc-sub { font-size:12px; color:#9f7aea; margin-bottom:18px; }
        #tab-buyuakademisi .ba-sonuc-stats { display:flex; gap:8px; margin-bottom:18px; }
        #tab-buyuakademisi .ba-stat-card { flex:1; border-radius:12px; overflow:hidden; }
        #tab-buyuakademisi .ba-stat-head { font-size:8px; font-weight:900; padding:5px; color:#fff; }
        #tab-buyuakademisi .ba-stat-body { background:#f5f3ff; padding:10px 4px; font-weight:900; font-size:14px; }
        #tab-buyuakademisi .ba-sonuc-btn { width:100%; max-width:280px; padding:13px; border-radius:14px; border:none; font-weight:900; font-size:13px; margin-bottom:18px; background:linear-gradient(135deg,#a06bff,#ff6b9d); color:#fff; cursor:pointer; }
        #tab-buyuakademisi .ba-rank-title { font-size:12px; font-weight:900; text-align:left; margin-bottom:8px; color:#553c9a; max-width:280px; margin-left:auto; margin-right:auto; }
        #tab-buyuakademisi .ba-rank-row { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:10px; margin-bottom:5px; font-size:11px; font-weight:800; max-width:280px; margin-left:auto; margin-right:auto; background:#f5f3ff; color:#553c9a; }
            
            </style>`;
                let html = stil + '<div id="kpParkurKapsayici">';
            html += '<div class="kp-confetti-bg" style="top:8px;right:14px;">🎊</div><div class="kp-confetti-bg" style="top:50px;left:4px;animation-delay:1s;">🎈</div>';kpTumSeviyeler.forEach((sv, idx) => {
                let tamamMi = kpTamamlananSeviyeler.has(sv.seviyeNo);
                let oncekiTamamMi = sv.seviyeNo === 1 || kpTamamlananSeviyeler.has(sv.seviyeNo - 1);
                let durum = tamamMi ? 'done' : (oncekiTamamMi ? 'active' : 'locked');
                let yonSinifi = idx % 2 === 0 ? '' : ' right';
                let connector = idx === 0 ? '' : '<div class="kp-step-connector"></div>';
                let checkHtml = tamamMi ? '<div class="kp-done-check">✓</div>' : '';
                let ikon = tamamMi ? '✓' : (durum === 'locked' ? '🔒' : sv.seviyeNo);
                let tiklamaOzelligi = durum === 'locked' ? '' : `onclick="kpSeviyeBaslat(${sv.seviyeNo})"`;
                let altYazi = tamamMi ? sv.kelimeler.length + ' kelime — Tamamlandı' : (durum === 'active' ? sv.kelimeler.length + ' kelime — Hazır!' : 'Önceki seviyeyi bitir');
                html += `
                <div class="kp-step-row${yonSinifi}">
                    ${connector}
                    <div class="kp-node-outer ${durum}" ${tiklamaOzelligi}>
                        <div class="kp-node-inner">${ikon}</div>
                        ${checkHtml}
                    </div>
                    <div class="kp-step-info">
                        <div class="kp-step-num">Seviye ${sv.seviyeNo}${durum==='active' ? ' · şu an' : ''}</div>
                        <div class="kp-step-name${durum==='locked' ? ' locked-txt' : ''}">${sv.isim}</div>
                        <div class="kp-step-sub">${altYazi}</div>
                    </div>
                </div>`;
            });
            html += '</div>';
            alan.innerHTML = html;
        }

        async function kpModuAc() {
            // Open the real entry panel immediately; word-bank networking must not leave a blank screen.
            dcTumTamEkranlariKapat();
            const page = document.getElementById('tab-konusmapratigi');
            if (!page) return;
            page.classList.add('active');
            dcBottomNavSenkronize();
            const card = document.getElementById('kp-panel-kelime');
            const entry = document.getElementById('kpKelimeGirisEkrani');
            if (card) { card.classList.add('active'); card.style.display = 'block'; }
            if (entry) entry.style.display = 'block';
            try { kpSekmeSec('kelime'); } catch (err) { console.warn('Kelime Modu tab:', err); }
            try { kpKelimeGirisGoster(); } catch (err) { console.warn('Kelime Modu giriş:', err); }
            try { kpEnerjiYukleVeGoster(); } catch (err) { console.warn('Kelime Modu enerji:', err); }
            const load = async () => {
                try {
                    if (!(window.masterKelimeHavuzu || []).length && typeof dijiKelimeHavuzunuYukle === 'function') await dijiKelimeHavuzunuYukle();
                    if (!page.classList.contains('active')) return;
                    if (typeof kpEsAnlamlariYukle === 'function') kpEsAnlamlariYukle();
                    kpParkurHazirla();
                    try { await kpTamamlananSeviyeleriYukle(); } catch (err) { console.warn('Kelime Modu ilerleme:', err); }
                    if (page.classList.contains('active')) kpParkurCiz();
                } catch (err) {
                    console.warn('Kelime Modu veri yüklenemedi:', err);
                    const map = document.getElementById('kpParkurAlani');
                    if (map && page.classList.contains('active')) map.textContent = 'Kelimeler şu anda yüklenemedi. Sayfayı yenileyip tekrar dene.';
                }
            };
            void load();
        }

              const BA_SEVIYE_BOYUTU = 8;
        const BA_SEVIYE_ISIMLERI = ["Başlangıç Büyüleri","Kelime İksirleri","Gizli Formüller","Ejder Dili","Kristal Kehanetler","Unutulmuş Tılsımlar","Ay Işığı Büyüleri","Zümrüt Tomarı","Gökkuşağı Asası","Sonsuzluk Kitabı"];
        const BA_SORU_TIPLERI = ['kristal', 'balon', 'bosluk', 'hafiza', 'yagmur', 'asmaca', 'ses'];

        function baPanelleriGizle() {
            ['baSesPanel','baKristalPanel','baBalonPanel','baBoslukPanel','baHafizaPanel','baYagmurPanel','baAsmacaPanel'].forEach(id => {
                let el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        }
        function genelSesOku(metin) {
            if (!('speechSynthesis' in window) || !metin) return;
            window.speechSynthesis.cancel();
            let u = new SpeechSynthesisUtterance(metin);
            u.lang = 'en-US'; u.rate = 0.9;
            window.speechSynthesis.speak(u);
        }
        function baSonrakiSoruyaGec() {
            document.getElementById('baKristalDevamBtn').style.display = 'none';
            document.getElementById('baBalonDevamBtn').style.display = 'none';
            baSoruIndex++;
            baSoruGoster();
        }
        function baYaziToggle() {
            document.getElementById('baYazRow').classList.toggle('acik');
        }
        function baYazGonder() {
            let deger = document.getElementById('baYazInput').value.trim();
            if (!deger) return;
            baSesCevapKontrolEt(deger);
            document.getElementById('baYazInput').value = '';
        }

        let baTumSeviyeler = [];
        let baGecenSaniye = 0;
        let baBaslangicZamani = 0;
        let baTimerInterval = null;
        let baTamamlananSeviyeler = new Set();
        let baAktifSeviyeNo = null;
        let baSoruListesi = [];
        let baSoruIndex = 0;
        let baDogruSayisi = 0, baYanlisSayisi = 0, baToplamPuan = 0, baKombo = 0;
        let baAktifSoru = null;
        let baAktifSoruYanlisDeneme = 0;
        let baRecognition = null;
        let baDinliyorMu = false;

        function baSeviyeAdiGetir(index) {
            let taban = BA_SEVIYE_ISIMLERI[index % BA_SEVIYE_ISIMLERI.length];
            let tur = Math.floor(index / BA_SEVIYE_ISIMLERI.length);
            return tur > 0 ? taban + ' ' + (tur+1) : taban;
        }

        function baRutbeGetir(tamamlananSayisi) {
            if (tamamlananSayisi >= 9) return { unvan:'👑 Baş Büyücü', sonraki:'En yüksek rütbedesin!' };
            if (tamamlananSayisi >= 6) return { unvan:'🔮 Usta Büyücü', sonraki:'Baş Büyücü için ' + (9 - tamamlananSayisi) + ' seviye kaldı' };
            if (tamamlananSayisi >= 3) return { unvan:'⭐ Kalfa Büyücü', sonraki:'Usta Büyücü için ' + (6 - tamamlananSayisi) + ' seviye kaldı' };
            return { unvan:'🌙 Çırak Büyücü', sonraki:'Kalfa Büyücü için ' + (3 - tamamlananSayisi) + ' seviye kaldı' };
        }

        function baParkurHazirla() {
            let havuz = (window.masterKelimeHavuzu || []).filter(k => (k.ingilizce||k.en) && (k.turkce||k.tr));
            baTumSeviyeler = [];
            for (let i = 0; i < havuz.length; i += BA_SEVIYE_BOYUTU) {
                let parca = havuz.slice(i, i + BA_SEVIYE_BOYUTU);
                let seviyeNo = baTumSeviyeler.length + 1;
                baTumSeviyeler.push({ seviyeNo: seviyeNo, isim: baSeviyeAdiGetir(seviyeNo - 1), kelimeler: parca });
            }
        }

        async function baTamamlananSeviyeleriYukle() {
            let isim = oyunIcinAktifIsim();
            baTamamlananSeviyeler = new Set();
            if (!isim) return;
            try {
                let res = await fetch(`${apiURL}?islem=buyuSeviyeIlerlemeGetir&ogrenci=${encodeURIComponent(isim)}`);
                let liste = await res.json();
                baTamamlananSeviyeler = new Set(liste);
            } catch(e) {}
        }

        function baEnerjiSatiriGuncelle() {
            let satir = document.getElementById('baEnerjiSatiri');
            if (!satir) return;
            let kalan = window.genelEnerjiKalan !== undefined ? window.genelEnerjiKalan : '--';
            let max = window.genelEnerjiMax !== undefined ? window.genelEnerjiMax : '--';
            satir.innerText = `${kalan}/${max}`;
            let streakEl = document.getElementById('baStreakGoster');
            let puanEl = document.getElementById('baPuanGoster');
            if (streakEl) { let h = document.getElementById('headerStreakNum'); if (h) streakEl.innerText = h.innerText.replace('🔥','').trim(); }
            if (puanEl) { let g = document.getElementById('valGenelPuan'); if (g) puanEl.innerText = g.innerText; }
        }

        const BA_PORTRE_IKONLAR = ['🦜','🐢','🐠','🦈','🐙','🦑','🐬','🦭','🪼','🐚'];
        function baParkurCiz() {
            let alan = document.getElementById('baParkurAlani');
            let rutbeAlani = document.getElementById('baRutbeAlani');
            let uniteBaslik = document.getElementById('baUniteBaslik');
            let ilerlemeGoster = document.getElementById('baIlerlemeGoster');
            if (!alan) return;
            let r = baRutbeGetir(baTamamlananSeviyeler.size);
            if (rutbeAlani) rutbeAlani.innerText = r.unvan;
            if (ilerlemeGoster) ilerlemeGoster.innerText = baTamamlananSeviyeler.size + ' / ' + baTumSeviyeler.length + ' seviye';
            if (baTumSeviyeler.length === 0) {
                alan.innerHTML = '<p style="color:#5c7980; font-size:12px; text-align:center; padding:20px;">Kelime havuzu henüz yüklenmedi, birkaç saniye sonra tekrar dene.</p>';
                return;
            }
            let aktifSeviye = baTumSeviyeler.find(s => !baTamamlananSeviyeler.has(s.seviyeNo) && (s.seviyeNo === 1 || baTamamlananSeviyeler.has(s.seviyeNo - 1)));
            if (uniteBaslik) uniteBaslik.innerText = aktifSeviye ? aktifSeviye.isim : 'Tüm Büyüler Tamamlandı!';

            let noktaYol = '<svg class="ba-dots-svg" viewBox="0 0 300 ' + (baTumSeviyeler.length * 100) + '"><path d="';
            baTumSeviyeler.forEach((sv, idx) => {
                let x = idx % 2 === 0 ? 70 : 230;
                let y = idx * 100 + 40;
                noktaYol += (idx === 0 ? 'M' : 'Q ' + (x < 150 ? 200 : 100) + ',' + (y - 50) + ' ') + x + ',' + y + ' ';
            });
            noktaYol += '" stroke="#7dd3fc" stroke-width="3" stroke-dasharray="1 10" stroke-linecap="round" fill="none"/></svg>';

            let html = noktaYol;
            baTumSeviyeler.forEach((sv, idx) => {
                let tamamMi = baTamamlananSeviyeler.has(sv.seviyeNo);
                let oncekiTamamMi = sv.seviyeNo === 1 || baTamamlananSeviyeler.has(sv.seviyeNo - 1);
                let durum = tamamMi ? 'done' : (oncekiTamamMi ? 'active' : 'locked');
                let yonSinifi = idx % 2 === 0 ? 'left' : 'right';
                let portreIkon = BA_PORTRE_IKONLAR[idx % BA_PORTRE_IKONLAR.length];
                let ikonGoster = durum === 'locked' ? portreIkon : (tamamMi ? '✓' : '🧙');
                let yildizlar = tamamMi ? '⭐⭐⭐' : (durum === 'active' ? '<span style="color:#ec8636; font-weight:900; font-size:10px;">HAZIR!</span>' : '☆☆☆');
                let kilitRozeti = durum === 'locked' ? '<div class="ba-lock-badge">🔒</div>' : '';
                let tiklamaOzelligi = durum === 'locked' ? '' : `onclick="baSeviyeBaslat(${sv.seviyeNo})"`;
                html += `
                <div class="ba-node-block ${yonSinifi}" ${tiklamaOzelligi}>
                    <div class="ba-portrait ${durum}">${ikonGoster}${kilitRozeti}</div>
                    <div class="ba-stars">${yildizlar}</div>
                    <div class="ba-node-name${durum==='locked' ? ' locked-t' : ''}">${sv.isim}</div>
                </div>`;
            });
            alan.innerHTML = `<div class="ba-path-wrap" style="min-height:${baTumSeviyeler.length * 100}px;">${html}</div>`;
        }

        async function baModuAc() {
            dcTumTamEkranlariKapat();
            document.getElementById('tab-buyuakademisi').classList.add('active');
            dcBottomNavSenkronize();
            baGirisGoster();
            baEnerjiSatiriGuncelle();
            baParkurHazirla();
            await baTamamlananSeviyeleriYukle();
            baParkurCiz();
        }
        function baModuKapat() {
            baDinlemeyiDurdur();
            document.getElementById('tab-buyuakademisi').classList.remove('active');
            dcBottomNavSenkronize();
        }
        function baGirisGoster() {
            document.getElementById('baGirisEkrani').style.display = 'block';
            document.getElementById('baOyunEkrani').style.display = 'none';
            let isimInput = document.getElementById('baIsimInput');
            if (isimInput) {
                if (siniftaOynananOgrenci) { isimInput.value = siniftaOynananOgrenci; isimInput.disabled = true; }
                else if (aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== "teacher") { isimInput.value = aktifOgrenciAdi; isimInput.disabled = false; }
                else { isimInput.value = ""; isimInput.disabled = false; }
            }
            baParkurCiz();
        }

        function baSeviyeBaslat(seviyeNo) {
            if (genelOyunGirisEngelliMi()) return;
            let isim = document.getElementById('baIsimInput').value.trim();
            if (!isim) { alert("Lütfen adınızı giriniz!"); return; }
            let seviye = baTumSeviyeler.find(s => s.seviyeNo === seviyeNo);
            if (!seviye || seviye.kelimeler.length === 0) { alert("Bu seviyede kelime bulunamadı."); return; }

           genelEnerjiHarca(-1);
            baAktifSeviyeNo = seviyeNo;
            baDogruSayisi = 0; baYanlisSayisi = 0; baToplamPuan = 0; baKombo = 0; baSoruIndex = 0;
                baBaslangicZamani = Date.now();
        baGecenSaniye = 0;
        if (baTimerInterval) clearInterval(baTimerInterval);
        baTimerInterval = setInterval(() => { baGecenSaniye = Math.floor((Date.now()-baBaslangicZamani)/1000); }, 1000);

            let tipler = [];
            for (let i = 0; i < seviye.kelimeler.length; i++) tipler.push(BA_SORU_TIPLERI[i % BA_SORU_TIPLERI.length]);
            tipler = tipler.sort(() => Math.random() - 0.5);
            baSoruListesi = seviye.kelimeler.map((k, i) => ({ kelime: k, tip: tipler[i] }));

            document.getElementById('baGirisEkrani').style.display = 'none';
            document.getElementById('baOyunEkrani').style.display = 'flex';
                jokerTuruBaslat('ba', 'baOyunEkrani');
            baSoruGoster();
        }

        function baSoruGoster() {
            if (baSoruIndex >= baSoruListesi.length) { baSeviyeBitir(false); return; }
            if (window.genelEnerjiKalan !== undefined && window.genelEnerjiKalan <= 0) { genelEnerjiBittiGoster(); baSeviyeBitir(true); return; }
            baAktifSoruYanlisDeneme = 0;
            let soru = baSoruListesi[baSoruIndex];
            baAktifSoru = soru;
                    jokerSoruTemizle(); jokerBarCiz();
            document.getElementById('baProgressFill').style.width = Math.round((baSoruIndex / baSoruListesi.length) * 100) + '%';
            document.getElementById('baKomboText').innerText = 'KOMBO x' + baKombo;
            baPanelleriGizle();
            if (soru.tip === 'ses') baSesBuyusuGoster(soru.kelime);
            else if (soru.tip === 'kristal') baKristalKuresiGoster(soru.kelime);
            else if (soru.tip === 'balon') baBalonGoster(soru.kelime);
            else if (soru.tip === 'bosluk') baBoslukGoster(soru.kelime);
            else if (soru.tip === 'hafiza') baHafizaGoster(soru.kelime);
            else if (soru.tip === 'yagmur') baYagmurGoster(soru.kelime);
            else if (soru.tip === 'asmaca') baAsmacaGoster(soru.kelime);
        }
        function baDogruIsle() {
            window.DijiMeduPapiFeedback?.correct({duration:850});
            genelSesEfektiCal('dogru');
            baDogruSayisi++;
            let kazanc = 10 + baKombo * 3;
            baToplamPuan += kazanc;
            baKombo++;
            genelKomboGoster(baKombo, document.getElementById('baOyunEkrani'));
            document.getElementById('baKomboText').innerText = 'KOMBO x' + baKombo;
        }
        function baYanlisIsle() {
            genelSesEfektiCal('yanlis');
            baYanlisSayisi++;
            baKombo = 0;
            document.getElementById('baKomboText').innerText = 'KOMBO x' + baKombo;
        }

        /* ===== SES BÜYÜSÜ ===== */
        function baSesBuyusuGoster(k) {
            document.getElementById('baSesPanel').style.display = 'block';
            document.getElementById('baKristalPanel').style.display = 'none';
            document.getElementById('baSesKelime').innerText = k.turkce || k.tr;
            document.getElementById('baSesSonuc').innerHTML = '';
            document.getElementById('baSesSonuc').className = 'ba-sonuc';
            baMikSifirla();
        }
        function baMikSifirla() {
            let btn = document.getElementById('baMikBtn');
            if (!btn) return;
            btn.classList.remove('dinliyor');
            btn.innerHTML = '🎤 Konuş';
        }
        function baDinlemeyiBaslat() {
            if (!kpTanimaDesteklVar) { alert("Tarayıcın konuşma tanımayı desteklemiyor."); return; }
            if (baDinliyorMu) { baDinlemeyiDurdur(); return; }
            let SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            baRecognition = new SR();
            baRecognition.lang = 'en-US';
            baRecognition.continuous = true;
            baRecognition.interimResults = false;
            baRecognition.maxAlternatives = 3;
            baDinliyorMu = true;
            let btn = document.getElementById('baMikBtn');
            btn.classList.add('dinliyor');
            btn.innerHTML = '🔴 Dinleniyor';
            baRecognition.onresult = function(event) {
                let son = event.results[event.results.length - 1];
                let sonuclar = [];
                for (let i = 0; i < son.length; i++) sonuclar.push(son[i].transcript);
                baSesCevapKontrolEt(sonuclar.join(' | '));
            };
            baRecognition.onerror = function(ev) { if (ev.error === 'no-speech' || ev.error === 'aborted') return; };
            baRecognition.onend = function() { if (baDinliyorMu) { try { baRecognition.start(); } catch(e) {} } };
            baRecognition.start();
        }
        function baDinlemeyiDurdur() {
            baDinliyorMu = false;
            if (baRecognition) { try { baRecognition.stop(); } catch(e) {} }
            baMikSifirla();
        }
        function baSesCevapKontrolEt(soylenenMetin) {
            let adaylar = soylenenMetin.split('|').map(s => kpNormallestir(s));
            let dogruCevapRaw = baAktifSoru.kelime.ingilizce || baAktifSoru.kelime.en;
            let dogruCevap = kpNormallestir(dogruCevapRaw);
            let altlar = kpEsAnlamMap[dogruCevap] || [];
                let dogruMu = adaylar.some(a => genelSesEslesiyorMu(a, dogruCevap, altlar));
            let sonucEl = document.getElementById('baSesSonuc');
            if (dogruMu) {
                sonucEl.className = 'ba-sonuc ok';
                sonucEl.innerHTML = '🎉 Doğru büyü!';
                baDogruIsle();
                setTimeout(() => { baDinlemeyiDurdur(); baSoruIndex++; baSoruGoster(); }, 1400);
            } else {
                baAktifSoruYanlisDeneme++;
                if (baAktifSoruYanlisDeneme < 3) {
                    sonucEl.className = 'ba-sonuc hata';
                    sonucEl.innerHTML = '😕 Tekrar dene! (' + baAktifSoruYanlisDeneme + '/3)';
                    return;
                }
                sonucEl.className = 'ba-sonuc hata';
                sonucEl.innerHTML = '😕 Doğrusu: "' + dogruCevapRaw + '"';
                baYanlisIsle();
                setTimeout(() => { baDinlemeyiDurdur(); baSoruIndex++; baSoruGoster(); }, 1700);
            }
        }

        /* ===== KRİSTAL KÜRE KEHANETİ ===== */
        function baKristalKuresiGoster(k) {
            document.getElementById('baKristalPanel').style.display = 'block';
            let ingilizceMi = Math.random() > 0.5;
            let soruMetin, yonEtiket, dogruCevap;
            if (ingilizceMi) {
                soruMetin = k.ingilizce || k.en;
                yonEtiket = '🔮 Bu kelimenin Türkçesi nedir?';
                dogruCevap = k.turkce || k.tr;
            } else {
                soruMetin = k.turkce || k.tr;
                yonEtiket = '🔮 Bu kelimenin İngilizcesi nedir?';
                dogruCevap = k.ingilizce || k.en;
            }
            baAktifSoru._ingilizceMi = !ingilizceMi;
            document.getElementById('baKristalYon').innerText = yonEtiket;
            document.getElementById('baKristalKelime').innerText = soruMetin;
            let havuz = window.masterKelimeHavuzu || [];
            let yanlisAday = havuz.filter(x => (ingilizceMi ? (x.turkce||x.tr) !== dogruCevap : (x.ingilizce||x.en) !== dogruCevap));
            let yanlislar = [...yanlisAday].sort(() => Math.random() - 0.5).slice(0, 3).map(x => ingilizceMi ? (x.turkce||x.tr) : (x.ingilizce||x.en));
            while (yanlislar.length < 3) yanlislar.push('---');
            let secenekler = [dogruCevap, ...yanlislar].sort(() => Math.random() - 0.5);
            baAktifSoru._dogruCevap = dogruCevap;
            baAktifSoru._dogruIndex = secenekler.indexOf(dogruCevap);
            document.getElementById('baKristalDevamBtn').style.display = 'none';
            for (let i = 0; i < 4; i++) {
                let btn = document.getElementById('baKSik' + i);
                btn.innerText = secenekler[i];
                btn.disabled = false;
                btn.style.background = '#fff8f0';
                btn.style.color = '#3b0764';
            }
        }
        function baKristalCevapVer(secilenIndex) {
            let dogruIdx = baAktifSoru._dogruIndex;
            for (let x = 0; x < 4; x++) document.getElementById('baKSik' + x).disabled = true;
            if (secilenIndex === dogruIdx) {
                document.getElementById('baKSik' + secilenIndex).style.background = '#38a169';
                document.getElementById('baKSik' + secilenIndex).style.color = '#fff';
                if (baAktifSoru._ingilizceMi) genelSesOku(baAktifSoru._dogruCevap);
                baDogruIsle();
                setTimeout(() => baSonrakiSoruyaGec(), 1300);
            } else {
                document.getElementById('baKSik' + secilenIndex).style.background = '#e53e3e';
                document.getElementById('baKSik' + secilenIndex).style.color = '#fff';
                document.getElementById('baKSik' + dogruIdx).style.background = '#38a169';
                document.getElementById('baKSik' + dogruIdx).style.color = '#fff';
                if (baAktifSoru._ingilizceMi) genelSesOku(baAktifSoru._dogruCevap);
                baYanlisIsle();
                document.getElementById('baKristalDevamBtn').style.display = 'block';
            }
        }

        /* ===== BALON PATLATMA ===== */
        function baBalonGoster(k) {
            document.getElementById('baBalonPanel').style.display = 'block';
            let ingilizceMi = Math.random() > 0.5;
            let soruMetin, dogruCevap;
            if (ingilizceMi) { soruMetin = k.ingilizce||k.en; dogruCevap = k.turkce||k.tr; }
            else { soruMetin = k.turkce||k.tr; dogruCevap = k.ingilizce||k.en; }
            document.getElementById('baBalonKelime').innerText = soruMetin;
            baAktifSoru._ingilizceMi = !ingilizceMi;
            let havuz = window.masterKelimeHavuzu||[];
            let yanlisAday = havuz.filter(x => (ingilizceMi ? (x.turkce||x.tr) : (x.ingilizce||x.en)) !== dogruCevap);
            let yanlislar = [...yanlisAday].sort(()=>Math.random()-0.5).slice(0,3).map(x => ingilizceMi ? (x.turkce||x.tr) : (x.ingilizce||x.en));
            while (yanlislar.length<3) yanlislar.push('---');
            let secenekler = [dogruCevap, ...yanlislar].sort(()=>Math.random()-0.5);
            baAktifSoru._dogruCevap = dogruCevap;
            baAktifSoru._dogruIndex = secenekler.indexOf(dogruCevap);
            document.getElementById('baBalonDevamBtn').style.display = 'none';
            for (let i=0;i<4;i++) {
                let btn = document.getElementById('baBalon'+i);
                btn.innerText = secenekler[i];
                btn.disabled = false;
                btn.className = 'ba-balon-btn';
            }
        }
        function baBalonCevapVer(secilenIndex) {
            let dogruIdx = baAktifSoru._dogruIndex;
            for (let x=0;x<4;x++) document.getElementById('baBalon'+x).disabled = true;
            if (secilenIndex === dogruIdx) {
                document.getElementById('baBalon'+secilenIndex).classList.add('patladi');
                if (baAktifSoru._ingilizceMi) genelSesOku(baAktifSoru._dogruCevap);
                baDogruIsle();
                setTimeout(() => baSonrakiSoruyaGec(), 1300);
            } else {
                document.getElementById('baBalon'+secilenIndex).classList.add('sondu');
                document.getElementById('baBalon'+dogruIdx).classList.add('patladi');
                if (baAktifSoru._ingilizceMi) genelSesOku(baAktifSoru._dogruCevap);
                baYanlisIsle();
                document.getElementById('baBalonDevamBtn').style.display = 'block';
            }
        }

        /* ===== FORMÜL TAMAMLAMA (Eksik Harf) ===== */
        function baBoslukGoster(k) {
            document.getElementById('baBoslukPanel').style.display = 'block';
            let en = (k.ingilizce || k.en || '').toUpperCase();
              let harfIdx = [];
            for (let i = 0; i < en.length; i++) if (/[A-Z]/.test(en[i])) harfIdx.push(i);
            harfIdx.sort(() => Math.random() - 0.5);
            let gizliIdx = harfIdx.slice(0, harfIdx.length >= 5 ? 2 : 1);
            baAktifSoru._enKelime = en;
            document.getElementById('baBoslukIpucu').innerText = '💡 ' + (k.turkce || k.tr);
            let alan = document.getElementById('baBoslukHarfler');
            alan.innerHTML = '';
            for (let i=0;i<en.length;i++) {
                if (gizliIdx.includes(i)) {
                    let inp = document.createElement('input');
                    inp.maxLength = 1; inp.className = 'ba-bosluk-input'; inp.dataset.dogru = en[i];
                    alan.appendChild(inp);
                } else {
                    let span = document.createElement('span');
                    span.className = 'ba-bosluk-sabit'; span.innerText = en[i];
                    alan.appendChild(span);
                }
            }
        }
        function baBoslukKontrolEt() {
            let inputs = document.querySelectorAll('#baBoslukHarfler .ba-bosluk-input');
            let hepsiDogru = true;
            inputs.forEach(inp => {
                let girilen = inp.value.trim().toUpperCase();
                if (girilen === inp.dataset.dogru) { inp.style.background = '#dcfce7'; inp.style.borderColor = '#22c55e'; }
                else { hepsiDogru = false; inp.style.background = '#fee2e2'; inp.style.borderColor = '#ef4444'; inp.value = inp.dataset.dogru; }
                inp.disabled = true;
            });
            if (hepsiDogru) baDogruIsle(); else baYanlisIsle();
            setTimeout(() => { baSoruIndex++; baSoruGoster(); }, 1300);
        }

        /* ===== İKİZ AYNA BÜYÜSÜ (Hafıza) ===== */



        /* ===== YILDIZ TOZU YAĞMURU ===== */
        let baYagmurTimer = null;
        function baYagmurGoster(k) {
            document.getElementById('baYagmurPanel').style.display = 'block';
            let dogru = k.turkce || k.tr;
            document.getElementById('baYagmurKelime').innerText = k.ingilizce || k.en;
            let havuz = window.masterKelimeHavuzu || [];
            let yanlislar = [...havuz].filter(x => (x.turkce||x.tr) !== dogru).sort(() => Math.random()-0.5).slice(0,3).map(x => x.turkce||x.tr);
            while (yanlislar.length < 3) yanlislar.push('---');
            let secenekler = [dogru, ...yanlislar].sort(() => Math.random()-0.5);
            baAktifSoru._dogruCevap = dogru;
            let alan = document.getElementById('baYagmurSecenekler');
            alan.innerHTML = '';
            secenekler.forEach(sec => {
                let btn = document.createElement('button');
                btn.className = 'ba-sik-btn'; btn.innerText = sec;
                btn.onclick = () => baYagmurCevapVer(sec === dogru, btn);
                alan.appendChild(btn);
            });
            let dusenEl = document.getElementById('baYagmurDusen');
            dusenEl.style.top = '0%';
            if (baYagmurTimer) clearInterval(baYagmurTimer);
            let pos = 0;
            baYagmurTimer = setInterval(() => {
                pos += 1.2;
                dusenEl.style.top = pos + '%';
                if (pos >= 85) {
                    clearInterval(baYagmurTimer);
                    document.querySelectorAll('#baYagmurSecenekler .ba-sik-btn').forEach(b => b.disabled = true);
                    baYanlisIsle();
                    setTimeout(() => { baSoruIndex++; baSoruGoster(); }, 900);
                }
            }, 60);
        }
        function baYagmurCevapVer(dogruMu, btnEl) {
            if (baYagmurTimer) clearInterval(baYagmurTimer);
            document.querySelectorAll('#baYagmurSecenekler .ba-sik-btn').forEach(b => b.disabled = true);
            if (dogruMu) { btnEl.style.background = '#38a169'; btnEl.style.color = '#fff'; baDogruIsle(); }
            else { btnEl.style.background = '#e53e3e'; btnEl.style.color = '#fff'; baYanlisIsle(); }
            setTimeout(() => { baSoruIndex++; baSoruGoster(); }, 1000);
        }

        /* ===== KAYIP HARFLER LANETİ (Harf Avı) ===== */
        let baAsmacaYanlis = 0, baAsmacaTahmin = [];
        function baAsmacaGoster(k) {
            document.getElementById('baAsmacaPanel').style.display = 'block';
            let en = (k.ingilizce || k.en || '').toUpperCase();
            baAktifSoru._enKelime = en;
            baAsmacaYanlis = 0; baAsmacaTahmin = [];
            document.getElementById('baAsmacaIpucu').innerText = '💡 ' + (k.turkce || k.tr);
            baAsmacaCiz();
            let klavye = document.getElementById('baAsmacaKlavye');
            klavye.innerHTML = '';
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(harf => {
                let btn = document.createElement('button');
                btn.className = 'ba-harf-btn'; btn.innerText = harf;
                btn.onclick = () => baAsmacaHarfSec(harf, btn);
                klavye.appendChild(btn);
            });
        }
        function baAsmacaCiz() {
            let en = baAktifSoru._enKelime;
            document.getElementById('baAsmacaBlank').innerText = en.split('').map(ch => (!/[A-Z]/.test(ch) || baAsmacaTahmin.includes(ch)) ? ch : '_').join(' ');
            document.getElementById('baAsmacaCan').innerText = '❤️'.repeat(4-baAsmacaYanlis) + '🖤'.repeat(baAsmacaYanlis);
        }
        function baAsmacaHarfSec(harf, btn) {
            btn.disabled = true;
            let en = baAktifSoru._enKelime;
            if (en.includes(harf)) {
                baAsmacaTahmin.push(harf);
                baAsmacaCiz();
                        if (en.split('').filter(ch => /[A-Z]/.test(ch)).every(ch => baAsmacaTahmin.includes(ch))) {
                    baDogruIsle();
                    setTimeout(() => { baSoruIndex++; baSoruGoster(); }, 1200);
                }
            } else {
                baAsmacaYanlis++;
                baAsmacaCiz();
                if (baAsmacaYanlis >= 4) {
                    baYanlisIsle();
                    document.getElementById('baAsmacaIpucu').innerText = '❌ Doğrusu: ' + en;
                    setTimeout(() => { baSoruIndex++; baSoruGoster(); }, 1500);
                }
            }
        }

        /* ===== SEVİYE BİTİŞİ ===== */
        async function baSeviyeBitir(enerjiBittiMi) {
                if (baTimerInterval) clearInterval(baTimerInterval);
            baDinlemeyiDurdur();
            document.getElementById('baOyunEkrani').style.display = 'none';
            let isim = document.getElementById('baIsimInput').value.trim();
            let seviyeAdi = baSeviyeAdiGetir(baAktifSeviyeNo - 1);
            let basariliMi = !enerjiBittiMi && baDogruSayisi >= Math.ceil(baSoruListesi.length * 0.6);
            if (!enerjiBittiMi && baYanlisSayisi === 0 && baDogruSayisi === baSoruListesi.length) {
                genelEnerjiHarca(1);
                genelEnerjiKazanimAnimasyonuGoster(1, '🏆 Mükemmel seviye bonusu!');
            }

            if (basariliMi && !baTamamlananSeviyeler.has(baAktifSeviyeNo)) {
                baTamamlananSeviyeler.add(baAktifSeviyeNo);
                fetch(apiURL, { method:"POST", body: JSON.stringify({ islem:"buyuSeviyeTamamla", ogrenci: isim, seviyeNo: baAktifSeviyeNo }) }).catch(()=>{});
            }

               document.getElementById('baLevelupBaslik').innerText = enerjiBittiMi ? 'Enerjin Bitti!' : (basariliMi ? 'Büyü Tamamlandı!' : 'Neredeyse Oldu!');
            document.getElementById('baLevelupSub').innerText = enerjiBittiMi ? 'Yarın devam edebilirsin' : ('"' + seviyeAdi + '" seviyesini ' + (basariliMi ? 'bitirdin' : 'tamamlayamadın'));
            let sonrakiSeviye = baTumSeviyeler.find(s => s.seviyeNo === baAktifSeviyeNo + 1);
            let badgeMetin = basariliMi
                ? (sonrakiSeviye ? ('🔓 Yeni büyü açıldı: ' + sonrakiSeviye.isim) : '👑 Tüm büyüleri tamamladın!')
                : ('✅ ' + baDogruSayisi + ' / ' + baSoruListesi.length + ' doğru — en az %60 gerekiyor');
            document.getElementById('baLevelupBadge').innerText = badgeMetin;
            document.getElementById('baLevelupOverlay').style.display = 'flex';

              let sureStr = Math.floor((baGecenSaniye||0)/60) + ':' + String((baGecenSaniye||0)%60).padStart(2,'0');
            let buyuSinif = 'Büyü ' + baAktifSeviyeNo;
            let buSeviyeNo = baAktifSeviyeNo;

            genelSonucEkraniGoster({
                oyunAdi: '🧙 ' + seviyeAdi,
                baslik: enerjiBittiMi ? 'Enerjin bitti!' : (basariliMi ? 'Süpersin!' : 'Neredeyse oldu!'),
                isim: isim, puan: baToplamPuan, dogru: baDogruSayisi, yanlis: baYanlisSayisi, sureSaniye: baGecenSaniye || 0,
                devamFn: baLevelupKapat,
                tekrarFn: function() { baLevelupKapat(); baSeviyeBaslat(buSeviyeNo); }
            });

            try {
                await fetch(apiURL, { method:"POST", body: JSON.stringify({ islem:"konusmaLiderlikKaydet", tarih:new Date().toISOString().split('T')[0], isim:isim, sinif:buyuSinif, unite:seviyeAdi, dogru:baDogruSayisi, yanlis:baYanlisSayisi, sure:sureStr, suresaniye:baGecenSaniye||0, puan:baToplamPuan }) });
                let liderlikRes = await fetch(`${apiURL}?islem=konusmaLiderlikTumunuGetir&sinif=${encodeURIComponent(buyuSinif)}`);
                let liste = await liderlikRes.json();
                genelSonucSiralamaCiz(liste, isim);
            } catch(e) {
                genelSonucSiralamaCiz([], isim);
            }
        }



        function baLevelupKapat() {
            document.getElementById('baLevelupOverlay').style.display = 'none';
            document.getElementById('baSonucEkrani').style.display = 'none';
            baEnerjiSatiriGuncelle();
            baGirisGoster();
        }      

        async function kpEnerjiYukleVeGoster() {
            let isim = siniftaOynananOgrenci || aktifOgrenciAdi;
            if (!isim) return;
            try {
                let res = await fetch(`${apiURL}?islem=enerjiDurumuGetir&ogrenci=${encodeURIComponent(isim)}`);
                let d = await res.json();
                kpEnerjiKalan = d.enerjiKalan;
                kpEnerjiMax = d.enerjiMax;
                headerEnerjiGoster(kpEnerjiKalan, kpEnerjiMax);
            } catch(e) {}
            kpEnerjiSatiriniGuncelle();
        }
        function kpEnerjiSatiriniGuncelle() {
            let satir = document.getElementById('kpEnerjiSatiri');
            if (!satir) return;
            satir.innerText = `⚡ Enerji: ${kpEnerjiKalan}/${kpEnerjiMax}`;
            let baslatBtn = document.querySelector('#kpKelimeGirisEkrani .kp-start-btn');
            if (baslatBtn) {
                if (kpEnerjiKalan <= 0) {
                    baslatBtn.disabled = true;
                    baslatBtn.style.opacity = '.5';
                    baslatBtn.innerText = '⚡ Enerjin bitti, yarın tekrar gel!';
                } else {
                    baslatBtn.disabled = false;
                    baslatBtn.style.opacity = '1';
                    baslatBtn.innerText = '🎤 Pratiğe Başla';
                }
            }
        }
        async function kpEnerjiDegistir(fark) {
            let isim = siniftaOynananOgrenci || aktifOgrenciAdi;
            kpEnerjiKalan = Math.max(0, Math.min(kpEnerjiMax, kpEnerjiKalan + fark));
            kpEnerjiSatiriniGuncelle();
            headerEnerjiGoster(kpEnerjiKalan, kpEnerjiMax);
            try {
                let res = await fetch(apiURL, { method:"POST", body: JSON.stringify({ islem:"enerjiDegistir", ogrenci: isim, fark: fark }) });
                let d = await res.json();
                kpEnerjiKalan = d.enerjiKalan; kpEnerjiMax = d.enerjiMax;
                kpEnerjiSatiriniGuncelle();
                headerEnerjiGoster(kpEnerjiKalan, kpEnerjiMax);
            } catch(e) {}
        }
        function kpModuKapat() {
            kpDinlemeyiDurdur();
            if (kpTimerInterval) clearInterval(kpTimerInterval);
            document.getElementById('tab-konusmapratigi').classList.remove('active');
            dcBottomNavSenkronize();
        }
        function kpSekmeSec(tab, btn) {
            document.querySelectorAll('#tab-konusmapratigi .kp-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#tab-konusmapratigi .kp-panel').forEach(p => p.classList.remove('active'));
            if (btn) btn.classList.add('active');
            else document.querySelector('#tab-konusmapratigi .kp-tab-btn[data-tab="'+tab+'"]').classList.add('active');
            document.getElementById('kp-panel-' + tab).classList.add('active');
        }

        function kpKelimeGirisGoster() {
            document.getElementById('kpKelimeGirisEkrani').style.display = 'block';
            document.getElementById('kpKelimeOyunEkrani').style.display = 'none';
            document.getElementById('kpKelimeBitisEkrani').style.display = 'none';
            let isimInput = document.getElementById('kpIsimInput');
            if (isimInput) {
                if (siniftaOynananOgrenci) { isimInput.value = siniftaOynananOgrenci; isimInput.disabled = true; }
                else if (aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== "teacher") { isimInput.value = aktifOgrenciAdi; isimInput.disabled = false; }
                else { isimInput.value = ""; isimInput.disabled = false; }
            }
            document.getElementById('kpMikUyari').style.display = kpTanimaDesteklVar ? 'none' : 'block';
            kpParkurCiz();
        }

        async function kpSeviyeBaslat(seviyeNo) {
            if (genelOyunGirisEngelliMi()) return;
            try { await kpEsAnlamlariYukle(); } catch (err) { console.warn('Kelime Modu alternatifleri eksik; normal cevaplarla devam ediliyor', err); }
            let isim = document.getElementById('kpIsimInput').value.trim();
            if (!isim) { alert("Lütfen adınızı giriniz!"); return; }

            let seviye = kpTumSeviyeler.find(s => s.seviyeNo === seviyeNo);
            if (!seviye || seviye.kelimeler.length === 0) { alert("Bu seviyede kelime bulunamadı."); return; }

            kpAktifSeviyeNo = seviyeNo;
            kpArkaArkayaDogru = 0;
            kpSoruListesi = [...seviye.kelimeler];window.dmVerifiedGames?.deck('kp',kpSoruListesi);

            kpSoruIndex = 0; kpDogruSayisi = 0; kpYanlisSayisi = 0; kpToplamPuan = 0; kpKombo = 0;
            kpBaslangicZamani = Date.now(); kpGecenSaniye = 0; OC.basla('kp');

            document.getElementById('kpKelimeGirisEkrani').style.display = 'none';
            document.getElementById('kpKelimeOyunEkrani').style.display = 'flex';
                jokerTuruBaslat('kp', 'kpKelimeOyunEkrani');

            if (kpTimerInterval) clearInterval(kpTimerInterval);
            kpTimerInterval = setInterval(() => { kpGecenSaniye = Math.floor((Date.now()-kpBaslangicZamani)/1000); }, 1000);

            kpSoruGoster();
        }

                    function baLevelupOverlayKapat() {
            document.getElementById('baLevelupOverlay').style.display = 'none';
        }

        let kpAktifSoruYanlisDeneme = 0;
        function kpSoruGoster() {
            if (kpSoruIndex >= kpSoruListesi.length) { kpKelimeOyunuBitir(); return; }
            if (kpEnerjiKalan <= 0) { genelEnerjiBittiGoster(); kpKelimeOyunuBitir(true); return; }
            kpAktifSoruYanlisDeneme = 0;
                let soru = kpSoruListesi[kpSoruIndex];
            let turkceDeger = soru.turkce || soru.tr || soru.Turkce || soru.TR || soru.anlam || '';
            let ingilizceDeger = soru.ingilizce || soru.en || soru.Ingilizce || soru.EN || '';
            kpAktifSoru = {
                gosterilen: turkceDeger,
                beklenenCevap: ingilizceDeger,
                dil: 'en-US'
            };

            document.getElementById('kpSoruYon').innerText = "Kelimenin İngilizcesini söyle";
            document.getElementById('kpSoruKelime').innerText = kpAktifSoru.gosterilen;
            document.getElementById('kpProgressFill').style.width = Math.round((kpSoruIndex / kpSoruListesi.length) * 100) + '%';
            document.getElementById('kpKomboText').innerText = 'KOMBO x' + kpKombo;
            document.getElementById('kpSonucAlani').innerHTML = '';
            document.getElementById('kpSonucAlani').className = 'kp-sonuc';
            document.getElementById('kpYazariCevapInput').value = '';
               let kart = document.getElementById('kpCard');
            kart.classList.remove('kp-ok', 'kp-hata');
            if (!kpDinliyorMu) kpMikButonSifirla();
        }

        function kpKonfetiPatlat() {
            let wrap = document.getElementById('kpCardWrap');
            let ikonlar = ['🎉','✨','🟢','🔵','⭐','🎊'];
            for (let i = 0; i < 16; i++) {
                let p = document.createElement('span');
                p.className = 'kp-confetti';
                p.textContent = ikonlar[Math.floor(Math.random()*ikonlar.length)];
                let acili = Math.random() * Math.PI * 2;
                let uzaklik = 90 + Math.random() * 70;
                p.style.setProperty('--tx', (Math.cos(acili)*uzaklik) + 'px');
                p.style.setProperty('--ty', (Math.sin(acili)*uzaklik - 40) + 'px');
                p.style.setProperty('--tr', (Math.random()*360 - 180) + 'deg');
                p.style.animationDelay = (Math.random()*0.15) + 's';
                wrap.appendChild(p);
                setTimeout(() => p.remove(), 1300);
            }
        }

                    function kpBonusPapaganGoster() {
            let wrap = document.getElementById('kpCardWrap');
            let el = document.createElement('div');
            el.className = 'kp-bonus-parrot';
            el.innerHTML = '<img src="papi-reward-v2.png" class="dm-panel-mascot" width="1145" height="1374" alt="Başarını kutlayan Diji-Medu papağanı" loading="lazy" decoding="async"><span class="kp-bonus-parrot-txt">+1 ⚡ Enerji!</span>';
            wrap.appendChild(el);
            setTimeout(() => el.remove(), 1800);
        }

        function kpMikButonSifirla() {
            let btn = document.getElementById('kpMikBtn');
            btn.classList.remove('dinliyor');
            btn.innerHTML = '🎤 Konuş';
        }
        function kpYaziToggle() {
            document.getElementById('kpYazRow').classList.toggle('acik');
        }
        function kpSonrakineGec() {
            window.dmVerifiedGames?.record(kpSoruListesi[kpSoruIndex],null);
            kpDinlemeyiDurdur();
            OC.yanlis(false); kpToplamPuan = OC.puan(); kpYanlisSayisi++;
            kpKombo = 0;
            kpSoruIndex++;
            kpSoruGoster();
        }

        function kpDinlemeyiBaslat() {
            if (!kpTanimaDesteklVar) { alert("Tarayıcın konuşma tanımayı desteklemiyor, aşağıdan yazarak cevaplayabilirsin."); return; }
            if (kpDinliyorMu) { kpDinlemeyiDurdur(); return; }

            let SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            kpRecognition = new SR();
            kpRecognition.lang = 'en-US';
            kpRecognition.continuous = true;
            kpRecognition.interimResults = false;
            kpRecognition.maxAlternatives = 3;

            kpDinliyorMu = true;
            let btn = document.getElementById('kpMikBtn');
            btn.classList.add('dinliyor');
            btn.innerHTML = '🔴 Dinleniyor (kapatmak için bas)';

            kpRecognition.onresult = function(event) {
                let son = event.results[event.results.length - 1];
                let sonuclar = [];
                for (let i = 0; i < son.length; i++) { sonuclar.push(son[i].transcript); }
                kpCevapKontrolEt(sonuclar.join(' | '));
            };
            kpRecognition.onerror = function(ev) {
                if (ev.error === 'no-speech' || ev.error === 'aborted') return;
            };
            kpRecognition.onend = function() {
                if (kpDinliyorMu) { try { kpRecognition.start(); } catch(e) {} }
            };
            kpRecognition.start();
        }
        function kpDinlemeyiDurdur() {
            kpDinliyorMu = false;
            if (kpRecognition) { try { kpRecognition.stop(); } catch(e) {} }
            kpMikButonSifirla();
        }
        function genelBenzerlikOrani(a, b) {
            if (!a || !b) return 0;
            let maliyet = [];
            for (let i = 0; i <= a.length; i++) maliyet[i] = [i];
            for (let j = 0; j <= b.length; j++) maliyet[0][j] = j;
            for (let i = 1; i <= a.length; i++) {
                for (let j = 1; j <= b.length; j++) {
                    maliyet[i][j] = a[i-1] === b[j-1] ? maliyet[i-1][j-1] : 1 + Math.min(maliyet[i-1][j], maliyet[i][j-1], maliyet[i-1][j-1]);
                }
            }
            let mesafe = maliyet[a.length][b.length];
            let uzunMax = Math.max(a.length, b.length);
            return uzunMax === 0 ? 1 : 1 - (mesafe / uzunMax);
        }
        function genelSesEslesiyorMu(soylenen, dogruCevap, altlar) {
            if (soylenen === dogruCevap) return true;
            if (soylenen.indexOf(dogruCevap) !== -1 || dogruCevap.indexOf(soylenen) !== -1) return true;
            if (altlar && altlar.indexOf(soylenen) !== -1) return true;
            if (dogruCevap.length >= 4 && genelBenzerlikOrani(soylenen, dogruCevap) >= 0.75) return true;
            return false;
        }
        function kpNormallestir(s) {
            return (s||"").toString().trim().toLowerCase()
                .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u')
                .replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
                .replace(/[.,!?'"]/g,'').replace(/\s+/g,' ');
        }

        function kpCevapKontrolEt(soylenenMetin) {
            window.dmVerifiedGames?.record(kpSoruListesi[kpSoruIndex],soylenenMetin);
            let adaylar = soylenenMetin.split('|').map(function(s){ return kpNormallestir(s); });
            let dogruCevap = kpNormallestir(kpAktifSoru.beklenenCevap);
            let altlar = kpEsAnlamMap[dogruCevap] || [];
               let dogruMu = adaylar.some(function(a){ return genelSesEslesiyorMu(a, dogruCevap, altlar); });

            let kart = document.getElementById('kpCard');
            kart.classList.remove('kp-ok', 'kp-hata');
            void kart.offsetWidth;

            let sonucEl = document.getElementById('kpSonucAlani');

            if (dogruMu) {
                kpDogruSayisi++;
                kpArkaArkayaDogru++;
                let kazanc = OC.dogru(kpAktifSoruYanlisDeneme ? .5 : 1);
                kpToplamPuan = OC.puan();
                kpKombo++;
                kart.classList.add('kp-ok');
                kpKonfetiPatlat();
                sonucEl.className = 'kp-sonuc ok';
                sonucEl.innerHTML = '🎉 Doğru bildin! +' + kazanc + ' puan';
                       genelSesEfektiCal('dogru');
                genelKomboGoster(kpKombo, document.getElementById('kpCardWrap'));

                if (kpArkaArkayaDogru > 0 && kpArkaArkayaDogru % 4 === 0) {
                    kpEnerjiDegistir(1);
                    kpBonusPapaganGoster();
                    sonucEl.innerHTML += '<br><span style="color:#ffd166;">⚡ 4 doğru üst üste! +1 enerji bonus</span>';
                }
                document.getElementById('kpKomboText').innerText = 'KOMBO x' + kpKombo;
                kpEnerjiDegistir(-1);
                setTimeout(function(){ kpSoruIndex++; kpSoruGoster(); }, 1600);
            } else {
                kpAktifSoruYanlisDeneme++; OC.yanlis(false); kpToplamPuan = OC.puan();
                if (kpAktifSoruYanlisDeneme < 3) {
                    if (!jokerKalkanTuket()) kpKombo = 0;
                    document.getElementById('kpKomboText').innerText = 'KOMBO x' + kpKombo;
                    kart.classList.add('kp-hata');
                    if (navigator.vibrate) navigator.vibrate([25,25]);
                    sonucEl.className = 'kp-sonuc hata';
                    sonucEl.innerHTML = '😕 Olmadı, tekrar dene! (' + kpAktifSoruYanlisDeneme + '/3 hak)';
                    return;
                }
                       genelSesEfektiCal('yanlis');
                kpYanlisSayisi++;
               if (!jokerKalkanTuket()) kpKombo = 0;
                kpArkaArkayaDogru = 0;
                kart.classList.add('kp-hata');
                sonucEl.className = 'kp-sonuc hata';
                 sonucEl.innerHTML = '😕 3 hakkın doldu — Doğrusu: "' + kpAktifSoru.beklenenCevap + '"';
                document.getElementById('kpKomboText').innerText = 'KOMBO x' + kpKombo;
                kpEnerjiDegistir(-1);
                setTimeout(function(){ kpSoruIndex++; kpSoruGoster(); }, 1900);
            }
        }

        function kpYazariCevapGonder() {
            let deger = document.getElementById('kpYazariCevapInput').value.trim();
            if (!deger) return;
            kpCevapKontrolEt(deger);
        }

        async function kpKelimeOyunuBitir(enerjiBittiMi) {
            kpDinlemeyiDurdur();
            if (kpTimerInterval) clearInterval(kpTimerInterval);
            document.getElementById('kpKelimeOyunEkrani').style.display = 'none';
            document.getElementById('kpKelimeBitisEkrani').style.display = 'block';
            if (enerjiBittiMi) {
                document.getElementById('kpKelimeBitisEkrani').insertAdjacentHTML('afterbegin',
                    '<div style="background:rgba(255,209,102,.15); border:1px solid #ffd166; color:#ffd166; padding:8px 12px; border-radius:10px; font-size:11.5px; font-weight:700; margin-bottom:10px;">⚡ Enerjin bitti, kalan kelimeler için yarın tekrar gel!</div>');
            }
            kpEnerjiSatiriniGuncelle();

              let isim = document.getElementById('kpIsimInput').value.trim();
            let seviyeAdi = kpAktifSeviyeNo ? kpSeviyeAdiGetir(kpAktifSeviyeNo - 1) : "";
            let sinifStr = "Seviye " + kpAktifSeviyeNo;
            let uniteStr = seviyeAdi;

            document.getElementById('kpResIsim').innerText = isim;
            document.getElementById('kpResDY').innerText = kpDogruSayisi + ' Doğru / ' + kpYanlisSayisi + ' Yanlış';
            document.getElementById('kpResPuan').innerText = kpToplamPuan + ' Puan';

            let basariliMi = kpDogruSayisi >= Math.ceil(kpSoruListesi.length * 0.6);
            if (basariliMi && kpAktifSeviyeNo && !kpTamamlananSeviyeler.has(kpAktifSeviyeNo)) {
                kpTamamlananSeviyeler.add(kpAktifSeviyeNo);
                fetch(apiURL, { method:"POST", body: JSON.stringify({ islem:"konusmaSeviyeTamamla", ogrenci: isim, seviyeNo: kpAktifSeviyeNo }) }).catch(()=>{});
                document.getElementById('kpKelimeBitisEkrani').insertAdjacentHTML('afterbegin',
                    '<div style="background:rgba(11,178,136,.18); border:1px solid #0bb288; color:#6de8c4; padding:8px 12px; border-radius:10px; font-size:12px; font-weight:800; margin-bottom:10px;">🏆 "' + seviyeAdi + '" seviyesi tamamlandı! Bir sonraki seviyenin kilidi açıldı.</div>');
            } else if (!basariliMi) {
                document.getElementById('kpKelimeBitisEkrani').insertAdjacentHTML('afterbegin',
                    '<div style="background:rgba(236,134,54,.18); border:1px solid #ec8636; color:#ffb37a; padding:8px 12px; border-radius:10px; font-size:12px; font-weight:800; margin-bottom:10px;">💪 Bu seviyeyi geçmek için en az %60 doğru gerekiyor, tekrar dene!</div>');
            }

                    genelSonucEkraniGoster({
                oyunAdi: '🎤 Konuşma Pratiği — ' + seviyeAdi, oyunKey:'kp',
                baslik: enerjiBittiMi ? 'Enerjin bitti!' : (basariliMi ? '🏆 Seviye geçildi!' : 'Neredeyse oldu!'),
                isim: isim, puan: kpToplamPuan, dogru: kpDogruSayisi, yanlis: kpYanlisSayisi, sureSaniye: kpGecenSaniye, oyunKey: 'kp',
                devamFn: function() { document.getElementById('kpKelimeBitisEkrani').style.display = 'none'; kpParkurCiz(); kpKelimeGirisGoster(); },
                tekrarFn: function() { document.getElementById('kpKelimeBitisEkrani').style.display = 'none'; kpSeviyeBaslat(kpAktifSeviyeNo); }
            });

            try {
                await fetch(apiURL, { method:"POST", body: JSON.stringify({
                    islem: "konusmaLiderlikKaydet", tarih: new Date().toISOString().split('T')[0],
                    isim: isim, sinif: sinifStr, unite: uniteStr, dogru: kpDogruSayisi, yanlis: kpYanlisSayisi,
                    sure: kpGecenSaniye+"s", suresaniye: kpGecenSaniye, puan: kpToplamPuan
                })});
            } catch(e) {}

            liderlikKilitBaslat('kp');
            oyunLiderlikGoster('konusmaLiderlikTumunuGetir', sinifStr, isim, 'kpGecmisSkorlar', 'Konuşma Pratiği', 'kp');
        }

                    function baFabTikla() {
            if (genelOyunGirisEngelliMi()) return;
            baModuAc();
        }

            