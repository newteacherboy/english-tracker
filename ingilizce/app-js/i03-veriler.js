
        /* ========== VERİLER ========== */
        const YO_ZK_GUN = { 1:1, 2:3, 3:7, 4:14 };
        const YO_ZK_MAX = 250;

        const YO_DONDURUCU_FIYAT = 150;

        const YO_CUMLE = [
          ['I have a red bicycle','Kırmızı bir bisikletim var.','A1'],
          ['She is my best friend','O benim en iyi arkadaşım.','A1'],
          ['We play football after school','Okuldan sonra futbol oynarız.','A1'],
          ['My cat is very small','Kedim çok küçük.','A1'],
          ['He gets up at seven','O yedide kalkar.','A1'],
          ['They are in the classroom','Onlar sınıftalar.','A1'],
          ['I like apples and bananas','Elmaları ve muzları severim.','A1'],
          ['Where is your school bag','Okul çantan nerede?','A1'],
          ['It is sunny today','Bugün hava güneşli.','A1'],
          ['My mother is a teacher','Annem bir öğretmen.','A1'],
          ['Can you swim','Yüzebilir misin?','A1'],
          ['The book is on the table','Kitap masanın üstünde.','A1'],
          ['I went to the cinema yesterday','Dün sinemaya gittim.','A2'],
          ['She is taller than her brother','O, erkek kardeşinden daha uzun.','A2'],
          ['We are going to visit our grandmother','Büyükannemizi ziyaret edeceğiz.','A2'],
          ['He has never been to Paris','O hiç Paris\'e gitmedi.','A2'],
          ['What were you doing last night','Dün gece ne yapıyordun?','A2'],
          ['You should drink more water','Daha fazla su içmelisin.','A2'],
          ['It was raining when I woke up','Uyandığımda yağmur yağıyordu.','A2'],
          ['My brother can play the guitar very well','Kardeşim gitarı çok iyi çalabilir.','A2'],
          ['There is a bakery next to the bank','Bankanın yanında bir fırın var.','A2'],
          ['How much is this jacket','Bu ceket ne kadar?','A2'],
          ['If it rains we will stay at home','Yağmur yağarsa evde kalacağız.','B1'],
          ['I have been learning English for three years','Üç yıldır İngilizce öğreniyorum.','B1'],
          ['The letter was written by my uncle','Mektup amcam tarafından yazıldı.','B1'],
          ['She told me that she was tired','Bana yorgun olduğunu söyledi.','B1'],
          ['I am used to getting up early','Erken kalkmaya alışkınım.','B1'],
          ['Although it was cold we went swimming','Hava soğuk olmasına rağmen yüzmeye gittik.','B1'],
          ['He asked me where I lived','Bana nerede yaşadığımı sordu.','B1'],
          ['You had better finish your homework','Ödevini bitirsen iyi olur.','B1']
        ];

        const YO_SEVIYE = [
          { s:'A1', q:'I ___ a student.', o:['am','is','are','be'] },
          { s:'A1', q:'She ___ two brothers.', o:['has','have','is','am'] },
          { s:'A1', q:'"Elma" in English is ___.', o:['apple','orange','pear','grape'] },
          { s:'A1', q:'___ you like pizza?', o:['Do','Does','Are','Is'] },
          { s:'A1', q:'There ___ three cats in the garden.', o:['are','is','am','be'] },
          { s:'A2', q:'Yesterday I ___ to the park.', o:['went','go','goes','going'] },
          { s:'A2', q:'He is ___ than his sister.', o:['taller','tall','tallest','more tall'] },
          { s:'A2', q:'We ___ TV when the phone rang.', o:['were watching','watched','are watching','watch'] },
          { s:'A2', q:'I have ___ been to London.', o:['never','ever','yet','already'] },
          { s:'A2', q:'You ___ wear a helmet. It is the rule.', o:['must','might','would','could'] },
          { s:'B1', q:'If it rains tomorrow, we ___ at home.', o:['will stay','stayed','would stay','stay'] },
          { s:'B1', q:'I have lived here ___ 2015.', o:['since','for','from','during'] },
          { s:'B1', q:'The book ___ by millions of people.', o:['was read','read','reads','is reading'] },
          { s:'B1', q:'She asked me where I ___.', o:['lived','live','am living','do live'] },
          { s:'B1', q:'I am used to ___ early.', o:['getting up','get up','got up','gets up'] },
          { s:'B2', q:'If I ___ you, I would apologise.', o:['were','am','was being','had'] },
          { s:'B2', q:'By next year, she ___ her degree.', o:['will have finished','will finish','finishes','has finished'] },
          { s:'B2', q:'He denied ___ the window.', o:['breaking','to break','broke','break'] },
          { s:'B2', q:'Hardly ___ arrived when it started to rain.', o:['had we','we had','did we','we have'] },
          { s:'B2', q:'The meeting was called ___ because of the storm.', o:['off','out','up','over'] }
        ];
        const YO_SEVIYE_AD = { A1:'Başlangıç', A2:'Temel', B1:'Orta', B2:'Orta-Üstü' };

       const YO_SOHBET_SEVIYE = [
  { kod:'A1', ad:'Başlangıç', ikon:'🌱', renk:'#34b36a' },
  { kod:'A2', ad:'Temel', ikon:'🌿', renk:'#3b82f6' },
  { kod:'B1', ad:'Orta', ikon:'🌳', renk:'#8b5cf6' },
  { kod:'B2', ad:'Orta-Üstü', ikon:'🏔️', renk:'#f43f5e' }
];
const YO_SOHBET = window.DMPapiDialogueCatalog;

        /* ========== DURUM VE KAYIT ========== */
        let yo = null, yoIsim = null, yoKayitZaman = null, yoModalKapaninca = null;

        function yoTarihStr(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
        function yoBugun(ofset) { let d = new Date(); if (ofset) d.setDate(d.getDate() + ofset); return yoTarihStr(d); }
        function yoHaftaKodu(zaman) {
          let d = zaman ? new Date(zaman) : new Date();
          let t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          let gun = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - gun);
          let yb = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
          return t.getUTCFullYear() + '-H' + Math.ceil(((t - yb) / 86400000 + 1) / 7);
        }
        function yoHaftaBaslangic() { let d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return yoTarihStr(d); }
        function yoVarsayilan() { return { v:1, guncelleme:0, hedef:50, xpGun:{ tarih:'', xp:0 }, hedefOdul:'', altin:0, sahip:[], takili:{ aks:'', renk:'' }, dondurucu:0, lig:{ hafta:'', xp:0, gecen:null }, log:{}, zk:{}, seviye:null, sohbet:{} };}
        function yoGuvenli(fn) { try { return fn(); } catch (e) { console.warn('Yeni özellik hatası:', e); } }

        function yoHazirla(isim) {
          if (!isim) return false;
          if (yo && yoIsim === isim) return true;
          yoIsim = isim;
          try { yo = Object.assign(yoVarsayilan(), JSON.parse(localStorage.getItem('ing_yo_' + isim) || '{}')); }
          catch (e) { yo = yoVarsayilan(); }
          DijiProgressRules.migrate(yo);
          yoGunKontrol();
          return true;
        }
        function yoHazirMi() {
          if (yo) return true;
          return (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi) ? yoHazirla(aktifOgrenciAdi) : false;
        }
        function yoGunKontrol() {
          if (!yo) return;
          let b = yoBugun();
          if (yo.xpGun.tarih !== b) yo.xpGun = { tarih:b, xp:0 };
          let h = yoHaftaKodu();
          if (yo.lig.hafta !== h) {
            if (yo.lig.hafta) yo.lig.gecen = { hafta:yo.lig.hafta, xp:yo.lig.xp };
            yo.lig.hafta = h; yo.lig.xp = 0;
          }
          let sinir = yoBugun(-21);
          Object.keys(yo.log).forEach(t => { if (t < sinir) delete yo.log[t]; });
        }
        function yoKaydet() {
          if (!yo || !yoIsim) return;
          DijiProgressRules.migrate(yo); yo.guncelleme = Date.now();
          try { localStorage.setItem('ing_yo_' + yoIsim, JSON.stringify(yo)); } catch (e) {}
          clearTimeout(yoKayitZaman);
          yoKayitZaman = setTimeout(yoSunucuyaGonder, 3000);
        }
        function yoSunucuyaGonder() {
          if (!yo || !yoIsim || yoIsim.toLowerCase() === 'teacher') return;
          fetch(apiURL, { method:'POST', body: JSON.stringify({ islem:'ekVeriKaydet', ogrenci:yoIsim, anahtar:'yo', deger: JSON.stringify((DijiProgressRules.migrate(yo),yo)) }) }).catch(() => {});
        }
        /* Sunucudaki satın alınmış ürünleri (karakter.sahip) cihazdaki kayda ekler; değişiklik olduysa true. */
        function yoSahipBirlestir(hedef, kaynak) {
          const owned = kaynak?.karakter?.sahip;
          if (!hedef || !Array.isArray(owned) || !owned.length) return false;
          if (!hedef.karakter || typeof hedef.karakter !== 'object') { if (!kaynak.karakter) return false; hedef.karakter = JSON.parse(JSON.stringify(kaynak.karakter)); return true; }
          const mine = Array.isArray(hedef.karakter.sahip) ? hedef.karakter.sahip : [], add = owned.filter(x => !mine.includes(x));
          if (!add.length) return false;
          hedef.karakter.sahip = mine.concat(add);
          if (kaynak.dolapIlkIndirimKullanildi) hedef.dolapIlkIndirimKullanildi = true;
          return true;
        }
        window.yoSahipBirlestir = yoSahipBirlestir;
        async function yoSunucudanAl() {
          const owner = yoIsim;
          if (!owner) return false;
          try {
            let r = await (window.dmStartupFetch||fetch)(`${apiURL}?islem=ekVeriGetir&ogrenci=${encodeURIComponent(owner)}&anahtar=yo`);
            let d = await r.json();
            if (owner !== yoIsim || !r.ok || d?.hata || d?.status === 'error' || r.headers.get('X-Diji-Cevrimdisi')) return false;
            if (d && d.deger) {
              let server = typeof d.deger === 'string' ? JSON.parse(d.deger) : d.deger;
              if ((server.guncelleme || 0) > (yo.guncelleme || 0)) {
                yo = Object.assign(yoVarsayilan(), server); DijiProgressRules.migrate(yo); yoGunKontrol();
                try { localStorage.setItem('ing_yo_' + owner, JSON.stringify(yo)); } catch (e) {}
                yoArayuzTazele();
              } else if (yoSahipBirlestir(yo, server)) {
                /* Cihazdaki kayıt daha yeni olsa da sunucuda satın alınan ürünler kaybolmaz (kilitli görünmez). */
                try { localStorage.setItem('ing_yo_' + owner, JSON.stringify(yo)); } catch (e) {}
                yoArayuzTazele();
              }
            }
            return true;
          } catch (e) { return false; }
        }
        async function yoTumVeri() {
          let r = await fetch(`${apiURL}?islem=ekVeriTumu&anahtar=yo`);
          let d = await r.json();
          let harita = {};
          (d || []).forEach(x => { try { harita[String(x.ogrenci).trim().toLowerCase()] = JSON.parse(x.deger); } catch (e) {} });
          return harita;
        }
        function yoKullanici(isim) { return (globalDataCache || []).find(u => String(u.ogrenci).trim().toLowerCase() === String(isim || '').trim().toLowerCase()); }
        function yoSinif(isim) { let u = yoKullanici(isim); return u ? String(u.Sinif || '').trim() : ''; }
        function yoKaristir(a) { return [...a].sort(() => Math.random() - 0.5); }
        function yoGuvenliMetin(t) { return typeof guvenliMetin === 'function' ? guvenliMetin(String(t)) : String(t); }
        function yoSes(tip) { if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal(tip); }

        /* ========== ORTAK ARAYÜZ ========== */
        function yoToast(metin) {

          if(window.DijiMeduPapiFeedback){window.DijiMeduPapiFeedback.notice(metin);return;}
          let e = document.createElement('div'); e.className = 'yo-toast'; e.innerText = metin;
          document.body.appendChild(e);
          setTimeout(() => e.classList.add('gor'), 20);
          (window.dmPapiNotices?.later||((el,fn,ms)=>setTimeout(fn,ms)))(e,()=>{ e.classList.remove('gor'); setTimeout(() => e.remove(), 400); },3200);
        }
               function yoModalAc(baslik, html, kapaninca) {
          if (window.yoGomuluHedef) {
            let hedef = document.getElementById(window.yoGomuluHedef);
            if (hedef) {
              hedef.innerHTML = `<div class="yo-kart" style="animation:none; max-width:560px;"><div class="yo-baslik" style="margin-right:2px">${baslik}</div><div id="yoGovdeGomulu">${html}</div></div>`;
              return;
            }
          }
          document.getElementById('yoBaslik').innerText = baslik;
          document.getElementById('yoGovde').innerHTML = html;
          yoModalKapaninca = kapaninca || null;
          document.getElementById('yoModal').classList.add('acik');
        }
                function yoGovde(html) {
          if (window.yoGomuluHedef) { let g = document.getElementById('yoGovdeGomulu'); if (g) g.innerHTML = html; return; }
          document.getElementById('yoGovde').innerHTML = html;
        }
        function yoModalKapat() {
          document.getElementById('yoModal').classList.remove('acik');
          if ('speechSynthesis' in window) speechSynthesis.cancel();
          let f = yoModalKapaninca; yoModalKapaninca = null;
          if (typeof f === 'function') f();
          yoArayuzTazele();
        }
        function yoSoyle(metin, hiz) {
          if (!('speechSynthesis' in window) || !metin) return;
          speechSynthesis.cancel();
          let u = new SpeechSynthesisUtterance(metin); u.lang = 'en-US'; u.rate = hiz || 0.9;
          speechSynthesis.speak(u);
        }
        function yoSonuc(o) {
          if (typeof genelSonucEkraniGoster === 'function') genelSonucEkraniGoster(o);
          else { yoToast(`${o.dogru} doğru, ${o.yanlis} yanlış`); if (o.devamFn) o.devamFn(); }
        }
        function yoEnerjiKontrol() {
          if(window.dmTeacherPortalMode)return true;
          if (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) return true;
          if (window.dmOdevEnerjiMuaf && window.dmOdevEnerjiMuaf()) return true;   /* ödev oyunu enerji harcamaz */
          let k = window.genelEnerjiKalan;
          if (typeof k === 'number' && k < 3) { if (typeof genelEnerjiBittiGoster === 'function') genelEnerjiBittiGoster(); return false; }
          if (typeof ocEnerjiHarca === 'function') ocEnerjiHarca(3);
          return true;
        }
        function yoOrnekKelimeHavuzu(regex) {
          if (window.dmSelectedIntro?.key === 'dikte') return oyunHavuzGetir(window.dmSelectedIntro.classNo,window.dmSelectedIntro.units).filter(k=>regex.test(String(k.ingilizce||k.en||''))&&(k.turkce||k.tr));
          let s = Number(yoSinif(yoIsim)) || 0;
          let tum = (window.masterKelimeHavuzu || []).filter(k => regex.test(String(k.ingilizce || k.en || '').trim()) && (k.turkce || k.tr));
          let uygun = s ? tum.filter(k => [s - 1, s].includes(Number(k.sinif))) : tum;
          return uygun.length >= 8 ? uygun : tum;
        }

        /* ========== 1) XP, GÜNLÜK HEDEF, ALTIN ========== */
        function yoXpEkle(xp, altin, neden, anahtar) {
          if (!yoHazirMi()) return;
          DijiProgressRules.migrate(yo);
          xp = DijiProgressRules.positive(xp); altin = DijiProgressRules.positive(altin);
          yo.totalXp += xp;
          yoGunKontrol();
          let b = yoBugun();
          yo.xpGun.xp += xp; yo.lig.xp += xp;
          yo.log[b] = (yo.log[b] || 0) + xp;
          yo.altin += altin;
          /* Ödül sunucuya da yazılır; ekrandaki anlık değer sunucunun yanıtıyla düzeltilir. */
          if (xp > 0 || altin > 0) window.dmOdulYaz?.(xp, altin, neden, anahtar);
          if (yo.xpGun.xp >= yo.hedef && yo.hedefOdul !== b) {
            yo.hedefOdul = b; yo.altin += 5; window.dmEkonomi?.kazan(5);
            /* Daily target completion toast retired; reward is unchanged. */
          }
          yoKaydet(); yoHedefHalkaCiz();
        }
        window.dmBaseXpAdd = yoXpEkle;
        function yoHedefHalkaCiz() {
          let b = document.getElementById('yoHedefBtn');
          if (!b || !yo) return;
          yoGunKontrol();
          let x = yo.xpGun.xp, h = yo.hedef, p = Math.min(1, x / h), C = 2 * Math.PI * 15;
          b.innerHTML = `<svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true"><circle cx="19" cy="19" r="15" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="4"/><circle cx="19" cy="19" r="15" fill="none" stroke="${p >= 1 ? '#6bcb77' : '#ffd166'}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" transform="rotate(-90 19 19)" style="transition:stroke-dashoffset .6s"/></svg><span>${p >= 1 ? '✓' : '🎯'}</span>`;
          b.setAttribute('aria-label', `Günlük hedef: ${x} / ${h} XP`);
          b.title = `Günlük hedef: ${x} / ${h} XP`;
        }
        function yoHedefAc() {
          if (!yoHazirMi()) return;
          yoGunKontrol();
          let x = yo.xpGun.xp, h = yo.hedef;
          let gunAd = ['Pz','Pt','Sa','Ça','Pe','Cu','Ct'];
          let son7 = [...Array(7)].map((_, i) => { let t = yoBugun(i - 6); return { t, xp: yo.log[t] || 0, ad: gunAd[new Date(t + 'T12:00:00').getDay()] }; });
          let mx = Math.max(h, ...son7.map(s => s.xp));
          let grafik = son7.map(s => `<div><i class="${s.xp >= h ? 'tamam' : ''}" style="height:${Math.round(s.xp / mx * 70)}px"></i>${s.ad}</div>`).join('');
          let secenek = [[30,'🌱 Rahat'],[50,'🙂 Normal'],[100,'🔥 Ciddi'],[150,'🚀 Çılgın']].map(([n, ad]) =>
            `<button class="${n === h ? 'aktif' : ''}" onclick="yoHedefSec(${n})">${ad}<br><small>${n} XP / gün</small></button>`).join('');
          yoModalAc('🎯 Günlük hedef', `
            <div class="yo-istat"><div><b>${x}</b>bugün XP</div><div><b>${h}</b>hedef</div><div><b>${yo.altin}</b>🪙 altın</div></div>
            <div class="yo-ilerleme"><div style="width:${Math.min(100, Math.round(x / h * 100))}%"></div></div>
            <div class="yo-bolum">Son 7 gün</div><div class="yo-grafik">${grafik}</div>
            <div class="yo-bolum">Hedefini seç</div><div class="yo-hedef-secenek">${secenek}</div>
            <div class="yo-bos">Her doğru cevap 10 XP ve 1 🪙 kazandırır. Hedefi tamamlayınca +5 🪙 bonus.</div>`);
        }
        function yoHedefSec(n) { yo.hedef = n; yoKaydet(); yoHedefHalkaCiz(); yoHedefAc(); }

        /* ========== 2) SERİ DONDURUCU ========== */
        /* Kalkanlar artık sunucuda (memberStatus) harcanır; cihazda harcamak çift düşüşe yol açardı. */
        function yoSeriDondurucuKontrol() {}

        /* ========== 3) PAPAĞAN MAĞAZASI ========== */


        function yoDondurucuAl() {
          if (yo.dondurucu >= 2) { yoToast('En fazla 2 dondurucu taşıyabilirsin.'); return; }
          if (yo.altin < YO_DONDURUCU_FIYAT) { yoToast(`${YO_DONDURUCU_FIYAT - yo.altin} altın daha lazım 🪙`); return; }
          /* [v4.8] satın alma sunucuda */
          window.dmEkonomi.islem('dondurucuAl').then(d => { if (!d.ok) { yoToast(d.mesaj || 'Satın alma tamamlanamadı.'); return; } yoToast('🧊 Seri dondurucu alındı!'); yoMagazaAc(); });
        }

        /* ========== 4) HAFTALIK SINIF LİGİ ========== */
        async function yoLigAc() {
          if (!yoHazirMi()) return;
          yoGunKontrol();
          yoModalAc('🏆 Haftalık lig', '<div class="yo-bos">Lig yükleniyor...</div>');
          let buHafta = yoHaftaKodu(), gecenHafta = yoHaftaKodu(Date.now() - 7 * 86400000);
          let benSinif = yoSinif(yoIsim), liste = [], gecenListe = [], hata = false;
          try {
            let veri = await yoTumVeri();
            Object.keys(veri).forEach(ad => {
              if (ad === 'teacher') return;
              let u = yoKullanici(ad); if (!u || String(u.Sinif || '').trim() !== benSinif) return;
              let l = veri[ad].lig || {};
              liste.push({ isim: u.ogrenci, xp: l.hafta === buHafta ? (l.xp || 0) : 0 });
              let g = l.hafta === buHafta ? l.gecen : (l.hafta === gecenHafta ? { hafta:l.hafta, xp:l.xp } : null);
              if (g && g.hafta === gecenHafta && g.xp > 0) gecenListe.push({ isim: u.ogrenci, xp: g.xp });
            });
          } catch (e) { hata = true; }
          let ben = liste.find(x => x.isim.toLowerCase() === yoIsim.toLowerCase());
          if (ben) ben.xp = yo.lig.xp; else liste.push({ isim: yoIsim, xp: yo.lig.xp });
          liste.sort((a, b) => b.xp - a.xp);
          gecenListe.sort((a, b) => b.xp - a.xp);
          let madalya = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
          let kalanGun = 7 - ((new Date().getDay() + 6) % 7);
          let satirlar = liste.map((x, i) => `<div class="yo-satir${x.isim.toLowerCase() === yoIsim.toLowerCase() ? ' ben' : ''}"><span>${madalya(i)}</span><span class="ad">${yoGuvenliMetin(x.isim)}</span><span>${x.xp} XP</span></div>`).join('');
          let gecenIndex = gecenListe.findIndex(x => x.isim.toLowerCase() === yoIsim.toLowerCase());
          let gecenHtml = gecenListe.length ? `<div class="yo-bolum">Geçen haftanın şampiyonları</div>` + gecenListe.slice(0, 3).map((x, i) => `<div class="yo-satir"><span>${madalya(i)}</span><span class="ad">${yoGuvenliMetin(x.isim)}</span><span>${x.xp} XP</span></div>`).join('') : '';
          let tebrik = gecenIndex > -1 && gecenIndex < 3 ? `<div class="yo-satir ben" style="justify-content:center">${madalya(gecenIndex)} Geçen hafta sınıfında ${gecenIndex + 1}. oldun!</div>` : '';
          yoGovde(`${tebrik}<div class="yo-bos" style="padding:4px 0 10px">${benSinif ? benSinif + '. sınıf' : 'Sınıfın'} · Lig pazartesi sıfırlanır · ${kalanGun} gün kaldı</div>
            ${satirlar}${hata ? '<div class="yo-bos">Sınıf verisi alınamadı, sadece senin puanın görünüyor.</div>' : ''}${gecenHtml}`);
        }

        /* ========== 5) ZOR KELİMELERİM (akıllı tekrar) ========== */
        function zkEkle(k) {
          if (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) return;
          window.dmWrongWords?.add(k);
          if (!k || !yoHazirMi()) return;
          let en = String(k.ingilizce || k.en || '').trim(), tr = String(k.turkce || k.tr || '').trim();
          if (!en || !tr) return;
          let a = en.toLowerCase(), v = yo.zk[a];
          if (v) { v.kutu = 1; v.yanlis++; v.sonraki = yoBugun(); }
          else yo.zk[a] = { en, tr, sinif: k.sinif || '', kutu:1, yanlis:1, sonraki: yoBugun() };
          let anahtarlar = Object.keys(yo.zk);
          if (anahtarlar.length > YO_ZK_MAX) {
            anahtarlar.sort((x, y) => (yo.zk[y].kutu - yo.zk[x].kutu) || (yo.zk[x].yanlis - yo.zk[y].yanlis));
            anahtarlar.slice(0, anahtarlar.length - YO_ZK_MAX).forEach(x => delete yo.zk[x]);
          }
          yoKaydet(); yoRozetleriGuncelle();
        }
        function zkListe() { return Object.values((yo && yo.zk) || {}); }
        function zkVadesiGelen() { let b = yoBugun(); return zkListe().filter(v => v.kutu < 5 && v.sonraki <= b); }
        function yoZkAc() {
          if (!yoHazirMi()) return;
          let tum = zkListe(), vade = zkVadesiGelen(), ogrenilen = tum.filter(x => x.kutu >= 5).length;
          let isaret = k => k >= 5 ? '🟢' : k === 4 ? '🟡' : k === 3 ? '🟠' : '🔴';
          let liste = tum.sort((a, b) => (a.kutu - b.kutu) || (b.yanlis - a.yanlis)).slice(0, 60).map(v =>
            `<div class="yo-satir"><span>${isaret(v.kutu)}</span><span class="ad">${yoGuvenliMetin(v.en)} <small>— ${yoGuvenliMetin(v.tr)}</small></span><small>${v.kutu >= 5 ? 'öğrenildi' : (v.sonraki <= yoBugun() ? 'bugün' : v.sonraki.slice(5).split('-').reverse().join('.'))}</small></div>`).join('');
          yoModalAc('🔁 Zor kelimelerim', `
            <div class="yo-istat"><div><b>${vade.length}</b>bugün tekrar</div><div><b>${tum.length - ogrenilen}</b>çalışılıyor</div><div><b>${ogrenilen}</b>öğrenildi</div></div>
            ${vade.length ? `<button class="yo-btn" onclick="zkBaslat()">Tekrara başla (${Math.min(10, vade.length)} kelime)</button>` : `<div class="yo-bos">${tum.length ? '🎉 Bugünlük tekrarın bitti! Yarın yeni tekrarlar gelecek.' : 'Oyunlarda yanlış yaptığın kelimeler buraya gelir ve 1, 3, 7, 14 gün arayla tekrar sorulur.'}</div>`}
            ${liste ? '<div class="yo-bolum">Kelimelerin <small style="color:#8a78b8">🔴 yeni · 🟠 · 🟡 · 🟢 öğrenildi</small></div>' + liste : ''}`);
        }
        let zkOturum = null;
        function zkBaslat() {
          let v = yoKaristir(zkVadesiGelen()).slice(0, 10);
          if (!v.length) return;
          zkOturum = { liste: v, i: 0, d: 0, y: 0, bas: Date.now() };
          if (!document.getElementById('yoModal').classList.contains('acik')) yoModalAc('🔁 Zor kelimelerim', '');
          zkSoru();
        }
        function zkSoru() {
          let o = zkOturum;
          if (o.i >= o.liste.length) return zkBitir();
          let w = o.liste[o.i];
          let digerleri = [...new Set((window.masterKelimeHavuzu || []).map(k => String(k.ingilizce || k.en || '').trim()).filter(e => e && e.toLowerCase() !== w.en.toLowerCase()))];
          let yanlis = yoKaristir(digerleri).slice(0, 3);
          while (yanlis.length < 3) yanlis.push('—');
          let s = yoKaristir([w.en, ...yanlis]);
          o.dogruIdx = s.indexOf(w.en);
          yoGovde(`<div class="yo-ust-bilgi"><span>Kelime ${o.i + 1}/${o.liste.length}</span><span>✅ ${o.d} · ❌ ${o.y}</span></div>
            <div class="yo-ilerleme"><div style="width:${Math.round(o.i / o.liste.length * 100)}%"></div></div>
            <div class="yo-soru"><small>Bu kelimenin İngilizcesi nedir?</small><b>${yoGuvenliMetin(w.tr)}</b></div>
            <div class="yo-siklar">${s.map((x, i) => `<button class="yo-sik" onclick="zkCevap(${i})">${yoGuvenliMetin(x)}</button>`).join('')}</div>
            <div class="yo-geri-bildirim" id="yoGB"></div>`);
        }
        function zkCevap(i) {
          let o = zkOturum, w = o.liste[o.i], butonlar = document.querySelectorAll('#yoGovde .yo-sik');
          if (!butonlar.length || butonlar[0].disabled) return;
          butonlar.forEach(b => b.disabled = true);
          let kayit = yo.zk[w.en.toLowerCase()], dogruMu = i === o.dogruIdx;
          butonlar[o.dogruIdx].classList.add('dogru');
          yoSoyle(w.en);
          if (dogruMu) {
            window.DijiMeduPapiFeedback?.correct({anchor:butonlar[i],duration:850});
            o.d++;
            if (kayit) { let eski = kayit.kutu; kayit.kutu = Math.min(5, eski + 1); kayit.sonraki = kayit.kutu >= 5 ? '9999-12-31' : yoBugun(YO_ZK_GUN[eski]); }
            yoSes('dogru');
            document.getElementById('yoGB').innerHTML = kayit && kayit.kutu >= 5 ? '🟢 Bu kelimeyi öğrendin!' : '✅ Doğru! Bir sonraki tekrar daha ileride.';
          } else {
            o.y++; butonlar[i].classList.add('yanlis');
            if (kayit) { kayit.kutu = 1; kayit.yanlis++; kayit.sonraki = yoBugun(1); }
            yoSes('yanlis');
            document.getElementById('yoGB').innerHTML = '🔴 Yarın tekrar soracağım.';
          }
          yoKaydet();
          setTimeout(() => { o.i++; zkSoru(); }, dogruMu ? 1000 : 1700);
        }
        function zkBitir() {
          let o = zkOturum;
          yoRozetleriGuncelle();
          yoSonuc({ oyunAdi:'🔁 Zor kelimelerim', dogru:o.d, yanlis:o.y, puan:o.d * 10, sureSaniye:Math.round((Date.now() - o.bas) / 1000), siralamaYok:true,
            devamFn: yoZkAc, tekrarFn: zkVadesiGelen().length ? zkBaslat : null });
        }

        /* ========== 6) DİKTE (dinle-yaz) ========== */
        let dkt = null;
        function dikteAc() {
          if (!yoHazirMi()) return;
          let havuz = yoOrnekKelimeHavuzu(/^[a-zA-Z]{3,10}$/);
          if (!havuz.length) { yoToast('Seçili ünitelerde dinleme için uygun kelime yok. Başka bir ünite seç.'); return; }
          if (!yoEnerjiKontrol()) return;
          dkt = { liste: OC.kelimeSec('dikte', havuz, OC.SORU), i:0, d:0, y:0, bas:Date.now() }; OC.basla('dikte');
          yoModalAc('🎧 Kulak Dedektifi', '');
          dikteSoru();
        }
        function dikteSoru() {
          if (dkt.i >= dkt.liste.length) return dikteBitir();
          let w = dkt.liste[dkt.i];
          yoGovde(`<div class="yo-ust-bilgi"><span>Kelime ${dkt.i + 1}/${dkt.liste.length}</span><span>✅ ${dkt.d} · ❌ ${dkt.y}</span></div>
            <div class="yo-ilerleme"><div style="width:${Math.round(dkt.i / dkt.liste.length * 100)}%"></div></div>
            <div class="yo-dikte-dinle"><button onclick="dikteDinle()" aria-label="Kelimeyi dinle">🔊</button><button class="kucuk" onclick="dikteDinle(true)" aria-label="Yavaş dinle">🐢</button></div>
            <div class="yo-bos" style="padding:0 0 10px">Duyduğun kelimeyi yaz · Anlamı: <b>${yoGuvenliMetin(w.turkce || w.tr)}</b></div>
            <input class="yo-giris" id="yoDikteInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="kelimeyi yaz" onkeydown="if(event.key==='Enter')dikteKontrol()">
            <button class="yo-btn" onclick="dikteKontrol()">Kontrol et</button>
            <div class="yo-geri-bildirim" id="yoGB"></div>`);
          setTimeout(() => { dikteDinle(); let i = document.getElementById('yoDikteInput'); if (i) i.focus(); }, 350);
        }
        function dikteDinle(yavas) { let w = dkt && dkt.liste[dkt.i]; if (w) yoSoyle(String(w.ingilizce || w.en).trim(), yavas ? 0.55 : 0.9); }
        function dikteKontrol() {
          let inp = document.getElementById('yoDikteInput'), gb = document.getElementById('yoGB');
          if (!inp || inp.disabled) return;
          let v = inp.value.trim().toLowerCase();
          if (!v) { gb.style.color = '#e0434b'; gb.innerText = 'Önce duyduğun kelimeyi yaz.'; return; }
          let w = dkt.liste[dkt.i], dogru = String(w.ingilizce || w.en).trim().toLowerCase(), tamam = v === dogru;
          window.dmVerifiedGames?.record(w,v);
          inp.disabled = true;
          if (tamam) {
            dkt.d++; OC.dogru(1); inp.style.borderColor = '#2f9e5a'; inp.style.background = '#dff6e7';
            gb.style.color = '#2f9e5a'; gb.innerText = '✅ Harika, doğru yazdın!'; yoSes('dogru');
          } else {
            dkt.y++; OC.yanlis(false); zkEkle(w); inp.style.borderColor = '#e0434b'; inp.style.background = '#fde2e3';
            gb.style.color = '#e0434b'; gb.innerHTML = `Doğrusu: <b>${yoGuvenliMetin(dogru)}</b>`; yoSes('yanlis');
          }
          setTimeout(() => { dkt.i++; dikteSoru(); }, tamam ? 1000 : 2100);
        }
        function dikteBitir() {
          yoSonuc({ oyunAdi:'🎧 Kulak Dedektifi', oyunKey:'dikte', dogru:dkt.d, yanlis:dkt.y, puan:OC.puan(), sureSaniye:Math.round((Date.now() - dkt.bas) / 1000), siralamaYok:true,
            devamFn: yoModalKapat, tekrarFn: () => { yoModalKapat(); dikteAc(); } });
        }



        /* ========== 7) CÜMLE KURMA ========== */
        let cml = null;
        function cumleAc() {
          if (!yoHazirMi()) return;
          let s = window.dmSelectedIntro?.key === 'cumle' ? window.dmSelectedIntro.classNo : Number(yoSinif(yoIsim)) || 0;
          let seviyeler = !s ? ['A1','A2','B1'] : s <= 4 ? ['A1'] : s <= 6 ? ['A1','A2'] : ['A2','B1'];
          const selectedUnits = window.dmSelectedIntro?.key === 'cumle' ? window.dmSelectedIntro.units : null;
          let bank = (window.masterKelimeHavuzu || []).filter(k => Number(k.sinif) === Number(s) && (!Array.isArray(selectedUnits) || selectedUnits.includes(Number(k.unite))) && typeof k.ingilizce === 'string' && k.ingilizce.trim().split(/\s+/).length >= 3 && k.ingilizce.trim().split(/\s+/).length <= 9 && k.turkce).map(k => [k.ingilizce.trim(), k.turkce.trim(), 'word_bank', Number(k.sinif), Number(k.unite)]);
          let liste = OC.kelimeSec('cumle', bank, OC.SORU, { anahtar: c => c[0], zk: false });
          if (!liste.length) { yoToast('Bu sınıfın seçilen ünitelerinde cümle kurulabilecek kalıp yok. Başka bir ünite seç.'); return; }
          if (!yoEnerjiKontrol()) return;
          cml = { liste, i:0, d:0, y:0, bas:Date.now() }; OC.basla('cumle');
          yoModalAc('🧱 Cümle Ustası', '');
          cumleSoru();
        }
        function cumleSoru() {
          if (cml.i >= cml.liste.length) return cumleBitir();
          let c = cml.liste[cml.i], kelimeler = c[0].split(' ').map((w, id) => ({ w, id }));
          let havuz = yoKaristir(kelimeler);
          if (havuz.map(x => x.w).join(' ') === c[0] && havuz.length > 1) havuz.reverse();
          cml.havuz = havuz; cml.cevap = []; cml.kilit = false;
          cumleCiz();
        }
        function cumleCiz() {
          let c = cml.liste[cml.i];
          yoGovde(`<div class="yo-ust-bilgi"><span>Cümle ${cml.i + 1}/${cml.liste.length}</span><span>✅ ${cml.d} · ❌ ${cml.y}</span></div>
            <div class="yo-ilerleme"><div style="width:${Math.round(cml.i / cml.liste.length * 100)}%"></div></div>
            <div class="yo-soru"><small>Bu cümleyi İngilizce kur</small><b style="font-size:18px">${yoGuvenliMetin(c[1])}</b></div>
            <div class="yo-cevap-alan">${cml.cevap.map((x, k) => `<button class="yo-chip" onclick="cumleGeri(${k})">${yoGuvenliMetin(x.w)}</button>`).join('') || '<span class="yo-bos" style="padding:8px">Kelimelere dokunarak cümleyi kur</span>'}</div>
            <div class="yo-havuz">${cml.havuz.map((x, k) => `<button class="yo-chip" onclick="cumleSec(${k})">${yoGuvenliMetin(x.w)}</button>`).join('')}</div>
            <button class="yo-btn" onclick="cumleKontrol()">Kontrol et</button>
            <div class="yo-geri-bildirim" id="yoGB"></div>`);
        }
        function cumleSec(k) { if (cml.kilit) return; cml.cevap.push(cml.havuz.splice(k, 1)[0]); cumleCiz(); }
        function cumleGeri(k) { if (cml.kilit) return; cml.havuz.push(cml.cevap.splice(k, 1)[0]); cumleCiz(); }
        function cumleKontrol() {
          if (cml.kilit) return;
          let gb = document.getElementById('yoGB'), c = cml.liste[cml.i];
          if (cml.havuz.length) { gb.style.color = '#e0434b'; gb.innerText = 'Önce tüm kelimeleri yerleştir.'; return; }
          cml.kilit = true;
          window.dmVerifiedGames?.record(c[0],cml.cevap.map(x=>x.w).join(' '));
          let dogru = cml.cevap.map(x => x.w).join(' ') === c[0];
          yoSoyle(c[0], 0.85);
          if (dogru) { cml.d++; OC.dogru(1); gb.style.color = '#2f9e5a'; gb.innerText = '✅ Mükemmel cümle!'; yoSes('dogru'); }
          else { cml.y++; OC.yanlis(false); gb.style.color = '#e0434b'; gb.innerHTML = `Doğrusu: <b>${yoGuvenliMetin(c[0])}</b>`; yoSes('yanlis'); }
          setTimeout(() => { cml.i++; cumleSoru(); }, dogru ? 1300 : 2600);
        }
        function cumleBitir() {
          yoSonuc({ oyunAdi:'🧱 Cümle Ustası', oyunKey:'cumle', dogru:cml.d, yanlis:cml.y, puan:OC.puan(), sureSaniye:Math.round((Date.now() - cml.bas) / 1000), siralamaYok:true,
            devamFn: yoModalKapat, tekrarFn: () => { yoModalKapat(); cumleAc(); } });
        }

        /* ========== 8) SEVİYE TESPİT SINAVI ========== */
        let svt = null;
        function seviyeTestAc() {
          if (!yoHazirMi()) return;
          let onceki = yo.seviye ? `<div class="yo-satir ben" style="justify-content:center">Son sonucun:&nbsp;<b>${yo.seviye.sonuc} (${YO_SEVIYE_AD[yo.seviye.sonuc]})</b>&nbsp;· ${yo.seviye.tarih.split('-').reverse().join('.')}</div>` : '';
          yoModalAc('📋 Seviye tespit', `${onceki}
            <div class="yo-soru" style="text-align:left"><small>Nasıl çalışır?</small>
              <div style="font-size:13px; font-weight:700; line-height:1.6">20 soru, kolaydan zora gider. Yaklaşık 10 dakika sürer ve enerji harcamaz. Sonunda A1, A2, B1 ya da B2 seviyeni öğrenir, Ders Çalış'ta sana uygun seviyeye geçersin.</div></div>
            <button class="yo-btn" onclick="seviyeBasla()">${yo.seviye ? 'Tekrar çöz' : 'Başla'}</button>`);
        }
        function seviyeBasla() { svt = { i:0, puan:{ A1:0, A2:0, B1:0, B2:0 }, d:0, bas:Date.now() }; seviyeSoru(); }
        function seviyeSoru() {
          if (svt.i >= YO_SEVIYE.length) return seviyeBitir();
          let q = YO_SEVIYE[svt.i], s = yoKaristir(q.o);
          svt.dogruIdx = s.indexOf(q.o[0]);
          yoGovde(`<div class="yo-ust-bilgi"><span>Soru ${svt.i + 1}/${YO_SEVIYE.length}</span><span>${q.s}</span></div>
            <div class="yo-ilerleme"><div style="width:${Math.round(svt.i / YO_SEVIYE.length * 100)}%"></div></div>
            <div class="yo-soru"><small>Boşluğa gelecek doğru seçeneği seç</small><b style="font-size:19px">${yoGuvenliMetin(q.q)}</b></div>
            <div class="yo-siklar">${s.map((x, i) => `<button class="yo-sik" onclick="seviyeCevap(${i})">${yoGuvenliMetin(x)}</button>`).join('')}</div>`);
        }
        function seviyeCevap(i) {
          let butonlar = document.querySelectorAll('#yoGovde .yo-sik');
          if (!butonlar.length || butonlar[0].disabled) return;
          butonlar.forEach(b => b.disabled = true);
          butonlar[i].classList.add(i === svt.dogruIdx ? 'dogru' : 'yanlis');
          if(i!==svt.dogruIdx){butonlar[svt.dogruIdx].classList.add('dogru');butonlar[svt.dogruIdx].style.cssText+=';background:#dcfce7!important;border:2px solid #16a34a!important;color:#166534!important;box-shadow:0 0 0 2px #86efac';}
          if (i === svt.dogruIdx) { window.DijiMeduPapiFeedback?.correct({anchor:butonlar[i],duration:650}); svt.puan[YO_SEVIYE[svt.i].s]++; svt.d++; }
          setTimeout(() => { svt.i++; seviyeSoru(); }, 1150);
        }
        function seviyeBitir() {
          let sonuc = 'A1';
          for (let lv of ['A1','A2','B1','B2']) { if (svt.puan[lv] >= 3) sonuc = lv; else break; }
          yo.seviye = { sonuc, tarih:yoBugun(), dogru:svt.d };
          yoKaydet(); yoArayuzTazele();
          yoSonuc({ oyunAdi:'📋 Seviye tespit', baslik:`Seviyen: ${sonuc}`, dogru:svt.d, yanlis:YO_SEVIYE.length - svt.d, puan:svt.d * 10, sureSaniye:Math.round((Date.now() - svt.bas) / 1000), siralamaYok:true,
            devamFn: () => {
              yoModalKapat();
              if (typeof dunyaAc === 'function') dunyaAc(); // Ders Çalış yalnızca öğretmen panelinde (11 Kas 2026)
            } });
        }
        function seviyeDavetGoster() {
          if(window.dmPapiNotices?.defer('placement-invite',seviyeDavetGoster))return;
          if (!yo || yo.seviye || !yoIsim || yoIsim.toLowerCase() === 'teacher') return;
          let anahtar = 'ing_yo_svtDavet_' + yoIsim;
          if (localStorage.getItem(anahtar)) return;
          localStorage.setItem(anahtar, '1');
          let d = document.createElement('div'); d.className = 'yo-davet';
          d.innerHTML = `<b>📋 Seviyeni 10 dakikada öğren!</b><p>Kısa bir test çöz, sana uygun seviyeden başla.</p>
            <button class="yo-btn" id="yoDavetEvet">Teste başla</button><button class="yo-btn ikincil" id="yoDavetHayir">Sonra</button>`;
          document.body.appendChild(d);
          setTimeout(() => d.classList.add('gor'), 30);
          let kapat = () => { d.classList.remove('gor'); setTimeout(() => d.remove(), 400); };
          d.querySelector('#yoDavetEvet').onclick = () => { kapat(); seviyeTestAc(); };
          d.querySelector('#yoDavetHayir').onclick = kapat;
          (window.dmPapiNotices?.later||((el,fn,ms)=>setTimeout(fn,ms)))(d,kapat,15000);
        }

        /* ========== 9) SOHBET MODU — SEVİYELİ HARİTA ========== */
