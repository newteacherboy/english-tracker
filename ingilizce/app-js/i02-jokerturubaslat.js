
        const JOKER_TANIM = {
          yari:    { ikon:'✂️', ad:'Yarı Yarıya',   renk:'#e0434b' },
          papagan: { ikon:'🦜', ad:'Papağan',       renk:'#2f9e5a' },
          harf:    { ikon:'💡', ad:'Harf Aç',       renk:'#e0a100' },
          dondur:  { ikon:'❄️', ad:'Zaman Dondur',  renk:'#4d96ff' },
          can:     { ikon:'❤️', ad:'Ekstra Can',    renk:'#ff4f7b' },
          kalkan:  { ikon:'🛡️', ad:'Kombo Kalkanı', renk:'#3a7bd5' },
          pas:     { ikon:'🔄', ad:'Pas Geç',       renk:'#8b5cf6' },
          bakis:   { ikon:'👀', ad:'Kısa Bakış',    renk:'#0ea5c6' },
          ikinci:  { ikon:'🎯', ad:'İkinci Şans',   renk:'#f97316' },
          cift:    { ikon:'✨', ad:'Çift Puan',     renk:'#d946ef' }
        };
        const OYUN_JOKERLERI = {
          ky:['pas','kalkan','cift'], jp:['yari','ikinci','cift'], bosluk:['harf','papagan','ikinci'],
          hafiza:['bakis','dondur','kalkan'], yagmur:['dondur','yari','can'], asmaca:['harf','can','pas'],
          kelimebul:['harf','can','pas'], kp:['papagan','pas','kalkan'], ba:['yari','harf','papagan']
        };
        let jk = { oyun:null, kullanilan:new Set(), kalkan:false, ikinci:false, cift:false, donuk:false, bakis:false };

        function jokerTuruBaslat(oyun, konteynerId) {
          jk = { oyun:oyun, kullanilan:new Set(), kalkan:false, ikinci:false, cift:false, donuk:false, bakis:false };
          document.querySelectorAll('.jk-buz').forEach(e => e.remove());
          let bar = document.getElementById('jkBar');
          if (!bar) { bar = document.createElement('div'); bar.id = 'jkBar'; }
          let hedef = document.getElementById(konteynerId);
          if (hedef) hedef.appendChild(bar);
          jokerBarCiz();
        }

        function jokerUygunMu(j) {
          if (jk.oyun !== 'ba') return true;
          let tip = (typeof baAktifSoru !== 'undefined' && baAktifSoru) ? baAktifSoru.tip : '';
          if (j === 'yari') return ['kristal','balon','yagmur'].includes(tip);
          if (j === 'harf') return ['bosluk','asmaca'].includes(tip);
          if (j === 'papagan') return tip !== 'hafiza';
          return true;
        }

        function jokerBarCiz() {
          let bar = document.getElementById('jkBar');
          if (!bar || !jk.oyun) return;
          let eskiMesaj = document.getElementById('jkMesaj');
          let mesajHtml = eskiMesaj ? eskiMesaj.outerHTML : '<div class="jk-mesaj" id="jkMesaj"></div>';
          let rozetler = '';
          if (jk.kalkan) rozetler += '<span class="jk-rozet">🛡️ Kalkan aktif</span>';
          if (jk.ikinci) rozetler += '<span class="jk-rozet">🎯 İkinci şans hazır</span>';
          if (jk.cift) rozetler += '<span class="jk-rozet">✨ Sonraki doğru x2</span>';
          bar.innerHTML = '<div class="jk-bar">' + OYUN_JOKERLERI[jk.oyun].map(j => {
            let J = JOKER_TANIM[j];
            return `<button type="button" class="jk-btn${jk.kullanilan.has(j) ? ' kullanildi' : ''}${jokerUygunMu(j) ? '' : ' uygunsuz'}" id="jkb-${j}" style="--jr:${J.renk}" onclick="jokerKullan('${j}')" aria-label="${J.ad} jokeri"><span class="jk-daire">${J.ikon}</span>${J.ad}</button>`;
          }).join('') + `</div><div class="jk-alt"><span>🃏 Kalan joker: ${3 - jk.kullanilan.size}/3</span>${rozetler}</div>` + mesajHtml;
        }

        function jokerMesaj(metin, hata) {
          let m = document.getElementById('jkMesaj');
          if (!m) return;
          m.className = 'jk-mesaj' + (hata ? ' hata' : '');
          m.innerText = metin;
          clearTimeout(window._jkMesajZaman);
          window._jkMesajZaman = setTimeout(() => { let x = document.getElementById('jkMesaj'); if (x) x.innerText = ''; }, 3500);
        }
        function jkSalla(el) { if (!el) return; el.classList.remove('jk-salla'); void el.offsetWidth; el.classList.add('jk-salla'); }
        function jkMerkez(el) { let r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

        function jokerKullan(j) {
          let btn = document.getElementById('jkb-' + j);
          if (jk.kullanilan.has(j)) { jkSalla(btn); jokerMesaj('Bu jokeri bu turda kullandın.', true); return; }
          if (!jokerUygunMu(j)) { jkSalla(btn); jokerMesaj('Bu soru tipinde kullanılamaz.', true); return; }
          let sonuc = JK_ETKI[j]();
          if (typeof sonuc === 'string') { jkSalla(btn); jokerMesaj(sonuc, true); return; }
          jk.kullanilan.add(j);
          jokerBarCiz();
          jkDuyuru(j);
          if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal('kombo', 10);
          setTimeout(sonuc, 850);
        }

        function jkDuyuru(j) {
          let J = JOKER_TANIM[j], d = document.createElement('div');
          d.className = 'jk-duyuru'; d.style.setProperty('--jr', J.renk);
          d.innerHTML = `<div class="jk-halka"></div><div class="jk-d-ikon">${J.ikon}</div><div class="jk-d-ad">${J.ad}!</div>`;
          document.body.appendChild(d); setTimeout(() => d.remove(), 1300);
        }
        function jkUcur(ikon, kaynak, hedef, bitince) {
          if (!kaynak || !hedef) { if (bitince) bitince(); return; }
          let u = document.createElement('div'); u.className = 'jk-ucan'; u.innerText = ikon;
          let k = jkMerkez(kaynak), h = jkMerkez(hedef);
          u.style.left = (k.x - 15) + 'px'; u.style.top = (k.y - 18) + 'px';
          document.body.appendChild(u);
          requestAnimationFrame(() => requestAnimationFrame(() => { u.style.left = (h.x - 15) + 'px'; u.style.top = (h.y - 18) + 'px'; }));
          setTimeout(() => { u.remove(); if (bitince) bitince(); }, 600);
        }
        function jkPatlat(el, ikonlar, adet) {
          if (!el) return;
          let p = jkMerkez(el);
          for (let i = 0; i < (adet || 10); i++) {
            let s = document.createElement('span'); s.className = 'jk-parca'; s.innerText = ikonlar[i % ikonlar.length];
            let a = Math.random() * Math.PI * 2, u = 40 + Math.random() * 60;
            s.style.left = (p.x - 9) + 'px'; s.style.top = (p.y - 12) + 'px';
            s.style.setProperty('--tx', Math.cos(a) * u + 'px'); s.style.setProperty('--ty', Math.sin(a) * u + 'px');
            s.style.setProperty('--tr', (Math.random() * 360 - 180) + 'deg');
            document.body.appendChild(s); setTimeout(() => s.remove(), 1000);
          }
        }
        function jkOrtadaGoster(sinif, icerik, sure) {
          let d = document.createElement('div'); d.className = 'jk-ortada';
          d.innerHTML = `<div class="${sinif}">${icerik}</div>`;
          document.body.appendChild(d); setTimeout(() => d.remove(), sure || 1600);
        }
        function jkKartDegistir(el, degistirFn) {
          if (!el) { degistirFn(); return; }
          el.classList.remove('jk-kart-gir'); el.classList.add('jk-kart-cik');
          setTimeout(() => {
            degistirFn();
            el.classList.remove('jk-kart-cik'); void el.offsetWidth; el.classList.add('jk-kart-gir');
            setTimeout(() => el.classList.remove('jk-kart-gir'), 550);
          }, 420);
        }
        function jkYeniKelime(liste, filtre) {
          let aday = (window.masterKelimeHavuzu || []).filter(filtre).filter(k => !liste.includes(k));
          return aday.length ? aday[Math.floor(Math.random() * aday.length)] : null;
        }

        // Yarı yarıya için: şu anki sorunun, henüz kapanmamış yanlış şık butonları
        function jkYanlisSiklar() {
          let $ = id => document.getElementById(id);
          if (jk.oyun === 'jp') return [0,1,2,3].filter(i => i !== jpAktifSoru._dogruIndex).map(i => $('jpSik' + i)).filter(b => b && !b.disabled);
          if (jk.oyun === 'yagmur') {
            let dogru = yagmurAktifKelime ? (yagmurAktifKelime.turkce || yagmurAktifKelime.tr || '') : '';
            return [...document.querySelectorAll('#yagmurSecenekler .yg-secenek-btn')].filter(b => b.innerText !== dogru && !b.disabled);
          }
          if (jk.oyun === 'ba') {
            let t = baAktifSoru.tip;
            if (t === 'kristal') return [0,1,2,3].filter(i => i !== baAktifSoru._dogruIndex).map(i => $('baKSik' + i)).filter(b => b && !b.disabled);
            if (t === 'balon') return [0,1,2,3].filter(i => i !== baAktifSoru._dogruIndex).map(i => $('baBalon' + i)).filter(b => b && !b.disabled);
            if (t === 'yagmur') return [...document.querySelectorAll('#baYagmurSecenekler .ba-sik-btn')].filter(b => b.innerText !== baAktifSoru._dogruCevap && !b.disabled);
          }
          return [];
        }
        // Yeni soru gelince önceki "kesilmiş" şıkları eski haline döndür
        function jokerSoruTemizle() {
          document.querySelectorAll('.jk-kesildi').forEach(b => { b.classList.remove('jk-kesildi'); b.style.opacity = ''; b.style.transform = ''; });
        }

        // Papağan için: şu an sorulan kelimenin İngilizcesi
        function jkDogruIngilizce() {
          if (jk.oyun === 'bosluk') {
            const active=document.querySelector('#boslukSatirlarContainer .dm-letter-word:has(.dm-letter-slots button:not(:disabled))');if(active)return active.dataset.word||'';
            let satirlar = [...document.querySelectorAll('#boslukSatirlarContainer > div')];
            let idx = satirlar.findIndex(s => [...s.querySelectorAll('input:not(:disabled)')].some(i => !i.value.trim()));
            let k = (window.boslukCizilenKelimeler || [])[idx];
            return k ? (k.ingilizce || k.en || '') : '';
          }
          if (jk.oyun === 'kp') return kpAktifSoru ? kpAktifSoru.beklenenCevap : '';
          if (jk.oyun === 'ba') return baAktifSoru ? (baAktifSoru.kelime.ingilizce || baAktifSoru.kelime.en || '') : '';
          return '';
        }

        // Harf Aç: kutu tipli oyunlarda ilk boş kutuyu doldurur, klavyeli oyunlarda harfe basar
        function jkHarfAc() {
          if(jk.oyun==='bosluk'){const slot=document.querySelector('#boslukSatirlarContainer .dm-letter-slots button:not(:disabled)');if(!slot)return 'Açılacak boş kutu kalmadı.';return ()=>slot.dmReveal?.();}
          if (jk.oyun === 'bosluk' || (jk.oyun === 'ba' && baAktifSoru.tip === 'bosluk')) {
            let secici = jk.oyun === 'bosluk' ? '#boslukSatirlarContainer input:not(:disabled)' : '#baBoslukHarfler .ba-bosluk-input:not(:disabled)';
            let inp = [...document.querySelectorAll(secici)].find(i => !i.value.trim());
            if (!inp) return 'Açılacak boş kutu kalmadı.';
            return () => jkUcur('💡', document.getElementById('jkb-harf'), inp, () => {
              inp.value = jk.oyun === 'bosluk' ? inp.dataset.dogruHarf : inp.dataset.dogru;
              inp.disabled = true; inp.classList.add('jk-harf-acildi'); jkPatlat(inp, ['✨','⭐'], 10);
            });
          }
          if (jk.oyun === 'asmaca' || (jk.oyun === 'ba' && baAktifSoru.tip === 'asmaca')) {
            let asm = jk.oyun === 'asmaca';
            let kelime = asm ? asmacaAktifKelime : baAktifSoru._enKelime;
            let tahmin = asm ? asmacaTahminEdilenHarfler : baAsmacaTahmin;
            let kalan = [...new Set(kelime.split('').filter(c => /[A-Z]/.test(c) && !tahmin.includes(c)))];
            if (!kalan.length) return 'Açılacak harf kalmadı.';
            let harf = kalan[Math.floor(Math.random() * kalan.length)];
            let btn = [...document.querySelectorAll(asm ? '#asmacaKlavye .as-harf-btn' : '#baAsmacaKlavye .ba-harf-btn')].find(b => b.innerText === harf);
            return () => jkUcur('💡', document.getElementById('jkb-harf'), btn, () => {
              jkPatlat(btn, ['✨','⭐'], 10);
              if (asm) asmacaHarfSec(harf, btn); else baAsmacaHarfSec(harf, btn);
            });
          }
          if (jk.oyun === 'kelimebul') {
            let ipucu = document.getElementById('kbIpucu');
            let acilan = [...ipucu.querySelectorAll('.jk-kb-ipucu')].map(e => Number(e.dataset.i));
            let kalan = kelimebulHedef.split('').map((c, i) => i).filter(i => !acilan.includes(i));
            if (kalan.length <= 1) return 'Daha fazla harf açılamaz.';
            let i = kalan[Math.floor(Math.random() * kalan.length)];
            return () => jkUcur('💡', document.getElementById('jkb-harf'), ipucu, () => {
              ipucu.insertAdjacentHTML('beforeend', `<div class="jk-kb-ipucu" data-i="${i}">🔓 ${i + 1}. harf: <b>${kelimebulHedef[i]}</b></div>`);
              jkPatlat(ipucu, ['✨','⭐'], 10);
            });
          }
          return 'Bu soruda harf açılamaz.';
        }

        const JK_ETKI = {
          yari() {
            let y = jkYanlisSiklar();
            if (y.length < 2) return 'Silinecek şık kalmadı.';
            return () => y.slice(0, 2).forEach((b, i) => setTimeout(() => {
              if (b.disabled) return;
              if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
              b.style.overflow = 'hidden';
              let m = document.createElement('span'); m.className = 'jk-makas'; m.innerText = '✂️'; b.appendChild(m);
              let c = document.createElement('span'); c.className = 'jk-kesik'; b.appendChild(c);
              b.classList.add('jk-kesildi'); b.disabled = true;
              setTimeout(() => { m.remove(); c.remove(); }, 1100);
            }, i * 250));
          },
          papagan() {
            let kelime = jkDogruIngilizce();
            if (!kelime) return 'Şu an okunacak kelime yok.';
            return () => {
              let p = document.createElement('div'); p.className = 'jk-papagan';
              p.innerHTML = `<div class="balon"><span class="dalga"></span>🔊 ${guvenliMetin(kelime)}</div><div class="kus">🦜</div>`;
              document.body.appendChild(p);
              setTimeout(() => { if (typeof genelSesOku === 'function') genelSesOku(kelime); }, 450);
              setTimeout(() => p.remove(), 3100);
            };
          },
          harf() { return jkHarfAc(); },
          dondur() {
            if (jk.donuk) return 'Zaman zaten donuk.';
            return () => {
              jk.donuk = true;
              let buz = document.createElement('div'); buz.className = 'jk-buz';
              buz.innerHTML = '<div class="jk-buz-sayi">5</div>';
              for (let i = 0; i < 16; i++) {
                let k = document.createElement('span'); k.className = 'jk-kar'; k.innerText = '❄️';
                k.style.left = (Math.random() * 95) + '%'; k.style.animationDuration = (2.5 + Math.random() * 2.5) + 's'; k.style.animationDelay = (Math.random() * 1.5) + 's';
                buz.appendChild(k);
              }
              document.body.appendChild(buz);
              let n = 5, t = setInterval(() => {
                n--; let s = buz.querySelector('.jk-buz-sayi'); if (s) s.innerText = n;
                if (n <= 0) { clearInterval(t); jk.donuk = false; buz.classList.add('eriyor'); setTimeout(() => buz.remove(), 600); }
              }, 1000);
            };
          },
          can() {
            let ayar = { yagmur:['yagmurCan', 3, 'yagmurCanInfo', yagmurCanGoster], asmaca:['asmacaCan', 5, 'asmacaCanInfo', asmacaCanGoster], kelimebul:['kelimebulCan', 5, 'kbCanInfo', kelimebulCanGoster] }[jk.oyun];
            if (!ayar) return 'Bu oyunda can yok.';
            let simdiki = { yagmurCan, asmacaCan, kelimebulCan }[ayar[0]];
            if (simdiki >= ayar[1]) return 'Canların zaten dolu.';
            return () => jkUcur('❤️', document.getElementById('jkb-can'), document.getElementById(ayar[2]), () => {
              if (jk.oyun === 'yagmur') yagmurCan++; else if (jk.oyun === 'asmaca') asmacaCan++; else kelimebulCan++;
              ayar[3](); jkPatlat(document.getElementById(ayar[2]), ['💖','✨'], 8);
            });
          },
          kalkan() {
            return () => jkUcur('🛡️', document.getElementById('jkb-kalkan'), document.getElementById('jkBar'), () => {
              jk.kalkan = true; jokerBarCiz(); jkPatlat(document.getElementById('jkBar'), ['💙','✨'], 8);
            });
          },
          pas() {
            let $ = id => document.getElementById(id);
            if (jk.oyun === 'ky') {
              if ($('kySik0').disabled) return 'Cevap verdikten sonra pas geçilemez.';
              let yeni = jkYeniKelime(kySorularListesi, k => Number(k.sinif) === Number(kyAktifSinif) && kySecilenUniteler.includes(Number(k.unite)));
              if (!yeni) return 'Yeni kelime kalmadı.';
              return () => jkKartDegistir($('kySoruKelimeText').parentElement, () => { kySorularListesi[kySoruIndex] = yeni; kySoruGoster(); });
            }
            if (jk.oyun === 'asmaca') {
              let yeni = jkYeniKelime(asmacaKelimeler, k => Number(k.sinif) === Number(asmacaAktifSinif) && asmacaSecilenUniteler.includes(Number(k.unite)) && (k.ingilizce || k.en || '').replace(/[^a-zA-Z]/g, '').length >= 3);
              if (!yeni) return 'Yeni kelime kalmadı.';
              return () => jkKartDegistir($('asmacaBlanklar'), () => { asmacaKelimeler[asmacaAktifIndex] = yeni; asmacaSonrakiKelime(); });
            }
            if (jk.oyun === 'kelimebul') {
              let yeni = jkYeniKelime(kelimebulKelimeler, k => Number(k.sinif) === Number(kelimebulAktifSinif) && kelimebulSecilenUniteler.includes(Number(k.unite)) && /^[a-zA-Z]{3,9}$/.test((k.ingilizce || k.en || '').trim()));
              if (!yeni) return 'Yeni kelime kalmadı.';
              return () => jkKartDegistir($('kbIpucu'), () => { kelimebulKelimeler[kelimebulAktifIndex] = yeni; kelimebulSonrakiKelime(); });
            }
            if (jk.oyun === 'kp') {
              let yeni = jkYeniKelime(kpSoruListesi, k => (k.ingilizce || k.en) && (k.turkce || k.tr));
              if (!yeni) return 'Yeni kelime kalmadı.';
              return () => jkKartDegistir($('kpCardWrap'), () => { kpSoruListesi[kpSoruIndex] = yeni; kpSoruGoster(); });
            }
            return 'Bu oyunda pas geçilemez.';
          },
          bakis() {
            if (jk.bakis) return 'Kartlar zaten açık.';
            return () => {
              jkOrtadaGoster('jk-goz', '👀', 900);
              setTimeout(() => {
                jk.bakis = true;
                let acilanlar = [];
                hafizaKartlar.forEach((k, i) => { if (!k.acik && !k.eslesti) { k.acik = true; acilanlar.push(i); } });
                hafizaKartlariCiz();
                setTimeout(() => {
                  acilanlar.forEach(i => { hafizaKartlar[i].acik = false; });
                  hafizaKartlariCiz(); jk.bakis = false;
                }, 2000);
              }, 450);
            };
          },
          ikinci() {
            return () => { jkOrtadaGoster('jk-geri', '↺', 1000); jk.ikinci = true; jokerBarCiz(); jokerMesaj('🎯 Bir yanlışın affedilecek!'); };
          },
          cift() {
            return () => { jkOrtadaGoster('jk-damga', 'x2', 1600); setTimeout(() => jkPatlat(document.getElementById('jkBar'), ['🪙','⭐','✨'], 14), 450); jk.cift = true; jokerBarCiz(); };
          }
        };

        // Oyun kodlarının çağıracağı yardımcılar
        function jokerKalkanTuket() {
          if (!jk.kalkan) return false;
          jk.kalkan = false; jokerBarCiz(); jokerMesaj('🛡️ Kalkan komboyu korudu!');
          jkPatlat(document.getElementById('jkBar'), ['🛡️','💙'], 8);
          return true;
        }
        function jokerIkinciTuket() {
          if (!jk.ikinci) return false;
          jk.ikinci = false; jokerBarCiz(); return true;
        }
        function jokerCiftCarpan() {
          if (!jk.cift) return 1;
          jk.cift = false; jokerBarCiz(); jokerMesaj('✨ Çift puan kazandın!');
          return 2;
        }
        