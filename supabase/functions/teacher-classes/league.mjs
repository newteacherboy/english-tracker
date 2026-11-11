// Sınıflar sekmesi (sınıf ligi): ham ölçülerden sıralama üretir. Saf fonksiyon, Node testlerinde de çalışır.
// Free planda her listede yalnız ilk FREE_ROWS öğrenci gönderilir; kalanların yalnız SAYISI gider (isim/puan gitmez).
export const FREE_ROWS = 2;
export const CATEGORIES = ['genel', 'sure', 'kelime', 'dogruluk', 'gelisen', 'ilerleme', 'seri', 'odev'];
const MIN_ANSWERS = { week: 30, month: 50, all: 50 };
const DAY = 86400000;

const label = c => `${c.classNo}-${c.branch}`;
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toLocaleUpperCase('tr-TR') || '?';
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

function derive(s, period) {
  const ok = num(s.ok), bad = num(s.bad), answers = ok + bad;
  const acc = answers ? Math.round(100 * ok / answers) : null;
  const now = num(s.growthNow), prev = num(s.growthPrev);
  const growth = now <= 0 ? null : prev > 0 ? Math.round(100 * (now - prev) / prev) : null;
  const hwTotal = num(s.hwTotal), hwDone = num(s.hwDone);
  return {
    ...s, ok, bad, answers, acc, minutes: num(s.minutes), levels: num(s.levels), streak: num(s.streak), xp: num(s.xp),
    growth, growthNow: now, growthPrev: prev, hwDone, hwTotal, hwRate: hwTotal ? Math.round(100 * hwDone / hwTotal) : null,
    accOk: answers >= (MIN_ANSWERS[period] || 50)
  };
}

// Genel puan (0–1000): doğru cevap %30, doğruluk %30 (az cevapta orantılı), ilerleme %20, aktif süre %20.
// Öğretmenin tüm öğrencileri içinde normalize edilir; sınıf filtresi değişince puan değişmez.
function score(list, period) {
  const max = k => Math.max(1, ...list.map(s => s[k]));
  const mOk = max('ok'), mLv = max('levels'), mMin = max('minutes'), need = MIN_ANSWERS[period] || 50;
  for (const s of list) {
    const accPart = s.acc === null ? 0 : (s.acc / 100) * Math.min(1, s.answers / need);
    s.genel = Math.round(1000 * (0.3 * s.ok / mOk + 0.3 * accPart + 0.2 * s.levels / mLv + 0.2 * s.minutes / mMin));
  }
}

const DEF = {
  genel: { v: s => s.genel, show: s => `${s.genel.toLocaleString('tr-TR')} puan`, ok: s => s.genel > 0 },
  sure: { v: s => s.minutes, show: s => (s.minutes >= 60 ? `${Math.floor(s.minutes / 60)} sa ${s.minutes % 60} dk` : `${s.minutes} dk`), ok: s => s.minutes > 0 },
  kelime: { v: s => s.ok, show: s => `${s.ok.toLocaleString('tr-TR')} doğru cevap`, ok: s => s.ok > 0 },
  dogruluk: { v: s => s.acc * 10000 + s.answers, show: s => `%${s.acc} · ${s.answers} soru`, ok: s => s.accOk && s.acc !== null },
  gelisen: { v: s => s.growth, show: s => `+%${s.growth}`, ok: s => s.growth !== null && s.growth > 0 },
  ilerleme: { v: s => s.levels, show: s => `${s.levels} durak/konu`, ok: s => s.levels > 0 },
  seri: { v: s => s.streak, show: s => `${s.streak} gün`, ok: s => s.streak > 0 },
  odev: { v: s => s.hwRate * 1000 + s.hwDone, show: s => `${s.hwDone}/${s.hwTotal} ödev`, ok: s => s.hwTotal > 0 && s.hwDone > 0 }
};

// Öğrenci bilgisi yanıtta bir kez (students haritasında) gider; listeler yalnız id taşır.
function card(s, classes) {
  const c = classes.find(x => x.id === s.classId);
  return { name: s.name, ini: initials(s.name), cls: c ? label(c) : (s.classNo ? `${s.classNo}. sınıf` : ''),
    m: { genel: s.genel, minutes: s.minutes, ok: s.ok, acc: s.acc, answers: s.answers, growth: s.growth, levels: s.levels, streak: s.streak, hwDone: s.hwDone, hwTotal: s.hwTotal, xp: s.xp } };
}

function rank(list, key) {
  const d = DEF[key];
  return list.filter(d.ok).sort((a, b) => d.v(b) - d.v(a) || a.name.localeCompare(b.name, 'tr'));
}

function attention(list, now) {
  return list.map(s => {
    const last = s.lastLogin ? Date.parse(s.lastLogin) : NaN;
    const days = Number.isFinite(last) ? Math.floor((now - last) / DAY) : null;
    if (days === null || days >= 7) return { s, why: days === null ? 'Hiç giriş yapmadı' : `${days} gündür girmedi`, w: 1000 + (days ?? 999) };
    if (s.answers >= 20 && s.acc !== null && s.acc < 50) return { s, why: `Doğruluk %${s.acc}`, w: 100 - s.acc };
    return null;
  }).filter(Boolean).sort((a, b) => b.w - a.w);
}

function scope(list, unlocked, now, seen) {
  const cats = {}, leaders = {};
  for (const key of CATEGORIES) {
    const r = rank(list, key);
    const keep = unlocked ? r : r.slice(0, FREE_ROWS);
    cats[key] = { rows: keep.map((s, i) => (seen.add(s), { rank: i + 1, id: s.id, value: DEF[key].show(s) })), hidden: r.length - keep.length, total: r.length };
    if (r[0]) { seen.add(r[0]); leaders[key] = { id: r[0].id, value: DEF[key].show(r[0]) }; }
  }
  const att = attention(list, now);
  return {
    count: list.length, categories: cats, leaders,
    attention: { count: att.length, rows: unlocked ? att.slice(0, 20).map(a => (seen.add(a.s), { id: a.s.id, why: a.why })) : [] }
  };
}

export function buildLeague(raw, { now = Date.now() } = {}) {
  const period = ['week', 'month', 'all'].includes(raw?.period) ? raw.period : 'week';
  const plan = raw?.plan || 'free';
  const unlocked = plan === 'pro' || plan === 'premium_pro';
  const classes = Array.isArray(raw?.classes) ? raw.classes : [];
  const list = (Array.isArray(raw?.students) ? raw.students : []).map(s => derive(s, period));
  score(list, period);
  const seen = new Set();
  const scopes = { all: scope(list, unlocked, now, seen) };
  for (const c of classes) scopes[c.id] = scope(list.filter(s => s.classId === c.id), unlocked, now, seen);
  const students = {};
  for (const s of seen) students[s.id] = card(s, classes);
  const classLeague = classes.map(c => {
    const m = list.filter(s => s.classId === c.id);
    return { id: c.id, label: label(c), name: c.name || null, count: m.length, avg: m.length ? Math.round(m.reduce((a, s) => a + s.genel, 0) / m.length) : 0 };
  }).sort((a, b) => b.avg - a.avg);
  return { ok: true, plan, unlocked, freeRows: FREE_ROWS, period, weekStart: raw?.weekStart || null, classes: classes.map(c => ({ id: c.id, label: label(c), name: c.name || null })), classLeague, scopes, students };
}