let sh = null, yoSR = null;
const YS_KONUM = [50, 76, 50, 24];
function ysAzHareket() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
function ysPanel() { return document.getElementById('kp-panel-sohbet'); }
function ysYildiz(id) { return (yo && yo.sohbet && yo.sohbet[id]) || 0; }
function ysAcikMi(i) { const d=YO_SOHBET[i];return !!d&&(i===0||ysYildiz(d.id)>=1||ysYildiz(YO_SOHBET[i-1].id)>=1||d.legacyAfter&&ysYildiz(d.legacyAfter)>=1); }
function ysSeviye(kod) { return YO_SOHBET_SEVIYE.find(s => s.kod === kod) || YO_SOHBET_SEVIYE[0]; }
function ysMerkez(el) { let r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

function ysPatlat(el, ikonlar, adet) {
  if (!el || ysAzHareket()) return;
  let p = ysMerkez(el);
  for (let i = 0; i < (adet || 12); i++) {
    let s = document.createElement('span'); s.className = 'ys-parca'; s.innerText = ikonlar[i % ikonlar.length];
    let a = Math.random() * Math.PI * 2, u = 50 + Math.random() * 70;
    s.style.left = (p.x - 10) + 'px'; s.style.top = (p.y - 12) + 'px';
    s.style.setProperty('--tx', Math.cos(a) * u + 'px'); s.style.setProperty('--ty', Math.sin(a) * u + 'px');
    s.style.setProperty('--tr', (Math.random() * 360 - 180) + 'deg');
    document.body.appendChild(s); setTimeout(() => s.remove(), 1100);
  }
}
function ysKonfetiYagmuru(adet) {
  if (ysAzHareket()) return;
  let ikonlar = ['🎉','✨','⭐','🎊','💜','💛','💚','💙','🧡'];
  for (let i = 0; i < adet; i++) {
    let s = document.createElement('span'); s.className = 'ys-konfeti'; s.innerText = ikonlar[i % ikonlar.length];
    s.style.left = (Math.random() * 100) + 'vw';
    s.style.animationDuration = (2 + Math.random() * 2) + 's';
    s.style.animationDelay = (Math.random() * 0.8) + 's';
    document.body.appendChild(s); setTimeout(() => s.remove(), 5000);
  }
}
function ysNoktalar(x1, x2) {
  return '<div class="ys-noktalar">' + [0.25, 0.5, 0.75].map(t => `<i style="left:${x1 + (x2 - x1) * t}%; top:${t * 100}%"></i>`).join('') + '</div>';
}

function ysPapiMarkup(){return window.dmPapiIntro?.characterMarkup?.() || window.dmLivePapi?.markup?.() || '<img src="daily-gift-assets/papi-streak-3d.webp" alt="Papi" width="60" height="66">';}
let ysEmotionIndex=0,ysSpeech=null,ysSpeechTimer=null;
function ysCallState(state,message){const root=document.querySelector('.ys-call');if(!root)return;root.dataset.voice=state;const status=document.getElementById('ysVoiceStatus');if(status)status.textContent=message;const mic=document.getElementById('yoSMik');if(mic){mic.classList.toggle('dinliyor',state==='listening');mic.setAttribute('aria-pressed',String(state==='listening'));mic.querySelector('span').textContent=state==='listening'?'Dinliyorum…':'Konuşmak için dokun';}}
function ysPapiSpeak(text){
 sohbetMikDur();ysSpeechStop();const owner=sh,step=sh?.i;
 if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){ysCallState('idle','Sıra sende');return;}
 const u=new SpeechSynthesisUtterance(text);ysSpeech=u;u.lang='en-US';u.rate=.9;
 const done=()=>{if(ysSpeech!==u)return;ysSpeech=null;clearTimeout(ysSpeechTimer);document.querySelectorAll('[data-speaking]').forEach(e=>e.removeAttribute('data-speaking'));if(sh===owner&&sh?.i===step)ysCallState('idle','Sıra sende');};
 u.onstart=()=>{if(ysSpeech!==u)return;document.querySelectorAll('.ys-call-character,.ys-ust-kus').forEach(e=>e.dataset.speaking='true');ysCallState('speaking','Papi konuşuyor…');};u.onend=done;u.onerror=done;
 try{speechSynthesis.speak(u);ysSpeechTimer=setTimeout(done,20000);}catch{done();}
}
function ysSpeechStop(){clearTimeout(ysSpeechTimer);ysSpeech=null;window.speechSynthesis?.cancel();document.querySelectorAll('[data-speaking]').forEach(e=>e.removeAttribute('data-speaking'));}
function ysPapiReact(button){
 const emotions=['happy','curious','love','surprised','cool'];button.dataset.emotion=emotions[ysEmotionIndex++%emotions.length];
 button.classList.remove('ys-papi-react');void button.offsetWidth;button.classList.add('ys-papi-react');
 ysPapiSpeak(['Hello, my friend!','Let’s practise English!','You are doing great!','Wow! That is amazing!','We make a great team!'][(ysEmotionIndex-1)%5]);
 setTimeout(()=>button.classList.remove('ys-papi-react'),700);
}
function ysPapiReplay(){if(sh&&!sh.finishing)ysPapiSpeak(sh.s.satirlar[sh.i]?.p||'');}
function sohbetDurdur(){sohbetMikDur();ysSpeechStop();ysCallState('idle','Durduruldu · Hazır olduğunda devam et');}
function ysTranscript(open){const panel=document.getElementById('ysTranscript');if(!panel)return;panel.hidden=!open;document.getElementById('ysTranscriptButton')?.setAttribute('aria-expanded',String(open));if(open){panel.querySelector('button')?.focus();const flow=document.getElementById('yoSAkis');flow.scrollTop=flow.scrollHeight;}else document.getElementById('ysTranscriptButton')?.focus();}
document.addEventListener('keydown',e=>{const panel=document.getElementById('ysTranscript');if(!panel||panel.hidden)return;if(e.key==='Escape'){e.preventDefault();ysTranscript(false);}if(e.key==='Tab'){e.preventDefault();panel.querySelector('button')?.focus();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)sohbetDurdur();});
/* ---- Harita ---- */
function sohbetListeCiz(acilis) {
  let p = ysPanel(); if (!p) return;
  ysViewportStop();sohbetDurdur(); sh = null;
  if (yo && !yo.sohbet) yo.sohbet = {};
  const trial=window.dmPapiChat?.trial?.();
  let toplam = YO_SOHBET.length;
  let tamam = YO_SOHBET.filter(d => ysYildiz(d.id) >= 1).length;
  let yildizTop = YO_SOHBET.reduce((t, d) => t + ysYildiz(d.id), 0);
  let html = `<div class="ys-harita">
    <div class="ys-ust"><button type="button" class="ys-ust-kus dm-lp" onclick="ysPapiReact(this)" aria-label="Papi’ye dokun">${ysPapiMarkup()}</button><div class="ys-ust-metin"><b>Papi ile sohbet</b>
      <span>${tamam}/${toplam} diyalog · ⭐ ${yildizTop}/${toplam * 3}</span>
      <div class="ys-ust-bar"><i style="width:${Math.round(tamam / toplam * 100)}%"></i></div></div></div>
    ${trial&&!trial.premium?'<div class="ys-trial-note">'+trial.remaining+' ücretsiz sohbet hakkın var · Premium Pro ile sınırsız</div>':''}
    <div class="ys-aciklama">En az %60 doğru cevapla, sıradaki sohbetin kilidi açılsın. Hepsini ilk denemede bilirsen 3 yıldız!</div>`;
  YO_SOHBET_SEVIYE.forEach(sv => {
    let grup = YO_SOHBET.map((d, i) => ({ d, i })).filter(x => x.d.sv === sv.kod);
    if (!grup.length) return;
    let svAcik = ysAcikMi(grup[0].i) && !(acilis && acilis.yeniSeviye === sv.kod);
    let svTamam = grup.filter(x => ysYildiz(x.d.id) >= 1).length;
    html += `<div class="ys-bant${svAcik ? '' : ' kilitli'}" id="ysBant${sv.kod}" style="--sr:${sv.renk}"><span class="ys-bant-ikon">${sv.ikon}</span>
      <span><b>${sv.kod} · ${sv.ad}</b><small>${svTamam}/${grup.length} tamamlandı</small></span>${svAcik ? '' : '<span class="ys-bant-kilit">🔒</span>'}</div>`;
    grup.forEach((x, j) => {
      let konum = YS_KONUM[x.i % 4];
      if (j > 0) html += ysNoktalar(YS_KONUM[(x.i - 1) % 4], konum);
      let y = ysYildiz(x.d.id), acik = ysAcikMi(x.i);
      let acilacak = acilis && acilis.yeniIdx === x.i;
      let durum = acilacak ? 'kilitli' : (y >= 1 ? 'bitti' : (acik ? 'aktif' : 'kilitli'));
      let kilit = durum === 'kilitli' ? '<span class="ys-kilit">🔒</span>' : '';
      let tik = acik ? `sohbetBasla(${x.i}, this)` : 'ysKilitliTik(this)';
      html += `<div class="ys-satir" style="--x:${konum}%">
        <button class="ys-dugum ${durum}" id="ysDugum${x.i}" style="--sr:${sv.renk}" onclick="${tik}" aria-label="${x.d.ad}${acik ? '' : ', kilitli'}">
          <span class="ys-dugum-ic">${x.d.ikon}</span>${kilit}</button>
        <div class="ys-yildizlar">${[1, 2, 3].map(n => `<span class="${n <= y ? 'dolu' : ''}">★</span>`).join('')}</div>
        <div class="ys-ad">${x.d.ad}</div></div>`;
    });
  });
  html += '</div>';
  p.innerHTML = html;
  if (acilis) setTimeout(() => ysKilitAcAnimasyonu(acilis), 300);
}
function ysKilitliTik(btn) {
  btn.classList.remove('ys-salla'); void btn.offsetWidth; btn.classList.add('ys-salla');
  yoToast('🔒 Önce bir önceki sohbeti tamamla!');
}
function ysKilitAcAnimasyonu(a) {
  let yeni = document.getElementById('ysDugum' + a.yeniIdx), onceki = document.getElementById('ysDugum' + a.oncekiIdx);
  if (!yeni) return;
  let ac = () => {
    yeni.scrollIntoView({ behavior: ysAzHareket() ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => {
      let kilit = yeni.querySelector('.ys-kilit');
      if (kilit) kilit.classList.add('kiriliyor');
      setTimeout(() => {
        if (kilit) kilit.remove();
        yeni.classList.remove('kilitli'); yeni.classList.add('aktif', 'ys-yeni-acildi');
        setTimeout(() => yeni.classList.remove('ys-yeni-acildi'), 800);
        ysPatlat(yeni, ['✨','⭐','💫','🎉'], 16);
        yoSes('dogru');

      }, 650);
    }, 550);
  };
  if (a.yeniSeviye) {
    ysSeviyeKutla(a.yeniSeviye, () => {
      let bant = document.getElementById('ysBant' + a.yeniSeviye);
      if (bant) { bant.classList.remove('kilitli'); let k = bant.querySelector('.ys-bant-kilit'); if (k) k.remove(); bant.classList.add('ys-bant-acildi'); }
      ac();
    });
  } else ac();
}
function ysSeviyeKutla(kod, sonra) {
  let sv = ysSeviye(kod);
  let k = document.createElement('div'); k.className = 'ys-kutlama'; k.style.setProperty('--sr', sv.renk);
  k.innerHTML = `<div class="ys-isinlar"></div><div class="ys-kutlama-icerik">
    <div class="ys-kutlama-ikon">${sv.ikon}</div><div class="ys-kutlama-ust">YENİ SEVİYE AÇILDI</div>
    <div class="ys-kutlama-baslik">${sv.kod} · ${sv.ad}</div><div class="ys-kutlama-alt">Yeni sohbetler seni bekliyor!</div>
    <button class="yo-btn ys-kutlama-btn">Hadi başlayalım! 🚀</button></div>`;
  document.body.appendChild(k);
  if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal('kombo', 15);
  ysKonfetiYagmuru(40);
  let kapandi = false;
  let kapat = () => { if (kapandi) return; kapandi = true; k.classList.add('kapaniyor'); setTimeout(() => { k.remove(); if (sonra) sonra(); }, 400); };
  k.querySelector('button').onclick = kapat;
  setTimeout(() => { let b = k.querySelector('button'); if (b) b.focus(); }, 900);
}

/* ---- Portal geçişi ---- */
function ysPortal(kaynak,renk,sonra,isCurrent=()=>true){
 const flight=window.dmRoutePracticeFlight;
 if(!flight?.play){if(isCurrent())sonra();return;}
 flight.prepare?.();
 Promise.resolve(flight.play({isCurrent,onExit:()=>{if(isCurrent())sohbetListeCiz();}})).then(done=>{if(done&&isCurrent())sonra();});
}
let ysViewportCleanup=null;
function ysViewportStop(){ysViewportCleanup?.();ysViewportCleanup=null;const root=document.getElementById('tab-sohbet');root?.style.removeProperty('--ys-viewport-height');root?.style.removeProperty('--ys-viewport-top');root?.classList.remove('ys-keyboard-open');}
function ysViewportStart(){
 ysViewportStop();const root=document.getElementById('tab-sohbet'),vv=window.visualViewport;let largest=window.innerHeight;
 const sync=()=>{if(!root?.querySelector('.ys-call'))return;const height=vv?.height||window.innerHeight;largest=Math.max(largest,window.innerHeight,height);root.style.setProperty('--ys-viewport-height',height+'px');root.style.setProperty('--ys-viewport-top',(vv?.offsetTop||0)+'px');root.classList.toggle('ys-keyboard-open',document.activeElement?.id==='yoSInput'&&height<largest*.78);};
 window.addEventListener('resize',sync);vv?.addEventListener('resize',sync);vv?.addEventListener('scroll',sync);root.addEventListener('focusin',sync);root.addEventListener('focusout',sync);
 ysViewportCleanup=()=>{window.removeEventListener('resize',sync);vv?.removeEventListener('resize',sync);vv?.removeEventListener('scroll',sync);root.removeEventListener('focusin',sync);root.removeEventListener('focusout',sync);};sync();
}

/* ---- Sohbet ekranı ---- */
function sohbetBasla(i, kaynak) {
  if (!yoHazirMi()||!YO_SOHBET[i]) return;
  if(!window.dmPapiChat?.access()){void window.dmPapiChat?.open();return;}
  if (!ysAcikMi(i)) { if (kaynak) ysKilitliTik(kaynak); return; }
  let d = YO_SOHBET[i], sv = ysSeviye(d.sv);
  document.querySelector('.ys-start-overlay')?.remove();
  const overlay=document.createElement('div');overlay.className='ys-start-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',d.ad);
  const trial=window.dmPapiChat?.trial?.();
  overlay.innerHTML='<section class="ys-start-card"><button type="button" class="ys-start-close" aria-label="Kapat">×</button><h2>'+yoGuvenliMetin(d.ad)+'</h2><p>'+d.sv+' · '+(i+1)+'. durak · '+d.satirlar.length+' konuşma adımı</p>'+(trial&&!trial.premium?'<p>'+trial.remaining+' ücretsiz hakkından 1’i kullanılacak.</p>':'')+'<button type="button" class="yo-btn" data-ys-start>Başlat</button><p role="status" class="ys-start-status"></p></section>';
  document.body.append(overlay);const prior=document.activeElement;const close=()=>{overlay.remove();prior?.focus?.();};overlay.querySelector('.ys-start-close').onclick=close;overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const b=[...overlay.querySelectorAll('button:not(:disabled)')];if(b.length){e.preventDefault();b[(b.indexOf(document.activeElement)+(e.shiftKey?-1:1)+b.length)%b.length].focus();}}});overlay.onclick=e=>{if(e.target===overlay)close();};
  const runId=crypto.randomUUID();overlay.querySelector('[data-ys-start]').onclick=async()=>{
   window.dmRoutePracticeFlight?.prepare?.();
   const b=overlay.querySelector('[data-ys-start]');b.disabled=true;const status=overlay.querySelector('.ys-start-status');status.textContent='Sohbet açılıyor…';
   try{const run=await window.dmPapiChat.request('start',{dialogueId:d.id,runId});if(!overlay.isConnected)return;overlay.remove();sohbetDuragiBaslat(i,kaynak,runId,run);}catch(e){if(!overlay.isConnected)return;status.textContent=e.message;b.disabled=false;}
  };overlay.querySelector('[data-ys-start]').focus();
}
function sohbetDuragiBaslat(i,kaynak,runId,run){
  let d=YO_SOHBET[i],sv=ysSeviye(d.sv);
  sohbetMikDur();
  sh = { runId, owner:typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi, idx: i, s: d, i: run.step, d: run.correctCount, y: run.wrongCount, ilk: run.firstCount, deneme: run.attempts, bas: Date.now(), kilit: true };
  let o = sh;
  ysPortal(kaynak, sv.renk, () => {
    if (sh !== o) return;
    let p = ysPanel();
    p.innerHTML = `<div class="yo-sohbet ys-sohbet ys-call" data-voice="idle" style="--sr:${sv.renk}">
      <div class="yo-s-ust"><button class="yo-s-geri" onclick="sohbetListeCiz()">← Harita</button><b>${d.ikon} ${d.ad}</b><span class="ys-rozet">${d.sv}</span></div>
      <div class="ys-adimlar" id="ysAdimlar">${d.satirlar.map(() => '<i></i>').join('')}</div>
      <section class="ys-call-scene"><span class="ys-touch-hint">Papi’ye dokun ✨</span>
      <button type="button" class="ys-call-character dm-lp" data-emotion="neutral" onclick="ysPapiReact(this)" aria-label="Papi’ye dokun, konuşsun ve duygusu değişsin">${ysPapiMarkup().replace('viewBox="0 0 400 440"','viewBox="60 20 280 345" preserveAspectRatio="xMidYMid slice"')}</button>
      <div class="ys-voice-pill"><span class="ys-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span id="ysVoiceStatus" role="status">Papi hazırlanıyor…</span></div></section>
      <div class="ys-question"><span class="ys-question-label">Papi</span><p id="ysCurrentQuestion"></p><button type="button" onclick="ysPapiReplay()">◖)) Tekrar dinle</button></div>
      <div class="yo-s-ipucu" id="yoSIpucu"></div><p id="ysAnswerStatus" role="status"></p>
      <div class="ys-call-controls"><button type="button" class="ys-side-control" id="ysTranscriptButton" onclick="ysTranscript(true)" aria-label="Konuşmanın tüm metnini göster" aria-expanded="false" aria-controls="ysTranscript"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/></svg><span>Konuşma metni</span></button>
      <button type="button" class="yo-s-mik" id="yoSMik" onclick="sohbetMik()" aria-label="Mikrofonla cevap ver" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0014 0v-2M12 19v3M8 22h8"/></svg><span>Konuşmak için dokun</span></button>
      <button type="button" class="ys-side-control" onclick="sohbetDurdur()" aria-label="Konuşmayı ve mikrofonu durdur"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3"/></svg><span>Durdur</span></button></div>
      <div class="yo-s-giris ys-text-fallback"><input id="yoSInput" aria-label="Yazarak cevap ver" placeholder="İstersen yaz…" maxlength="400" autocomplete="off" onkeydown="if(event.key==='Enter')sohbetGonder()"><button type="button" onclick="sohbetGonder()" aria-label="Gönder">➤</button></div>
      <section class="ys-transcript" id="ysTranscript" role="dialog" aria-modal="true" aria-labelledby="ysTranscriptTitle" hidden><div class="ys-transcript-card"><header><h2 id="ysTranscriptTitle">Konuşmanın tamamı</h2><button type="button" onclick="ysTranscript(false)" aria-label="Konuşma metnini kapat">×</button></header><div class="yo-s-akis" id="yoSAkis" role="log" aria-label="Papi ve senin konuşmaların"></div></div></section></div>`;
    ysViewportStart();document.getElementById('tab-sohbet').scrollTop=0;
    sohbetPapaganSoyle();
  },()=>sh===o);
}
function ysAdimGuncelle() {
  let a = document.getElementById('ysAdimlar'); if (!a || !sh) return;
  [...a.children].forEach((e, k) => { e.className = k < sh.i ? 'tamam' : (k === sh.i ? 'simdi' : ''); });
}
function sohbetBalon(tur, html) {
  let a = document.getElementById('yoSAkis'); if (!a) return null;
  a.insertAdjacentHTML('beforeend', `<div class="yo-s-balon ${tur}">${html}</div>`);
  a.scrollTop = a.scrollHeight;
  return a.lastElementChild;
}
function sohbetPapaganSoyle() {
  let o = sh; if (!o) return;
  let s = o.s.satirlar[o.i];
  ysAdimGuncelle();
  o.kilit = true;
  const feedback=document.getElementById('ysAnswerStatus');if(feedback)feedback.textContent='';
  let yaziyor = sohbetBalon('p ys-yaziyor', '<i></i><i></i><i></i>');
  document.getElementById('yoSIpucu').innerHTML = '';
  setTimeout(() => {
    if (sh !== o) return;
    if (yaziyor) yaziyor.remove();
    sohbetBalon('p', yoGuvenliMetin(s.p));
    document.getElementById('ysCurrentQuestion').textContent=s.p;
    ysPapiSpeak(s.p);
    document.getElementById('yoSIpucu').innerHTML = `💡 ${yoGuvenliMetin(s.tr)} Örnek: <i>${yoGuvenliMetin(s.ornek)}</i>`;
    o.kilit = false;
  }, ysAzHareket() ? 100 : 950);
}
async function sohbetGonder(metin) {
  const o=sh;if(!o||o.kilit)return;
  const inp=document.getElementById('yoSInput');metin=String(metin||(inp?inp.value:'')).trim();if(!metin||metin.length>400)return;
  if(!o.pending||o.pending.text!==metin||o.pending.step!==o.i)o.pending={runId:o.runId,step:o.i,text:metin,requestId:crypto.randomUUID()};
  sohbetDurdur();o.kilit=true;ysCallState('thinking','Cevabına bakıyorum…');const s=o.s.satirlar[o.i];
  try{
   const r=await window.dmPapiChat.request('answer',o.pending);if(sh!==o)return;o.pending=null;
   if(inp)inp.value='';const benBalon=sohbetBalon('ben',yoGuvenliMetin(metin));
   o.d=r.correctCount;o.y=r.wrongCount;o.ilk=r.firstCount;o.deneme=r.attempts;
   const feedback=document.getElementById('ysAnswerStatus');if(feedback)feedback.textContent=r.tooShort?'En az '+r.minimum+' kelimeyle anlat.':r.accepted?'Harika cevap!':r.advance?'Birlikte bir sonrakini deneyelim.':'İpucuna bakıp tekrar dene.';
   document.querySelector('.ys-call-character')?.setAttribute('data-emotion',r.accepted?'happy':'curious');ysCallState('idle',r.accepted?'Harikasın!':'Sıra sende');
   if(r.tooShort){sohbetBalon('hata','✍️ Güzel başlangıç! En az '+r.minimum+' kelimeyle anlat.');o.kilit=false;return;}
   if(r.accepted){benBalon?.classList.add('parla');sohbetBalon('ok',r.attempts===0?'✅ Harika cevap!':'✅ Bu sefer oldu!');ysPatlat(benBalon,['✨','⭐','🎉'],10);yoSes('dogru');}
   else {yoSes('yanlis');benBalon?.classList.add('ys-salla');sohbetBalon('hata',r.advance?'Şöyle diyebilirdin: "'+yoGuvenliMetin(s.ornek)+'"':'🤔 Tam olmadı, ipucuna bakıp tekrar dene.');}
   if(r.advance)sohbetIleri(r.accepted?1000:1800);else o.kilit=false;
  }catch(e){if(sh===o){sohbetBalon('hata',yoGuvenliMetin(e.message)+' Aynı cevabı yeniden gönderebilirsin.');ysCallState('idle',e.message+' Yeniden deneyebilirsin.');o.kilit=false;}}
}

