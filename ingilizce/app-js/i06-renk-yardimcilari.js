
(function () {
/* ===================== RENK YARDIMCILARI ===================== */
function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function karis(h, hedef, t) { let a = rgb(h), b = rgb(hedef); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const acik = (c, t) => karis(c, '#ffffff', t), koyu = (c, t) => karis(c, '#000000', t);

/* ===================== KATALOG ===================== */
const TEN = [['#ffe0c7','Açık'],['#f6c9a3','Buğday'],['#e3a77b','Esmer'],['#c68655','Kumral'],['#8d5a3b','Koyu'],['#5e3a24','Çok koyu']];
const KATALOG = {
  ten:     { ad:'Ten', ikon:'🖐️', liste: TEN.map((t, i) => ({ id:String(i), ad:t[1], f:0 })) },
  sac:     { ad:'Saç', ikon:'💇', liste: [
    { id:'kisa', ad:'Kısa', f:0, c:'e' }, { id:'dalgali', ad:'Dalgalı', f:0, c:'e' }, { id:'kirpi', ad:'Kirpi', f:30, c:'e' }, { id:'kivircik', ad:'Kıvırcık', f:40 },
    { id:'uzun', ad:'Uzun', f:0, c:'k' }, { id:'atkuyrugu', ad:'At kuyruğu', f:0, c:'k' }, { id:'bob', ad:'Kısa küt', f:25, c:'k' }, { id:'topuz', ad:'Topuz', f:35, c:'k' }, { id:'orgu', ad:'Örgülü', f:45, c:'k' } ] },
  sacRenk: { ad:'Saç rengi', ikon:'🎨', liste: [
    { id:'#2b2331', ad:'Siyah', f:0 }, { id:'#6b4226', ad:'Kahve', f:0 }, { id:'#e8b64c', ad:'Sarı', f:0 }, { id:'#c2502a', ad:'Kızıl', f:20 },
    { id:'#ff7eb6', ad:'Pembe', f:40 }, { id:'#4d96ff', ad:'Mavi', f:40 }, { id:'#8b5cf6', ad:'Mor', f:50 }, { id:'#34d399', ad:'Nane', f:50 }, { id:'gokkusagi', ad:'Gökkuşağı', f:120 } ] },
  goz:     { ad:'Gözler', ikon:'👀', liste: [ { id:'normal', ad:'Normal', f:0 }, { id:'mutlu', ad:'Mutlu', f:0 }, { id:'buyuk', ad:'Kocaman', f:20 }, { id:'kirp', ad:'Göz kırpma', f:25 }, { id:'yildiz', ad:'Yıldız', f:40 }, { id:'kalp', ad:'Kalp', f:40 } ] },
  agiz:    { ad:'Ağız', ikon:'👄', liste: [ { id:'gulumse', ad:'Gülümseme', f:0 }, { id:'kocaman', ad:'Kahkaha', f:0 }, { id:'dil', ad:'Dil çıkarma', f:20 }, { id:'saskin', ad:'Şaşkın', f:20 }, { id:'kedi', ad:'Kedi ağzı', f:30 } ] },
  kiyafet: { ad:'Kıyafet', ikon:'👕', liste: [
    { id:'tisort-mor', ad:'Mor tişört', f:0 }, { id:'tisort-mavi', ad:'Mavi tişört', f:0 }, { id:'tisort-yesil', ad:'Yeşil tişört', f:10 }, { id:'forma', ad:'Okul forması', f:30 },
    { id:'kazak', ad:'Çizgili kazak', f:35 }, { id:'esofman', ad:'Eşofman', f:40 }, { id:'buyucu', ad:'Büyücü cübbesi', f:80 }, { id:'kahraman', ad:'Süper kahraman', f:90 }, { id:'astronot', ad:'Astronot', f:120 } ] },
  sapka:   { ad:'Şapka', ikon:'🎩', liste: [ { id:'yok', ad:'Yok', f:0 }, { id:'kep', ad:'Kep', f:25 }, { id:'bere', ad:'Bere', f:25 }, { id:'kulaklik', ad:'Kulaklık', f:40 }, { id:'cicek', ad:'Çiçek taç', f:35 }, { id:'parti', ad:'Parti şapkası', f:30 }, { id:'tac', ad:'Taç', f:80 }, { id:'buyucu', ad:'Büyücü şapkası', f:90 } ] },
  gozluk:  { ad:'Gözlük', ikon:'👓', liste: [ { id:'yok', ad:'Yok', f:0 }, { id:'yuvarlak', ad:'Yuvarlak', f:25 }, { id:'gunes', ad:'Güneş gözlüğü', f:35 }, { id:'yildiz', ad:'Yıldız gözlük', f:50 } ] },
  dost:    { ad:'Minik dost', ikon:'🐾', liste: [ { id:'yok', ad:'Yok', f:0 }, { id:'papagan', ad:'Papağan', f:60 }, { id:'kedi', ad:'Kedicik', f:60 }, { id:'yildizcik', ad:'Yıldızcık', f:70 } ] },
  detay:   { ad:'Yüz detayı', ikon:'✨', liste: [ { id:'yanak', ad:'Pembe yanak', f:0 }, { id:'yok', ad:'Sade', f:0 }, { id:'cil', ad:'Çiller', f:15 }, { id:'ikisi', ad:'Çil + yanak', f:20 } ] },
  arka:    { ad:'Arka plan', ikon:'🖼️', liste: [ { id:'mor', ad:'Lila', f:0 }, { id:'pembe', ad:'Pembe', f:0 }, { id:'mavi', ad:'Gökyüzü', f:10 }, { id:'karnaval', ad:'Karnaval', f:40 }, { id:'okyanus', ad:'Okyanus', f:40 }, { id:'orman', ad:'Orman', f:40 }, { id:'gunbatimi', ad:'Gün batımı', f:50 }, { id:'uzay', ad:'Uzay', f:70 }, { id:'gokkusagi', ad:'Gökkuşağı', f:80 } ] },
  cerceve: { ad:'Çerçeve', ikon:'⭕', liste: [ { id:'yok', ad:'Yok', f:0 }, { id:'altin', ad:'Altın', f:60 }, { id:'neon', ad:'Neon', f:70 }, { id:'gokkusagi', ad:'Gökkuşağı', f:100 } ] }
};
const VARSAYILAN = {
  k: { ten:'1', sac:'uzun', sacRenk:'#6b4226', goz:'normal', agiz:'gulumse', kiyafet:'tisort-mor', sapka:'yok', gozluk:'yok', dost:'yok', detay:'yanak', arka:'mor', cerceve:'yok' },
  e: { ten:'1', sac:'kisa', sacRenk:'#2b2331', goz:'normal', agiz:'gulumse', kiyafet:'tisort-mavi', sapka:'yok', gozluk:'yok', dost:'yok', detay:'yanak', arka:'mavi', cerceve:'yok' }
};

/* Dolap ve diğer bloklar karakter çizimine erişebilsin */
window.avatarSVG = avatarSVG; window.KA_KATALOG = KATALOG; window.KA_TEN = TEN; window.KA_VARSAYILAN = VARSAYILAN; window.kaKoyu = koyu; window.kaAcik = acik;

/* ===================== ÇİZİM ===================== */
let uidSayac = 0;
function avatarSVG(s, stil, px, cins) {
  let uid = 'a' + (++uidSayac), defs = [], g = 0;
  const D = c => {
    if (c === 'gokkusagi') return `url(#rb${uid})`;
    if (stil !== 'c') return c;
    let id = `g${uid}_${g++}`;
    defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="${acik(c, .3)}"/><stop offset="1" stop-color="${koyu(c, .1)}"/></linearGradient>`);
    return `url(#${id})`;
  };
  const S = stil === 'b' ? ' stroke="#3b2c66" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"' : '';
  const P = (d, c, ek) => `<path d="${d}" fill="${D(c)}"${S}${ek || ''}/>`;
  const C = (x, y, r, c, ek) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${D(c)}"${S}${ek || ''}/>`;
  const E = (x, y, rx, ry, c, ek) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${D(c)}"${S}${ek || ''}/>`;

  let ten = TEN[Number(s.ten) || 0][0], tenK = koyu(ten, .12);
  let sac = s.sacRenk, sacK = sac === 'gokkusagi' ? '#6b21a8' : koyu(sac, .25);
  defs.push(`<linearGradient id="rb${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".25" stop-color="#ffd93d"/><stop offset=".5" stop-color="#6bcb77"/><stop offset=".75" stop-color="#4d96ff"/><stop offset="1" stop-color="#a06bff"/></linearGradient>`);
  defs.push(`<clipPath id="cl${uid}"><circle cx="100" cy="100" r="98"/></clipPath>`);
  defs.push(`<clipPath id="bc${uid}"><path d="M34 200 C34 166 62 148 100 148 C138 148 166 166 166 200 Z"/></clipPath>`);

  /* arka plan */
  let arka = '';
  const AR = { mor:'#efe6ff', pembe:'#ffe0ef', mavi:'#dbeafe' };
  if (AR[s.arka]) arka = `<rect width="200" height="200" fill="${AR[s.arka]}"/>`;
  else if (s.arka === 'karnaval') { arka = `<rect width="200" height="200" fill="#ffe066"/>`; for (let i = -1; i < 12; i++) arka += `<rect x="${i * 24}" y="-20" width="12" height="260" fill="#ff8fb8" transform="rotate(18 100 100)"/>`; }
  else if (s.arka === 'okyanus') { defs.push(`<linearGradient id="ok${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bae6fd"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient>`); arka = `<rect width="200" height="200" fill="url(#ok${uid})"/><path d="M0 150 Q25 138 50 150 T100 150 T150 150 T200 150 V200 H0 Z" fill="#fff" opacity=".35"/><circle cx="36" cy="46" r="5" fill="#fff" opacity=".6"/><circle cx="48" cy="62" r="3" fill="#fff" opacity=".6"/>`; }
  else if (s.arka === 'orman') { arka = `<rect width="200" height="200" fill="#dcfce7"/><circle cx="20" cy="170" r="40" fill="#86efac"/><circle cx="180" cy="165" r="44" fill="#86efac"/><circle cx="170" cy="40" r="16" fill="#fde68a"/>`; }
  else if (s.arka === 'gunbatimi') { defs.push(`<linearGradient id="gb${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbcfe8"/><stop offset=".6" stop-color="#fdba74"/><stop offset="1" stop-color="#f97316"/></linearGradient>`); arka = `<rect width="200" height="200" fill="url(#gb${uid})"/><circle cx="100" cy="150" r="46" fill="#fde68a" opacity=".7"/>`; }
  else if (s.arka === 'uzay') { arka = `<rect width="200" height="200" fill="#1e1b4b"/>`; [[30,30],[160,26],[178,90],[20,110],[150,60],[46,70],[120,20]].forEach(([x, y], i) => arka += `<circle cx="${x}" cy="${y}" r="${i % 2 ? 1.6 : 2.4}" fill="#fff"/>`); arka += `<circle cx="168" cy="150" r="14" fill="#a78bfa"/><ellipse cx="168" cy="150" rx="22" ry="5" fill="none" stroke="#fde68a" stroke-width="2.5"/>`; }
  else if (s.arka === 'gokkusagi') { ['#a06bff','#4d96ff','#6bcb77','#ffd93d','#ff6b6b','#fff5fb'].forEach((c, i) => arka += `<circle cx="100" cy="200" r="${200 - i * 26}" fill="${c}"/>`); }

  /* arka saç */
  let arkaSac = '';
  if (s.sac === 'uzun') arkaSac = P('M50 92 C44 130 46 168 60 186 L140 186 C154 168 156 130 150 92 Z', sac);
  if (s.sac === 'bob') arkaSac = P('M50 94 C47 118 51 134 60 140 L140 140 C149 134 153 118 150 94 Z', sac);
  if (s.sac === 'atkuyrugu') arkaSac = P('M138 56 C172 58 180 104 164 136 C158 118 150 100 142 84 Z', sac) + C(142, 62, 6, '#ff5d8f');
  if (s.sac === 'topuz') arkaSac = C(100, 42, 18, sac) + `<rect x="88" y="54" width="24" height="6" rx="3" fill="#ff5d8f"${S}/>`;
  if (s.sac === 'orgu') { [58, 142].forEach(x => { [116, 131, 146, 161].forEach(y => arkaSac += C(x, y, 8.5, sac)); arkaSac += C(x, 173, 5, '#ff5d8f'); }); }
  if (s.sac === 'kivircik') { [[58,80,18],[72,58,20],[100,48,22],[128,58,20],[142,80,18]].forEach(([x, y, r]) => arkaSac += C(x, y, r, sac)); if (cins === 'k') [[54,112,16],[146,112,16],[58,138,14],[142,138,14]].forEach(([x, y, r]) => arkaSac += C(x, y, r, sac)); }

  /* kıyafet */
  let k = s.kiyafet, govde = '', govdeRenk = '#8b5cf6', ayrinti = '', pelerin = '';
  if (k.startsWith('tisort')) { govdeRenk = { 'tisort-mor':'#a06bff', 'tisort-mavi':'#4d96ff', 'tisort-yesil':'#34b36a' }[k]; ayrinti = `<path d="M88 149 Q100 162 112 149" fill="none" stroke="${koyu(govdeRenk, .25)}" stroke-width="3"/>`; }
  if (k === 'forma') { govdeRenk = '#f8fafc'; ayrinti = P('M86 150 L100 164 L94 172 L80 157 Z', '#e2e8f0') + P('M114 150 L100 164 L106 172 L120 157 Z', '#e2e8f0') + P('M97 163 L103 163 L106 186 L100 194 L94 186 Z', '#e0434b'); }
  if (k === 'kazak') { govdeRenk = '#ff8a3d'; ayrinti = `<rect x="30" y="168" width="140" height="9" fill="#fff" opacity=".85"/><rect x="30" y="184" width="140" height="9" fill="#fff" opacity=".85"/>`; }
  if (k === 'esofman') { govdeRenk = '#0ea5e9'; ayrinti = `<line x1="100" y1="152" x2="100" y2="200" stroke="#e0f2fe" stroke-width="3"/><rect x="46" y="160" width="7" height="44" fill="#fff" transform="rotate(-18 50 180)"/><rect x="147" y="160" width="7" height="44" fill="#fff" transform="rotate(18 150 180)"/>`; }
  if (k === 'buyucu') { govdeRenk = '#6d28d9'; ayrinti = `<text x="64" y="186" font-size="14">⭐</text><text x="120" y="176" font-size="11">✨</text>` + P('M84 150 Q100 170 116 150 L112 148 Q100 160 88 148 Z', '#fde68a'); }
  if (k === 'kahraman') { govdeRenk = '#2563eb'; pelerin = P('M40 200 C28 168 50 150 72 150 L128 150 C150 150 172 168 160 200 Z', '#e0434b'); ayrinti = P('M100 164 L104 173 L114 174 L106 180 L109 190 L100 184 L91 190 L94 180 L86 174 L96 173 Z', '#ffd166'); }
  if (k === 'astronot') { govdeRenk = '#f1f5f9'; ayrinti = `<rect x="82" y="166" width="36" height="24" rx="5" fill="#cbd5e1"${S}/><circle cx="92" cy="178" r="4" fill="#e0434b"/><circle cx="108" cy="178" r="4" fill="#34b36a"/>` + `<rect x="78" y="144" width="44" height="10" rx="5" fill="#94a3b8"${S}/>`; }
  { let _h = { P, C, E, D, S, uid, defs };
    let _tk = (s.tek && s.tek !== 'yok') ? s.tek : ((s.ust && s.ust !== 'yok') ? s.ust : '');
    if (_tk && typeof dolapUstCiz === 'function') { try { let _r = dolapUstCiz(_tk, _h); govdeRenk = _r.renk; ayrinti = _r.ayrinti; pelerin = _r.pelerin || ''; } catch (e) {} }
    if (s.dis && s.dis !== 'yok' && typeof dolapDisCiz === 'function') { try { ayrinti += dolapDisCiz(s.dis, _h); } catch (e) {} } }
  govde = pelerin + P('M34 200 C34 166 62 148 100 148 C138 148 166 166 166 200 Z', govdeRenk) + `<g clip-path="url(#bc${uid})">${ayrinti}</g>`;

  /* boyun, kulak, kafa */
  let kafa = P('M88 126 L88 146 Q100 153 112 146 L112 126 Z', tenK) + C(53, 98, 9, ten) + C(147, 98, 9, ten) + E(100, 92, 48, 46, ten);
  if (stil === 'c') kafa += `<ellipse cx="82" cy="74" rx="18" ry="10" fill="#fff" opacity=".22"/>`;

  /* yüz */
  let yuz = '';
  let kas = `<path d="M74 82 Q82 77 90 81 M110 81 Q118 77 126 82" fill="none" stroke="${sacK}" stroke-width="3.2" stroke-linecap="round"/>`;
  const gozNormal = (x, r = 1) => {r*=Math.max(.8,Math.min(1.3,Number(s.gozBoy)||1));return `<ellipse cx="${x}" cy="97" rx="${5 * r}" ry="${6.5 * r}" fill="${/^#[0-9a-f]{6}$/i.test(s.gozRenk||'')?s.gozRenk:'#2b2331'}"/><circle cx="${x + 1.8 * r}" cy="${94.6 - (r - 1) * 2}" r="${1.9 * r}" fill="#fff"/>`};
  const kavis = x => `<path d="M${x - 6} 98 Q${x} 90 ${x + 6} 98" fill="none" stroke="#2b2331" stroke-width="3.2" stroke-linecap="round"/>`;
  const yildizYol = (x, y, r) => { let d = ''; for (let i = 0; i < 10; i++) { let a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(1) + ' ' + (y + rr * Math.sin(a)).toFixed(1) + ' '; } return d + 'Z'; };
  const kalpYol = (x, y, r) => `M${x} ${y + r * .9} C${x - r * 1.6} ${y - r * .1} ${x - r * .8} ${y - r * 1.3} ${x} ${y - r * .4} C${x + r * .8} ${y - r * 1.3} ${x + r * 1.6} ${y - r * .1} ${x} ${y + r * .9} Z`;
  if (s.goz === 'normal') yuz += gozNormal(82) + gozNormal(118);
  if (s.goz === 'buyuk') yuz += gozNormal(82, 1.35) + gozNormal(118, 1.35) + `<circle cx="79" cy="100" r="1.3" fill="#fff"/><circle cx="115" cy="100" r="1.3" fill="#fff"/>`;
  if (s.goz === 'mutlu') yuz += kavis(82) + kavis(118);
  if (s.goz === 'kirp') yuz += gozNormal(82) + `<path d="M112 97 Q118 101 124 97" fill="none" stroke="#2b2331" stroke-width="3.2" stroke-linecap="round"/>`;
  if (s.goz === 'yildiz') yuz += `<path d="${yildizYol(82, 97, 8)}" fill="#ffd166" stroke="#2b2331" stroke-width="1.5"/><path d="${yildizYol(118, 97, 8)}" fill="#ffd166" stroke="#2b2331" stroke-width="1.5"/>`;
  if (s.goz === 'kalp') yuz += `<path d="${kalpYol(82, 97, 7)}" fill="#ff5d8f"/><path d="${kalpYol(118, 97, 7)}" fill="#ff5d8f"/>`;
  if (cins === 'k' && ['normal', 'buyuk', 'kirp'].includes(s.goz)) yuz += `<path d="M76 92 L71 88 M77 95 L72 93" stroke="#2b2331" stroke-width="2" stroke-linecap="round"/>` + (s.goz !== 'kirp' ? `<path d="M124 92 L129 88 M123 95 L128 93" stroke="#2b2331" stroke-width="2" stroke-linecap="round"/>` : '');
  yuz += `<path d="M97 105 Q100 108 103 105" fill="none" stroke="${koyu(ten, .25)}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (s.detay === 'yanak' || s.detay === 'ikisi') yuz += `<ellipse cx="70" cy="110" rx="7.5" ry="4.5" fill="#ff8fab" opacity=".55"/><ellipse cx="130" cy="110" rx="7.5" ry="4.5" fill="#ff8fab" opacity=".55"/>`;
  if (s.detay === 'cil' || s.detay === 'ikisi') [[72,104],[77,108],[68,108],[128,104],[123,108],[132,108]].forEach(([x, y]) => yuz += `<circle cx="${x}" cy="${y}" r="1.3" fill="${koyu(ten, .35)}"/>`);
  if (s.agiz === 'gulumse') yuz += `<path d="M91 115 Q100 123 109 115" fill="none" stroke="#7a2e2e" stroke-width="3" stroke-linecap="round"/>`;
  if (s.agiz === 'kocaman') yuz += `<path d="M88 113 Q100 132 112 113 Z" fill="#7a2e2e"/><path d="M93 121 Q100 128 107 121 Q100 125 93 121 Z" fill="#ff8fab"/><path d="M90 114 L110 114 L108 117 L92 117 Z" fill="#fff"/>`;
  if (s.agiz === 'dil') yuz += `<path d="M91 115 Q100 122 109 115" fill="none" stroke="#7a2e2e" stroke-width="3" stroke-linecap="round"/><path d="M96 119 Q100 129 104 119 Z" fill="#ff6b8a"/>`;
  if (s.agiz === 'saskin') yuz += `<ellipse cx="100" cy="118" rx="4.5" ry="5.5" fill="#7a2e2e"/>`;
  if (s.agiz === 'kedi') yuz += `<path d="M91 115 Q95.5 120 100 115 Q104.5 120 109 115" fill="none" stroke="#7a2e2e" stroke-width="3" stroke-linecap="round"/>`;
  yuz = kas + yuz;

  /* ön saç */
  let onSac = '';
  const ON = {
    kisa: 'M54 88 C52 56 76 42 100 42 C126 42 150 58 146 88 C138 76 128 70 116 70 C108 76 94 76 86 70 C72 72 60 78 54 88 Z',
    kirpi: 'M52 90 L56 58 L68 66 L74 44 L88 58 L100 36 L112 58 L126 44 L132 66 L144 58 L148 90 C135 74 118 68 100 70 C82 68 65 74 52 90 Z',
    dalgali: 'M50 92 C48 56 76 40 100 40 C126 40 152 56 150 92 C142 80 136 70 124 72 C118 64 108 70 100 66 C92 72 82 64 74 72 C64 70 56 80 50 92 Z',
    uzun: 'M52 98 C48 58 76 42 100 42 C124 42 152 58 148 98 C144 80 132 64 104 60 C100 70 90 76 80 76 C66 78 56 86 52 98 Z',
    bob: 'M50 104 C46 58 74 42 100 42 C126 42 154 58 150 104 C148 94 144 86 140 80 L60 80 C56 86 52 94 50 104 Z',
    atkuyrugu: 'M54 90 C52 56 78 42 104 42 C128 42 150 58 146 86 C130 70 112 64 92 66 C76 68 62 76 54 90 Z',
    topuz: 'M54 90 C52 58 76 46 100 46 C124 46 148 58 146 90 C136 74 120 68 100 68 C80 68 64 74 54 90 Z',
    orgu: 'M52 96 C48 58 76 44 100 44 C124 44 152 58 148 96 C142 78 124 66 100 64 C76 66 58 78 52 96 Z'
  };
  if (ON[s.sac]) onSac = P(ON[s.sac], sac);
  if (s.sac === 'uzun') onSac += P('M52 86 C47 102 49 120 56 130 C58 114 60 100 65 90 Z', sac) + P('M148 86 C153 102 151 120 144 130 C142 114 140 100 135 90 Z', sac);
  if (s.sac === 'kivircik') { onSac = P('M56 84 C56 58 78 46 100 46 C122 46 144 58 144 84 Z', sac); [[60,80],[72,68],[86,62],[100,60],[114,62],[128,68],[140,80]].forEach(([x, y]) => onSac += C(x, y, 11, sac)); }
  if (stil === 'c' && onSac && s.sac !== 'kivircik') onSac += `<ellipse cx="88" cy="54" rx="16" ry="5" fill="#fff" opacity=".25" transform="rotate(-12 88 54)"/>`;

  /* şapka */
  let sapka = '';
  if (s.sapka === 'kep') sapka = P('M52 76 C52 46 76 32 100 32 C124 32 148 46 148 76 Z', '#e0434b') + P('M96 72 C120 66 152 68 166 80 C152 86 120 84 96 80 Z', koyu('#e0434b', .15)) + C(100, 33, 5, '#fff');
  if (s.sapka === 'bere') sapka = P('M50 80 C50 44 74 30 100 30 C126 30 150 44 150 80 Z', '#34b36a') + `<rect x="46" y="72" width="108" height="16" rx="8" fill="${D('#fde68a')}"${S}/>` + C(100, 28, 10, '#fde68a');
  if (s.sapka === 'tac') sapka = P('M62 60 L70 28 L86 46 L100 20 L114 46 L130 28 L138 60 Z', '#f5b700') + C(100, 44, 4.5, '#e0434b') + C(80, 50, 3.5, '#4d96ff') + C(120, 50, 3.5, '#34b36a');
  if (s.sapka === 'buyucu') sapka = P('M58 72 L114 2 L146 72 Z', '#6d28d9') + E(100, 72, 58, 11, '#5b21b6') + `<text x="98" y="48" font-size="13">⭐</text><text x="84" y="64" font-size="9">✨</text>`;
  if (s.sapka === 'parti') sapka = P('M76 56 L100 4 L124 56 Z', '#ff5d8f') + P('M84 40 L116 40 L120 48 L80 48 Z', '#ffd166') + P('M92 22 L108 22 L111 30 L89 30 Z', '#4d96ff') + C(100, 5, 7, '#ffd166');
  if (s.sapka === 'kulaklik') sapka = `<path d="M50 98 C48 40 152 40 150 98" fill="none" stroke="#3b2c66" stroke-width="8" stroke-linecap="round"/>` + `<rect x="40" y="84" width="18" height="30" rx="8" fill="${D('#ff5d8f')}"${S}/><rect x="142" y="84" width="18" height="30" rx="8" fill="${D('#ff5d8f')}"${S}/>`;
  if (s.sapka === 'cicek') [[60,72,'#ff7eb6'],[74,58,'#ffd166'],[90,50,'#a06bff'],[110,50,'#ff7eb6'],[126,58,'#6bcb77'],[140,72,'#4d96ff']].forEach(([x, y, c]) => sapka += C(x, y, 8, c) + `<circle cx="${x}" cy="${y}" r="3" fill="#fff5c2"/>`);

  /* başörtüsü (Dolap): saç ve şapka gizlenir */
  let basArka = '', basOn = '';
  if (s.bas && s.bas !== 'yok' && typeof dolapBasCiz === 'function') { try { let _r = dolapBasCiz(s.bas, { P, C, E, D, S, uid, defs }); basArka = _r.arka; basOn = _r.on; if (_r.sacGizle) { arkaSac = ''; onSac = ''; } if (_r.sapkaGizle) sapka = ''; } catch (e) {} }
  let cikB = s.cik ? `<circle cx="160" cy="40" r="17" fill="#fff" stroke="#e4dafc" stroke-width="3"/><text x="160" y="47" font-size="19" text-anchor="middle">${String(s.cik).replace(/^c:/, '')}</text>` : '';

  /* gözlük */
  let gozluk = '';
  if (s.gozluk === 'yuvarlak') gozluk = `<circle cx="82" cy="97" r="13" fill="rgba(255,255,255,.25)" stroke="#3b2c66" stroke-width="3"/><circle cx="118" cy="97" r="13" fill="rgba(255,255,255,.25)" stroke="#3b2c66" stroke-width="3"/><path d="M95 96 Q100 92 105 96" fill="none" stroke="#3b2c66" stroke-width="3"/>`;
  if (s.gozluk === 'gunes') gozluk = `<rect x="66" y="88" width="30" height="18" rx="8" fill="#1e1b4b"/><rect x="104" y="88" width="30" height="18" rx="8" fill="#1e1b4b"/><path d="M96 94 H104" stroke="#1e1b4b" stroke-width="3"/><path d="M72 92 L80 92" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".7"/><path d="M110 92 L118 92" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>`;
  if (s.gozluk === 'yildiz') gozluk = `<path d="${yildizYol(82, 97, 16)}" fill="rgba(255,93,143,.25)" stroke="#ff5d8f" stroke-width="3"/><path d="${yildizYol(118, 97, 16)}" fill="rgba(255,93,143,.25)" stroke="#ff5d8f" stroke-width="3"/>`;

  /* minik dost */
  let dost = '';
  if (s.dost === 'papagan') dost = E(154, 166, 12, 16, '#34d399') + E(149, 170, 6, 10, '#10b981') + C(154, 146, 10, '#34d399') + P('M162 145 L171 148 L162 152 Z', '#ff8a3d') + `<circle cx="157" cy="143" r="2.2" fill="#2b2331"/>` + C(150, 138, 3, '#ff5d8f');
  if (s.dost === 'kedi') dost = P('M140 150 L144 134 L152 144 Z', '#fdba74') + P('M168 150 L164 134 L156 144 Z', '#fdba74') + E(154, 156, 15, 13, '#fdba74') + `<circle cx="149" cy="155" r="2" fill="#2b2331"/><circle cx="159" cy="155" r="2" fill="#2b2331"/><path d="M151 161 Q154 164 157 161" fill="none" stroke="#7a2e2e" stroke-width="1.8" stroke-linecap="round"/>`;
  if (s.dost === 'yildizcik') dost = `<path d="${yildizYol(158, 150, 17)}" fill="${D('#ffd166')}"${S}/><circle cx="153" cy="150" r="2" fill="#2b2331"/><circle cx="163" cy="150" r="2" fill="#2b2331"/><path d="M154 156 Q158 159 162 156" fill="none" stroke="#7a2e2e" stroke-width="1.8" stroke-linecap="round"/>`;

  /* çerçeve */
  let cerceve = '';
  if (s.cerceve === 'altin') cerceve = `<circle cx="100" cy="100" r="95" fill="none" stroke="#f5b700" stroke-width="8"/><circle cx="100" cy="100" r="90" fill="none" stroke="#fde68a" stroke-width="2"/>`;
  if (s.cerceve === 'neon') cerceve = `<circle cx="100" cy="100" r="95" fill="none" stroke="#22d3ee" stroke-width="7" opacity=".5"/><circle cx="100" cy="100" r="95" fill="none" stroke="#a5f3fc" stroke-width="2.5"/>`;
  if (s.cerceve === 'gokkusagi') cerceve = `<circle cx="100" cy="100" r="95" fill="none" stroke="url(#rb${uid})" stroke-width="9"/>`;
  let dis = stil === 'b' ? `<circle cx="100" cy="100" r="97" fill="none" stroke="#fff" stroke-width="5"/><circle cx="100" cy="100" r="99" fill="none" stroke="#3b2c66" stroke-width="2.5"/>` : '';

  const bodyScale={ince:.85,normal:1,genis:1.05}[s.govdeTip]||1;
  const adjustedBody=`<g transform="translate(100 0) scale(${bodyScale} 1) translate(-100 0)">${govde}</g>`;
  if (s._tamBoy) return { defs: defs.join(''), ic: arkaSac + adjustedBody + basArka + kafa + yuz + basOn + onSac + sapka + gozluk };
  return `<svg viewBox="0 0 200 200" width="${px}" height="${px}" role="img" aria-label="Karakter"><defs>${defs.join('')}</defs><g clip-path="url(#cl${uid})">${arka}${window.dmCharacterBuilder?.poseOpen(s,200)||''}${arkaSac}${adjustedBody}${basArka}${kafa}${yuz}${basOn}${onSac}${sapka}${gozluk}${dost}${cikB}${window.dmCharacterBuilder?'</g>':''}</g>${cerceve}${dis}</svg>`;
}

  const KA_STIL = 'c';
  let kaHarita = {};
  try { kaHarita = JSON.parse(localStorage.getItem('ing_ka_harita') || '{}'); } catch (e) {}
  const kucuk = x => String(x || '').trim().toLowerCase();
  const yoVar = () => typeof yo !== 'undefined' && yo;

  function kaKarakter(isim) {
    let a = kucuk(isim);
    if (a && a === kucuk(typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '')) return (yoVar() && yo.karakter && yo.karakter.cins) ? yo.karakter : null;
    return kaHarita[a] || null;
  }
  window.karakterSvg = function (isim, px) {
    let k = kaKarakter(isim);
    if (!k || !k.cins || !k.s || !VARSAYILAN[k.cins]) return '';
    try { return avatarSVG(Object.assign({}, VARSAYILAN[k.cins], k.s), KA_STIL, px, k.cins); } catch (e) { return ''; }
  };

  /* ---- Portaldaki avatarlar ---- */
  let orgMaAvatar = window.maAvatar;
  window.maAvatar = function (o) {
    let isim = o ? (o.id === 'ben' ? aktifOgrenciAdi : o.ad) : '';
    let svg = isim ? karakterSvg(isim, 60) : '';
    if (svg) return `<span class="avatar ka-av">${svg}</span>`;
    return typeof orgMaAvatar === 'function' ? orgMaAvatar(o) : '';
  };
  window.yoAvatarUygula = function () {
    let a = document.getElementById('userAvatarLetter');
    if (!a) return;
    let svg = karakterSvg(aktifOgrenciAdi, 50);
    if (!svg) return;
    a.innerHTML = svg;
    a.style.background = 'transparent'; a.style.padding = '0'; a.style.overflow = 'hidden';
  };
  let orgHarita = window.maTumVeriHaritasi;
  if (typeof orgHarita === 'function') {
    window.maTumVeriHaritasi = async function () {
      let h = await orgHarita.apply(this, arguments);
      let degisti = false;
      Object.keys(h || {}).forEach(k => {
        let kr = h[k] && h[k].karakter;
        if (kr && kr.cins) { kaHarita[k] = { cins: kr.cins, s: kr.s }; degisti = true; }
      });
      if (degisti) {
        try { localStorage.setItem('ing_ka_harita', JSON.stringify(kaHarita)); } catch (e) {}
        let l = document.getElementById('maAkisListe');
        if (l && typeof maSekme !== 'undefined' && maSekme === 'akis' && typeof maAkisListeHtml === 'function') l.innerHTML = maAkisListeHtml();
      }
      return h;
    };
  }

  /* ---- Eski mağaza alışverişinin iadesi ---- */
    function eskiIade() {
    if (!yoVar() || yo.kaIade) return 0;
    yo.altin = (yo.altin || 0) + 10;
    yo.sahip = []; yo.takili = { aks:'', renk:'' }; yo.kaIade = 1;
    return 10;
  }

  /* ---- Atölye ---- */
  let kaKat = 'sac', kaDeneme = null, kaHedef = null;
  function sahipMi(kat, id) {
    let u = KATALOG[kat].liste.find(x => x.id === id);
    return (u && u.f === 0) || (yo.karakter && (yo.karakter.sahip || []).includes(kat + ':' + id));
  }
  function patlat(el, ikonlar, n) {
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (let i = 0; i < n; i++) {
      let s = document.createElement('span'); s.className = 'ka-parca'; s.innerText = ikonlar[i % ikonlar.length];
      let a = Math.random() * Math.PI * 2, u = 50 + Math.random() * 70;
      s.style.left = (x - 9) + 'px'; s.style.top = (y - 12) + 'px';
      s.style.setProperty('--tx', Math.cos(a) * u + 'px'); s.style.setProperty('--ty', (Math.sin(a) * u - 30) + 'px'); s.style.setProperty('--tr', (Math.random() * 300 - 150) + 'deg');
      document.body.appendChild(s); setTimeout(() => s.remove(), 1050);
    }
  }
  function cinsSecimHtml(perdede) {
    return `<div class="ka-cins-baslik">🎨 Karakterini seç</div>
      <div class="ka-cins-alt">Mağazadan istediğin zaman karakter seçimini değiştirebilirsin.<br>Saçını, kıyafetini ve eşyalarını altınlarınla değiştirebilirsin.</div>
      <div class="ka-cins-grid">
        <button class="ka-cins" data-c="k">${avatarSVG(VARSAYILAN.k, KA_STIL, 140, 'k')}<b>Kız karakter</b></button>
        <button class="ka-cins" data-c="e">${avatarSVG(VARSAYILAN.e, KA_STIL, 140, 'e')}<b>Erkek karakter</b></button>
      </div>${perdede ? '<button class="ka-sonra" id="kaSonra">Sonra seçerim</button>' : ''}`;
  }
  function cinsBagla(kap, sonra) {
    let saving=false;
    kap.querySelectorAll('.ka-cins').forEach(b => b.onclick = async () => {
      if(saving)return;saving=true;kap.querySelectorAll('.ka-cins').forEach(x=>x.disabled=true);
      const owner=aktifOgrenciAdi;let previous,changed=false;
      try{
        // Wait for the server's initial version before changing the first
        // character, so the first save is not rejected as "bekliyor".
        if(typeof window.dmMemberSaveReady==='function') await window.dmMemberSaveReady(owner);
        else if(typeof window.dmPrepareMemberState==='function') await window.dmPrepareMemberState();
        if(owner!==aktifOgrenciAdi)return;
        if(typeof yoHazirMi==='function'&&!yoHazirMi())throw Error('Hesabın yüklenemedi. Bağlantını kontrol et.');
        previous=yo.karakter;const c=b.dataset.c;
        yo.karakter={cins:c,s:Object.assign({},VARSAYILAN[c],previous?.s||{}),sahip:[...(previous?.sahip||[])]};changed=true;
        await window.dmProgression.sync();
        if(owner!==aktifOgrenciAdi)return;
        yoKaydet();window.yoAvatarUygula();
        window.yoToast?.('✓ Karakter seçimin kaydedildi. Mağazadan istediğin zaman değiştirebilirsin.');
        if(!previous?.cins){
          /* İlk seçim: mağazaya/atölyeye gitme; perdeyi kapat ve Papi tanıtımını hemen başlat. */
          document.querySelectorAll('.ka-perde').forEach(x=>x.remove());
          if(!kap.classList.contains('ka-perde')&&sonra)sonra();
          document.dispatchEvent(new CustomEvent('dm:first-character-chosen'));
          return;
        }
        if(sonra)sonra();window.dmCharacterBuilder?.open();
      }catch(e){if(owner===aktifOgrenciAdi){if(changed)yo.karakter=previous;window.yoToast?.(e.message||'Seçimin kaydedilemedi. Yeniden dene.');}}
      finally{saving=false;kap.querySelectorAll('.ka-cins').forEach(x=>x.disabled=false);}
    });
  }
  function atolyeCiz() {
    let el = kaHedef;
    if (!el || !document.body.contains(el) || !yoVar()) return;
    if (!yo.karakter || !yo.karakter.cins) {
      el.innerHTML = `<div class="ka-wrap">${cinsSecimHtml(false)}</div>`;
      cinsBagla(el, atolyeCiz);
      return;
    }
    let k = yo.karakter, cins = k.cins;
    let s = Object.assign({}, VARSAYILAN[cins], k.s);
    let gorunen = kaDeneme ? Object.assign({}, s, { [kaDeneme.kat]: kaDeneme.id }) : s;
    let u = kaDeneme && KATALOG[kaDeneme.kat].liste.find(x => x.id === kaDeneme.id);
    let urunler = KATALOG[kaKat].liste.filter(x => !x.c || x.c === cins).map(x => {
      let takili = s[kaKat] === x.id, sahip = sahipMi(kaKat, x.id), den = kaDeneme && kaDeneme.kat === kaKat && kaDeneme.id === x.id;
      let etiket = takili ? '<span class="fiyat sahip">✓ Takılı</span>' : sahip ? `<span class="fiyat ${x.f ? 'sahip' : 'bedava'}">${x.f ? 'Sende' : 'Ücretsiz'}</span>` : `<span class="fiyat">🪙 ${x.f}</span>`;
      return `<button class="ka-urun${takili ? ' takili' : ''}${den ? ' deneniyor' : ''}" data-id="${x.id}">${sahip ? '' : '<span class="kilit">🔒</span>'}${avatarSVG(Object.assign({}, s, { [kaKat]: x.id }), KA_STIL, 70, cins)}<span>${x.ad}</span>${etiket}</button>`;
    }).join('');
    el.innerHTML = `<div class="ka-wrap">
      <div class="ka-ust"><h3>🎨 Karakter Atölyesi</h3><div class="ka-altin" id="kaAltin">🪙 ${yo.altin || 0}</div></div>
      <div class="ka-sahne"><div class="ka-buyuk" id="kaBuyuk">${avatarSVG(gorunen, KA_STIL, 190, cins)}</div><div class="ka-kursu"></div>
        <div class="ka-not">🔒 ${cins === 'k' ? 'Kız' : 'Erkek'} karakter · Eşyaları altınla alırsın</div>
        <div class="ka-btn-satir"><button id="kaKaristir">🎲 Sahip olduklarımla karıştır</button></div></div>
      ${u ? `<div class="ka-deneme"><span>👀 Deniyorsun: <b>${u.ad}</b> · 🪙 ${u.f}</span><button class="vaz" id="kaVaz">Vazgeç</button><button class="al" id="kaAl">Satın al</button></div>` : ''}
      <div class="ka-kat">${Object.keys(KATALOG).map(kk => `<button class="${kk === kaKat ? 'aktif' : ''}" data-k="${kk}">${KATALOG[kk].ikon} ${KATALOG[kk].ad}</button>`).join('')}</div>
      <div class="ka-urunler">${urunler}</div>
      <div class="ka-bolum">Seri koruma</div>
      <div class="ka-dondurucu"><span>🧊 Seri dondurucu<small>Haftada 1 gün kaçırırsan serin ücretsiz korunur. Fazlası için kalkan: ${yo.dondurucu || 0}/2</small></span><button id="kaDondurucu">🪙 ${typeof YO_DONDURUCU_FIYAT !== 'undefined' ? YO_DONDURUCU_FIYAT : 30}</button></div>
      <div class="ka-not" style="text-align:center">Altınları oyunlarda her doğru cevapla kazanırsın.</div></div>`;
    el.querySelectorAll('.ka-kat button').forEach(b => b.onclick = () => { kaKat = b.dataset.k; atolyeCiz(); });
    el.querySelectorAll('.ka-urun').forEach(b => b.onclick = () => urunTikla(b.dataset.id));
    el.querySelector('#kaKaristir').onclick = karistir;
    el.querySelector('#kaDondurucu').onclick = () => { if (typeof yoDondurucuAl === 'function') yoDondurucuAl(); };
    if (u) { el.querySelector('#kaVaz').onclick = () => { kaDeneme = null; atolyeCiz(); }; el.querySelector('#kaAl').onclick = satinAl; }
  }
  function buyukPop() { let b = document.getElementById('kaBuyuk'); if (b) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } }
  function urunTikla(id) {
    const u=KATALOG[kaKat].liste.find(x=>x.id===id);if(!window.dmProgression?.itemAllowed({kat:kaKat,sv:u?.dmTier||'temel'}))return;
    if (sahipMi(kaKat, id)) {
      kaDeneme = null; yo.karakter.s[kaKat] = id; yoKaydet(); window.yoAvatarUygula(); atolyeCiz(); buyukPop();
      return;
    }
    kaDeneme = { kat: kaKat, id }; atolyeCiz();
  }
  async function satinAl() {
    if (!kaDeneme) return;
    try { await window.dmProgression.sync(); const r=await fetch(apiURL,{method:"POST",body:JSON.stringify({islem:"seviyeUrunAl",ogrenci:aktifOgrenciAdi,item:"a|"+kaDeneme.kat+"|"+kaDeneme.id})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.mesaj||"Satın alma tamamlanamadı");Object.assign(yo,d.yo);kaDeneme=null;window.yoAvatarUygula();atolyeCiz();buyukPop();return; }catch(e){yoToast(e.message);return;}
    let u = KATALOG[kaDeneme.kat].liste.find(x => x.id === kaDeneme.id);
    if ((yo.altin || 0) < u.f) { if (typeof yoToast === 'function') yoToast(`Bunun için ${u.f - (yo.altin || 0)} altın daha lazım 🪙`); return; }
    patlat(document.getElementById('kaAl'), ['🎉', '✨', '🪙', '⭐'], 16);
    yo.altin -= u.f;
    yo.karakter.sahip = yo.karakter.sahip || [];
    yo.karakter.sahip.push(kaDeneme.kat + ':' + kaDeneme.id);
    yo.karakter.s[kaDeneme.kat] = kaDeneme.id;
    if (typeof yoToast === 'function') yoToast(`🎉 ${u.ad} senin oldu!`);
    if (typeof yoSes === 'function') yoSes('dogru');
    kaDeneme = null; yoKaydet(); window.yoAvatarUygula(); atolyeCiz(); buyukPop();
    let a = document.getElementById('kaAltin'); if (a) a.classList.add('pop');
  }
  function karistir() {
    kaDeneme = null;
    Object.keys(KATALOG).forEach(k => {
      let sec = KATALOG[k].liste.filter(x => (!x.c || x.c === yo.karakter.cins) && sahipMi(k, x.id));
      if (sec.length) yo.karakter.s[k] = sec[Math.floor(Math.random() * sec.length)].id;
    });
    yoKaydet(); window.yoAvatarUygula(); atolyeCiz(); buyukPop();
  }

  /* ---- Mağaza artık Karakter Atölyesi ---- */
  window.yoMagazaAc = function () {
    if (typeof yoHazirMi === 'function' && !yoHazirMi()) return;
    let hedef = window.yoGomuluHedef && document.getElementById(window.yoGomuluHedef);
    if (!hedef) { if (typeof meduAkisAc === 'function') { maSekme = 'magaza'; meduAkisAc(); } return; }
    kaHedef = hedef; kaDeneme = null;
    atolyeCiz();
  };

  /* ---- İlk girişte karakter seçimi ---- */
  let sorulduZaman = 0;
  setInterval(() => {
    if (window.dmGuestMode) return;   /* misafir denemesinde karakter penceresi açılmaz */
    if (!yoVar() || sessionStorage.getItem('ing_ka_soruldu')) return;
    let panel = document.getElementById('panel-alani');
    if (!panel || panel.style.display !== 'block') return;
    if (typeof aktifOgrenciAdi === 'undefined' || !aktifOgrenciAdi || kucuk(aktifOgrenciAdi) === 'teacher') return;
    if (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) return;
    if (yo.karakter && yo.karakter.cins) { window.yoAvatarUygula(); sessionStorage.setItem('ing_ka_soruldu', '1'); return; }
    if (!sorulduZaman) { sorulduZaman = Date.now(); return; }
    if (Date.now() - sorulduZaman < 6000) return;
    let mesgul = ['.duy3-overlay', '#genelSonucOverlay', '#yoModal', '.game-modal-overlay', '.yo-davet'].some(s => [...document.querySelectorAll(s)].some(el => getComputedStyle(el).display !== 'none'));
    if (mesgul) return;
    sessionStorage.setItem('ing_ka_soruldu', '1');
    let p = document.createElement('div');
    p.className = 'ka-perde';
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true');
    p.innerHTML = `<div class="ka-wrap">${cinsSecimHtml(true)}</div>`;
    document.body.appendChild(p);
    let kapat = () => p.remove();
    cinsBagla(p, () => { kapat(); if (typeof meduAkisAc === 'function') { maSekme = 'magaza'; meduAkisAc(); } });
    p.querySelector('#kaSonra').onclick = () => { kapat(); document.dispatchEvent(new CustomEvent('dm:first-character-skipped')); };
  }, 1000);
})();
