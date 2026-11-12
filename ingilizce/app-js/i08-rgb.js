
(function () {
function rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function kar(h, t, k) { let a = rgb(h), b = rgb(t); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
const ac = (c, k) => kar(c, '#ffffff', k), ko = (c, k) => kar(c, '#000000', k);

let uid = 0;
function krkSVG(p, px) {
  let u = 'k' + (++uid), c1 = p.r1, c2 = p.r2, koyuR = ko(c1, .25);
  let g = `<defs><radialGradient id="${u}" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="${ac(c1, .35)}"/><stop offset=".7" stop-color="${c1}"/><stop offset="1" stop-color="${ko(c1, .12)}"/></radialGradient></defs>`;
  let F = `url(#${u})`, out = '';
  const G = {
    yuvarlak: `<circle cx="50" cy="60" r="30" fill="${F}"/>`,
    yumurta: `<ellipse cx="50" cy="58" rx="27" ry="33" fill="${F}"/>`,
    fasulye: `<path d="M24 62 C22 38 40 26 54 28 C72 30 80 46 76 64 C72 84 50 92 36 86 C28 82 24 72 24 62 Z" fill="${F}"/>`,
    hayalet: `<path d="M22 88 L22 56 C22 38 36 26 50 26 C64 26 78 38 78 56 L78 88 L70 82 L62 88 L54 82 L46 88 L38 82 L30 88 Z" fill="${F}"/>`,
    kare: `<rect x="22" y="30" width="56" height="58" rx="18" fill="${F}"/>`,
    damla: `<path d="M50 20 C62 40 80 52 80 66 C80 82 66 92 50 92 C34 92 20 82 20 66 C20 52 38 40 50 20 Z" fill="${F}"/>`,
    yildiz: `<path d="M50 20 L60 44 L86 46 L66 62 L73 88 L50 74 L27 88 L34 62 L14 46 L40 44 Z" fill="${F}" stroke-linejoin="round"/>`
  };
  const K = {
    kedi: `<path d="M28 42 L30 18 L44 32 Z M72 42 L70 18 L56 32 Z" fill="${c1}"/><path d="M31 36 L32 24 L40 32 Z M69 36 L68 24 L60 32 Z" fill="${c2}"/>`,
    tavsan: `<ellipse cx="38" cy="18" rx="6" ry="18" fill="${c1}"/><ellipse cx="62" cy="18" rx="6" ry="18" fill="${c1}"/><ellipse cx="38" cy="18" rx="3" ry="12" fill="${c2}"/><ellipse cx="62" cy="18" rx="3" ry="12" fill="${c2}"/>`,
    boynuz: `<path d="M34 34 L30 14 L42 30 Z M66 34 L70 14 L58 30 Z" fill="${c2}"/>`,
    anten: `<path d="M42 30 Q38 16 32 12 M58 30 Q62 16 68 12" stroke="${koyuR}" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="32" cy="12" r="4.5" fill="${c2}"/><circle cx="68" cy="12" r="4.5" fill="${c2}"/>`,
    yaprak: `<path d="M50 28 C44 14 52 6 60 8 C60 18 56 24 50 28 Z" fill="#6bcb77"/><path d="M50 28 L52 16" stroke="#2f9e5a" stroke-width="1.5"/>`,
    ayi: `<circle cx="30" cy="36" r="9" fill="${c1}"/><circle cx="70" cy="36" r="9" fill="${c1}"/><circle cx="30" cy="36" r="4.5" fill="${c2}"/><circle cx="70" cy="36" r="4.5" fill="${c2}"/>`,
    kanat: `<path d="M22 60 C6 50 6 36 14 32 C18 44 22 50 26 54 Z M78 60 C94 50 94 36 86 32 C82 44 78 50 74 54 Z" fill="${c2}"/>`,
    yuzgec: `<path d="M50 26 C44 16 52 8 58 12 C56 18 54 22 50 26 Z" fill="${c2}"/><path d="M22 66 C12 64 10 56 14 52 C18 58 20 60 24 60 Z M78 66 C88 64 90 56 86 52 C82 58 80 60 76 60 Z" fill="${c2}"/>`,
    tuy: `<path d="M50 28 C46 16 40 12 36 12 C42 18 44 22 46 28 Z M50 28 C54 14 60 10 66 10 C60 18 56 22 54 28 Z M50 28 L50 12" fill="${c2}" stroke="${c2}" stroke-width="3" stroke-linecap="round"/>`,
    yok: ''
  };
  const D = {
    karin: `<ellipse cx="50" cy="70" rx="15" ry="13" fill="${ac(c2, .45)}" opacity=".9"/>`,
    benek: `<circle cx="32" cy="56" r="4" fill="${c2}" opacity=".7"/><circle cx="68" cy="72" r="5" fill="${c2}" opacity=".7"/><circle cx="62" cy="48" r="3" fill="${c2}" opacity=".7"/>`,
    serit: `<path d="M26 66 Q50 72 74 66 M28 76 Q50 82 72 76" stroke="${c2}" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/>`,
    kalp: `<path d="M50 80 C40 72 40 64 46 64 C48 64 50 66 50 68 C50 66 52 64 54 64 C60 64 60 72 50 80 Z" fill="${c2}"/>`,
    yok: ''
  };
  const Gz = {
    iki: `<ellipse cx="41" cy="55" rx="4.5" ry="5.5" fill="#2b2331"/><ellipse cx="59" cy="55" rx="4.5" ry="5.5" fill="#2b2331"/><circle cx="42.5" cy="53" r="1.7" fill="#fff"/><circle cx="60.5" cy="53" r="1.7" fill="#fff"/>`,
    tek: `<circle cx="50" cy="52" r="11" fill="#fff"/><circle cx="51" cy="53" r="6.5" fill="#2b2331"/><circle cx="53" cy="50" r="2.3" fill="#fff"/>`,
    uc: `<circle cx="38" cy="56" r="3.6" fill="#2b2331"/><circle cx="50" cy="50" r="4" fill="#2b2331"/><circle cx="62" cy="56" r="3.6" fill="#2b2331"/><circle cx="51" cy="48.6" r="1.3" fill="#fff"/>`,
    mutlu: `<path d="M36 56 Q41 50 46 56 M54 56 Q59 50 64 56" stroke="#2b2331" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    buyuk: `<ellipse cx="40" cy="55" rx="7" ry="8" fill="#fff"/><ellipse cx="60" cy="55" rx="7" ry="8" fill="#fff"/><circle cx="41" cy="56" r="4.5" fill="#2b2331"/><circle cx="61" cy="56" r="4.5" fill="#2b2331"/><circle cx="42.5" cy="54" r="1.6" fill="#fff"/><circle cx="62.5" cy="54" r="1.6" fill="#fff"/>`,
    uykulu: `<path d="M35 56 Q41 60 47 56 M53 56 Q59 60 65 56" stroke="#2b2331" stroke-width="3" fill="none" stroke-linecap="round"/>`
  };
  const A = {
    gulus: `<path d="M44 66 Q50 72 56 66" stroke="#7a2e2e" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    dis: `<path d="M43 65 Q50 72 57 65" stroke="#7a2e2e" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M46 67 L47.5 71 L49 67.6 Z M51 67.6 L52.5 71 L54 67 Z" fill="#fff"/>`,
    o: `<ellipse cx="50" cy="68" rx="3.5" ry="4.2" fill="#7a2e2e"/>`,
    dil: `<path d="M44 66 Q50 72 56 66" stroke="#7a2e2e" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M48 69 Q50 76 52 69 Z" fill="#ff6b8a"/>`,
    gaga: `<path d="M44 62 L56 62 L50 72 Z" fill="#ff9f43"/>`,
    kedi: `<path d="M44 66 Q47 69.5 50 66 Q53 69.5 56 66" stroke="#7a2e2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
  };
  const X = {
    sapka: `<path d="M34 34 L56 2 L68 34 Z" fill="#6d28d9"/><ellipse cx="51" cy="34" rx="24" ry="5" fill="#5b21b6"/><text x="50" y="26" font-size="8">⭐</text>`,
    tac: `<path d="M34 32 L38 16 L45 26 L50 12 L55 26 L62 16 L66 32 Z" fill="#f5b700"/><circle cx="50" cy="24" r="2.3" fill="#e0434b"/>`,
    kitap: `<rect x="64" y="66" width="16" height="12" rx="2" fill="#e0434b" transform="rotate(-12 72 72)"/><rect x="66" y="67" width="12" height="10" fill="#fff" transform="rotate(-12 72 72)"/>`,
    asa: `<path d="M76 88 L84 52" stroke="#8b5a2b" stroke-width="3" stroke-linecap="round"/><text x="78" y="52" font-size="11">✨</text>`,
    kulaklik: `<path d="M24 56 C24 28 76 28 76 56" stroke="#3b2c66" stroke-width="4" fill="none"/><rect x="18" y="50" width="9" height="15" rx="4" fill="#ff5d8f"/><rect x="73" y="50" width="9" height="15" rx="4" fill="#ff5d8f"/>`,
    papyon: `<path d="M42 82 L50 86 L42 90 Z M58 82 L50 86 L58 90 Z" fill="#e0434b"/><circle cx="50" cy="86" r="2" fill="#b91c1c"/>`,
    gozluk: `<circle cx="41" cy="55" r="8" fill="rgba(255,255,255,.3)" stroke="#3b2c66" stroke-width="2"/><circle cx="59" cy="55" r="8" fill="rgba(255,255,255,.3)" stroke="#3b2c66" stroke-width="2"/><path d="M49 55 H51" stroke="#3b2c66" stroke-width="2"/>`,
    mikrofon: `<rect x="70" y="60" width="7" height="12" rx="3.5" fill="#94a3b8" transform="rotate(20 74 66)"/><circle cx="76" cy="58" r="5" fill="#475569"/>`,
    korsan: `<path d="M30 34 C30 22 70 22 70 34 Z" fill="#1e1b4b"/><rect x="28" y="32" width="44" height="4" rx="2" fill="#1e1b4b"/><text x="46" y="31" font-size="7" fill="#fff">☠</text>`,
    cicek: `<circle cx="66" cy="34" r="5" fill="#ff7eb6"/><circle cx="66" cy="34" r="2" fill="#ffd166"/><circle cx="58" cy="30" r="4" fill="#ffd166"/>`,
    yok: ''
  };
  let arka = (p.kulak === 'kanat' || p.kulak === 'yuzgec') ? K[p.kulak] : '';
  let ust = (p.kulak !== 'kanat' && p.kulak !== 'yuzgec') ? K[p.kulak] : '';
  out = `${g}<ellipse cx="50" cy="94" rx="24" ry="4" fill="rgba(0,0,0,.12)"/>${arka}${ust}${G[p.govde]}${D[p.desen]}<ellipse cx="38" cy="40" rx="9" ry="5" fill="#fff" opacity=".35"/>${Gz[p.goz]}<ellipse cx="33" cy="64" rx="4.5" ry="3" fill="#ff8fab" opacity=".45"/><ellipse cx="67" cy="64" rx="4.5" ry="3" fill="#ff8fab" opacity=".45"/>${A[p.agiz]}${X[p.aks]}`;
  return `<svg viewBox="0 0 100 100" width="${px}" height="${px}" aria-hidden="true">${out}</svg>`;
}

/* ===================== 36 KARAKTER ===================== */
const NADIR = [['Sıradan', '#94a3b8'], ['Nadir', '#4d96ff'], ['Epik', '#a06bff'], ['Efsane', '#f59e0b']];
const OYUNLAR = { ba: ['🧙', 'Büyü Akademisi', '#efe6ff'], kp: ['🔤', 'Kelime Modu', '#ffe7d6'], sh: ['🦜', 'Papağanla Sohbet', '#dcfce7'], kk: ['🃏', 'Kelime Kartları', '#dbeafe'] };
const H = (ad, oyun, i, govde, kulak, goz, agiz, desen, aks, r1, r2) => ({ ad, oyun, sv: (i + 1) * 3, nadir: i < 4 ? 0 : i < 7 ? 1 : i < 8 ? 2 : 3, govde, kulak, goz, agiz, desen, aks, r1, r2 });
const KRK = [
  H('Pofuduk Çırak', 'ba', 0, 'yuvarlak', 'ayi', 'iki', 'gulus', 'karin', 'kitap', '#c4a1ff', '#fde68a'),
  H('Zıpzıp', 'ba', 1, 'damla', 'anten', 'buyuk', 'dil', 'yok', 'yok', '#8b5cf6', '#ffd166'),
  H('Kristal Kedi', 'ba', 2, 'yumurta', 'kedi', 'iki', 'kedi', 'benek', 'yok', '#7dd3fc', '#e0f2fe'),
  H('Profesör Hu', 'ba', 3, 'yumurta', 'tuy', 'buyuk', 'gaga', 'karin', 'gozluk', '#a16207', '#fde68a'),
  H('Yıldız Tozu', 'ba', 4, 'yildiz', 'yok', 'mutlu', 'gulus', 'yok', 'yok', '#ffd166', '#fff5c2'),
  H('Ay Hayaleti', 'ba', 5, 'hayalet', 'yok', 'uykulu', 'o', 'yok', 'yok', '#e2e8f0', '#c4b5fd'),
  H('Kazan Kıpır', 'ba', 6, 'kare', 'boynuz', 'uc', 'dis', 'benek', 'yok', '#34d399', '#065f46'),
  H('Asa Ustası', 'ba', 7, 'fasulye', 'yok', 'iki', 'gulus', 'serit', 'sapka', '#6366f1', '#fde68a'),
  H('Ejderhacık', 'ba', 8, 'yumurta', 'kanat', 'buyuk', 'dis', 'karin', 'tac', '#f43f5e', '#fdba74'),
  H('Alfi', 'kp', 0, 'kare', 'yok', 'iki', 'gulus', 'yok', 'papyon', '#ff8a3d', '#fff'),
  H('Zıpır Z', 'kp', 1, 'fasulye', 'anten', 'mutlu', 'dil', 'serit', 'yok', '#ffc93c', '#ff5d8f'),
  H('Hece Böceği', 'kp', 2, 'yuvarlak', 'anten', 'buyuk', 'gulus', 'benek', 'yok', '#f472b6', '#831843'),
  H('Yankı', 'kp', 3, 'hayalet', 'yok', 'iki', 'o', 'yok', 'kulaklik', '#a5b4fc', '#c7d2fe'),
  H('Mikro Mimi', 'kp', 4, 'yumurta', 'tavsan', 'iki', 'gulus', 'karin', 'mikrofon', '#fda4af', '#ffe4e6'),
  H('Kafiye', 'kp', 5, 'damla', 'yok', 'uc', 'dil', 'kalp', 'yok', '#fb923c', '#fef3c7'),
  H('Tekerleme', 'kp', 6, 'yuvarlak', 'boynuz', 'tek', 'dis', 'serit', 'yok', '#22d3ee', '#0e7490'),
  H('Nokta Hanım', 'kp', 7, 'yumurta', 'kedi', 'buyuk', 'kedi', 'benek', 'cicek', '#e879f9', '#701a75'),
  H('Alfabe Kral', 'kp', 8, 'kare', 'ayi', 'iki', 'gulus', 'karin', 'tac', '#f59e0b', '#fff7ed'),
  H('Cıvıl', 'sh', 0, 'yumurta', 'tuy', 'iki', 'gaga', 'karin', 'yok', '#34d399', '#fde68a'),
  H('Kaktüs Koko', 'sh', 1, 'kare', 'yaprak', 'mutlu', 'gulus', 'benek', 'cicek', '#4ade80', '#166534'),
  H('Ananas Nana', 'sh', 2, 'yumurta', 'yaprak', 'iki', 'dil', 'serit', 'yok', '#facc15', '#ca8a04'),
  H('Mercan', 'sh', 3, 'damla', 'boynuz', 'buyuk', 'gulus', 'benek', 'yok', '#fb7185', '#fff1f2'),
  H('Dalga', 'sh', 4, 'fasulye', 'yuzgec', 'iki', 'o', 'serit', 'yok', '#38bdf8', '#e0f2fe'),
  H('Tukan Tuki', 'sh', 5, 'yuvarlak', 'tuy', 'buyuk', 'gaga', 'karin', 'yok', '#1e293b', '#fb923c'),
  H('Hindistan Coco', 'sh', 6, 'yuvarlak', 'yok', 'uykulu', 'gulus', 'yok', 'cicek', '#92400e', '#fef3c7'),
  H('Lagün', 'sh', 7, 'hayalet', 'yuzgec', 'uc', 'dil', 'benek', 'yok', '#2dd4bf', '#ccfbf1'),
  H('Gökkuşağı Papağan', 'sh', 8, 'yumurta', 'kanat', 'buyuk', 'gaga', 'kalp', 'tac', '#ef4444', '#60a5fa'),
  H('Kaptan Yengeç', 'kk', 0, 'fasulye', 'anten', 'iki', 'gulus', 'yok', 'korsan', '#f87171', '#fee2e2'),
  H('Pusula', 'kk', 1, 'yuvarlak', 'yok', 'tek', 'gulus', 'serit', 'yok', '#fbbf24', '#78350f'),
  H('Pofi Balon', 'kk', 2, 'yuvarlak', 'yuzgec', 'buyuk', 'o', 'benek', 'yok', '#fde047', '#a16207'),
  H('Deniz Yıldızı', 'kk', 3, 'yildiz', 'yok', 'iki', 'dil', 'benek', 'yok', '#fb923c', '#fff7ed'),
  H('Martı Mert', 'kk', 4, 'yumurta', 'kanat', 'iki', 'gaga', 'karin', 'yok', '#f1f5f9', '#94a3b8'),
  H('Korsan Tavşan', 'kk', 5, 'yumurta', 'tavsan', 'iki', 'dis', 'karin', 'korsan', '#d6d3d1', '#fda4af'),
  H('Ahtapot Oki', 'kk', 6, 'hayalet', 'yok', 'buyuk', 'gulus', 'benek', 'yok', '#c084fc', '#f5d0fe'),
  H('Zümrüt Kaplumbağa', 'kk', 7, 'kare', 'yok', 'uykulu', 'gulus', 'serit', 'gozluk', '#10b981', '#064e3b'),
  H('Efsane Kraken', 'kk', 8, 'damla', 'boynuz', 'tek', 'dis', 'benek', 'tac', '#4338ca', '#a5b4fc')
];

const TEMALAR = [
  { ad:'Gökyüzü Kulesi', ikon:'☁️', zemin:'linear-gradient(180deg,#312e81 0%,#6366f1 35%,#a5b4fc 75%,#e0e7ff 100%)', hud:'rgba(49,46,129,.75)', dugum:'#fff', golge:'#a5b4fc', boss:'#fbbf24', bossIkon:'🌩️', bossAd:'Fırtına Devi', yol:'rgba(255,255,255,.8)',
    amb:[['☁️', 'bcYatay', 30, .85, 9], ['☁️', 'bcYatay', 44, .7, 12], ['🎈', 'bcSuzul', 22, .8, 5], ['✨', 'bcPirilti', 16, 1, 2.5], ['🕊️', 'bcYatay', 22, .8, 8]], not:'Bulutların üstünde yükselen bir kule. Her 10 seviyede bir fırtına devi kapıyı tutuyor.' },
  { ad:'Büyülü Orman', ikon:'🌳', zemin:'linear-gradient(180deg,#052e16 0%,#14532d 40%,#166534 75%,#4d7c0f 100%)', hud:'rgba(5,46,22,.75)', dugum:'#fef3c7', golge:'#65a30d', boss:'#84cc16', bossIkon:'🌲', bossAd:'Yaşlı Ağaç Bekçisi', yol:'rgba(254,243,199,.75)',
    amb:[['🌲', 'bcSuzul', 40, .55, 7], ['🍄', 'bcSuzul', 24, .8, 5], ['✨', 'bcPirilti', 14, 1, 2], ['🦋', 'bcYatay', 20, .9, 7], ['🟡', 'bcPirilti', 8, .9, 1.8]], not:'Ateş böcekleri yanıp sönüyor, mantarlar zıplıyor. Gece orman atmosferi.' },
  { ad:'Kristal Mağara', ikon:'💎', zemin:'linear-gradient(180deg,#0c0a1d 0%,#1e1b4b 45%,#4c1d95 100%)', hud:'rgba(12,10,29,.75)', dugum:'#e0e7ff', golge:'#7c3aed', boss:'#c084fc', bossIkon:'🗿', bossAd:'Taş Muhafız', yol:'rgba(196,181,253,.8)',
    amb:[['💎', 'bcPirilti', 26, 1, 3], ['🔮', 'bcSuzul', 22, .8, 6], ['✨', 'bcPirilti', 14, 1, 2], ['🦇', 'bcYatay', 20, .8, 6], ['💠', 'bcPirilti', 18, .9, 2.6]], not:'Parlayan kristaller ve sihirli küreler. Karanlık ama ışıl ışıl bir mağara.' },
  { ad:'Uzay Akademisi', ikon:'🚀', zemin:'radial-gradient(circle at 70% 20%,#312e81 0%,#0f172a 45%,#020617 100%)', hud:'rgba(2,6,23,.75)', dugum:'#fef9c3', golge:'#38bdf8', boss:'#38bdf8', bossIkon:'👾', bossAd:'Galaksi Bekçisi', yol:'rgba(125,211,252,.8)',
    amb:[['⭐', 'bcPirilti', 12, 1, 2.2], ['🪐', 'bcSuzul', 34, .9, 8], ['☄️', 'bcYatay', 22, .9, 6], ['🛸', 'bcYatay', 26, .9, 9], ['🌟', 'bcPirilti', 16, 1, 3]], not:'Gezegenler süzülüyor, UFO geçiyor, yıldızlar parlıyor. Seviye düğümleri istasyon gibi.' },
  { ad:'Denizaltı Kalesi', ikon:'🐠', zemin:'linear-gradient(180deg,#0e7490 0%,#155e75 40%,#164e63 75%,#083344 100%)', hud:'rgba(8,51,68,.75)', dugum:'#ecfeff', golge:'#22d3ee', boss:'#22d3ee', bossIkon:'🐙', bossAd:'Dev Ahtapot', yol:'rgba(165,243,252,.75)',
    amb:[['🫧', 'bcYuksel', 18, .8, 5], ['🐠', 'bcYatay', 24, .9, 7], ['🐟', 'bcYatay', 20, .8, 9], ['🪸', 'bcSuzul', 30, .8, 6], ['🐚', 'bcSuzul', 20, .8, 5]], not:'Kabarcıklar yükseliyor, balıklar yüzüyor. Her boss bir deniz canavarı.' },
  { ad:'Ejder Dağı', ikon:'🌋', zemin:'linear-gradient(180deg,#1c0a0a 0%,#7f1d1d 45%,#c2410c 80%,#f59e0b 100%)', hud:'rgba(28,10,10,.75)', dugum:'#fff7ed', golge:'#f97316', boss:'#f97316', bossIkon:'🐉', bossAd:'Kızıl Ejderha', yol:'rgba(254,215,170,.8)',
    amb:[['🔥', 'bcYuksel', 18, .9, 4], ['🌋', 'bcSuzul', 34, .7, 8], ['✨', 'bcPirilti', 14, 1, 2], ['🪨', 'bcSuzul', 22, .7, 6], ['🦇', 'bcYatay', 18, .8, 7]], not:'Lav kıvılcımları yükseliyor, zirvede ejderha bekliyor. En heyecanlı ve zor tema.' }
];
const KADEME = [
  { ad:'Bronz', renk:'#c98a4a', parla:'rgba(255,190,120,.9)', tas:'#e0434b', sans:'%60' },
  { ad:'Gümüş', renk:'#8b9bb4', parla:'rgba(220,235,255,.95)', tas:'#4d96ff', sans:'%28' },
  { ad:'Altın', renk:'#e0a800', parla:'rgba(255,221,102,.95)', tas:'#34d399', sans:'%10' },
  { ad:'Efsane', renk:'#a06bff', parla:'rgba(214,180,255,.95)', tas:'#ff5d8f', sans:'%2' }
];
const SOYUN = {
  ba: { ad:'Büyü Akademisi', ikon:'🧙', zemin:'linear-gradient(180deg,#2a1a5e 0%,#5b21b6 55%,#7c3aed 100%)', govde:'#6d28d9', kapak:'#8b5cf6', amblem:'🔮', dekor:['✨','🌙','⭐','🔮','🪄'],
        sandik:['Çırak Sandığı','Büyücü Sandığı','Başbüyücü Sandığı','Ejderha Hazinesi'] },
  kp: { ad:'Kelime Modu', ikon:'🔤', zemin:'linear-gradient(180deg,#ff8a3d 0%,#ff5d8f 60%,#c026d3 100%)', govde:'#c2410c', kapak:'#f97316', amblem:'🔤', dekor:['🅰️','🅱️','💬','🎤','📣'],
        sandik:['Harf Kutusu','Kelime Sandığı','Hece Hazinesi','Alfabe Kralı Sandığı'] },
  sohbet: { ad:'Papağanla Sohbet', ikon:'🦜', zemin:'linear-gradient(180deg,#0ea5e9 0%,#10b981 60%,#15803d 100%)', govde:'#15803d', kapak:'#22c55e', amblem:'🦜', dekor:['🌴','🌺','🥥','🌊','🍍'],
        sandik:['Yuva Kutusu','Tropik Sandık','Mercan Sandığı','Gökkuşağı Papağan Hazinesi'] },
  kart: { ad:'Kelime Kartları', ikon:'🃏', zemin:'linear-gradient(180deg,#38bdf8 0%,#0284c7 50%,#1e3a8a 100%)', govde:'#7c4a1e', kapak:'#a16207', amblem:'🗺️', dekor:['🏝️','⛵','🐚','🦀','🐠'],
        sandik:['Ada Sandığı','Kaptan Sandığı','Zümrüt Hazine','Efsane Korsan Hazinesi'] }
};
function sandikSVG(o, k, px) {
  let K = KADEME[k], efsane = k === 3;
  let bant = K.renk, id = 'g' + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 120 110" width="${px}" height="${px * 110 / 120}" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".33" stop-color="#ffd93d"/><stop offset=".66" stop-color="#4d96ff"/><stop offset="1" stop-color="#a06bff"/></linearGradient></defs>
    <ellipse cx="60" cy="104" rx="46" ry="6" fill="rgba(0,0,0,.25)"/>
    <rect x="12" y="50" width="96" height="50" rx="8" fill="${o.govde}"/>
    <rect x="12" y="50" width="96" height="10" fill="rgba(0,0,0,.18)"/>
    <path d="M12 54 Q12 16 60 16 Q108 16 108 54 Z" fill="${o.kapak}"/>
    <path d="M22 50 Q24 26 60 24 Q96 26 98 50" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="3"/>
    <rect x="24" y="16" width="12" height="84" rx="3" fill="${efsane ? `url(#${id})` : bant}"/>
    <rect x="84" y="16" width="12" height="84" rx="3" fill="${efsane ? `url(#${id})` : bant}"/>
    <rect x="12" y="48" width="96" height="8" fill="${efsane ? `url(#${id})` : bant}"/>
    <rect x="48" y="46" width="24" height="26" rx="6" fill="${efsane ? `url(#${id})` : bant}" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
    <circle cx="60" cy="58" r="6" fill="${K.tas}"/><circle cx="58" cy="56" r="2" fill="#fff" opacity=".8"/>
    <text x="60" y="44" text-anchor="middle" font-size="18">${o.amblem}</text>
    ${k >= 2 ? `<text x="14" y="22" font-size="13">✨</text><text x="96" y="30" font-size="11">✨</text>` : ''}
    ${efsane ? `<text x="54" y="12" font-size="13">👑</text>` : ''}
  </svg>`;
}

/* Ödül tablosu: kademeye göre (en kötüsü: 10 XP + 3 altın) */
function odulUret(k, o) {
  let r = [];
  const T = [
    { xp:[10,20], al:[3,5],   en:[0,1],    hd:0,    kar:0 },
    { xp:[20,35], al:[5,10],  en:[0.30,2], hd:0,    kar:0 },
    { xp:[35,60], al:[10,15], en:[1,3],  hd:0.25, kar:0 },
    { xp:[60,100],al:[15,25], en:[1,5],    hd:1,    kar:0.25 }
  ][k];
  r.push({ e:'⭐', m:rnd(...T.xp), t:'XP', tur:'xp' });
  r.push({ e:'🪙', m:rnd(...T.al), t:'altın', tur:'altin' });
  if (sans(T.en[0])) r.push({ e:'⚡', m:T.en[1], t:'enerji', tur:'enerji' });
  if (sans(T.hd)) r.push({ e:'🎁', m:1, t:'hediye gönderme hakkı', tur:'hediye', nadir:true });
  if (sans(T.kar)) r.push({ e:'👕', m:1, t:'nadir kıyafet parçası', tur:'kar', nadir:true });
  return r;
}

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const sans = p => Math.random() < p;
  const $ = id => document.getElementById(id);
  const kucuk = x => String(x || '').trim().toLowerCase();
  const enc = encodeURIComponent;
  const yoVar = () => typeof yo !== 'undefined' && yo;
  const SK = { ba: 'ba', kp: 'kp', sh: 'sohbet', kk: 'kart' };
  const OYUN_AD = { ba: '🧙 Büyü Akademisi', kp: '🔤 Kelime Modu', sh: '🦜 Papağanla Sohbet', kk: '🃏 Kelime Kartları' };
  const NADIR_KIYAFET = ['sapka:tac', 'kiyafet:astronot', 'sacRenk:gokkusagi', 'arka:uzay', 'cerceve:gokkusagi', 'dost:yildizcik', 'gozluk:yildiz', 'kiyafet:buyucu', 'sapka:buyucu', 'kiyafet:kahraman'];
  const girisli = () => { let p = $('panel-alani'); return !!(p && p.style.display === 'block' && typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && kucuk(aktifOgrenciAdi) !== 'teacher' && !(typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci)); };
  const oyunda = () => (typeof odulOyunda === 'function' && odulOyunda()) || !!document.querySelector('.bc-perde') || !!document.querySelector('.bs-perde');

  /* ================= İLERLEME ================= */
  let ilerleme = { ba: 0, kp: 0, sh: 0, kk: 0 }, baSet = [], ilerlemeHazir = false;
  async function ilerlemeGetir() {
    if (!girisli()) return;
    try {
      let r = await fetch(`${apiURL}?islem=ilerlemeOzet&ogrenci=${enc(aktifOgrenciAdi)}`);
      let d = await r.json();
      if (d && d.ok) { baSet = d.ba || []; ilerleme.ba = baSet.length; ilerleme.kp = (d.kp || []).length; }
    } catch (e) {}
    if (yoVar()) ilerleme.sh = Object.values(yo.sohbet || {}).filter(v => v > 0).length;
    try {
      let u = (globalDataCache || []).find(x => kucuk(x.ogrenci) === kucuk(aktifOgrenciAdi));
      ilerleme.kk = u && u.seviyeIlerleme ? u.seviyeIlerleme.filter(s => s.tamamlandi).length : 0;
    } catch (e) {}
    ilerlemeHazir = true;
    kontrolEt();
    if ($('tab-dunya') && $('tab-dunya').classList.contains('active') && !$('tab-dunya').classList.contains('bz-yeni')) dunyaCiz();
  }
  window.bcIlerleme = () => Object.assign({}, ilerleme);

  /* ================= SANDIKLAR ================= */
  function kademe(idx) { let k = (idx - 1) % 4; while (k < 3 && sans(0.15)) k++; return k; }
  function sandikKontrol() {
    if (!yoVar() || !ilerlemeHazir) return null;
    yo.sandik = yo.sandik || {};
    for (let g of ['ba', 'kp', 'sh', 'kk']) {
      let kazan = Math.floor(ilerleme[g] / 3);
      if (yo.sandik[g] === undefined) { yo.sandik[g] = kazan; yoKaydet(); }
      if (kazan > yo.sandik[g]) return { g, idx: yo.sandik[g] + 1 };
    }
    return null;
  }
  function parca(x, y, n, ikon) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < n; i++) {
      let s = document.createElement('span'); s.className = 'bc-parca'; s.innerText = ikon[i % ikon.length];
      let a = Math.random() * Math.PI * 2, u = 80 + Math.random() * 140;
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--tx', Math.cos(a) * u + 'px'); s.style.setProperty('--ty', Math.sin(a) * u + 'px'); s.style.setProperty('--tr', (Math.random() * 400 - 200) + 'deg');
      document.body.appendChild(s); setTimeout(() => s.remove(), 1150);
    }
  }
    function sandikTorenAc(g, idx, zorK) {
    let o = SOYUN[SK[g]], k = zorK !== undefined ? zorK : kademe(idx), oduller = odulUret(k, o), dokunus = 0;
    if(document.querySelector('.bc-perde'))return;
    let p = document.createElement('div');
    p.className = 'bc-perde'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', o.sandik[k]);
    p.style.setProperty('--parla', KADEME[k].parla);
    p.innerHTML = `<div class="bc-isin"></div><div class="bc-oyun">${OYUN_AD[g]} · ${idx * 3}. seviye hazinesi</div><h2>${o.sandik[k]}</h2><div class="bc-ipucu">${KADEME[k].ad} kademe · Açmak için 3 kez dokun!</div>
      <button class="bc-sandik" aria-label="Sandığa dokun">${sandikSVG(o, k, 200)}</button><div class="bc-oduller"></div><button class="bc-topla">Topla ✨</button>`;
    document.body.appendChild(p);
    let s = p.querySelector('.bc-sandik');
    setTimeout(() => s.focus({ preventScroll: true }), 250);
    s.onclick = () => {
      dokunus++;
      s.className = 'bc-sandik salla' + Math.min(3, dokunus);
      setTimeout(() => { if (s.isConnected) s.className = 'bc-sandik'; }, 900);
      let r = s.getBoundingClientRect();
      if (dokunus < 3) { p.querySelector('.bc-ipucu').innerText = ['', 'Bir kez daha! 👀', 'Son vuruş! 💥'][dokunus]; parca(r.left + r.width / 2, r.top + r.height / 2, 6, ['✨']); return; }
      p.classList.add('patladi');
      parca(r.left + r.width / 2, r.top + r.height / 2, 30, ['✨', '⭐', '🪙', '🎉', '💎']);
      s.remove();
      p.querySelector('.bc-ipucu').innerText = k >= 2 ? '🤩 Muhteşem bir hazine!' : 'İşte hazinen!';
      p.querySelector('.bc-oduller').innerHTML = oduller.map((x, i) => `<div class="bc-odul${x.nadir ? ' nadir' : ''}" style="--g:${0.15 + i * 0.22}s"><span class="e">${x.e}</span><b>${['xp', 'altin', 'enerji'].includes(x.tur) ? '+' + x.m : '×' + x.m}</b><small>${x.t}</small></div>`).join('');
      setTimeout(() => p.classList.add('bitti'), 300 + oduller.length * 220);
    };
    p.querySelector('.bc-topla').onclick = () => {
      if(p.dataset.claimed==='1')return;p.dataset.claimed='1';
      let xp = 0, al = 0, en = 0;
      oduller.forEach(x => {
        if (x.tur === 'xp') xp += x.m; else if (x.tur === 'altin') al += x.m; else if (x.tur === 'enerji') en += x.m;
        else if (x.tur === 'hediye') yo.hediyeHak = (yo.hediyeHak || 0) + x.m;
        else if (x.tur === 'kar') {
          let aday = yo.karakter ? NADIR_KIYAFET.filter(id => !(yo.karakter.sahip || []).includes(id)) : [];
          if (aday.length) { let sec = aday[rnd(0, aday.length - 1)]; yo.karakter.sahip = yo.karakter.sahip || []; yo.karakter.sahip.push(sec); if (typeof yoToast === 'function') setTimeout(() => yoToast('👕 Nadir parça Mağaza\'da seni bekliyor!'), 800); }
          else al += 40;
        }
      });
      yo.sandik[g] = idx;
      yoKaydet();
      if (xp || al) yoXpEkle(xp, al);
      if (en && typeof enerjiHediye === 'function') enerjiHediye(en);
      p.remove();
      setTimeout(kontrolEt, 600);
    };
  }

  /* ================= KARAKTER AÇILIŞLARI ================= */
    const krkAcik = k => (ilerleme[k.oyun] || 0) >= k.sv || (yoVar() && (yo.krkSatin || []).includes(k.ad));
  function karakterKontrol() {
    if (!yoVar() || !ilerlemeHazir) return false;
    let acik = KRK.filter(krkAcik).map(k => k.ad);
    if (!yo.krkGoruldu) { yo.krkGoruldu = acik; yoKaydet(); return false; }
    let yeni = acik.filter(a => !yo.krkGoruldu.includes(a));
    if (!yeni.length) return false;
    let k = KRK.find(x => x.ad === yeni[0]);
    if (!window.dmSharing?.celebrateCharacter({kind:'character',id:k.ad,name:k.ad,svg:krkSVG(k,512)})) return false;
    yo.krkGoruldu.push(yeni[0]); yoKaydet();
    return true;
  }
  function kontrolEt() {
    if (!girisli() || (window.yoHazirMi && !window.yoHazirMi()) || oyunda() || document.querySelector('.bc-perde')) return;
    /* Parkur sandıkları progression-ui üzerinden sunucuda bir kez alınır. */
    karakterKontrol();
  }
  setInterval(kontrolEt, 4000);
  setInterval(ilerlemeGetir, 600000);   /* 2 dk → 10 dk */
  let ilkGiris = '';
  setInterval(() => { if (girisli() && ilkGiris !== kucuk(aktifOgrenciAdi)) { ilkGiris = kucuk(aktifOgrenciAdi); setTimeout(ilerlemeGetir, 3000); } }, 1500);
  ['baModuKapat', 'kpModuKapat', 'sohbetEkraniKapat', 'baLevelupKapat', 'kpKelimeOyunuBitir'].forEach(ad => {
    let org = window[ad];
    if (typeof org === 'function') window[ad] = function () { let r = org.apply(this, arguments); setTimeout(ilerlemeGetir, 2500); return r; };
  });

  /* ================= PROFİL KARAKTERİ ================= */
  let profilHarita = {};
  let orgKsvg = window.karakterSvg;
  window.karakterSvg = function (isim, px) {
    let ad = kucuk(isim), secim = ad === kucuk(typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '') ? (yoVar() ? yo.profilKrk : '') : profilHarita[ad];
    let k = secim && KRK.find(x => x.ad === secim);
    if (k) return krkSVG(k, px).replace('<svg ', `<svg style="background:radial-gradient(circle at 50% 35%,#fff,${OYUNLAR[k.oyun][2]})" `);
    return typeof orgKsvg === 'function' ? orgKsvg(isim, px) : '';
  };
  let orgHar = window.maTumVeriHaritasi;
  if (typeof orgHar === 'function') window.maTumVeriHaritasi = async function () {
    let h = await orgHar.apply(this, arguments);
    Object.keys(h || {}).forEach(k => { if (h[k] && h[k].profilKrk) profilHarita[k] = h[k].profilKrk; });
    return h;
  };

  /* ================= EKSTRA JOKER ================= */
  /* ================= EKSTRA HEDİYE HAKKI ================= */
  let orgEg = window.enerjiGonder;
  if (typeof orgEg === 'function') window.enerjiGonder = async function (alici, btn) {
    if (localStorage.getItem('ing_enerji_gonder') === yoBugun() && yoVar() && (yo.hediyeHak || 0) > 0) {
      if (btn) { btn.disabled = true; btn.innerText = 'Gönderiliyor...'; }
      try {
        let r = await fetch(`${apiURL}?islem=enerjiGonder&ekstra=1&gonderen=${enc(aktifOgrenciAdi)}&alici=${enc(alici)}`);
        let d = await r.json();
        if (d.ok) { yo.hediyeHak--; yoKaydet(); if (btn) btn.innerText = 'Gönderildi ✓'; if (typeof yoToast === 'function') yoToast(`🎁 Ekstra hakla gönderildi! Kalan hak: ${yo.hediyeHak}`); }
      } catch (e) { if (btn) { btn.disabled = false; btn.innerText = 'Tekrar dene'; } }
      return;
    }
    return orgEg.apply(this, arguments);
  };
  let orgVit = window.maVitrinHtml;
  if (typeof orgVit === 'function') window.maVitrinHtml = function (id, benimMi) {
    let h = orgVit.apply(this, arguments);
    if (yoVar() && (yo.hediyeHak || 0) > 0) h = h.replace(/(<button disabled data-o="[^"]*" onclick="enerjiGonder\(this\.dataset\.o, this\)">)Bugün gönderdin/, (m, a) => a.replace('disabled ', '') + `🎁 Ekstra hakla gönder (${yo.hediyeHak})`);
    return h;
  };

  /* ================= MAĞAZA SEKMELERİ: ATÖLYE / KOLEKSİYON / SANDIKLAR ================= */
  let mgSekme = 'atolye', kolFiltre = 'hepsi';
  function mgBarCiz() {
    let kap = document.querySelector('#tab-magaza .mg-kap');
    if (!kap) return;
    let bar = $('bcMgBar');
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'bcMgBar'; bar.className = 'bc-mgbar';
      kap.insertBefore(bar, kap.firstChild);
      let k = document.createElement('div'); k.id = 'bcMgAlan'; kap.appendChild(k);
    }
    bar.innerHTML = [['atolye', '👕 Giyim'], ['sandik', '🎁 Sandıklar']].map(([k, t]) => `<button class="${k === mgSekme ? 'aktif' : ''}" data-k="${k}">${t}</button>`).join('');
    bar.querySelectorAll('button').forEach(b => b.onclick = () => { mgSekme = b.dataset.k; mgCiz(); });
  }
  function mgCiz() {
    mgBarCiz();
    let at = $('magazaAlan'), al = $('bcMgAlan');
    if (!at || !al) return;
    at.style.display = mgSekme === 'atolye' ? '' : 'none';
    al.style.display = mgSekme === 'atolye' ? 'none' : '';
    if (mgSekme === 'koleksiyon' && !window.dmProgression?.require('koleksiyon')) {mgSekme='atolye';return;}
    if (mgSekme === 'koleksiyon') al.innerHTML = koleksiyonHtml(), kolBagla(al);
    if (mgSekme === 'sandik') al.innerHTML = sandikOzetHtml();
  }
  function koleksiyonHtml() {
    let acik = KRK.filter(krkAcik).length, sec = yoVar() ? yo.profilKrk : '';
    let f = [['hepsi', 'Hepsi'], ['ba', '🧙'], ['kp', '🔤'], ['sh', '🦜'], ['kk', '🃏'], ['acik', '✅ Açılanlar']];
    return `<div class="bc-kutu"><h3>🎭 Karakter Koleksiyonu · ${acik}/36</h3><p>Her oyunda her 3 seviyede bir yeni karakter açılır. Açtığın birini profil fotoğrafın yapabilirsin.</p>
      ${sec ? `<button class="bc-geri" id="bcKendi">🎨 Kendi karakterime dön</button>` : ''}
      <div class="bc-filtre">${f.map(([k, t]) => `<button class="${kolFiltre === k ? 'aktif' : ''}" data-f="${k}">${t}</button>`).join('')}</div>
      <div class="bc-izgara">${KRK.filter(k => kolFiltre === 'hepsi' || (kolFiltre === 'acik' ? krkAcik(k) : k.oyun === kolFiltre)).map((k, i) => {
        let a = krkAcik(k);
        return `<button class="bc-krk${a ? '' : ' kilitli'}${sec === k.ad ? ' secili' : ''}" data-ad="${k.ad}" style="--z:${OYUNLAR[k.oyun][2]};--g:${(i % 6) * .3}s"><span class="nadir" style="--n:${NADIR[k.nadir][1]}">${NADIR[k.nadir][0]}</span><span class="sahne">${krkSVG(k, 70)}</span>${a ? k.ad : '???'}<small>${a ? (sec === k.ad ? '✓ Profilinde' : 'Dokun, seç') : `🔒 ${k.sv}. sv · ${typeof krkFiyat === 'function' ? krkFiyat(k) : ''} 🪙`}</small></button>`;
      }).join('')}</div></div>`;
  }
  function kolBagla(al) {
    al.querySelectorAll('.bc-filtre button').forEach(b => b.onclick = () => { kolFiltre = b.dataset.f; mgCiz(); });
    let kendi = $('bcKendi'); if (kendi) kendi.onclick = () => { yo.profilKrk = ''; yoKaydet(); if (typeof yoAvatarUygula === 'function') yoAvatarUygula(); mgCiz(); };
    al.querySelectorAll('.bc-krk').forEach(b => b.onclick = () => {
      let k = KRK.find(x => x.ad === b.dataset.ad);
          if (!krkAcik(k)) { if (typeof krkSatinAl === 'function') krkSatinAl(k); return; }
      yo.profilKrk = k.ad; yoKaydet();
      if (typeof yoAvatarUygula === 'function') yoAvatarUygula();
      if (typeof yoToast === 'function') yoToast(`✨ ${k.ad} artık profil fotoğrafın!`);
      mgCiz();
    });
  }
  function sandikOzetHtml() {
    let s = (yoVar() && yo.sandik) || {};
    return `<div class="bc-kutu"><h3>🎁 Kayıp Hazineler</h3><p>Her oyunda her 3 seviyede bir sandık kazanırsın. Kademeler sırayla yükselir: Bronz → Gümüş → Altın → Efsane. Her sandığın %15 "yükselme" şansı var.</p>
      ${['ba', 'kp', 'sh', 'kk'].map(g => { let n = ilerleme[g] || 0, sonraki = 3 - (n % 3), o = SOYUN[SK[g]], acilan = s[g] || 0, k = acilan % 4;
        return `<div class="bc-satir"><span class="bc-mini">${sandikSVG(o, k, 54)}</span><span><b>${OYUN_AD[g]}</b><small>${n} seviye · ${acilan} sandık açtın · sonraki (${KADEME[k].ad}) ${sonraki} seviye sonra</small></span></div>`; }).join('')}
      <div class="bc-envanter"><span>🎁 Hediye hakkı: <b>${(yoVar() && yo.hediyeHak) || 0}</b><small>Arkadaşına günde 1'den fazla enerji yollar</small></span></div></div>`;
  }
           window.bcMgCiz = mgCiz;
  window.bcSandikAc = sandikTorenAc;
  window.dmCharacterArt = (name,px=256) => {const k=KRK.find(x=>x.ad===name);return k&&krkAcik(k)?krkSVG(k,px):null;};
  window._krkListe = () => KRK.map(k => Object.assign({}, k, { acik: krkAcik(k) }));
  window.bcKoleksiyonCiz = function (el) {
    let ciz = () => {
      el.innerHTML = koleksiyonHtml(); kolBagla(el);
      el.querySelectorAll('.bc-filtre button, .bc-krk, #bcKendi').forEach(b => { let o = b.onclick; b.onclick = e => { if (o) o(e); ciz(); }; });
    };
    ilerlemeGetir().then(ciz); ciz();
  };
  let orgMg = window.magazaAc;
  if (typeof orgMg === 'function') window.magazaAc = function () { let r = orgMg.apply(this, arguments); mgCiz(); return r; };

  /* ================= DÜNYA PARKURU (Büyü Akademisi) ================= */
  const RUTBELER = ['🥚 Çırak', '🪄 Büyü Öğrencisi', '📜 Büyücü', '🔮 Başbüyücü', '🐉 Ejder Ustası', '🌟 Efsane Büyücü'];
  window.dunyaAc = async function () {
    if(window.dmTeacherPortalMode)return;
    dcTumTamEkranlariKapat();
    let el = $('tab-dunya');
    el.classList.add('active');
    if (typeof dcBottomNavSenkronize === 'function') dcBottomNavSenkronize();
    if (!el.classList.contains('bz-yeni')) dunyaCiz();
    await ilerlemeGetir();
    if (!el.classList.contains('bz-yeni')) dunyaCiz();
  };
  window.dunyaKapat = function () {
    $('tab-dunya').classList.remove('active');
    if (typeof sonEkranaDon === 'function') sonEkranaDon(); else if (typeof meduAkisAc === 'function') meduAkisAc();
  };
  function dunyaSeviyeAc(n) {
    if (typeof baModuAc !== 'function') return;
    baModuAc();
    setTimeout(() => {
      let inp = $('baIsimInput');
      if (inp && !inp.value.trim()) inp.value = aktifOgrenciAdi;
      if (typeof baSeviyeBaslat === 'function') baSeviyeBaslat(n);
    }, 700);
  }
  function dunyaCiz() {
    let alan = $('dunyaAlan'); if (!alan) return;
    let toplam = (typeof baTumSeviyeler !== 'undefined' && baTumSeviyeler && baTumSeviyeler.length) ? baTumSeviyeler.length : Math.max(30, Math.ceil((Math.max(0, ...baSet) + 5) / 10) * 10);
    let dunyaSay = Math.ceil(toplam / 10), BAND = 10 * 112, yuk = dunyaSay * BAND + 120;
    let simdi = 1; while (baSet.includes(simdi)) simdi++;
    let kahramanSvg = window.karakterSvg(aktifOgrenciAdi, 56) || krkSVG(KRK[0], 56);
    let nk = i => ({
    x: 50 + Math.sin(i * 0.78) * 25,
    y: yuk - 105 - i * 118
});
    let bantlar = '', amb = '', dugum = '', rozet = '';
    for (let w = 0; w < dunyaSay; w++) {
      let T = TEMALAR[w % TEMALAR.length], ust = yuk - (w + 1) * BAND - (w === dunyaSay - 1 ? 120 : 0), yuks = BAND + (w === dunyaSay - 1 ? 120 : 0);
      bantlar += `<div class="bc-bant" style="top:${ust}px;height:${yuks}px;background:${T.zemin}"><span class="bc-dunya-ad">${T.ikon} ${w + 1}. Dünya · ${T.ad}</span></div>`;
      for (let i = 0; i < 9; i++) { let a = T.amb[i % T.amb.length]; amb += `<span class="amb" style="left:${(i * 37 + w * 11) % 90}%;top:${ust + (i * 127) % yuks}px;--s:${a[2]}px;--o:${a[3]};--a:${a[1]};--d:${a[4] + (i % 3)}s;--g:${(i % 5) * .7}s">${a[0]}</span>`; }
    }
    let noktalar = Array.from({ length: toplam }, (_, i) => nk(i));
    let yol = noktalar.map((p, i) => {
    if (i === 0) {
        return `M ${p.x} ${p.y}`;
    }

    let onceki = noktalar[i - 1];

    let kontrolX = (onceki.x + p.x) / 2;
    let kontrolY = (onceki.y + p.y) / 2;

    return `Q ${kontrolX} ${kontrolY} ${p.x} ${p.y}`;
}).join(' ');
    noktalar.forEach((p, i) => {
      let sv = i + 1,
    bitti = baSet.includes(sv),
    T = TEMALAR[Math.floor(i / 10) % TEMALAR.length];

let adaRenkleri = [
    ['#fff4a8', '#ffd84d'],
    ['#b9f3d0', '#55c98a'],
    ['#b9e5ff', '#5da9f5'],
    ['#dcc7ff', '#9b72e8'],
    ['#ffc9dc', '#ef79aa'],
    ['#ffd5ae', '#f49b54']
];

let adaRenk = adaRenkleri[
    Math.floor(i / 10) % adaRenkleri.length
];
      let cls = sv === simdi ? 'simdi' : bitti ? 'bitti' : 'kilit', ic = bitti ? '✓' : sv;
      if (sv % 10 === 0) { dugum += `<button class="bc-d boss ${cls}" data-sv="${sv}" style="left:${p.x}%;top:${p.y}px;--boss:${T.boss}" aria-label="${sv}. seviye, ${T.bossAd}">${T.bossIkon}<small>${sv}. ${T.bossAd}</small>${sv === simdi ? `<span class="oyuncu">${kahramanSvg}</span>` : ''}</button>`; return; }
      if (sv % 3 === 0) {
        let acildi = Math.floor(sv / 3) <= ((yoVar() && yo.sandik && yo.sandik.ba) || 0);
        rozet += `<span class="bc-sandikr${acildi ? ' acildi' : ''}" style="left:calc(${p.x}% + ${p.x > 50 ? -48 : 48}px);top:${p.y + 14}px" title="Sandık">🎁</span>`;
      }
      let kr = KRK.find(k => k.oyun === 'ba' && k.sv === sv);
      if (kr) rozet += `<span class="bc-kr${bitti ? ' acik' : ''}" style="left:calc(${p.x}% + ${p.x > 50 ? -50 : 50}px);top:${p.y - 26}px" title="${kr.ad}">${krkSVG(kr, 32)}</span>`;
     dugum += `
<button
    class="bc-d ${cls}"
    data-sv="${sv}"
    style="
    left:${p.x}%;
    top:${p.y}px;
    --dugum:${T.dugum};
    --golge:${T.golge};
    --ada-acik:${adaRenk[0]};
    --ada-koyu:${adaRenk[1]};
"
    aria-label="${sv}. seviye${bitti ? ', tamamlandı' : sv === simdi ? ', sıradaki' : ', kilitli'}"
>
    <span class="ada-icerik">

        ${
            bitti
            ? `<span class="ada-tik">✓</span>`
            : `<span class="ada-numara">${sv}</span>`
        }

    </span>

   <span class="ada-yildizlar ${bitti ? 'kazandi' : 'kilitli-yildiz'}">
    <span>★</span>
    <span>★</span>
    <span>★</span>
</span>

    ${
        sv === simdi
        ? `
            <span class="oyuncu">
                ${kahramanSvg}
            </span>

            <span class="baslat">
                ▶ Oyna
            </span>
        `
        : ''
    }

    ${
        !bitti && sv !== simdi
        ? `<span class="ada-kilit">🔒</span>`
        : ''
    }

</button>`;
    });
    let rIdx = Math.min(RUTBELER.length - 1, Math.floor(baSet.length / 10));
    let T0 = TEMALAR[Math.floor((simdi - 1) / 10) % TEMALAR.length];
    alan.innerHTML = `<div class="bc-hud"><button class="bc-kapat" onclick="dunyaKapat()" aria-label="Kapat">✕</button><span class="bc-rutbe">${RUTBELER[rIdx].split(' ')[0]}</span><div class="bc-bar"><b>${RUTBELER[rIdx]} · ${T0.ikon} ${T0.ad}</b><small>${baSet.length}/${toplam} seviye · sonraki dünyaya ${10 - (baSet.length % 10)} seviye</small><div class="cubuk"><i style="width:${Math.round(baSet.length / toplam * 100)}%"></i></div></div></div>
      <div class="bc-kaydir" id="bcKaydir"><div class="bc-harita" style="height:${yuk}px">${bantlar}${amb}<svg class="bc-yol" viewBox="0 0 100 ${yuk}" preserveAspectRatio="none" style="height:${yuk}px"><path d="${yol}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="6" stroke-dasharray="2 14" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>${rozet}${dugum}</div></div>`;
    alan.querySelectorAll('.bc-d').forEach(b => b.onclick = () => {
      let sv = Number(b.dataset.sv);
      if (b.classList.contains('kilit')) { if (typeof yoToast === 'function') yoToast('🔒 Önce önceki seviyeleri geç!'); return; }
      dunyaSeviyeAc(sv);
    });
    let k = $('bcKaydir'); if (k) k.scrollTop = Math.max(0, nk(simdi - 1).y - k.clientHeight * 0.6);
  }
  /* Parkur sekmesi Dünya Parkuru'nu açsın */
  setInterval(() => { let b = document.querySelector('#maSegment [data-s="parkur"]'); if (b && !b._bc) { b._bc = 1; b.onclick = () => window.dunyaAc(); } }, 1000);

})();