function sohbetIleri(ms) {
  sh.deneme = 0;
  let o = sh;
  setTimeout(() => { if (sh !== o) return; sh.i++; if (sh.i >= sh.s.satirlar.length) sohbetBitir(); else sohbetPapaganSoyle(); }, ms);
}

/* ---- Bitiş sahnesi ---- */
async function sohbetBitir() {
  const o=sh;if(!o||o.finishing)return;sohbetDurdur();o.finishing=true;
  const p=ysPanel();p.innerHTML='<div class="ys-saving" role="status">Sohbetin ve ödülün kaydediliyor…</div>';
  try{
   const eski=ysYildiz(o.s.id),r=await window.dmPapiChat.request('finish',{runId:o.runId});if(sh!==o)return;
   const t=o.s.satirlar.length,gecti=r.passed,yildiz=r.stars;let acilis=null;
   if(gecti&&eski<1&&o.idx+1<YO_SOHBET.length){const next=YO_SOHBET[o.idx+1];acilis={yeniIdx:o.idx+1,oncekiIdx:o.idx,yeniSeviye:next.sv!==o.s.sv?next.sv:null};}
   const baslik=!gecti?'Biraz daha pratik!':yildiz===3?'Mükemmel sohbet!':'Harika sohbet!';
   if(!window.dmSonucA?.showSaved)throw Error('Sonuç ekranı hazırlanamadı. Yeniden dene.');
   ysViewportStop();
   window.dmSonucA.showSaved({oyunAdi:'Papi ile sohbet · '+o.s.ad,baslik,oyunKey:'papi-sohbet',dogru:r.correctCount,yanlis:r.wrongCount,
    sureSaniye:Math.max(1,Math.round((Date.now()-o.bas)/1000)),siralamaYok:true,parkurGecti:gecti,parkurYildiz:yildiz,
    savedReward:{xp:r.xp,gold:r.gold},resultNote:gecti?(acilis?'Yeni bir sohbetin kilidi açıldı!':'İlerlemen sohbet haritana kaydedildi.'):'Biraz daha pratik yap. Sonraki sohbet için en az %60 doğru gerekiyor.',
    devamFn:()=>sohbetListeCiz(acilis),tekrarFn:()=>{sohbetListeCiz();sohbetBasla(o.idx);}});
   sh=null;
  }catch(e){if(sh!==o)return;o.finishing=false;p.innerHTML='<div class="ys-saving" role="status"><p>'+yoGuvenliMetin(e.message)+'</p><button type="button" class="yo-btn" id="ysFinishRetry">Kaydı yeniden dene</button></div>';document.getElementById('ysFinishRetry').onclick=sohbetBitir;}
}

/* ---- Mikrofon ---- */
function sohbetMik() {
 const o=sh;if(!o||o.kilit||o.finishing)return;
 if(yoSR){sohbetDurdur();return;}
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 const fallback=message=>{ysCallState('idle',message);yoToast(message);document.getElementById('yoSInput')?.focus();};
 if(!SR){fallback('Mikrofon bu cihazda desteklenmiyor. Cevabını yazabilirsin.');return;}
 ysSpeechStop();const step=o.i,r=new SR();yoSR=r;r.lang='en-US';r.interimResults=false;r.maxAlternatives=1;
 const current=()=>yoSR===r&&sh===o&&o.i===step&&!o.kilit;
 r.onstart=()=>{if(current())ysCallState('listening','Seni dinliyorum…');};
 r.onresult=e=>{if(!current())return;const t=e.results?.[0]?.[0]?.transcript||'';sohbetMikDur();if(t.trim())void sohbetGonder(t);};
 r.onerror=e=>{if(!current())return;sohbetMikDur();fallback(e.error==='not-allowed'||e.error==='service-not-allowed'?'Mikrofon izni verilmedi. Cevabını yazabilirsin.':e.error==='no-speech'?'Ses duyamadım. Tekrar dene veya cevabını yaz.':'Mikrofon çalışmadı. Tekrar dene veya cevabını yaz.');};
 r.onend=()=>{if(yoSR!==r)return;yoSR=null;ysCallState('idle','Sıra sende');};
 try{ysCallState('listening','Mikrofon açılıyor…');r.start();}catch{sohbetMikDur();fallback('Mikrofon açılamadı. Cevabını yazabilirsin.');}
}
function sohbetMikDur(){const r=yoSR;yoSR=null;if(r){r.onstart=r.onresult=r.onerror=r.onend=null;try{if(r.abort)r.abort();else r.stop();}catch{}}document.getElementById('yoSMik')?.classList.remove('dinliyor');}

        /* ========== 10-11) ÖĞRETMEN RAPORLARI ========== */
        let yoRaporTip = 'zayif';
        function yoOgretmenRapor(tip) {
          yoRaporTip = tip;
          let m = document.getElementById('ogretmenMenuModal'); if (m) m.style.display = 'none';
          let siniflar = [...new Set((globalDataCache || []).filter(u => String(u.ogrenci || '').toLowerCase() !== 'teacher').map(u => String(u.Sinif || '').trim()).filter(Boolean))].sort((a, b) => a - b);
          yoModalAc(tip === 'zayif' ? '🔍 Sınıfın zayıf noktaları' : '📨 Haftalık veli özetleri', `
            <div class="yo-yukle"><select id="yoRaporSinif" onchange="yoRaporYukle()"><option value="">Sınıf seçin</option>${siniflar.map(s => `<option value="${s}">${s}. sınıf</option>`).join('')}</select></div>
            <div id="yoRaporAlan"><div class="yo-bos">${tip === 'zayif' ? 'Sınıftaki öğrencilerin en çok yanlış yaptığı kelimeleri görmek için bir sınıf seç.' : 'Her öğrencinin bu haftaki özetini hazırlayıp veliye WhatsApp ile tek dokunuşla gönderebilirsin.'}</div></div>`,
            () => { let mm = document.getElementById('ogretmenMenuModal'); if (mm) mm.style.display = 'flex'; });
        }
        async function yoRaporYukle() {
          let sinif = document.getElementById('yoRaporSinif').value, alan = document.getElementById('yoRaporAlan');
          if (!sinif) return;
          if(yoRaporTip==='veli')return window.dmVeliRaporYukle(sinif,alan);
          alan.innerHTML = '<div class="yo-bos">Veriler yükleniyor...</div>';
          let veri;
          try { veri = await yoTumVeri(); } catch (e) { alan.innerHTML = '<div class="yo-bos">Veriler alınamadı. İnternet bağlantını kontrol edip tekrar dene.</div>'; return; }
          let ogrenciler = (globalDataCache || []).filter(u => String(u.Sinif || '').trim() === sinif && String(u.ogrenci || '').toLowerCase() !== 'teacher');
          let buHafta = yoHaftaKodu(), haftaBas = yoHaftaBaslangic();
          if (yoRaporTip === 'zayif') {
            let agg = {}, calismayan = [];
            ogrenciler.forEach(u => {
              let b = veri[String(u.ogrenci).trim().toLowerCase()];
              if (!b || !b.lig || b.lig.hafta !== buHafta || !b.lig.xp) calismayan.push(u.ogrenci);
              if (!b || !b.zk) return;
              Object.values(b.zk).forEach(v => {
                if (v.kutu >= 5) return;
                let a = String(v.en).toLowerCase();
                if (!agg[a]) agg[a] = { en:v.en, tr:v.tr, ogr:0, yanlis:0 };
                agg[a].ogr++; agg[a].yanlis += v.yanlis || 1;
              });
            });
            let ilk = Object.values(agg).sort((a, b) => (b.ogr - a.ogr) || (b.yanlis - a.yanlis)).slice(0, 10);
            alan.innerHTML = (ilk.length ? '<div class="yo-bolum">En çok zorlanılan 10 kelime</div>' + ilk.map((x, i) =>
              `<div class="yo-satir"><span>${i + 1}.</span><span class="ad">${yoGuvenliMetin(x.en)} <small>— ${yoGuvenliMetin(x.tr)}</small></span><small>${x.ogr} öğr. · ${x.yanlis} yanlış</small></div>`).join('')
              : '<div class="yo-bos">Bu sınıfta henüz kayıtlı zor kelime yok.</div>') +
              (calismayan.length ? `<div class="yo-bolum">Bu hafta hiç çalışmayanlar (${calismayan.length})</div><div class="yo-bos" style="text-align:left">${calismayan.map(yoGuvenliMetin).join(', ')}</div>` : '');
          } else {
            return window.dmVeliRaporYukle(sinif, alan);
          }
        }

        /* ========== ARAYÜZE YERLEŞTİRME ========== */
        function yoRozetleriGuncelle() {
          let r = document.getElementById('yoZkRozet');
          if (r && yo) { let n = zkVadesiGelen().length; r.style.display = n ? '' : 'none'; r.innerText = n + ' TEKRAR'; }
          let s = document.getElementById('yoSeviyeRozet');
          if (s && yo) s.innerText = yo.seviye ? yo.seviye.sonuc : 'YENİ';
        }
        function yoArayuzTazele() { yoGuvenli(() => { yoHedefHalkaCiz(); yoAvatarUygula(); yoRozetleriGuncelle(); }); }

        function yoArayuzKur() {
          let sag = document.querySelector('.header-right-widgets');
          if (sag && !document.getElementById('yoHedefBtn')) {
            let b = document.createElement('button'); b.id = 'yoHedefBtn'; b.className = 'yo-hedef-btn'; b.onclick = yoHedefAc;
            sag.insertBefore(b, sag.firstChild);
          }
          let araclar = document.querySelector('.header-tools-row');
          if (araclar && !document.getElementById('yoLigBtn')) {
            araclar.insertAdjacentHTML('beforeend', `<button class="header-tool-btn" id="yoLigBtn" onclick="yoLigAc()" title="Haftalık lig" aria-label="Haftalık lig">🏆</button><button class="header-tool-btn" onclick="yoMagazaAc()" title="Papağan mağazası" aria-label="Papağan mağazası">🛍️</button>`);
          }
          let so = document.querySelector('#tab-sanaozel .dc-focus-card');
          if (so && !document.getElementById('yoSanaOzelGrid')) {
            so.insertAdjacentHTML('beforeend', `<div class="sana-ozel-odevler-baslik" style="color:#553c9a; border-bottom-color:#e7dcff;">🚀 Gelişim araçlarım</div>
              <div class="az-grid2x2" id="yoSanaOzelGrid">
                <button class="az-gcard" style="background:linear-gradient(160deg,#fb7185,#be123c);" onclick="yoZkAc()"><span class="yo-rozet-kose" id="yoZkRozet" style="display:none"></span><div class="az-gcard-icon">🔁</div><div class="az-gcard-title">Zor Kelimelerim</div></button>
                <button class="az-gcard" style="background:linear-gradient(160deg,#fbbf24,#d97706);" onclick="yoLigAc()"><div class="az-gcard-icon">🏆</div><div class="az-gcard-title">Haftalık Lig</div></button>
                <button class="az-gcard" style="background:linear-gradient(160deg,#34d399,#0f766e);" onclick="yoMagazaAc()"><div class="az-gcard-icon">🛍️</div><div class="az-gcard-title">Papağan Mağazası</div></button>
              </div>`);
          }
          let ak = document.querySelector('#tab-aktiviteler .az-grid2x2');
          if (ak && !document.getElementById('yoDikteKart')) {
            let son = ak.querySelector('.az-gcard.span2');
            let html = `<button class="az-gcard" id="yoDikteKart" style="background:linear-gradient(160deg,#38bdf8,#6d28d9);" onclick="()"><div class="az-gcard-badge">YENİ</div><div class="az-gcard-icon">🎧</div><div class="az-gcard-title">Dikte (Dinle-Yaz)</div></button>
              <button class="az-gcard" style="background:linear-gradient(160deg,#f472b6,#9333ea);" onclick="cumleAc()"><div class="az-gcard-badge">YENİ</div><div class="az-gcard-icon">🧱</div><div class="az-gcard-title">Cümle Kur</div></button>`;
            if (son) son.insertAdjacentHTML('beforebegin', html); else ak.insertAdjacentHTML('beforeend', html);
          }
          let sp = document.getElementById('kp-panel-sohbet');
          if (sp && !sp.dataset.yo) { sp.dataset.yo = '1'; sohbetListeCiz(); }
          yoOgretmenButonlariEkle();
          yoArayuzTazele();
        }
        function yoOgretmenButonlariEkle() {
          let k = document.querySelector('#ogretmenMenuModal .rubric-content');
          if (!k || document.getElementById('yoOgrZayifBtn')) return;
          k.insertAdjacentHTML('beforeend', `<button class="ogretmen-menu-btn" id="yoOgrZayifBtn" onclick="yoOgretmenRapor('zayif')"><span>🔍 Sınıfın Zayıf Noktaları</span></button>
            <button class="ogretmen-menu-btn" onclick="yoOgretmenRapor('veli')"><span>📨 Haftalık Veli Özetleri</span></button>`);
        }

        /* ========== MEVCUT FONKSİYONLARA BAĞLANMA (dışarıdan sarma) ========== */
        function yoSar(ad, once, sonra) {
          let org = window[ad];
          if (typeof org !== 'function' || org._yoSarildi) return;
          let sarici = function () {
            let ctx = null;
            try { if (once) ctx = once.apply(this, arguments); } catch (e) {}
            let sonuc = org.apply(this, arguments);
            try { if (sonra) sonra(ctx, arguments); } catch (e) {}
            return sonuc;
          };
          sarici._yoSarildi = true;
          window[ad] = sarici;
        }
        function yoBaglantilariKur() {
          // Oyun sonu: XP ve altın
          yoSar('genelSonucEkraniGoster', null, (c, a) => {
            if (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) return;
            if (a[0] && a[0].yildiz && typeof ocOdulVer === 'function') { ocOdulVer(a[0]); return; }
            let d = Number(a[0] && a[0].dogru) || 0;
            if (d > 0) yoXpEkle(d * 10, d, 'oyun_sonu');
          });
          // Yanlış yapılan kelimeleri "Zor Kelimelerim"e ekle
          yoSar('kyCevapVer', i => { let s = kySorularListesi[kySoruIndex]; if (!s || document.getElementById('kySik0').disabled) return null; return { s, y: i !== s._dogruIndex }; }, c => { if (c && c.y) zkEkle(c.s); });
          yoSar('jpCevapVer', i => { let b = document.getElementById('jpSik' + i); if (!jpAktifSoru || (b && b.disabled)) return null; return { s: jpAktifSoru, y: i !== jpAktifSoru._dogruIndex }; }, c => { if (c && c.y) zkEkle(c.s); });
          yoSar('yagmurSecenekSec', (s, d, b) => (b && b.disabled) ? null : { k: yagmurAktifKelime, y: s !== d }, c => { if (c && c.y) zkEkle(c.k); });
          yoSar('asmacaHarfSec', () => ({ y: asmacaYanlisSayisi, k: asmacaKelimeler[asmacaAktifIndex] }), c => { if (c && c.y < 6 && asmacaYanlisSayisi >= 6) zkEkle(c.k); });
          yoSar('kelimebulTahminGonder', () => ({ d: kelimebulDenemeSayisi, k: kelimebulKelimeler[kelimebulAktifIndex] }), c => {
            if (c && c.d < 6 && kelimebulDenemeSayisi >= 6 && document.getElementById('kbIpucu').innerHTML.indexOf('Doğrusu') !== -1) zkEkle(c.k);
          });
          yoSar('boslukKontrolEt', () => window.boslukSonucDetaylari, onceki => {
            let d = window.boslukSonucDetaylari;
            if (d && d !== onceki) d.forEach((x, i) => { if (!x.dogruMu) zkEkle((window.boslukCizilenKelimeler || [])[i]); });
          });
          yoSar('kpCevapKontrolEt', () => ({ d: kpAktifSoruYanlisDeneme, k: kpSoruListesi[kpSoruIndex] }), c => { if (c && c.d < 3 && kpAktifSoruYanlisDeneme >= 3) zkEkle(c.k); });
          yoSar('kpSonrakineGec', () => kpSoruListesi[kpSoruIndex], k => zkEkle(k));
          yoSar('baYanlisIsle', () => baAktifSoru && baAktifSoru.kelime, k => zkEkle(k));
          // Seri dondurucu (seri hesaplanmadan hemen önce devreye girer)
          yoSar('girisSerisiGuncelleVeGetir', () => yoSeriDondurucuKontrol(), null);
          // Konuşma Pratiği kapanınca sohbet mikrofonunu da kapat
          yoSar('kpModuKapat', null, () => sohbetMikDur());
        }
        yoGuvenli(yoBaglantilariKur);
        yoGuvenli(yoOgretmenButonlariEkle);

        // Giriş yapılınca (otomatik ya da elle) paketi başlat
        let yoBaslatildi = '', yoBaslatTask = null;
        window.dmPrepareMemberState = function () {
          const owner=typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
          if(!owner)return Promise.resolve(false);
          if(yoBaslatildi===owner)return yoBaslatTask||Promise.resolve(true);
          yoBaslatildi=owner;
          yoBaslatTask=(async()=>{
            yoHazirla(owner);
            yoArayuzKur();
            const ok=await window.yoSunucudanAl();
            if(owner===aktifOgrenciAdi)setTimeout(()=>window.dmMemberExperience?.check(),120000);
            return ok;
          })().catch(e=>{console.warn('Öğrenci durumu yüklenemedi',e);return false;});
          return yoBaslatTask;
        };
        setInterval(() => {
          const panel=document.getElementById('panel-alani');
          if(panel?.style.display==='block'&&typeof aktifOgrenciAdi!=='undefined'&&aktifOgrenciAdi)
            window.dmPrepareMemberState();
        }, 1000);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('yoModal').classList.contains('acik')) yoModalKapat(); });
        