// =====================================================================
// DİJİ-MEDU API — Supabase Edge Function (YAMALI SÜRÜM v3)
// Yamalar "[YAMA n]" etiketiyle işaretlidir. İşlem adları ve cevap
// biçimleri önceki sürümle aynıdır; sayfa kodunda değişiklik gerekmez.
// =====================================================================
import { releaseAPI } from './release-api.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-diji-token, x-diji-import, x-diji-otomasyon",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const adminKey = secretKeys.default;
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, adminKey);
const release = releaseAPI(supabase,json);

const OGRENCI_OTURUM_GUN = 30;
const OGRETMEN_OTURUM_SAAT = 8;           // [YAMA 1] öğretmen oturumu 30 gün değil 8 saat

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
  });
}

function b64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function unb64(s: string) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function hex(bytes: Uint8Array) {
  return Array.from(bytes).map(x => x.toString(16).padStart(2, "0")).join("");
}
async function sha256(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}
async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, key, 256);
  return "pbkdf2$210000$" + b64(salt) + "$" + b64(new Uint8Array(bits));
}
async function verifyPassword(password: string, stored: string) {
  try {
    const p = String(stored || "").split("$");
    if (p.length !== 4 || p[0] !== "pbkdf2") return false;
    const iterations = Number(p[1]);
    const salt = unb64(p[2]);
    const expected = unb64(p[3]);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, expected.length * 8));
    if (bits.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
    return diff === 0;
  } catch (_) { return false; }
}
function val(body: any, q: URLSearchParams, key: string, fallback = "") {
  return body?.[key] !== undefined ? body[key] : (q.get(key) ?? fallback);
}
function num(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function bool(v: any) {
  return v === true || v === "true" || v === 1 || v === "1" || v === "evet";
}
function arr(v: any) {
  return Array.isArray(v) ? v : [];
}
function encName(v: string) {
  return String(v || "").trim().toLocaleLowerCase("tr");
}
// [YAMA 2] ilike içinde % ve _ joker karakterdir; kullanıcı adında kaçırılmalı
function likeKacir(s: string) {
  return String(s || "").trim().replace(/[\\%_]/g, m => "\\" + m);
}
function temizMetin(v: any, max = 500) {
  return String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}
function bugunBasi() {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString();
}

// ---------------------------------------------------------------------
// Deneme sınırı (kaba kuvvet koruması): audit_logs üzerinden sayılır
// ---------------------------------------------------------------------
async function denemeSay(operation: string, target: string, dakika: number) {
  const { count } = await supabase.from("audit_logs").select("id", { count: "exact", head: true })
    .eq("operation", operation).eq("target", target)
    .gte("created_at", new Date(Date.now() - dakika * 60000).toISOString());
  return count || 0;
}
async function denemeYaz(operation: string, target: string, payload: any = {}) {
  await supabase.from("audit_logs").insert({ actor_role: "public", operation, target, payload });
}

async function auth(req: Request, body: any, q: URLSearchParams) {
  const token = body?.t || q.get("t") || req.headers.get("x-diji-token") || "";
  if (!token) return null;
  const th = await sha256(token);
  const { data } = await supabase.from("portal_sessions")
    .select("id,role,student_id,teacher_id,expires_at,last_seen_at")
    .eq("token_hash", th).maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    await supabase.from("portal_sessions").delete().eq("id", data.id);
    return null;
  }
  // [YAMA 3] her istekte yazmak yerine 5 dakikada bir güncelle
  if (!data.last_seen_at || Date.now() - new Date(data.last_seen_at).getTime() > 5 * 60000) {
    await supabase.from("portal_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  }
  if (data.role === "teacher" && data.teacher_id) {
    const { data: t } = await supabase.from("teachers").select("username,full_name,email,is_admin,active").eq("id", data.teacher_id).maybeSingle();
    if (!t || t.active === false) return null;
    return { ...data, token, yonetici: !!t.is_admin, ogretmenAdi: t.full_name || t.username, ogretmenKullanici: t.username };
  }
  return { ...data, token };
}
/* [v4.0] ÇOK ÖĞRETMEN: öğretmen sadece kendi öğrencilerine erişir; yönetici herkese */
const kapsamda = (a: any, s: any) => !a || a.role !== "teacher" || !!a.yonetici || (!!s && !!a.teacher_id && s.teacher_id === a.teacher_id);
const yoneticiOlmayan = (a: any) => !!a && a.role === "teacher" && !a.yonetici;
let _yoneticiler: { t: number, ids: Set<string>, epostalar: string[] } = { t: 0, ids: new Set(), epostalar: [] };
async function yoneticiler() {
  if (Date.now() - _yoneticiler.t < 300000) return _yoneticiler;
  const { data } = await supabase.from("teachers").select("id,email").eq("is_admin", true).eq("active", true);
  _yoneticiler = { t: Date.now(), ids: new Set((data || []).map((x: any) => x.id)), epostalar: (data || []).map((x: any) => String(x.email || "").trim()).filter((e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) };
  return _yoneticiler;
}
/* Bir öğrencinin sorumlu öğretmen(ler)inin e-postası: kendi öğretmeni, yoksa yönetici(ler) */
async function sorumluEpostalar(s: any) {
  if (s && s.teacher_id) {
    const { data: t } = await supabase.from("teachers").select("email,active").eq("id", s.teacher_id).maybeSingle();
    const e = String(t?.email || "").trim();
    if (t && t.active !== false && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return [e];
  }
  return (await yoneticiler()).epostalar;
}
async function issueSession(role: "student" | "teacher", studentId?: string, teacherId?: string) {
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();
  const th = await sha256(token);
  const ms = role === "teacher" ? OGRETMEN_OTURUM_SAAT * 3600000 : OGRENCI_OTURUM_GUN * 86400000;
  await supabase.from("portal_sessions").insert({
    token_hash: th, role, student_id: studentId || null, teacher_id: teacherId || null,
    expires_at: new Date(Date.now() + ms).toISOString()
  });
  return token;
}
async function requireStudent(a: any, requested: string) {
  if (!a) return json({ hata: "oturum", mesaj: "Oturum gerekli." }, 401);
  if (a.role === "teacher") return null;
  if (a.role !== "student" || !a.student_id) return json({ hata: "yetki", mesaj: "Öğrenci yetkisi gerekli." }, 403);
  if (requested && requested !== a.student_id) {
    const { data } = await supabase.from("students").select("id,username").eq("id", a.student_id).maybeSingle();
    if (!data || encName(data.username) !== encName(requested)) return json({ hata: "yetki", mesaj: "Bu öğrenciye erişim yok." }, 403);
  }
  return null;
}
async function requireTeacher(a: any) {
  if (!a || a.role !== "teacher") return json({ hata: "yetki", mesaj: "Öğretmen yetkisi gerekli." }, 403);
  return null;
}
async function studentByName(name: string) {
  const n = String(name || "").trim();
  if (!n) return null;
  const { data } = await supabase.from("students").select("*").ilike("username", likeKacir(n)).limit(2);
  return (data && data.length === 1) ? data[0] : null;
}
// [YAMA 4] İşlemin hedef öğrencisi: öğrenci oturumunda HER ZAMAN kendisi,
// öğretmen oturumunda isimle bulunan öğrenci. (Boş isimle çökme sorunu da giderildi.)
async function hedefOgrenci(a: any, name: string) {
  if (a?.role === "student" && a.student_id) {
    const { data } = await supabase.from("students").select("*").eq("id", a.student_id).maybeSingle();
    return data;
  }
  const s = await studentByName(name);
  return kapsamda(a, s) ? s : null;
}
const studentByNameGenel = studentByName;
// [v3.1] Supabase tek istekte en fazla 1000 satır verir; hepsini sayfa sayfa al
async function hepsiniGetir(sorgu: () => any) {
  const out: any[] = [];
  for (let i = 0; i < 20000; i += 1000) {
    const { data, error } = await sorgu().range(i, i + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
const bulunamadi = () => json({ status: "error", message: "Öğrenci bulunamadı." }, 404);

// ---------------------------------------------------------------------
// [v3] Profil: sayfanın beklediği eski biçim (rapor arşivi, grafikler,
// kitap, ders takvimi, izinler, kelime kartları, planlar, rozetler)
// ---------------------------------------------------------------------
const gunStr = (v: any) => (v ? String(v).slice(0, 10) : "");
const ortala = (l: any[], k: string) => l.length ? Math.round(l.reduce((t, x) => t + Number(x[k] || 0), 0) / l.length) : 0;
function raporSatiri(r: any) {
  const p = [r.reading_score, r.writing_score, r.vocabulary_score, r.speaking_score, r.grammar_score].map(Number).filter(Number.isFinite);
  const genel = r.genel_score != null && r.genel_score !== "" ? Number(r.genel_score) : (p.length ? Math.round(p.reduce((a, b) => a + b, 0) / p.length) : 0);
  return {
    tarih: gunStr(r.report_date), genel, okuma: Number(r.reading_score || 0), yazma: Number(r.writing_score || 0),
    vocabulary: Number(r.vocabulary_score || 0), konusma: Number(r.speaking_score || 0), grammar: Number(r.grammar_score || 0),
    deneme: Number(r.exam_score || 0), kitapAdi: r.book_name || "", sayfa: Number(r.page_no || 0), hedef: Number(r.target || 0),
    okunanSayisi: Number(r.read_count || 0), odevDonut: r.homework_feedback || "", sonrakiOdev: r.next_homework || "", sonrakiTarih: gunStr(r.next_report_date)
  };
}
async function ortakVeri() {
  const [ff, wc, bd, ap] = await Promise.all([
    supabase.from("feature_flags").select("code,target_type,target_value,enabled"),
    supabase.from("word_cards").select("class_no,unit_no,level_no,button_name,external_link").order("class_no").order("unit_no").order("level_no"),
    supabase.from("badges").select("student_name,name,required_points,emoji"),
    supabase.from("annual_plans").select("id,plan_code,title,total_weeks,plan_data")
  ]);
  return {
    flags: ff.data || [],
    kartlar: (wc.data || []).map((k: any) => ({ sinif: Number(k.class_no), unite: Number(k.unit_no), seviye: Number(k.level_no), butonAdi: k.button_name || "", disLink: k.external_link || "" })),
    rozetler: bd.data || [], planlar: ap.data || []
  };
}
async function baglamYukle(ids: string[] | null) {
  const f = (q: any) => ids ? q.in("student_id", ids) : q;
  const [rp, pp, lc, sa] = await Promise.all([
    f(supabase.from("teacher_reports").select("*")).order("report_date", { ascending: false }),
    f(supabase.from("student_plan_progress").select("student_id,plan_id,week_no,completed")),
    f(supabase.from("level_completions").select("student_id,mode,class_no,unit_no,level_no")),
    f(supabase.from("student_activities").select("student_id,status"))
  ]);
  const grup = (l: any[]) => { const m = new Map<string, any[]>(); for (const r of l || []) { if (!m.has(r.student_id)) m.set(r.student_id, []); m.get(r.student_id)!.push(r); } return m; };
  return { raporlar: grup(rp.data), plan: grup(pp.data), seviye: grup(lc.data), etkinlik: grup(sa.data) };
}
function izinlerHesapla(flags: any[], s: any) {
  const derece: any = { tumogrenciler: 0, all: 0, herkes: 0, sinif: 1, sube: 2, ogrenci: 3 }, out: any = {}, en: any = {};
  for (const f of flags) {
    const t = String(f.target_type || "tumogrenciler"), v = encName(f.target_value);
    const uyar = derece[t] === 0 || (t === "sinif" && v === String(s.class_no || "")) || (t === "sube" && v === encName(s.branch)) || (t === "ogrenci" && v === encName(s.username));
    if (!uyar) continue;
    const d = derece[t] ?? 0;
    if (en[f.code] === undefined || d >= en[f.code]) { en[f.code] = d; out[f.code] = !!f.enabled; }
  }
  return out;
}
function profileFor(s: any, o: any, b: any) {
  const p = (s.profile && typeof s.profile === "object") ? s.profile : {};
  const raporlar = (b.raporlar.get(s.id) || []).map(raporSatiri);
  const artan = raporlar.slice().reverse();
  const son = raporlar[0];
  const puan = Number(s.points || 0);
  const genelOrtalama = puan > 0 ? Math.round(puan * 10) / 10 : (p.genelOrtalama ?? ortala(raporlar, "genel"));
  const sonDenemeR = raporlar.find((r: any) => r.deneme > 0);
  const kitapR = raporlar.find((r: any) => r.kitapAdi);
  const kitapBilgi = (p.kitapBilgi && p.kitapBilgi.kitapAdi) ? p.kitapBilgi : (kitapR ? { kitapAdi: kitapR.kitapAdi, sayfa: kitapR.sayfa, hedef: kitapR.hedef || 40, okunanSayisi: kitapR.okunanSayisi || 1 } : {});
  const dersler = (Array.isArray(p.dersler) && p.dersler.length) ? p.dersler : (son ? [{ tarih: son.tarih, durum: "yapildi" }, { tarih: son.sonrakiTarih, durum: "sonraki" }] : []);
  const kodlar = String(p.AtananPlan || p.atananPlan || "").split(/[,;]/).map(x => x.trim()).filter(Boolean);
  const ilerleme = b.plan.get(s.id) || [], atananPlanlar: any[] = [];
  for (const kod of kodlar) {
    const plan = o.planlar.find((x: any) => encName(x.plan_code) === encName(kod)); if (!plan) continue;
    for (const h of (Array.isArray(plan.plan_data) ? plan.plan_data : [])) {
      const w = Number(h.hafta);
      atananPlanlar.push({ planKodu: plan.plan_code, hafta: w, aciklama: h.aciklama || "", tamamlandiMi: ilerleme.some((x: any) => x.plan_id === plan.id && Number(x.week_no) === w && x.completed) });
    }
  }
  const tamamHafta = atananPlanlar.filter(x => x.tamamlandiMi).length;
  const etk = b.etkinlik.get(s.id) || [];
  const rozetler = o.rozetler
    .filter((r: any) => {
      const rozetSahibi = encName(r.student_name);
      const ogrenciAdi = encName(s.username);

      // Genel rozetler: HERKES
      const herkesRozeti = rozetSahibi === "herkes";

      // Öğrenciye özel rozet
      const ozelRozet = rozetSahibi === ogrenciAdi;

      // Eski sistemdeki boş student_name kayıtlarını da destekle
      const genelBosRozet = !rozetSahibi;

      return herkesRozeti || ozelRozet || genelBosRozet;
    })
    .map((r: any) => ({
      rozetAdi: r.name,
      gerekliPuan: Number(r.required_points || 0),
      emoji: r.emoji || "🏅"
    }));
  return {
    ogrenci: s.username, Sinif: s.class_no || "", sinif: s.class_no || "", sube: s.branch || "", Sube: s.branch || "",
    ogretmenBagli: !!s.teacher_id,
    telefon: s.phone || "", email: s.email || "", durum: s.status === "pending" ? "onay bekliyor" : s.status, toplamsure: s.total_seconds || 0,
    enerji: s.energy, enerjiMax: s.energy_max, streak: s.streak, puan: s.points, altin: s.gold, xp: s.xp,
    genelPuan: son ? son.genel : genelOrtalama, genelOrtalama,
    etkinlikBasarisi: etk.length ? Math.round(etk.filter((x: any) => x.status === "completed").length / etk.length * 100) : (p.etkinlikBasarisi ?? 0),
    sonDeneme: sonDenemeR ? sonDenemeR.deneme : (p.sonDeneme ?? 0),
    okumaOrt: ortala(raporlar, "okuma"), yazmaOrt: ortala(raporlar, "yazma"), vocabOrt: ortala(raporlar, "vocabulary"), konusmaOrt: ortala(raporlar, "konusma"), grammarOrt: ortala(raporlar, "grammar"),
    dersler, arsivListesi: raporlar, kitapBilgi,
    gelisimSerisi: artan.map((r: any) => ({ tarih: r.tarih, genel: r.genel })),
    denemeSerisi: artan.filter((r: any) => r.deneme > 0).map((r: any) => ({ tarih: r.tarih, deneme: r.deneme })),
    rozetListesi: rozetler.length ? rozetler : (p.rozetListesi || []),
    izinler: izinlerHesapla(o.flags, s), kelimeHavuzu: undefined,
    seviyeIlerleme: (b.seviye.get(s.id) || []).filter((x: any) => x.mode === "external").map((x: any) => ({ sinif: Number(x.class_no), unite: Number(x.unit_no), seviye: Number(x.level_no), tamamlandi: true })),
    secilenSinif: Number(s.selected_class || 0) || "",
    aktiviteKartlari: o.kartlar, atananPlanlar,
    planToplamHafta: atananPlanlar.length, planTamamlananHafta: tamamHafta,
    planIlerlemeYuzdesi: atananPlanlar.length ? Math.round(tamamHafta / atananPlanlar.length * 100) : 0
  };
}

async function audit(a: any, operation: string, target: string, payload: any = {}) {
  await supabase.from("audit_logs").insert({
    actor_role: a?.role || "public", actor_id: a?.student_id || a?.teacher_id || null, operation, target, payload
  });
}

// ---------------------------------------------------------------------
// Liderlik (önceki sürümde iki kopya vardı; eski arayüzle uyumlu olanı tutuldu)
// [YAMA 5] Öğrencinin skor kaydı her seferinde 403 "Oyuncu uyuşmuyor" dönüyordu
// ---------------------------------------------------------------------
const leaderboardKey: Record<string, string> = {
  kelimeLiderlikKaydet: "kelime", hafizaLiderlikKaydet: "hafiza", yagmurLiderlikKaydet: "yagmur",
  asmacaLiderlikKaydet: "asmaca", kelimebulLiderlikKaydet: "kelimebul", jeopardyLiderlikKaydet: "jeopardy",
  boslukLiderlikKaydet: "bosluk", konusmaLiderlikKaydet: "konusma", eslestirmeLiderlikKaydet: "eslestirme", trenLiderlikKaydet: "tren", harfBahcesiLiderlikKaydet: "harfbahcesi"
};
const leaderboardGetKey: Record<string, string> = {
  kelimeLiderlikTumunuGetir: "kelime", hafizaLiderlikTumunuGetir: "hafiza", yagmurLiderlikTumunuGetir: "yagmur",
  asmacaLiderlikTumunuGetir: "asmaca", kelimebulLiderlikTumunuGetir: "kelimebul", jeopardyLiderlikTumunuGetir: "jeopardy",
  boslukLiderlikTumunuGetir: "bosluk", konusmaLiderlikTumunuGetir: "konusma", eslestirmeLiderlikTumunuGetir: "eslestirme", trenLiderlikTumunuGetir: "tren", harfBahcesiLiderlikTumunuGetir: "harfbahcesi"
};
const legacyClassNo = (v: any) => { const m = String(v ?? "").match(/(\d+)/); return m ? Number(m[1]) : null; };
const scoreRow = (r: any) => ({
  isim: r.student_name, ogrenci: r.student_name, sinif: r.extra?.legacy_class || (r.class_no ? String(r.class_no) + ". Sınıf" : ""),
  unite: r.unit_name || "", dogru: r.correct_count || 0, yanlis: r.wrong_count || 0,
  sure: String(r.detail || "").match(/\d+\s*s/)?.[0] || (r.duration_seconds || 0) + "s",
  suresaniye: r.duration_seconds || 0, puan: Number(r.score || 0), tarih: r.played_on
});
async function leaderboardSave(op: string, body: any, a: any) {
  const key = leaderboardKey[op];
  const name = String(body.isim || body.ogrenci || "");
  const s = await hedefOgrenci(a, name);
  if (key === "harfbahcesi") {
    if (!s?.id) return bulunamadi();
    if (!/^[0-9a-f-]{36}$/i.test(String(body.runId || ""))) return json({status:"error",message:"Geçersiz oyun kaydı."},400);
    const prior = await supabase.from("game_scores").select("id").eq("student_id",s.id).eq("game_key",key).contains("extra",{run_id:body.runId}).limit(1);
    if (prior.error) return json({status:"error",message:"Kayıt doğrulanamadı."},500);
    if (prior.data?.length) return json({status:"success"});
  }
  const v2 = Number(body.puanSurum) === 2 && ADIL_OYUNLAR.has(key);
  const puan = Math.max(0, Math.min(v2 ? 1000 : 100000, num(body.puan)));
  const row = {
    game_key: key, student_id: s?.id || null, student_name: s?.username || temizMetin(name, 60),
    class_no: legacyClassNo(body.sinif) ?? s?.class_no ?? null, unit_no: legacyClassNo(body.unite),
    unit_name: temizMetin(body.unite, 80) || null, score: puan, correct_count: Math.max(0, num(body.dogru)),
    wrong_count: Math.max(0, num(body.yanlis)), duration_seconds: Math.max(0, num(body.suresaniye)),
    detail: temizMetin(body.detay || body.sure, 200) || null, played_on: body.tarih || new Date().toISOString().slice(0, 10),
    extra: { legacy_class: body.sinif || null, v: v2 ? 2 : 1, ...(key === "harfbahcesi" ? {run_id:body.runId} : {}) }
  };
  const ins = await supabase.from("game_scores").insert(row);
  if (ins.error) return json({ status: "error", message: ins.error.message }, 500);
  if (row.student_id) await supabase.from("feed_events").insert({
    student_id: row.student_id, event_type: "game_score",
    payload: { game_name: key, game_key: key, score: row.score, unit_name: row.unit_name, icon: key === "konusma" ? "🗣️" : key === "eslestirme" ? "🧩" : key === "tren" ? "🚂" : "🎮", student_name: row.student_name }
  });
  return json({ status: "success" });
}
// [v3.5] Adil puanlama: 9 oyun 1000'lik ölçekte. Sıralama: puan ↓, süre ↑, tarih ↑.
// Her öğrencinin sadece en iyi skoru listelenir. donem=hafta → bu pazartesiden beri.
const ADIL_OYUNLAR = new Set(["kelime", "jeopardy", "bosluk", "hafiza", "yagmur", "asmaca", "kelimebul", "eslestirme", "tren", "harfbahcesi"]);
function haftaBasi() {
  const tr = new Date(Date.now() + 3 * 3600000);               // İstanbul saati
  const gun = (tr.getUTCDay() + 6) % 7;                         // pazartesi = 0
  tr.setUTCDate(tr.getUTCDate() - gun);
  return tr.toISOString().slice(0, 10);
}
async function leaderboardGet(op: string, body: any, q: URLSearchParams) {
  const key = leaderboardGetKey[op];
  const cls = String(val(body, q, "sinif") || "");
  const donem = String(val(body, q, "donem") || "tum");
  const adil = ADIL_OYUNLAR.has(key);
  let query = supabase.from("game_scores").select("*").eq("game_key", key)
    .order("score", { ascending: false }).order("duration_seconds", { ascending: true }).order("played_on", { ascending: true }).limit(adil ? 1000 : 100);
  if (adil) query = query.contains("extra", { v: 2 });
  if (adil && donem === "hafta") query = query.gte("played_on", haftaBasi());
  const cn = legacyClassNo(cls);
  if (cn !== null && !/^Büyü/i.test(cls)) query = query.eq("class_no", cn);
  const { data } = await query;
  let rows = data || [];
  if (/^Büyü/i.test(cls)) rows = rows.filter((r: any) => String(r.extra?.legacy_class || r.unit_name || "").toLowerCase() === cls.toLowerCase());
  if (adil) {
    const gorulen = new Set<string>();
    rows = rows.filter((r: any) => { const k = r.student_id || encName(r.student_name); if (gorulen.has(k)) return false; gorulen.add(k); return true; }).slice(0, 100);
  }
  return json(rows.map(scoreRow));
}

async function rootData(a: any) {
  if (!a) return json([]);
  const o = await ortakVeri();
  if (a.role === "teacher") {
    let sorgu = supabase.from("students").select("*").order("username");
    if (!a.yonetici) sorgu = sorgu.eq("teacher_id", a.teacher_id);
    const { data } = await sorgu;
    const b = await baglamYukle(null);
    return json((data || []).map(s => profileFor(s, o, b)));
  }
  const { data } = await supabase.from("students").select("*").eq("id", a.student_id).maybeSingle();
  if (!data) return json([]);
  const b = await baglamYukle([a.student_id]);
  return json([profileFor(data, o, b)]);
}

const PUBLIC_BADGES: any[] = [];

// =====================================================================
// [v3] GOOGLE SHEETS → SUPABASE AKTARIMI
// Sadece Supabase'de IMPORT_TOKEN gizli değeri tanımlıysa çalışır.
// Aktarım bitince bu gizli değeri silin.
// =====================================================================
// =====================================================================
// [v3.2] OTOMASYON: ödev cezası, ödev hatırlatma e-postası, veli raporu
// E-postalar mail_queue tablosuna yazılır, Apps Script (Gmail) gönderir.
// =====================================================================
const ODEV_CEZA_GUN = Number(Deno.env.get("ODEV_CEZA_GUN") || 5);      // kaç günde bir
const ODEV_CEZA_PUAN = Number(Deno.env.get("ODEV_CEZA_PUAN") || 1);    // kaç puan düşülür
const PORTAL_URL = "https://panel.ogretmencocuk.com/ingilizce/";
const hk = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const epostaGecerli = (e: any) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || "").trim());
const trTarih = (v: any) => { const d = new Date(String(v || "")); return isNaN(d.getTime()) ? String(v || "") : d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }); };
function mailKabugu(baslik: string, icerik: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;border:1px solid #e9e2ff;border-radius:16px;overflow:hidden;color:#2d2350">
<div style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;padding:18px 20px;font-size:18px;font-weight:bold">🦜 Diji-Medu İngilizce · ${hk(baslik)}</div>
<div style="padding:20px;font-size:14px;line-height:1.6">${icerik}</div>
<div style="background:#faf7ff;padding:12px 20px;font-size:12px;color:#8a78b8">Bu e-posta Diji-Medu İngilizce Portalı tarafından öğretmen adına gönderilmiştir. Portal: <a href="${PORTAL_URL}" style="color:#7c3aed">${PORTAL_URL}</a></div></div>`;
}
function metniHtmlYap(metin: string) {
  return hk(metin).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/_([^_\n]+)_/g, "<i>$1</i>").replace(/\n/g, "<br>");
}
function rubrikMailHtml(ad: string, x: any) {
  const satir = (k: string, v: any) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #f1ecff">${k}</td><td style="padding:6px 10px;border-bottom:1px solid #f1ecff;font-weight:bold;text-align:right">${hk(v)}</td></tr>`;
  let h = `<p>Sayın Veli,</p><p><b>${hk(ad)}</b> için <b>${trTarih(x.report_date)}</b> tarihli ders değerlendirmesi aşağıdadır.</p>
<table style="width:100%;border-collapse:collapse;background:#fbf9ff;border-radius:10px">
${satir("📖 Okuma", x.reading_score)}${satir("✍️ Yazma", x.writing_score)}${satir("🔤 Kelime", x.vocabulary_score)}${satir("🗣️ Konuşma", x.speaking_score)}${satir("🧩 Dil bilgisi", x.grammar_score)}
${x.genel_score != null ? satir("⭐ Genel", x.genel_score) : ""}${x.exam_score ? satir("📝 Deneme", x.exam_score) : ""}</table>`;
  if (x.book_name) h += `<p>📚 <b>Okunan kitap:</b> ${hk(x.book_name)}${x.page_no ? ` · ${hk(x.page_no)}. sayfa` : ""}</p>`;
  if (x.homework_feedback) h += `<p>💬 <b>Ödev geri dönütü:</b><br>${metniHtmlYap(x.homework_feedback)}</p>`;
  if (x.next_homework) h += `<p>🎯 <b>Sonraki ödev:</b><br>${metniHtmlYap(x.next_homework)}</p>`;
  if (x.next_report_date) h += `<p>📅 <b>Sonraki ders:</b> ${trTarih(x.next_report_date)}</p>`;
  return mailKabugu("Gelişim Raporu", h);
}
/* [v4.1] E-postalar doğrudan Supabase'den gönderilir (Google Apps Script gerekmez).
   Supabase → Edge Functions → Secrets:
     BREVO_API_KEY   (ya da RESEND_API_KEY)
     EPOSTA_GONDEREN = e-posta servisinde doğrulanmış gönderen adresi
     EPOSTA_GONDEREN_AD = görünen ad (isteğe bağlı) */
async function epostaGonder(m: any): Promise<{ ok: boolean, hata?: string }> {
  const brevo = String(Deno.env.get("BREVO_API_KEY") || "").trim(), resend = String(Deno.env.get("RESEND_API_KEY") || "").trim();
  const kimden = String(Deno.env.get("EPOSTA_GONDEREN") || "").trim(), ad = String(Deno.env.get("EPOSTA_GONDEREN_AD") || "Diji-Medu İngilizce").trim();
  if (!kimden) return { ok: false, hata: "EPOSTA_GONDEREN tanımlı değil" };
  try {
    let r: Response;
    if (brevo) r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": brevo, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ sender: { email: kimden, name: ad }, to: [{ email: m.to_email }], subject: m.subject, htmlContent: m.html || hk(m.text_body || ""), ...(m.text_body ? { textContent: m.text_body } : {}) }) });
    else if (resend) r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": `Bearer ${resend}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${ad} <${kimden}>`, to: [m.to_email], subject: m.subject, html: m.html || hk(m.text_body || ""), ...(m.text_body ? { text: m.text_body } : {}) }) });
    else return { ok: false, hata: "BREVO_API_KEY ya da RESEND_API_KEY tanımlı değil" };
    if (r.ok) return { ok: true };
    return { ok: false, hata: `${r.status} ${(await r.text()).slice(0, 250)}` };
  } catch (e) { return { ok: false, hata: String(e).slice(0, 250) }; }
}
async function kuyrukSatiriGonder(id: number, m: any) {
  const g = await epostaGonder(m);
  if (g.ok) await supabase.from("mail_queue").update({ sent_at: new Date().toISOString(), error: null }).eq("id", id);
  else { const { data: x } = await supabase.from("mail_queue").select("attempts").eq("id", id).maybeSingle(); await supabase.from("mail_queue").update({ attempts: num(x?.attempts) + 1, error: String(g.hata || "").slice(0, 300) }).eq("id", id); }
  return g;
}
/* Bekleyen e-postaları gönder (zamanlayıcı 5 dakikada bir çağırır) */
async function kuyruguIsle(limit = 40) {
  const { data } = await supabase.from("mail_queue").select("id,to_email,subject,html,text_body").is("sent_at", null).lt("attempts", 5).lte("send_after", new Date().toISOString()).order("id").limit(limit);
  let gonderilen = 0, hata = 0, sonHata = "";
  for (const m of data || []) { const g = await kuyrukSatiriGonder(m.id, m); if (g.ok) gonderilen++; else { hata++; sonHata = g.hata || ""; } }
  return { ok: true, bekleyen: (data || []).length, gonderilen, hata, sonHata };
}
async function kuyrugaEkle(m: any) {
  const { data, error } = await supabase.from("mail_queue").insert(m).select("id").single();
  if (error) { console.error("mail_queue", error.message); return false; }
  /* Hemen gönderilecekse beklemeden gönder (arka planda); gecikmeli olanları zamanlayıcı gönderir */
  if (!m.send_after || Date.parse(m.send_after) <= Date.now() + 5000) {
    const is = kuyrukSatiriGonder(data.id, m).catch(e => console.error("e-posta", e));
    const er = (globalThis as any).EdgeRuntime;
    if (er && typeof er.waitUntil === "function") er.waitUntil(is); else await is;
  }
  return true;
}

async function odevOtomasyonu(deneme: boolean) {
  const simdi = Date.now(), gunMs = 86400000, periyot = ODEV_CEZA_GUN * gunMs;
  const ozet: any = { deneme, cezaGun: ODEV_CEZA_GUN, cezaPuan: ODEV_CEZA_PUAN, bekleyenOdev: 0, yeniCeza: 0, cezaAlanOgrenci: 0, hatirlatmaMaili: 0, epostasiOlmayan: 0, detay: [] as any[] };
  const [ogr, sa, sv, eskiCeza] = await Promise.all([
    hepsiniGetir(() => supabase.from("students").select("id,username,email,points,class_no,branch,teacher_id").eq("status", "approved").order("username")),
    hepsiniGetir(() => supabase.from("student_activities").select("id,student_id,status,assigned_at,activities(display_name,active)").neq("status", "completed").order("id")),
    hepsiniGetir(() => supabase.from("student_videos").select("id,student_id,watched_at,assigned_at,videos(title,active)").is("watched_at", null).order("id")),
    hepsiniGetir(() => supabase.from("points_transactions").select("auto_key").like("auto_key", "odev:%").order("auto_key"))
  ]);
  const verildi = new Set(eskiCeza.map((x: any) => x.auto_key));
  const ogrMap = new Map(ogr.map((s: any) => [s.id, s]));
  const kisi = new Map<string, { bekleyen: any[], yeni: any[] }>();
  const isle = (tur: string, id: any, sid: string, ad: string, aktif: boolean, atanma: any) => {
    if (!ogrMap.has(sid) || aktif === false || !atanma) return;
    const gun = Math.floor((simdi - Date.parse(atanma)) / gunMs), donem = Math.floor((simdi - Date.parse(atanma)) / periyot);
    if (!kisi.has(sid)) kisi.set(sid, { bekleyen: [], yeni: [] });
    const k = kisi.get(sid)!;
    k.bekleyen.push({ tur, ad, gun });
    ozet.bekleyenOdev++;
    for (let n = 1; n <= donem; n++) {
      const key = `odev:${tur === "Video" ? "v" : tur === "Ödev" ? "a" : "e"}:${id}:${n}`;
      if (!verildi.has(key)) k.yeni.push({ key, ad, tur, gun: n * ODEV_CEZA_GUN });
    }
  };
  for (const x of sa) isle("Etkinlik", x.id, x.student_id, x.activities?.display_name || "Etkinlik", x.activities?.active, x.assigned_at);
  for (const x of sv) isle("Video", x.id, x.student_id, x.videos?.title || "Video", x.videos?.active, x.assigned_at);
  /* Öğretmen panelinden verilen ödevler (Ders Çalış konuları, mini oyunlar) */
  const { data: asg } = await supabase.from("assignments").select("id,title,class_no,branch,created_at,teacher_id").eq("active", true);
  const Yot = await yoneticiler();
  if (asg && asg.length) {
    const { data: ast } = await supabase.from("assignment_status").select("assignment_id,student_id").in("assignment_id", asg.map((x: any) => x.id));
    const yap = new Set((ast || []).map((x: any) => x.assignment_id + "|" + x.student_id));
    for (const o of asg) for (const st of ogr) {
      if (Number(st.class_no) !== Number(o.class_no)) continue;
      if (o.branch && encName(st.branch) !== encName(o.branch)) continue;
      if (o.teacher_id && !Yot.ids.has(o.teacher_id) && st.teacher_id !== o.teacher_id) continue;
      if (yap.has(o.id + "|" + st.id)) continue;
      isle("Ödev", `${o.id}-${st.id}`, st.id, String(o.title).replace(/^[^\s]+\s/, ""), true, o.created_at);
    }
  }

  for (const [sid, k] of kisi) {
    if (!k.yeni.length) continue;
    const s: any = ogrMap.get(sid);
    ozet.yeniCeza += k.yeni.length; ozet.cezaAlanOgrenci++;
    if (ozet.detay.length < 40) ozet.detay.push({ ogrenci: s.username, yeniCeza: k.yeni.length, bekleyen: k.bekleyen.map(b => `${b.ad} (${b.gun} gün)`) });
    if (!epostaGecerli(s.email)) ozet.epostasiOlmayan++; else ozet.hatirlatmaMaili++;
    if (deneme) continue;
    let bakiye = Number(s.points || 0), dusulen = 0;
    for (const c of k.yeni) {
      const sonra = Math.round(Math.max(0, bakiye - ODEV_CEZA_PUAN) * 10) / 10;
      const { error } = await supabase.from("points_transactions").insert({ student_id: sid, change_amount: Math.round((sonra - bakiye) * 10) / 10, balance_after: sonra, reason: `${c.ad} ödevi ${c.gun} gündür yapılmadı`, auto_key: c.key });
      if (error) { if (!/duplicate|unique/i.test(error.message)) console.error("ceza", error.message); continue; }
      dusulen += bakiye - sonra; bakiye = sonra;
    }
    await supabase.from("students").update({ points: bakiye }).eq("id", sid);
    const liste = k.yeni.map(c => c.ad).filter((v, i, a) => a.indexOf(v) === i).join(", ");
    await supabase.from("notifications").insert({ recipient_student_id: sid, type: "odev", message: `📌 Yapılmayan ödev: ${liste}. ${ODEV_CEZA_GUN} günde bir ${ODEV_CEZA_PUAN} puan düşülür, hemen tamamla!` });
    if (epostaGecerli(s.email)) {
      const satirlar = k.bekleyen.sort((a, b) => b.gun - a.gun).map(b => `<li><b>${hk(b.ad)}</b> <span style="color:#8a78b8">(${b.tur})</span> · <b style="color:${b.gun >= ODEV_CEZA_GUN ? "#dc2626" : "#2d2350"}">${b.gun} gündür bekliyor</b></li>`).join("");
      await kuyrugaEkle({ student_id: sid, to_email: String(s.email).trim(), kind: "hatirlatma", subject: `Ödev hatırlatması – ${s.username}`,
        html: mailKabugu("Ödev Hatırlatması", `<p>Sayın Veli,</p><p><b>${hk(s.username)}</b> için portalda tamamlanmamış ödevler var:</p><ul style="padding-left:18px">${satirlar}</ul>
<p>Her ödev, verildiği günden itibaren <b>${ODEV_CEZA_GUN} günde bir</b> yapılmadığında genel puandan <b>${ODEV_CEZA_PUAN} puan</b> düşülmektedir. Ödev tamamlanınca puan düşümü durur.</p>
<p style="text-align:center;margin:22px 0"><a href="${PORTAL_URL}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:bold">Portala git ve ödevi tamamla</a></p>`) });
    }
  }
  return ozet;
}

// =====================================================================
// [v3.3] OTOMATİK TEMİZLİK: eski ve gereksiz kayıtları siler
// Süreleri değiştirmek için sadece "gun" değerlerini düzenleyin.
// Öğrenci verisi (puanlar, rubrikler, ilerleme, rozetler, mesajlar,
// ödevler, okuma sonuçları, puan geçmişi) ASLA silinmez.
// =====================================================================
const TEMIZLIK_KURALLARI: { ad: string, tablo: string, gun: number, filtre: (q: any, sinir: string) => any }[] = [
  { ad: "Süresi dolmuş oturumlar", tablo: "portal_sessions", gun: 0, filtre: (q) => q.lt("expires_at", new Date().toISOString()) },
  { ad: "Gönderilmiş e-postalar", tablo: "mail_queue", gun: 30, filtre: (q, t) => q.not("sent_at", "is", null).lt("sent_at", t) },
  { ad: "Gönderilemeyen eski e-postalar", tablo: "mail_queue", gun: 30, filtre: (q, t) => q.is("sent_at", null).gte("attempts", 5).lt("created_at", t) },
  { ad: "İşlem günlüğü (audit)", tablo: "audit_logs", gun: 90, filtre: (q, t) => q.lt("created_at", t) },
  { ad: "Okunmuş bildirimler", tablo: "notifications", gun: 60, filtre: (q, t) => q.not("read_at", "is", null).lt("created_at", t) },
  { ad: "Okunmamış çok eski bildirimler", tablo: "notifications", gun: 180, filtre: (q, t) => q.lt("created_at", t) },
  { ad: "Akış olayları (takipler hariç)", tablo: "feed_events", gun: 60, filtre: (q, t) => q.neq("event_type", "takip").lt("created_at", t) },
  { ad: "Enerji hareketleri", tablo: "energy_transactions", gun: 60, filtre: (q, t) => q.lt("created_at", t) },
  { ad: "Eski düellolar", tablo: "duels", gun: 60, filtre: (q, t) => q.lt("created_at", t) },
  { ad: "Ders içi puan geri alma kayıtları", tablo: "class_point_actions", gun: 30, filtre: (q, t) => q.lt("action_at", t) },
  { ad: "Bir yıldan eski oyun skorları", tablo: "game_scores", gun: 365, filtre: (q, t) => q.lt("played_on", t.slice(0, 10)) },
  /* [v4.3] eklenenler */
  { ad: "Bir yıldan eski sohbet mesajları", tablo: "chat_messages", gun: 365, filtre: (q, t) => q.lt("created_at", t) },
  { ad: "Kaldırılmış eski ödevler", tablo: "assignments", gun: 90, filtre: (q, t) => q.eq("active", false).lt("created_at", t) },
  { ad: "Gönderilmiş e-postaların içeriği (başlık ve alıcı kalır)", tablo: "mail_queue", gun: 3, filtre: (q, t) => q.not("sent_at", "is", null).not("html", "is", null).lt("sent_at", t) }
];

async function temizlikCalistir(deneme: boolean) {
  const sonuc: any[] = []; let toplam = 0;
  for (const k of TEMIZLIK_KURALLARI) {
    const sinir = new Date(Date.now() - k.gun * 86400000).toISOString();
    try {
      const icerik = k.ad.startsWith("Gönderilmiş e-postaların içeriği");
      const { count, error } = deneme
        ? await k.filtre(supabase.from(k.tablo).select("*", { count: "exact", head: true }), sinir)
        : icerik ? await k.filtre(supabase.from(k.tablo).update({ html: null, text_body: null }, { count: "exact" }), sinir)
        : await k.filtre(supabase.from(k.tablo).delete({ count: "exact" }), sinir);
      if (error) { sonuc.push({ kural: k.ad, tablo: k.tablo, saklama: k.gun + " gün", hata: error.message }); continue; }
      toplam += count || 0;
      sonuc.push({ kural: k.ad, tablo: k.tablo, saklama: k.gun ? k.gun + " gün" : "süresi dolunca", [deneme ? "silinecek" : "silinen"]: count || 0 });
    } catch (e) { sonuc.push({ kural: k.ad, tablo: k.tablo, hata: String(e) }); }
  }
  if (!deneme) await supabase.from("audit_logs").insert({ actor_role: "sistem", operation: "temizlik", target: "", payload: { toplam } });
  return { ok: true, deneme, [deneme ? "toplamSilinecek" : "toplamSilinen"]: toplam, kurallar: sonuc };
}

async function otomasyonIslem(req: Request, body: any) {
  const beklenen = String(Deno.env.get("OTOMASYON_TOKEN") || "").trim(), gelen = String(req.headers.get("x-diji-otomasyon") || "").trim();
  if (beklenen.length < 20) return json({ ok: false, mesaj: "Sunucuda OTOMASYON_TOKEN yok ya da 20 karakterden kısa." }, 403);
  if (gelen !== beklenen) return json({ ok: false, mesaj: `Otomasyon anahtarı eşleşmiyor (sunucu ${beklenen.length}, gelen ${gelen.length} karakter).` }, 403);
  const is = String(body.is || "");
  if (is === "odevKontrol") return json({ ok: true, ...(await odevOtomasyonu(!!body.deneme)) });
  if (is === "temizlik") return json(await temizlikCalistir(!!body.deneme));
  if (is === "epostaGonder") return json(await kuyruguIsle(Math.min(80, num(body.limit, 40))));
  if (is === "epostaDene") {   /* kurulum testi: { is:"epostaDene", alici:"..." } */
    const alici = String(body.alici || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(alici)) return json({ ok: false, mesaj: "alici geçerli bir e-posta olmalı" });
    return json(await epostaGonder({ to_email: alici, subject: "Diji-Medu e-posta testi ✅", html: mailKabugu("E-posta testi", "<p>Bu e-postayı görüyorsan Supabase e-posta gönderimi çalışıyor. 🎉</p>") }));
  }
  if (is === "mailKuyrugu") {
    const { data, error } = await supabase.from("mail_queue").select("id,to_email,subject,html,text_body").is("sent_at", null).lt("attempts", 5).lte("send_after", new Date().toISOString()).order("id").limit(Math.min(80, num(body.limit, 40)));
    if (error) return json({ ok: false, mesaj: error.message }, 500);
    return json({ ok: true, liste: data || [] });
  }
  if (is === "mailSonuc") {
    for (const r of arr(body.sonuclar)) {
      const id = num(r.id); if (!id) continue;
      if (r.ok) await supabase.from("mail_queue").update({ sent_at: new Date().toISOString(), error: null }).eq("id", id);
      else { const { data: m } = await supabase.from("mail_queue").select("attempts").eq("id", id).maybeSingle(); await supabase.from("mail_queue").update({ attempts: num(m?.attempts) + 1, error: String(r.hata || "").slice(0, 300) }).eq("id", id); }
    }
    return json({ ok: true });
  }
  return json({ ok: false, mesaj: "Bilinmeyen otomasyon işi: " + is }, 400);
}

// =====================================================================
// [v3.6] ENERJİ: tavan 30, her 15 dakikada +1 (sunucu hesaplar)
// =====================================================================
const ENERJI_TAVAN = 30, ENERJI_DOLUM_DK = 15;
async function enerjiYenile(s: any) {
  const max = Number(s.energy_max || ENERJI_TAVAN), simdi = Date.now(), adimMs = ENERJI_DOLUM_DK * 60000;
  const son = s.energy_updated_at ? Date.parse(s.energy_updated_at) : simdi;
  if (Number(s.energy) >= max) {
    if (!s.energy_updated_at || simdi - son > adimMs) {
      s.energy_updated_at = new Date(simdi).toISOString();
      await supabase.from("students").update({ energy_updated_at: s.energy_updated_at }).eq("id", s.id);
    }
    return s;
  }
  const adim = Math.floor((simdi - son) / adimMs);
  if (adim <= 0) return s;
  const yeni = Math.min(max, Number(s.energy) + adim);
  const zaman = new Date(yeni >= max ? simdi : son + adim * adimMs).toISOString();
  await supabase.from("students").update({ energy: yeni, energy_updated_at: zaman }).eq("id", s.id);
  if (yeni !== s.energy) await supabase.from("energy_transactions").insert({ student_id: s.id, change_amount: yeni - s.energy, balance_after: yeni, reason: "dolum" });
  s.energy = yeni; s.energy_updated_at = zaman;
  return s;
}
function dolumBilgi(s: any) {
  const max = Number(s.energy_max || ENERJI_TAVAN);
  if (Number(s.energy) >= max) return { sonrakiDk: 0, sonrakiSn: 0, dolumDk: ENERJI_DOLUM_DK };
  const son = s.energy_updated_at ? Date.parse(s.energy_updated_at) : Date.now();
  const kalanMs = Math.max(0, son + ENERJI_DOLUM_DK * 60000 - Date.now());
  return { sonrakiDk: Math.ceil(kalanMs / 60000), sonrakiSn: Math.ceil(kalanMs / 1000), dolumDk: ENERJI_DOLUM_DK };
}

async function iceAktar(body: any) {
  const tablo = String(body.tablo || ""), rows: any[] = Array.isArray(body.satirlar) ? body.satirlar : [], ilk = !!body.ilkParca;
  const r = { tablo, gelen: rows.length, eklenen: 0, guncellenen: 0, atlanan: 0, hatalar: [] as string[] };
  const hata = (m: string) => { if (r.hatalar.length < 15) r.hatalar.push(m); };
  const { data: ogr } = await supabase.from("students").select("id,username,status,profile,selected_class");
  const idx = new Map<string, any>(); for (const s of ogr || []) idx.set(encName(s.username), s);
  const bul = (ad: any) => idx.get(encName(ad));
  const yok = (ad: any) => { r.atlanan++; hata("Öğrenci bulunamadı: " + ad); };
  const gun = (v: any) => { const s = String(v || "").trim(); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); };
  const zaman = (v: any) => { const d = new Date(String(v || "")); return isNaN(d.getTime()) ? null : d.toISOString(); };
  const evet = (v: any) => ["true", "evet", "1", "x", "✓", "✔", "tamamlandi", "tamamlandı", "acik", "açık", "aktif", "yes", "okundu"].includes(encName(v));
  const adlar = (v: any) => String(v || "").split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
  async function topluEkle(t: string, l: any[]) {
    for (let i = 0; i < l.length; i += 200) {
      const { error } = await supabase.from(t).insert(l.slice(i, i + 200));
      if (error) hata(`${t}: ${error.message}`); else r.eklenen += l.slice(i, i + 200).length;
    }
  }
  async function profilYaz(s: any, ek: any) {
    const p = (s.profile && typeof s.profile === "object") ? { ...s.profile } : {};
    Object.assign(p, ek); s.profile = p;
    const { error } = await supabase.from("students").update({ profile: p }).eq("id", s.id);
    if (error) hata(error.message); else r.guncellenen++;
  }
  async function seviyeEkle(l: any[]) {
    for (let i = 0; i < l.length; i += 200) {
      const { error } = await supabase.from("level_completions").upsert(l.slice(i, i + 200), { onConflict: "student_id,mode,class_no,unit_no,level_no", ignoreDuplicates: true });
      if (error) hata("level_completions: " + error.message); else r.eklenen += l.slice(i, i + 200).length;
    }
  }
  const { data: ogrt } = await supabase.from("teachers").select("id").eq("username", "teacher").maybeSingle();

  switch (tablo) {
    case "Puanlama": {
      const { data: m } = await supabase.from("teacher_reports").select("id,student_id,report_date");
      const var_ = new Map((m || []).map((x: any) => [x.student_id + "|" + String(x.report_date).slice(0, 10), x.id]));
      const son = new Map<string, any>(); let tarihsiz = 0, tekrar = 0;
      for (const x of rows) {
        const s = bul(x.ogrenci), t = gun(x.tarih); if (!s) { yok(x.ogrenci); continue; } if (!t) { tarihsiz++; r.atlanan++; continue; }
        const k = s.id + "|" + t; if (son.has(k)) tekrar++;
        son.set(k, { student_id: s.id, teacher_id: ogrt?.id || null, report_date: t, genel_score: num(x.genel), vocabulary_score: num(x.vocabulary), speaking_score: num(x.konusma), reading_score: num(x.okuma), writing_score: num(x.yazma), grammar_score: num(x.grammar), exam_score: num(x.deneme_puan), last_attempt: num(x.deneme_puan) > 0 });
      }
      const ekle: any[] = [];
      for (const [k, satir] of son) {
        const id = var_.get(k);
        if (id) { const { error } = await supabase.from("teacher_reports").update(satir).eq("id", id); if (error) hata(error.message); else r.guncellenen++; }
        else ekle.push(satir);
      }
      await topluEkle("teacher_reports", ekle);
      if (tekrar) hata(`${tekrar} satır aynı öğrenci ve günün tekrarıydı, en son kayıt kullanıldı`);
      if (tarihsiz) hata(`${tarihsiz} satırda tarih yok`);
      r.atlanan += tekrar;
      break;
    }
    case "Kitaplar": case "Dersler": {
      const g = new Map<string, any[]>();
      for (const x of rows) { const s = bul(x.ogrenci); if (!s) { yok(x.ogrenci); continue; } if (!g.has(s.id)) g.set(s.id, []); g.get(s.id)!.push(x); }
      const bugun = new Date().toISOString().slice(0, 10);
      for (const [id, l] of g) {
        const s = (ogr || []).find((x: any) => x.id === id);
        l.sort((a, b) => String(gun(a.tarih)).localeCompare(String(gun(b.tarih))));
        if (tablo === "Kitaplar") { const k = l[l.length - 1]; await profilYaz(s, { kitapBilgi: { kitapAdi: String(k.son_kitap_adi || ""), sayfa: num(k.son_kitap_sayfa), hedef: num(k.son_kitap_hedef, 40) || 40, okunanSayisi: num(k.okunan_kitap_sayisi, 1) } }); }
        else {
          const gecmis = l.filter(x => (gun(x.tarih) || "") <= bugun), gelecek = l.filter(x => (gun(x.tarih) || "") > bugun);
          const a1 = gecmis[gecmis.length - 1], a2 = gelecek[0];
          await profilYaz(s, { dersler: [{ tarih: a1 ? gun(a1.tarih) : "", durum: a1 ? a1.durum : "" }, { tarih: a2 ? gun(a2.tarih) : "", durum: a2 ? a2.durum : "sonraki" }] });
        }
      }
      break;
    }
    case "EkVeri": {
      const { data: m } = await supabase.from("extra_data").select("student_id,key_name,value");
      const var_ = new Map((m || []).map((x: any) => [x.student_id + "|" + x.key_name, x.value]));
      for (const x of rows) {
        const s = bul(x.ogrenci); if (!s) { yok(x.ogrenci); continue; }
        const key = String(x.anahtar || "").trim(); if (!key) { r.atlanan++; continue; }
        let v: any; try { v = JSON.parse(x.deger); } catch (_) { v = x.deger; }
        const eski: any = var_.get(s.id + "|" + key);
        if (eski && typeof eski === "object" && v && typeof v === "object" && num(eski.guncelleme) >= num(v.guncelleme)) { r.atlanan++; continue; }
        const { error } = await supabase.from("extra_data").upsert({ student_id: s.id, key_name: key, value: v, updated_at: zaman(x.guncelleme) || new Date().toISOString() }, { onConflict: "student_id,key_name" });
        if (error) hata(error.message); else r.eklenen++;
        if (key === "yo" && v && typeof v === "object" && v.lig) await profilYaz(s, { lig: v.lig });
      }
      break;
    }
    case "BuyuIlerleme": case "KonusmaSeviyeIlerleme": {
      const mode = tablo === "BuyuIlerleme" ? "buyu" : "konusma", l: any[] = [];
      for (const x of rows) { const s = bul(x.ogrenci); if (!s) { yok(x.ogrenci); continue; } if (!num(x.seviyeNo)) { r.atlanan++; continue; } l.push({ student_id: s.id, mode, class_no: 0, unit_no: 0, level_no: num(x.seviyeNo) }); }
      await seviyeEkle(l); break;
    }
    case "SeviyeIlerleme": {
      const l: any[] = [];
      for (const x of rows) {
        const s = bul(x.ogrenci); if (!s) { yok(x.ogrenci); continue; }
        if (num(x.secilen_sinif) && !s.selected_class) { await supabase.from("students").update({ selected_class: num(x.secilen_sinif) }).eq("id", s.id); s.selected_class = num(x.secilen_sinif); }
        if (!evet(x.tamamlandi_mi)) { r.atlanan++; continue; }
        l.push({ student_id: s.id, mode: "external", class_no: num(x.sinif), unit_no: num(x.unite), level_no: num(x.seviye) });
      }
      await seviyeEkle(l); break;
    }
    case "AktiviteKartlari": {
      if (ilk) await supabase.from("word_cards").delete().gte("class_no", -1);
      await topluEkle("word_cards", rows.filter(x => x.dis_link).map(x => ({ class_no: num(x.sinif), unit_no: num(x.unite), level_no: num(x.seviye), button_name: String(x.buton_adi || ""), external_link: String(x.dis_link) })));
      break;
    }
    case "Rozetler": {
      if (ilk) await supabase.from("badges").delete().gte("required_points", -1000);
      await topluEkle("badges", rows.filter(x => x.rozetAdi).map(x => ({ student_name: String(x.ogrenciAdi || "").trim() || null, name: String(x.rozetAdi), required_points: num(x.gerekliPuan), emoji: String(x.emoji || "🏅") })));
      break;
    }
    case "KonusmaEsAnlamlar": {
      if (ilk) await supabase.from("speech_synonyms").delete().neq("english", "");
      const wb = await hepsiniGetir(() => supabase.from("word_bank").select("english,turkish").order("english"));
      const tr = new Map<string, string[]>(); for (const w of wb || []) { const k = encName(w.turkish); if (!tr.has(k)) tr.set(k, []); tr.get(k)!.push(String(w.english)); }
      const l: any[] = [];
      let bos = 0, esz = 0;
      for (const x of rows) {
        if (!String(x.alternatifler || "").trim()) { r.atlanan++; bos++; continue; }
        const en = tr.get(encName(x.turkce)); if (!en) { r.atlanan++; esz++; if (esz <= 5) hata("Kelime bankasında yok: " + x.turkce); continue; }
        for (const e of en) l.push({ english: e, turkish: String(x.turkce), alternatives: String(x.alternatifler) });
      }
      await topluEkle("speech_synonyms", l);
      if (bos) hata(`${bos} satırın alternatifi boş`); if (esz) hata(`${esz} satır kelime bankasıyla eşleşmedi`);
      break;
    }
    case "Kategoriler": {
      if (ilk) await supabase.from("activity_categories").delete().neq("name", "");
      await topluEkle("activity_categories", [...new Set(rows.map(x => String(x.kategori_adi || "").trim()).filter(Boolean))].map(name => ({ name })));
      break;
    }
    case "OzellikIzinleri": {
      for (const x of rows) {
        const code = String(x.ozellikKodu || "").trim(); if (!code) { r.atlanan++; continue; }
        const satir = { code, name: code, target_type: String(x.hedefTipi || "tumogrenciler"), target_value: String(x.hedefDegeri || ""), enabled: evet(x.durum), updated_at: new Date().toISOString() };
        const { data: v } = await supabase.from("feature_flags").select("id").eq("code", code).eq("target_type", satir.target_type).eq("target_value", satir.target_value).limit(1);
        const { error } = v && v.length ? await supabase.from("feature_flags").update(satir).eq("id", v[0].id) : await supabase.from("feature_flags").insert(satir);
        if (error) hata(error.message); else r.eklenen++;
      }
      break;
    }
    case "PlanSayfa": {
      const g = new Map<string, any[]>();
      for (const x of rows) { const k = String(x.Plankodu || "").trim(); if (!k || !num(x.Hafta)) { r.atlanan++; continue; } if (!g.has(k)) g.set(k, []); g.get(k)!.push(x); }
      for (const [kod, l] of g) {
        l.sort((a, b) => num(a.Hafta) - num(b.Hafta));
        const plan_data = l.map(x => ({ hafta: num(x.Hafta), aciklama: String(x["Açıklama"] || x.Aciklama || "") }));
        const { data: v } = await supabase.from("annual_plans").select("id").eq("plan_code", kod).maybeSingle();
        const up = v ? await supabase.from("annual_plans").update({ plan_data, total_weeks: plan_data.length, title: kod }).eq("id", v.id).select("id").single() : await supabase.from("annual_plans").insert({ plan_code: kod, title: kod, total_weeks: plan_data.length, plan_data }).select("id").single();
        if (up.error) { hata(up.error.message); continue; }
        r.eklenen++;
        const ilerleme: any[] = [];
        for (const x of l) for (const ad of adlar(x.Onaylananlar)) { const s = bul(ad); if (s) ilerleme.push({ student_id: s.id, plan_id: up.data.id, week_no: num(x.Hafta), completed: true }); }
        if (ilerleme.length) { const { error } = await supabase.from("student_plan_progress").upsert(ilerleme, { onConflict: "student_id,plan_id,week_no" }); if (error) hata("plan ilerleme: " + error.message); else r.guncellenen += ilerleme.length; }
      }
      break;
    }
    case "Etkinlikler": case "Videolar": {
      const video = tablo === "Videolar";
      const onaylilar = (ogr || []).filter((s: any) => s.status === "approved");
      for (const x of rows) {
        let kayit: any;
        if (video) {
          if (!x.videoLink) { r.atlanan++; continue; }
          const satir = { title: String(x.baslik || "Video"), url: String(x.videoLink), description: String(x.aciklama || ""), category: String(x.kategori || "Genel"), external_row_index: num(x._satir), content: { siraNo: num(x.siraNo) }, active: true };
          const { data: v } = await supabase.from("videos").select("id").eq("external_row_index", satir.external_row_index).maybeSingle();
          const s2 = v ? await supabase.from("videos").update(satir).eq("id", v.id).select("id").single() : await supabase.from("videos").insert(satir).select("id").single();
          if (s2.error) { hata(s2.error.message); continue; } kayit = s2.data;
        } else {
          const code = String(x.etkinlikKodu || "").trim() || ("sheet_" + x._satir);
          const { data: v } = await supabase.from("activities").select("id,content").eq("code", code).maybeSingle();
          const satir = { code, display_name: String(x.gorunenAd || code), category: String(x.kategori || "Genel"), external_link: String(x.disLink || ""), teacher_comment: String(x.ogretmenYorumu || ""), content: { ...((v && v.content) || {}), siraNo: num(x.siraNo), _sourceRow: num(x._satir) }, active: true };
          const s2 = v ? await supabase.from("activities").update(satir).eq("id", v.id).select("id").single() : await supabase.from("activities").insert(satir).select("id").single();
          if (s2.error) { hata(s2.error.message); continue; } kayit = s2.data;
        }
        r.eklenen++;
        const hedef = adlar(x.ogrenciAdi).some(a => encName(a) === "herkes") ? onaylilar : adlar(x.ogrenciAdi).map(bul).filter(Boolean);
        for (const s of hedef) {
          if (video) await supabase.from("student_videos").upsert({ student_id: s.id, video_id: kayit.id }, { onConflict: "student_id,video_id", ignoreDuplicates: true });
          else { const { data: v } = await supabase.from("student_activities").select("id").eq("student_id", s.id).eq("activity_id", kayit.id).limit(1); if (!v || !v.length) await supabase.from("student_activities").insert({ student_id: s.id, activity_id: kayit.id, status: "assigned" }); }
          r.guncellenen++;
        }
      }
      break;
    }
    case "Dogru_Yanlis_Sorular": {
      const g = new Map<string, any[]>();
      for (const x of rows) { const k = String(x.etkinlikKodu || "").trim(); if (!k) { r.atlanan++; continue; } if (!g.has(k)) g.set(k, []); g.get(k)!.push(x); }
      for (const [code, l] of g) {
        const questions = l.sort((a, b) => num(a.siraNo) - num(b.siraNo)).map(x => ({ siraNo: num(x.siraNo), gorselLink: String(x.gorselLink || ""), dinlemeMetni: String(x.dinlemeMetniEN || ""), dogruCevap: encName(x.dogruCevap).startsWith("d") ? "dogru" : "yanlis" }));
        const { data: v } = await supabase.from("activities").select("id,content").eq("code", code).maybeSingle();
        const { error } = v ? await supabase.from("activities").update({ content: { ...(v.content || {}), questions } }).eq("id", v.id) : await supabase.from("activities").insert({ code, display_name: code, category: "Etkinlikler", content: { questions }, active: false });
        if (error) hata(error.message); else r.eklenen++;
      }
      break;
    }
    case "Etkinlik_Yapilan": case "Video_Izlenenler": {
      const video = tablo === "Video_Izlenenler";
      const { data: liste } = video ? await supabase.from("videos").select("id,external_row_index") : await supabase.from("activities").select("id,content");
      for (const x of rows) {
        const s = bul(x.ogrenciAdi); if (!s) { yok(x.ogrenciAdi); continue; }
        const i = num(video ? x.videoSatirIndex : x.etkinlikSatirIndex), t = zaman(video ? x.izlenmeTarihi : x.yapilmaTarihi) || new Date().toISOString();
        const k = (liste || []).find((y: any) => video ? Number(y.external_row_index) === i : Number(y.content?._sourceRow) === i);
        if (!k) { r.atlanan++; hata("Satır eşleşmedi: " + i); continue; }
        if (video) { const { error } = await supabase.from("student_videos").upsert({ student_id: s.id, video_id: k.id, watched_at: t }, { onConflict: "student_id,video_id" }); if (error) hata(error.message); else r.eklenen++; }
        else {
          const { data: v } = await supabase.from("student_activities").select("id").eq("student_id", s.id).eq("activity_id", k.id).limit(1);
          const { error } = v && v.length ? await supabase.from("student_activities").update({ status: "completed", completed_at: t }).eq("id", v[0].id) : await supabase.from("student_activities").insert({ student_id: s.id, activity_id: k.id, status: "completed", completed_at: t });
          if (error) hata(error.message); else r.eklenen++;
        }
      }
      break;
    }
    case "Akis_Olaylari": {
      const { data: m } = await supabase.from("feed_events").select("student_id,target_student_id").eq("event_type", "takip");
      const var_ = new Set((m || []).map((x: any) => x.student_id + "|" + x.target_student_id)), l: any[] = [];
      for (const x of rows) {
        if (encName(x.Tur) !== "takip" || !evet(x.Aktif === "" ? "true" : x.Aktif)) { r.atlanan++; continue; }
        const s = bul(x.Kaynak), t = bul(x.Hedef); if (!s || !t) { r.atlanan++; continue; }
        if (var_.has(s.id + "|" + t.id)) { r.atlanan++; continue; } var_.add(s.id + "|" + t.id);
        l.push({ student_id: s.id, target_student_id: t.id, event_type: "takip", payload: { target_name: t.username }, created_at: zaman(x.Zaman) || new Date().toISOString() });
      }
      await topluEkle("feed_events", l); break;
    }
    case "Sohbet": {
      const { data: m } = await supabase.from("chat_messages").select("student_id,created_at,message");
      const var_ = new Set((m || []).map((x: any) => x.student_id + "|" + String(x.created_at).slice(0, 16) + "|" + x.message)), l: any[] = [];
      for (const x of rows) {
        const s = bul(x.ogrenci); if (!s) { yok(x.ogrenci); continue; }
        const t = zaman(x.tarih) || new Date().toISOString(), k = s.id + "|" + t.slice(0, 16) + "|" + x.mesaj;
        if (!x.mesaj || var_.has(k)) { r.atlanan++; continue; } var_.add(k);
        l.push({ student_id: s.id, sender_role: /ogretmen|öğretmen|teacher/i.test(String(x.gonderen)) ? "teacher" : "student", message: String(x.mesaj), created_at: t, read_at: evet(x.okundu) ? t : null });
      }
      await topluEkle("chat_messages", l); break;
    }
    case "Bildirimler": {
      const { data: m } = await supabase.from("notifications").select("recipient_student_id,type,created_at");
      const var_ = new Set((m || []).map((x: any) => x.recipient_student_id + "|" + x.type + "|" + String(x.created_at).slice(0, 16))), l: any[] = [];
      for (const x of rows) {
        const s = bul(x.alici); if (!s) { r.atlanan++; continue; }
        const t = zaman(x.tarih) || new Date().toISOString(), k = s.id + "|" + x.tur + "|" + t.slice(0, 16);
        if (var_.has(k)) { r.atlanan++; continue; } var_.add(k);
        const g = bul(x.gonderen);
        l.push({ recipient_student_id: s.id, sender_student_id: g ? g.id : null, type: String(x.tur || "bilgi"), message: String(x.metin || ""), created_at: t, read_at: evet(x.okundu) ? t : null });
      }
      await topluEkle("notifications", l); break;
    }
    default: return json({ ok: false, mesaj: "Bu sekme aktarılmıyor: " + tablo }, 400);
  }
  return json({ ok: true, ...r });
}

async function handle(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  let body: any = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch (_) { body = {}; }
  }
  const q = url.searchParams;
  const op = String(body.islem || q.get("islem") || "").trim();

  // Google Auth is an additional student login method; legacy login stays intact.
  if (op === "googleDurum") {
    const { error } = await supabase.from("student_google_accounts").select("auth_user_id").limit(0);
    return json({ hazir: !error });
  }
  if (op === "googleGiris" || op === "googleBagla" || op === "googleKayit") {
    if (req.method !== "POST") return json({ ok: false, mesaj: "POST gerekli." }, 405);
    const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!bearer) return json({ ok: false, mesaj: "Google oturumu gerekli." }, 401);
    const { data: identity, error: identityError } = await supabase.auth.getUser(bearer);
    const user = identity?.user;
    // Never trust a client-supplied email, name or user_metadata for ownership.
    if (identityError || !user || !user.identities?.some(i => i.provider === "google"))
      return json({ ok: false, mesaj: "Geçerli bir Google oturumu gerekli." }, 401);
    const { data: mapping, error: mappingError } = await supabase.from("student_google_accounts")
      .select("student_id").eq("auth_user_id", user.id).maybeSingle();
    if (mappingError) return json({ ok: false, mesaj: "Google girişi henüz hazır değil." }, 503);
    let studentId = mapping?.student_id;
    if (op === "googleKayit") {
      if (studentId) return json({ ok: false, mesaj: "Bu Google hesabı zaten kayıtlı. Google ile giriş düğmesini kullan; onay bekliyorsa öğretmenin onayını bekle." }, 409);
      const username = String(body.ogrenciAdi || "").trim().replace(/\s+/g, " ");
      if (!/^[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû .'-]{3,50}$/.test(username))
        return json({ ok: false, mesaj: "Öğrenci ad soyadı sadece harflerden oluşmalı (3-50 karakter)." }, 400);
      const telHam = String(body.telefon || "").replace(/\D/g, "");
      const tel = /^5\d{9}$/.test(telHam) ? "0" + telHam : /^05\d{9}$/.test(telHam) ? telHam : /^905\d{9}$/.test(telHam) ? "0" + telHam.slice(2) : "";
      const email = String(body.email || "").trim();
      const sinif = Number(body.sinif), sube = temizMetin(body.sube, 10).trim();
      if (!tel) return json({ ok: false, mesaj: "Geçerli bir veli cep telefonu yaz (05XX XXX XX XX)." }, 400);
      if (email.length > 120 || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email))
        return json({ ok: false, mesaj: "Geçerli bir veli e-posta adresi yaz." }, 400);
      if (!Number.isInteger(sinif) || sinif < 1 || sinif > 8 || !sube)
        return json({ ok: false, mesaj: "Öğrencinin sınıfını ve şubesini belirt." }, 400);
      if (body.kvkkOnay !== true) return json({ ok: false, mesaj: "Veli ve bilgilendirme beyanını işaretlemelisin." }, 400);
      if (await denemeSay("google_kayit", user.id, 60) >= 5 || await denemeSay("kayit", "genel", 60) >= 20)
        return json({ ok: false, mesaj: "Çok fazla kayıt denemesi. Bir saat sonra tekrar dene." }, 429);
      await denemeYaz("google_kayit", user.id);
      await denemeYaz("kayit", "genel", { ad: username });
      if (await studentByNameGenel(username))
        return json({ ok: false, mesaj: "Bu öğrenci zaten kayıtlı. Mevcut hesabını kullanıcı adı ve şifresiyle bağla." }, 409);
      const { data: ayniOgrt } = await supabase.from("teachers").select("id").ilike("username", likeKacir(username)).limit(1);
      if (ayniOgrt?.length) return json({ ok: false, mesaj: "Bu kullanıcı adı zaten kayıtlı." }, 409);
      const kod = String(body.ogretmenKodu || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      const ogretmen = kod ? (await supabase.from("teachers").select("id,email,full_name,username,active").ilike("invite_code", kod).limit(1)).data?.[0] || null : null;
      if (kod && (!ogretmen || ogretmen.active === false))
        return json({ ok: false, mesaj: "Öğretmen kodu bulunamadı. Kodu kontrol et veya boş bırak." }, 400);
      const payload = { username, password_hash: await hashPassword((crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "")),
        phone: tel, class_no: sinif, branch: sube, email, teacher_id: ogretmen?.id || null };
      // One transaction: failure to bind the Google identity rolls back the new student.
      const { data: createdId, error: createError } = await supabase.rpc("register_google_student", { p_auth_user_id: user.id, p_payload: payload });
      if (createError || !createdId) return json({ ok: false, mesaj: createError?.code === "23505"
        ? "Bu ad soyad zaten kayıtlı. Mevcut hesabını bağla veya öğretmeninle görüş."
        : "Kayıt tamamlanamadı. Biraz sonra tekrar dene." }, createError?.code === "23505" ? 409 : 503);
      try {
        const alicilar = await sorumluEpostalar({ teacher_id: payload.teacher_id });
        for (const e of alicilar) await kuyrugaEkle({ to_email: e, kind: "kayit", student_id: createdId,
          subject: `Google ile yeni öğrenci kaydı – ${username}`,
          html: mailKabugu("Yeni Öğrenci Kaydı", `<p><b>${hk(username)}</b> Google hesabıyla kayıt oldu. Hesabı aktif; bu bildirim kayıt bilgisi içindir.</p><p>Sınıf / şube: ${hk(sinif)} ${hk(sube)}</p><p>Veli telefonu: ${hk(tel)}</p><p>Veli e-postası: ${hk(email)}</p>`) });
      } catch (_) { console.error("Google signup notification could not be queued"); }
      const { data: createdStudent, error: createdStudentError } = await supabase.from("students")
        .select("id,username,status").eq("id", createdId).maybeSingle();
      if (createdStudentError || !createdStudent || createdStudent.status !== "approved")
        return json({ ok: false, mesaj: "Hesabın aktif değil. Öğretmeninle görüş." }, 403);
      const token = await issueSession("student", createdStudent.id);
      return json({ ok: true, kayitOlustu: true, token, rol: "ogrenci", ogrenci: createdStudent.username,
        mesaj: "Google ile kaydın tamamlandı. Hoş geldin!" });
    }
    if (op === "googleBagla") {
      // Linking ALWAYS verifies the existing password, including repeat requests.
      const username = String(body.ogrenci || "").trim();
      const password = String(body.sifre || "");
      const target = encName(username);
      if (!username || !password) return json({ ok: false, mesaj: "Kullanıcı adı ve şifre gerekli." }, 400);
      if (await denemeSay("giris_hata", target, 15) >= 5)
        return json({ ok: false, mesaj: "Çok fazla hatalı deneme. 15 dakika sonra tekrar dene." }, 429);
      const student = await studentByNameGenel(username);
      if (!student || !(await verifyPassword(password, student.password_hash))) {
        await denemeYaz("giris_hata", target);
        return json({ ok: false, mesaj: "Hatalı kullanıcı adı veya şifre." }, 401);
      }
      if (student.status !== "approved") return json({ ok: false, mesaj: "Hesabın aktif değil veya onay bekliyor." }, 403);
      if (studentId && studentId !== student.id)
        return json({ ok: false, mesaj: "Bu Google hesabı başka bir öğrenci hesabına bağlı." }, 409);
      if (!studentId) {
        // Unique constraints prevent both directions of duplicate linking under concurrency.
        const { error } = await supabase.from("student_google_accounts")
          .insert({ auth_user_id: user.id, student_id: student.id });
        if (error) return json({ ok: false, mesaj: "Hesap bağlanamadı; daha önce bağlanmış olabilir. Öğretmeninle görüş." }, 409);
        studentId = student.id;
      }
    }
    if (!studentId) return json({ ok: false, baglantiGerekli: true, mesaj: "Mevcut öğrenci hesabını bir kez doğrula. Puanların ve geçmişin korunacak." });
    const { data: student, error: studentError } = await supabase.from("students")
      .select("id,username,status").eq("id", studentId).maybeSingle();
    if (studentError || !student || student.status !== "approved")
      return json({ ok: false, mesaj: "Öğrenci hesabın aktif değil veya onay bekliyor." }, 403);
    const token = await issueSession("student", student.id);
    await supabase.from("students").update({ last_login_at: new Date().toISOString() }).eq("id", student.id);
    return json({ ok: true, token, rol: "ogrenci", ogrenci: student.username });
  }

  // [YAMA 7] Apps Script "gölge" uç noktası KAPATILDI. Gizli yönetici anahtarını
  // parola olarak kullanıyordu. Apps Script devre dışı olduğu için gerek kalmadı.

  // [v3.2] Zamanlanmış görevler (Apps Script tetikleyicisi çağırır)
  if (op === "otomasyon") return otomasyonIslem(req, body);
  // [v3] Sheets aktarımı (IMPORT_TOKEN tanımlı değilse kapalı)
  if (op === "iceAktar") {
    const beklenen = String(Deno.env.get("IMPORT_TOKEN") || "").trim(), gelen = String(req.headers.get("x-diji-import") || "").trim();
    if (!beklenen) return json({ ok: false, mesaj: "Sunucuda IMPORT_TOKEN bulunamadı (Supabase → Edge Functions → Secrets)." }, 403);
    if (beklenen.length < 20) return json({ ok: false, mesaj: `Sunucudaki IMPORT_TOKEN çok kısa (${beklenen.length} karakter, en az 20 olmalı).` }, 403);
    if (!gelen) return json({ ok: false, mesaj: "Apps Script anahtarı göndermedi." }, 403);
    if (gelen !== beklenen) return json({ ok: false, mesaj: `Anahtarlar eşleşmiyor (sunucu ${beklenen.length} karakter, Apps Script ${gelen.length} karakter; ilk 3: ${beklenen.slice(0, 3)} / ${gelen.slice(0, 3)}).` }, 403);
    if (body.islem2 === "ogretmenSifre") {
      const yeni = String(body.yeniSifre || "");
      if (yeni.length < 8) return json({ ok: false, mesaj: "Şifre en az 8 karakter olmalı." }, 400);
      const { data: t } = await supabase.from("teachers").select("id").eq("username", "teacher").maybeSingle();
      if (!t) return json({ ok: false, mesaj: "Öğretmen hesabı bulunamadı." }, 404);
      const up = await supabase.from("teachers").update({ password_hash: await hashPassword(yeni), active: true }).eq("id", t.id);
      if (up.error) return json({ ok: false, mesaj: up.error.message }, 500);
      await supabase.from("portal_sessions").delete().eq("teacher_id", t.id);
      await supabase.from("audit_logs").insert({ actor_role: "admin", operation: "ogretmenSifreBelirle", target: "teacher", payload: {} });
      return json({ ok: true, mesaj: "Öğretmen şifresi güncellendi." });
    }
    return iceAktar(body);
  }
  const a = await auth(req, body, q);
  const releaseResult=await release.handle(op,body,q,a);if(releaseResult)return releaseResult;
  const releaseDeny=await release.guard(op,body,q,a);if(releaseDeny)return releaseDeny;
  /* [v4.0] Bu istekte öğrenci aramaları öğretmenin kapsamıyla sınırlı (yönetici herkesi görür) */
  const studentByName = async (n: string) => { const s = await studentByNameGenel(n); return kapsamda(a, s) ? s : null; };
  const ogrFiltre = (sorgu: any) => yoneticiOlmayan(a) ? sorgu.eq("teacher_id", a.teacher_id) : sorgu;
  if (!op) return rootData(a);

  // =================================================================
  // [v3] ESKİ ARAYÜZLE UYUMLU CEVAPLAR (aşağıdaki eski sürümlerin yerine geçer)
  // =================================================================
  const OYUN_ADI: Record<string, string> = { kelime: "Kelime Laboratuvarı", bosluk: "Eksik Harf", jeopardy: "Risk Balonları", hafiza: "Hafıza Sandığı", yagmur: "Hız Fırtınası", asmaca: "Harf Avı", kelimebul: "Şifre Kırıcı", konusma: "Konuşma", cekilis: "Çekiliş", eslestirme: "Eş Bul", tren: "Kelime Treni", harfbahcesi: "Harf Bahçesi" };
  const SOSYAL = new Set(["takip", "begeni", "tebrik", "like", "congrats"]);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const metinVer = (v: any) => v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);

  if (op === "ekVeriGetir") {
    const name = String(val(body, q, "ogrenci")), key = String(val(body, q, "anahtar")); const deny = await requireStudent(a, name); if (deny) return deny;
    /* [v4.2] Öğretmenin kendi oyun verisi (altın, XP, karakter): teachers.game_data — öğrenci havuzuna karışmaz */
    if (a?.role === "teacher" && encName(name) === "teacher" && key === "yo") {
      const { data: t } = await supabase.from("teachers").select("game_data,game_data_at").eq("id", a.teacher_id).maybeSingle();
      return json(t && t.game_data ? { deger: metinVer(t.game_data), guncelleme: t.game_data_at } : null);
    }
    const s = await hedefOgrenci(a, name); if (!s) return json(null);
    const { data } = await supabase.from("extra_data").select("value,updated_at").eq("student_id", s.id).eq("key_name", key).maybeSingle();
    return json(data ? { deger: metinVer(data.value), guncelleme: data.updated_at } : null);
  }
  if (op === "ekVeriTumu") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const key = String(val(body, q, "anahtar") || "yo");
    const [{ data: ev }, { data: st }] = await Promise.all([supabase.from("extra_data").select("student_id,value").eq("key_name", key), ogrFiltre(supabase.from("students").select("id,username"))]);
    const ad = new Map((st || []).map((x: any) => [x.id, x.username]));
    return json((ev || []).filter((x: any) => ad.has(x.student_id)).map((x: any) => ({ ogrenci: ad.get(x.student_id), anahtar: key, deger: metinVer(x.value) })));
  }
  if (op === "sosyalOgrencilerGetir") {
    const deny = await requireStudent(a, ""); if (deny) return deny;
    const [{ data: st }, { data: yo }, { data: sc }] = await Promise.all([
      supabase.from("students").select("id,username,class_no,points,xp,gold,streak,profile").eq("status", "approved").order("username"),
      supabase.from("extra_data").select("student_id,karakter:value->karakter,takili:value->takili,seviye:value->seviye,lig:value->lig,profilKrk:value->profilKrk").eq("key_name", "yo"),
      supabase.from("teacher_reports").select("student_id,report_date,reading_score,writing_score,vocabulary_score,speaking_score,grammar_score,genel_score,exam_score").order("report_date")
    ]);
    const ym = new Map((yo || []).map((x: any) => [x.student_id, x]));
    const rm = new Map<string, any[]>(); for (const r of sc || []) { if (!rm.has(r.student_id)) rm.set(r.student_id, []); rm.get(r.student_id)!.push(raporSatiri(r)); }
    return json((st || []).filter((s: any) => encName(s.username) !== "teacher").map((s: any) => {
      const p = (s.profile && typeof s.profile === "object") ? s.profile : {}, y: any = ym.get(s.id) || {}, r = rm.get(s.id) || [];
      return {
        id: s.id, ogrenci: s.username, sinif: s.class_no || "", Sinif: s.class_no || "", durum: "approved",
        genelPuan: Number(s.points || 0) > 0 ? Number(s.points) : ortala(r, "genel"), genelOrtalama: Number(s.points || 0) > 0 ? Number(s.points) : ortala(r, "genel"), puan: Number(s.points || 0), xp: Number(s.xp || 0), altin: Number(s.gold || 0), streak: Number(s.streak || 0),
        lig: y.lig || p.lig || { hafta: "", xp: 0 }, karakter: y.karakter || null, takili: y.takili || null, seviye: y.seviye || null, profilKrk: y.profilKrk || "",
        rozetListesi: [], gelisimSerisi: r.map((x: any) => ({ tarih: x.tarih, genel: x.genel })), denemeSerisi: r.filter((x: any) => x.deneme > 0).map((x: any) => ({ tarih: x.tarih, deneme: x.deneme })),
        okumaOrt: ortala(r, "okuma"), yazmaOrt: ortala(r, "yazma"), vocabOrt: ortala(r, "vocabulary"), konusmaOrt: ortala(r, "konusma"), grammarOrt: ortala(r, "grammar")
      };
    }));
  }
  if (op === "raporVeriGetir") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const s = await studentByName(String(val(body, q, "ogrenci"))); if (!s) return json({});
    const bas = String(val(body, q, "baslangic") || ""), bit = String(val(body, q, "bitis") || "");
    let rq = supabase.from("teacher_reports").select("*").eq("student_id", s.id).order("report_date");
    let gq = supabase.from("game_scores").select("game_key,score,correct_count,wrong_count").eq("student_id", s.id);
    if (bas) { rq = rq.gte("report_date", bas); gq = gq.gte("played_on", bas); }
    if (bit) { rq = rq.lte("report_date", bit); gq = gq.lte("played_on", bit); }
    const [{ data: rr }, { data: gg }] = await Promise.all([rq, gq]);
    const l = (rr || []).map(raporSatiri), g = gg || [];
    const oz = (f: (x: any) => boolean) => { const x = g.filter(f); return { oyunSayisi: x.length, dogru: x.reduce((t: number, y: any) => t + Number(y.correct_count || 0), 0), yanlis: x.reduce((t: number, y: any) => t + Number(y.wrong_count || 0), 0), puan: x.reduce((t: number, y: any) => t + Number(y.score || 0), 0) }; };
    const den = l.filter((x: any) => x.deneme > 0);
    return json({
      ogrenci: s.username, raporlar: l, kayitSayisi: l.length, dersSayisiAralikta: l.length,
      ortalamalar: { genel: ortala(l, "genel"), okuma: ortala(l, "okuma"), yazma: ortala(l, "yazma"), vocabulary: ortala(l, "vocabulary"), konusma: ortala(l, "konusma"), grammar: ortala(l, "grammar") },
      gelisimSerisi: l.map((x: any) => ({ tarih: x.tarih, genel: x.genel })), denemeSerisi: den.map((x: any) => ({ tarih: x.tarih, deneme: x.deneme })),
      sonDenemeAralikta: den.length ? den[den.length - 1].deneme : 0,
      oyunOzet: { klasik: oz(x => !["jeopardy", "cekilis"].includes(x.game_key)), jeopardy: oz(x => x.game_key === "jeopardy"), cekilis: oz(x => x.game_key === "cekilis") },
      kitapBilgi: (s.profile || {}).kitapBilgi || {}
    });
  }
  if (op === "rubrikKaydet") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const ogrAdi = String(val(body, q, "ogrenci"));
    const s = await studentByName(ogrAdi); if (!s) return json({ status: "error", message: "Öğrenci bulunamadı: " + ogrAdi });
    const tarih = gunStr(val(body, q, "tarih")) || new Date().toISOString().slice(0, 10), sonraki = gunStr(val(body, q, "sonrakitarih"));
    const sk = ["okuma", "yazma", "vocab", "konusma", "grammar"].map(k => num(val(body, q, k)));
    const deneme = num(val(body, q, "sondeneme"));
    const satir: any = {
      student_id: s.id, teacher_id: a.teacher_id || null, report_date: tarih, next_report_date: sonraki || null,
      book_name: String(val(body, q, "kitapadi") || "").trim() || null, page_no: num(val(body, q, "sayfa")), target: num(val(body, q, "hedef"), 40), read_count: num(val(body, q, "okunansayisi")),
      last_attempt: deneme > 0, exam_score: deneme,
      reading_score: sk[0], writing_score: sk[1], vocabulary_score: sk[2], speaking_score: sk[3], grammar_score: sk[4], genel_score: Math.round(sk.reduce((x, y) => x + y, 0) / 5),
      homework_feedback: String(val(body, q, "odevdonut") || "") || null, next_homework: String(val(body, q, "sonrakiodev") || "") || null
    };
    const { data: eski } = await supabase.from("teacher_reports").select("id").eq("student_id", s.id).eq("report_date", tarih).limit(1);
    const yaz = (x: any) => eski && eski.length ? supabase.from("teacher_reports").update(x).eq("id", eski[0].id) : supabase.from("teacher_reports").insert(x);
    let sonuc = await yaz(satir), uyari = "";
    /* Tabloda olmayan bir sütun varsa onu çıkarıp tekrar dene; zorunlu alanlara dokunma */
    const eksikler: string[] = [];
    for (let i = 0; i < 12 && sonuc.error; i++) {
      const m = String(sonuc.error.message || "").match(/'([a-z_]+)' column|column "?([a-z_]+)"? (?:of relation|does not exist)/i);
      const sutun = m && (m[1] || m[2]);
      if (!sutun || !(sutun in satir) || ["student_id", "report_date"].includes(sutun)) break;
      eksikler.push(sutun); delete satir[sutun];
      sonuc = await yaz(satir);
    }
    if (eksikler.length) uyari = "Eksik sütunlar atlandı (" + eksikler.join(", ") + "), 02-rubrik-sutunlari.sql çalıştırılmalı.";
    if (sonuc.error) { console.error("rubrikKaydet", sonuc.error); return json({ status: "error", message: "Kaydedilemedi: " + sonuc.error.message }, 500); }
    const p = (s.profile && typeof s.profile === "object") ? { ...s.profile } : {};
    if (satir.book_name) p.kitapBilgi = { kitapAdi: satir.book_name, sayfa: satir.page_no, hedef: satir.target || 40, okunanSayisi: satir.read_count || 1 };
    p.dersler = [{ tarih, durum: "yapildi" }, { tarih: sonraki, durum: "sonraki" }];
    if (deneme > 0) p.sonDeneme = deneme;
    await supabase.from("students").update({ profile: p }).eq("id", s.id);
    await audit(a, "rubrikKaydet", s.username, { tarih, guncelleme: !!(eski && eski.length) });
    /* Veli raporu: 2 dk sonra gönderilecek şekilde kuyruğa. Sayfanın uzun rapor metni gelirse (raporMail) onunla değiştirilir. */
    let mail = "eposta_yok";
    if (epostaGecerli(s.email)) {
      await supabase.from("mail_queue").delete().eq("student_id", s.id).eq("kind", "rapor").eq("report_date", tarih).is("sent_at", null);
      const ok = await kuyrugaEkle({ student_id: s.id, to_email: String(s.email).trim(), kind: "rapor", report_date: tarih, subject: `Diji-Medu İngilizce Gelişim Raporu – ${s.username}${eski && eski.length ? " (güncellendi)" : ""}`, html: rubrikMailHtml(s.username, satir), send_after: new Date(Date.now() + 120000).toISOString() });
      mail = ok ? "kuyrukta" : "kuyruk_hatasi";
    }
    return json({ status: "success", guncellendi: !!(eski && eski.length), uyari, mail, email: epostaGecerli(s.email) ? String(s.email).trim() : "" });
  }
  if (op === "bekleyenKayitlariGetir") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const { data } = await ogrFiltre(supabase.from("students").select("username,phone,class_no,branch,email,created_at,teacher_id").eq("status", "pending").order("created_at"));
    return json({ liste: (data || []).map((x: any) => ({ ogrenciAdi: x.username, sinif: x.class_no || "", sube: x.branch || "", telefon: x.phone || "", email: x.email || "", tarih: x.created_at, bagimsiz: !x.teacher_id })) });
  }
  if (op === "duyuruListesiGetir") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const { data } = await ogrFiltre(supabase.from("announcements").select("*").order("created_at", { ascending: false }));
    return json((data || []).map((d: any) => ({ id: d.id, baslik: d.title, mesaj: d.message, hedefTipi: ["all", "tumogrenciler", "herkes"].includes(d.target_type) ? "herkes" : d.target_type, gosterimSinir: d.display_limit || 0, tema: d.theme || "mavi", aktif: d.active ? "evet" : "hayir", tarih: d.created_at, gorselLink: d.image_link || "" })));
  }
  if (op === "duyuruEkle") {
    const deny = await requireTeacher(a); if (deny) return deny;
    /* [v4.1] "herkes": yöneticide tüm portal, öğretmende sadece kendi öğrencileri */
    let tip = String(body.hedefTipi || "");
    if (["herkes", "all", "tumogrenciler", ""].includes(tip)) tip = a.yonetici ? "all" : "ogretmen";
    else if (!["ogretmen", "sinif", "sube", "secili"].includes(tip)) tip = "secili";
    const ek = await supabase.from("announcements").insert({ title: temizMetin(body.baslik, 120), message: temizMetin(body.mesaj, 2000), image_link: body.gorselLink || null, target_type: tip, target_list: arr(body.hedefListesi).map((x: any) => String(x)).slice(0, 500), display_limit: num(body.gosterimSinir) || null, theme: body.tema || null, active: true, teacher_id: a.teacher_id || null });
    return json(ek.error ? { status: "error", message: ek.error.message } : { status: "success" });
  }
  if (op === "duyurulariGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json(null);
    const [{ data }, { data: ok }] = await Promise.all([supabase.from("announcements").select("*").eq("active", true).order("created_at", { ascending: false }), supabase.from("announcement_reads").select("announcement_id").eq("student_id", s.id)]);
    const gordu = new Set((ok || []).map((x: any) => x.announcement_id));
    const Y = await yoneticiler();
    const hedefte = (x: any) => {
      const L = arr(x.target_list).map((v: any) => String(v)), yon = !x.teacher_id || Y.ids.has(x.teacher_id);
      if (!yon && x.teacher_id !== s.teacher_id) return false;              /* başka öğretmenin duyurusu */
      if (["all", "tumogrenciler", "herkes"].includes(x.target_type)) return true;
      if (x.target_type === "ogretmen") return true;
      if (x.target_type === "sinif") return L.includes(String(s.class_no || ""));
      if (x.target_type === "sube") return L.map(encName).includes(encName(`${s.class_no || ""}|${s.branch || ""}`));
      return L.map(encName).includes(encName(s.username));
    };
    const d = (data || []).find((x: any) => !gordu.has(x.id) && hedefte(x));
    return json(d ? { id: d.id, baslik: d.title, mesaj: d.message, hedefTipi: d.target_type, gosterimSinir: d.display_limit || 0, tema: d.theme || "mavi", aktif: "evet", tarih: d.created_at, gorselLink: d.image_link || "" } : null);
  }
  const sohbetSatiri = (m: any) => ({ gonderen: m.sender_role === "teacher" ? "ogretmen" : "ogrenci", mesaj: m.message, tarih: m.created_at, okundu: !!m.read_at });
  if (op === "sohbetGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json([]);
    const { data } = await supabase.from("chat_messages").select("*").eq("student_id", s.id).order("created_at");
    return json((data || []).map(sohbetSatiri));
  }
  if (op === "ogretmenSohbetAc") {
    const deny = await requireTeacher(a); if (deny) return deny; const s = await studentByName(String(val(body, q, "ogrenci"))); if (!s) return json([]);
    const { data } = await supabase.from("chat_messages").select("*").eq("student_id", s.id).order("created_at");
    await supabase.from("chat_messages").update({ read_at: new Date().toISOString() }).eq("student_id", s.id).eq("sender_role", "student").is("read_at", null);
    return json((data || []).map(sohbetSatiri));
  }
  if (op === "ogretmenSohbetListesi") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const [{ data }, { data: st }] = await Promise.all([supabase.from("chat_messages").select("student_id,created_at,message,sender_role,read_at").order("created_at", { ascending: false }).limit(800), ogrFiltre(supabase.from("students").select("id,username"))]);
    const ad = new Map((st || []).map((x: any) => [x.id, x.username])), son = new Map<string, any>(), say = new Map<string, number>();
    for (const m of data || []) { if (!son.has(m.student_id)) son.set(m.student_id, m); if (m.sender_role === "student" && !m.read_at) say.set(m.student_id, (say.get(m.student_id) || 0) + 1); }
    return json([...son.values()].filter((m: any) => ad.has(m.student_id)).map((m: any) => ({ ogrenci: ad.get(m.student_id), sonMesaj: m.message, mesaj: m.message, tarih: m.created_at, okunmamis: say.get(m.student_id) || 0 })));
  }
  if (op === "etkinlikTanimlariGetir" || op === "tumVideolariGetir") {
    const video = op === "tumVideolariGetir";
    const [{ data }, { data: at }, { data: st }] = await Promise.all([
      video ? supabase.from("videos").select("*").eq("active", true).order("title") : supabase.from("activities").select("*").eq("active", true).order("display_name"),
      video ? supabase.from("student_videos").select("student_id,video_id") : supabase.from("student_activities").select("student_id,activity_id"),
      supabase.from("students").select("id,username")
    ]);
    const ad = new Map((st || []).map((x: any) => [x.id, encName(x.username)])), atanan = new Map<string, string[]>();
    for (const r of at || []) { const k = video ? r.video_id : r.activity_id; if (!atanan.has(k)) atanan.set(k, []); if (ad.has(r.student_id)) atanan.get(k)!.push(String(ad.get(r.student_id))); }
    if (video) return json((data || []).map((v: any) => ({ satirIndex: v.external_row_index, baslik: v.title, kategori: v.category || "Genel", link: v.url, videoLink: v.url, aciklama: v.description || "", siraNo: v.content?.siraNo || 0, atananlar: atanan.get(v.id) || [] })));
    return json((data || []).map((x: any) => ({ ...(x.content || {}), kod: x.code, ad: x.display_name, etkinlikKodu: x.code, gorunenAd: x.display_name, kategori: x.category || "Genel", disLink: x.external_link || "", ogretmenYorumu: x.teacher_comment || "", siraNo: x.content?.siraNo || 0, satirIndex: x.content?._sourceRow || x.content?.siraNo, atananlar: atanan.get(x.id) || [] })));
  }
  if (op === "videolariGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json([]);
    const { data } = await supabase.from("student_videos").select("watched_at,assigned_at,videos(*)").eq("student_id", s.id);
    return json((data || []).filter((x: any) => x.videos).map((x: any) => ({ satirIndex: x.videos.external_row_index, baslik: x.videos.title, kategori: x.videos.category || "Genel", link: x.videos.url, videoLink: x.videos.url, aciklama: x.videos.description || "", siraNo: x.videos.content?.siraNo || 0, izlendiMi: !!x.watched_at, atandi: x.assigned_at || null })));
  }
  if (op === "okumaGecmisGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json([]);
    const { data } = await supabase.from("reading_results").select("*").eq("student_id", s.id).order("created_at", { ascending: true }).limit(100);
    return json((data || []).map((r: any) => ({ tarih: r.created_at, sinif: r.class_label || "", okunanKelime: r.words_read || 0, gecenSure: r.duration_seconds || 0, wpm: r.wpm || 0, metinBasligi: r.text_title || "" })));
  }
  if (op === "dersKonulariGetir") {
    const { data } = await supabase.from("lesson_topics").select("level,category,topic_name,sort_no").eq("active", true).order("sort_no");
    const tamam = new Set<string>(), basarisiz = new Set<string>(), bilmiyor = new Set<string>();
    if (a) {
      const s = await hedefOgrenci(a, String(val(body, q, "ogrenci")));
      if (s) { const { data: lp } = await supabase.from("lesson_progress").select("topic_name,test_success,knew_it").eq("student_id", s.id);
        for (const x of lp || []) { if (x.test_success === true) tamam.add(x.topic_name); else if (x.test_success === false) basarisiz.add(x.topic_name); if (x.knew_it === false) bilmiyor.add(x.topic_name); } }
    }
    return json((data || []).map((x: any) => ({ seviye: x.level, kategori: x.category, konuAdi: x.topic_name, siraNo: x.sort_no, durum: tamam.has(x.topic_name) ? "tamamlandi" : basarisiz.has(x.topic_name) ? "basarisiz" : "", bilmiyordum: bilmiyor.has(x.topic_name) })));
  }
  if (op === "dersKonuDetayGetir") {
    const { data } = await supabase.from("lesson_topics").select("content").eq("level", String(val(body, q, "seviye"))).eq("category", String(val(body, q, "kategori"))).eq("topic_name", String(val(body, q, "konu"))).maybeSingle();
    const c: any = (data && data.content) || {};
    return json({ ...c, anlatimHTML: c.anlatimHTML || "", gorselLink: c.gorselLink || "", kelimeSozlugu: metinVer(c.kelimeSozlugu) || "{}", ornekler: metinVer(c.ornekler) || "[]", testJSON: metinVer(c.testJSON ?? c.test) || "[]", uygulamaJSON: metinVer(c.uygulamaJSON ?? c.uygulama) || "[]" });
  }
  if (op === "dersBilmiyordumToggle") {
    const name = String(body.ogrenci || ""); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    const { data: v } = await supabase.from("lesson_progress").select("id").eq("student_id", s.id).eq("topic_name", body.konuAdi).eq("knew_it", false).limit(1);
    if (v && v.length) { await supabase.from("lesson_progress").delete().eq("id", v[0].id); return json({ status: "success", isaretli: false }); }
    await supabase.from("lesson_progress").insert({ student_id: s.id, level: body.seviye, category: body.kategori, topic_name: body.konuAdi, knew_it: false });
    return json({ status: "success", isaretli: true });
  }
  if (op === "akisTumu") {
    const deny = await requireStudent(a, ""); if (deny) return deny;
    const { data } = await supabase.from("feed_events").select("id,student_id,event_type,payload,created_at,students!feed_events_student_id_fkey(username)").order("created_at", { ascending: false }).limit(400);
    const b = new Map<string, number>(), tb = new Map<string, number>(), liste: any[] = [];
    for (const e of data || []) {
      const p = e.payload || {};
      if (SOSYAL.has(e.event_type)) { if (p.event_id) { const m = e.event_type === "tebrik" ? tb : b; m.set(p.event_id, (m.get(p.event_id) || 0) + 1); } continue; }
      const ad = (e as any).students?.username || p.student_name || ""; if (!ad || liste.length >= 150) continue;
      let ikon = p.icon || "✨", metin = p.message || "Yeni bir hareket yaptı";
      if (e.event_type === "game_score") metin = `${OYUN_ADI[p.game_key || p.game_name] || p.game_name || "Bir oyunda"} oyununda ${p.score ?? 0} puan kazandı`;
      else if (e.event_type === "energy_send") metin = `${p.target_name || "bir arkadaşına"} ${p.amount ?? 2} ⚡ enerji hediye etti`;
      else if (e.event_type === "duel_invite") metin = `${p.target_name || "birini"} ${OYUN_ADI[p.game_name] || p.game_name || ""} düellosuna çağırdı ⚔️`;
      else if (e.event_type === "level_complete") metin = `${p.mode_name || "Parkurda"} ${p.level ?? ""}. seviyeyi geçti`;
      liste.push({ k: e.id, t: Date.parse(e.created_at), ogr: ad, ad, tur: e.event_type === "energy_loss" ? "eksi" : "arti", ikon, metin, g: false });
    }
    liste.forEach(x => { x.b = b.get(x.k) || 0; x.tb = tb.get(x.k) || 0; });
    return json({ liste });
  }
  if (op === "akisOlaylariGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json({ takip: [], begeni: [], tebrik: [] });
    const { data } = await supabase.from("feed_events").select("event_type,payload").eq("student_id", s.id).in("event_type", ["takip", "begeni", "tebrik"]).limit(1000);
    const out: any = { takip: [], begeni: [], tebrik: [] };
    for (const e of data || []) { const t = (e.payload || {}).target_name; if (t) out[e.event_type].push(t); }
    return json(out);
  }
  if (op === "akisOlayToggle") {
    const name = String(body.ogrenci || ""); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    const tur = String(body.tur || "").trim().toLowerCase(), hedef = String(body.hedef || "").trim().replace(/^akis-/, "");
    if (!["takip", "begeni", "tebrik"].includes(tur)) return json({ status: "error", aktif: false }, 400);
    let hedefId: string | null = null, payload: any, varSorgu: any = supabase.from("feed_events").select("id").eq("student_id", s.id).eq("event_type", tur);
    if (UUID.test(hedef)) {
      const { data: ev } = await supabase.from("feed_events").select("id,student_id").eq("id", hedef).maybeSingle();
      if (!ev) return json({ status: "error", aktif: false });
      hedefId = ev.student_id; payload = { event_id: ev.id, target_name: "akis-" + ev.id }; varSorgu = varSorgu.contains("payload", { event_id: ev.id });
    } else {
      const t = await studentByName(hedef); if (!t || t.id === s.id) return json({ status: "error", aktif: false });
      hedefId = t.id; payload = { target_name: t.username }; varSorgu = varSorgu.eq("target_student_id", t.id).contains("payload", { target_name: t.username });
    }
    const { data: v } = await varSorgu.limit(1);
    if (v && v.length) { await supabase.from("feed_events").delete().eq("id", v[0].id); return json({ status: "success", aktif: false }); }
    await supabase.from("feed_events").insert({ student_id: s.id, event_type: tur, target_student_id: hedefId, payload });
    return json({ status: "success", aktif: true });
  }
  if (op === "enerjiGonder") {
    const g = String(val(body, q, "gonderen")), al = String(val(body, q, "alici")); const deny = await requireStudent(a, g); if (deny) return deny;
    const gs = await hedefOgrenci(a, g), as = await studentByName(al);
    if (!gs || !as) return json({ ok: false, mesaj: "Öğrenci bulunamadı." });
    if (gs.id === as.id) return json({ ok: false, mesaj: "Kendine enerji gönderemezsin. 😄" });
    const { count } = await supabase.from("feed_events").select("id", { count: "exact", head: true }).eq("student_id", gs.id).eq("event_type", "energy_send").gte("created_at", bugunBasi());
    if ((count || 0) >= (bool(val(body, q, "ekstra")) ? 3 : 1)) return json({ ok: false, mesaj: "Bugünkü enerji hediyeni zaten gönderdin." });
    const next = Math.min(as.energy_max, as.energy + 2);
    await supabase.from("students").update({ energy: next }).eq("id", as.id);
    await supabase.from("energy_transactions").insert({ student_id: as.id, change_amount: next - as.energy, balance_after: next, reason: "öğrenci hediyesi" });
    await supabase.from("feed_events").insert({ student_id: gs.id, target_student_id: as.id, event_type: "energy_send", payload: { amount: 2, student_name: gs.username, target_name: as.username, icon: "⚡" } });
    await supabase.from("notifications").insert({ recipient_student_id: as.id, sender_student_id: gs.id, type: "enerji", message: "sana 2 enerji gönderdi" });
    return json({ ok: true, status: "success", enerjiKalan: next });
  }
  if (op === "duelloGonder") {
    const g = String(val(body, q, "gonderen")), al = String(val(body, q, "alici")); const deny = await requireStudent(a, g); if (deny) return deny;
    const gs = await hedefOgrenci(a, g), as = await studentByName(al); if (!gs || !as) return json({ ok: false, mesaj: "Öğrenci bulunamadı." });
    if (gs.id === as.id) return json({ ok: false, mesaj: "Kendinle düello yapamazsın. 😄" });
    const { count } = await supabase.from("duels").select("id", { count: "exact", head: true }).eq("sender_student_id", gs.id).gte("created_at", bugunBasi());
    if ((count || 0) >= 3) return json({ ok: false, mesaj: "Bugün 3 düello gönderdin. Yarın yine gel! ⚔️" });
    const oyun = temizMetin(val(body, q, "oyun"), 40);
    await supabase.from("duels").insert({ sender_student_id: gs.id, receiver_student_id: as.id, sender_payload: { oyun } });
    await supabase.from("notifications").insert({ recipient_student_id: as.id, sender_student_id: gs.id, type: "duello", message: oyun });
    await supabase.from("feed_events").insert({ student_id: gs.id, target_student_id: as.id, event_type: "duel_invite", payload: { game_name: oyun, student_name: gs.username, target_name: as.username, icon: "⚔️" } });
    return json({ ok: true, status: "success" });
  }
  // [v3.4] KELİME TRENİ: cümle bankası + Ders Çalış örnekleri
  if (op === "cumleleriGetir") {
    const deny = await requireStudent(a, ""); if (deny) return deny;
    const sinif = num(val(body, q, "sinif"));
    const uniteler = String(val(body, q, "uniteler") || "").split(/[,;]/).map(x => num(x)).filter(x => x > 0);
    const bol = (v: any, ayrac: RegExp) => String(v || "").split(ayrac).map(x => x.trim()).filter(Boolean);
    const kelimeSay = (t: string) => t.replace(/[.,!?;:]/g, " ").trim().split(/\s+/).filter(Boolean).length;
    const uygun = (en: string, tr: string) => !!en && !!tr && kelimeSay(en) >= 2 && kelimeSay(en) <= 9 && kelimeSay(tr) <= 9 && !/[\/()_\[\]]|\.\.\./.test(en + tr);
    let bq = supabase.from("sentence_bank").select("class_no,unit_no,turkish,english,alternatives,distractors").eq("active", true);
    if (sinif) bq = bq.eq("class_no", sinif);
    if (uniteler.length) bq = bq.in("unit_no", uniteler);
    const { data: bd, error: be } = await bq.limit(400);
    const banka = (be ? [] : bd || []).filter((x: any) => uygun(String(x.english || "").trim(), String(x.turkish || "").trim())).map((x: any) => ({
      tr: String(x.turkish).trim(), en: String(x.english).trim(), alt: bol(x.alternatives, /\|/), ce: bol(x.distractors, /[,;]/), kaynak: "banka", unite: x.unit_no }));
    /* Sınıfa uygun Ders Çalış seviyeleri */
    const seviyeler = sinif <= 4 ? ["A1"] : sinif <= 6 ? ["A1", "A2"] : ["A2", "B1"];
    const { data: ld } = await supabase.from("lesson_topics").select("level,topic_name,content").eq("active", true);
    const ders: any[] = [];
    const al = (o: any, anahtarlar: string[]) => { for (const k of anahtarlar) if (o && o[k] != null && String(o[k]).trim()) return String(o[k]).trim(); return ""; };
    for (const t of ld || []) {
      if (!seviyeler.some(sv => String(t.level || "").toUpperCase().startsWith(sv))) continue;
      let orn: any = t.content?.ornekler;
      if (typeof orn === "string") { try { orn = JSON.parse(orn); } catch (_) { orn = []; } }
      if (!Array.isArray(orn)) continue;
      for (const o of orn) {
        let en = "", tr = "";
        if (typeof o === "string") { const p = o.split(/\s[-–=:]\s/); if (p.length === 2) { en = p[0].trim(); tr = p[1].trim(); } }
        else { en = al(o, ["en", "english", "ingilizce", "eng", "cumle", "sentence"]); tr = al(o, ["tr", "turkish", "turkce", "türkçe", "anlam", "ceviri"]); }
        en = en.replace(/<[^>]+>/g, ""); tr = tr.replace(/<[^>]+>/g, "");
        if (uygun(en, tr)) ders.push({ tr, en, alt: [], ce: [], kaynak: "ders", konu: t.topic_name });
      }
    }
    for (let i = ders.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ders[i], ders[j]] = [ders[j], ders[i]]; }
    return json({ ok: true, banka, ders: ders.slice(0, 60), seviyeler });
  }
  if (op === "konusmaEsAnlamlarGetir") {
    const { data } = await supabase.from("speech_synonyms").select("english,alternatives");
    return json((data || []).map((x: any) => ({ kelime: x.english, alternatifler: x.alternatives })));
  }
  if (op === "kategorileriGetir") {
    const { data } = await supabase.from("activity_categories").select("name").order("name");
    if (data && data.length) return json(data.map((x: any) => x.name));
    const { data: ac } = await supabase.from("activities").select("category");
    const l = [...new Set((ac || []).map((x: any) => x.category).filter(Boolean))];
    return json(l.length ? l : ["Etkinlikler", "Videolar"]);
  }
  if (op === "yeniPuanBildirimleriGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json([]);
    const { data: gv } = await supabase.from("extra_data").select("value").eq("student_id", s.id).eq("key_name", "puan_gorulen").maybeSingle();
    const simdi = new Date().toISOString();
    await supabase.from("extra_data").upsert({ student_id: s.id, key_name: "puan_gorulen", value: { t: simdi }, updated_at: simdi }, { onConflict: "student_id,key_name" });
    if (!gv || !gv.value || !gv.value.t) return json([]);
    const { data } = await supabase.from("points_transactions").select("id,change_amount,reason,created_at").eq("student_id", s.id).is("unique_key", null).gt("created_at", gv.value.t).order("created_at").limit(10);
    return json((data || []).map((x: any) => ({ id: x.id, degisim: Number(x.change_amount), sebep: x.reason, tarih: x.created_at })));
  }
  if (op === "sinifIciPuanVer") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const yon = num(body.degisim), deg = yon > 0 ? 0.3 : -2, applied: string[] = [], skipped: string[] = [];
    for (const name of arr(body.ogrenciler)) {
      const s = await studentByName(String(name)); if (!s) continue;
      const once = Number(s.points || 0), next = Math.round(Math.max(0, Math.min(100, once + deg)) * 10) / 10;
      if (next === once) { skipped.push(s.username); continue; }
      await supabase.from("students").update({ points: next }).eq("id", s.id);
      await supabase.from("points_transactions").insert({ student_id: s.id, change_amount: Math.round((next - once) * 10) / 10, balance_after: next, reason: temizMetin(body.sebep, 120) || "Ders içi performans" });
      applied.push(s.username);
    }
    const act = await supabase.from("class_point_actions").insert({ teacher_id: a.teacher_id, student_ids: applied, change_amount: deg, reason: body.sebep || "" }).select().single();
    return json({ status: "success", uygulanan: applied, atlanan: skipped, zamanDamgasi: act.data?.action_at || new Date().toISOString() });
  }

  // =================================================================== GİRİŞ
  if (op === "giris") {
    const username = String(body.ogrenci || "").trim();
    const password = String(body.sifre || "");
    const hedef = encName(username);
    // [YAMA 8] 15 dakikada 5 hatalı denemeden sonra kilit
    if (await denemeSay("giris_hata", hedef, 15) >= 5) return json({ ok: false, mesaj: "Çok fazla hatalı deneme. 15 dakika sonra tekrar dene." });
    /* [v4.0] Kullanıcı adı bir öğretmene aitse öğretmen oturumu (yönetici "teacher" dahil) */
    const { data: ogrt } = await supabase.from("teachers").select("*").ilike("username", likeKacir(username)).limit(2);
    if (ogrt && ogrt.length === 1) {
      const t = ogrt[0];
      if (t.active !== false && await verifyPassword(password, t.password_hash)) {
        const token = await issueSession("teacher", undefined, t.id);
        await supabase.from("teachers").update({ last_login_at: new Date().toISOString() }).eq("id", t.id);
        return json({ ok: true, token, rol: "ogretmen", ogrenci: t.username, yonetici: !!t.is_admin });
      }
      await denemeYaz("giris_hata", hedef);
      return json({ ok: false, mesaj: t.active === false ? "Öğretmen hesabın aktif değil." : "Hatalı kullanıcı adı veya şifre." });
    }
    const s = await studentByName(username);
    if (!s || !(await verifyPassword(password, s.password_hash))) {
      await denemeYaz("giris_hata", hedef);
      return json({ ok: false, mesaj: "Hatalı kullanıcı adı veya şifre." });
    }
    if (s.status === "pending") return json({ ok: false, mesaj: "Hesabın henüz öğretmen onayı bekliyor. Onaylandığında giriş yapabilirsin." });
    if (s.status !== "approved") return json({ ok: false, mesaj: "Hesabın aktif değil. Öğretmeninle görüş." });
    const token = await issueSession("student", s.id);
    await supabase.from("students").update({ last_login_at: new Date().toISOString() }).eq("id", s.id);
    return json({ ok: true, token, rol: "ogrenci", ogrenci: s.username });
  }
  if (op === "ogretmenGiris") {
    const password = String(body.sifre || "");
    if (await denemeSay("ogretmen_hata", "teacher", 15) >= 5) return json({ ok: false, mesaj: "Çok fazla hatalı deneme. 15 dakika bekle." });
    let t: any = null;
    const kul = String(body.kullanici || "").trim();
    if (kul) t = (await supabase.from("teachers").select("*").ilike("username", likeKacir(kul)).eq("active", true).limit(2)).data?.[0] || null;
    else if (a?.role === "teacher" && a.teacher_id) t = (await supabase.from("teachers").select("*").eq("id", a.teacher_id).eq("active", true).maybeSingle()).data;
    else if (a?.role === "student" && a.student_id) {
      const { data: st } = await supabase.from("students").select("teacher_id").eq("id", a.student_id).maybeSingle();
      if (st?.teacher_id) t = (await supabase.from("teachers").select("*").eq("id", st.teacher_id).eq("active", true).maybeSingle()).data;
    }
    if (!t) t = (await supabase.from("teachers").select("*").eq("username", "teacher").eq("active", true).maybeSingle()).data;
    /* sınıftaki tablette: öğrencinin öğretmeni değilse yönetici şifresi de kabul edilir */
    let gecti = !!t && await verifyPassword(password, t.password_hash);
    if (!gecti && !kul) { const y = (await supabase.from("teachers").select("*").eq("username", "teacher").eq("active", true).maybeSingle()).data; if (y && y.id !== t?.id && await verifyPassword(password, y.password_hash)) { t = y; gecti = true; } }
    if (!gecti) { await denemeYaz("ogretmen_hata", "teacher"); return json({ ok: false, mesaj: "Öğretmen şifresi hatalı." }); }
    const token = await issueSession("teacher", undefined, t.id);
    await supabase.from("teachers").update({ last_login_at: new Date().toISOString() }).eq("id", t.id);
    return json({ ok: true, token, rol: "ogretmen", ogretmen: t.full_name || t.username, yonetici: !!t.is_admin });
  }
  if (op === "cikis") {
    if (a) await supabase.from("portal_sessions").delete().eq("id", a.id);
    return json({ status: "success", ok: true });
  }

  /* [v4.0] Öğretmen kaydı: hesap hemen açılır, kendine özel öğretmen kodu verilir, yöneticiye e-posta gider */
  if (op === "ogretmenKayitOl") {
    const kullanici = String(body.kullaniciAdi || "").trim().replace(/\s+/g, " ");
    const adSoyad = temizMetin(body.adSoyad, 80), eposta = String(body.email || "").trim(), kurum = temizMetin(body.kurum, 120), sifre = String(body.sifre || "");
    if (!/^[A-Za-zÇĞİÖŞÜçğıöşü0-9 ._-]{3,40}$/.test(kullanici)) return json({ ok: false, mesaj: "Kullanıcı adı 3-40 karakter olmalı (harf, rakam, boşluk, . _ -)." });
    if (!adSoyad || adSoyad.length < 3) return json({ ok: false, mesaj: "Adını ve soyadını yaz." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta)) return json({ ok: false, mesaj: "Geçerli bir e-posta adresi yaz. Öğrenci bildirimleri bu adrese gelecek." });
    if (sifre.length < 8 || sifre.length > 64) return json({ ok: false, mesaj: "Öğretmen şifresi en az 8 karakter olmalı." });
    const otHam = String(body.telefon || "").replace(/\D/g, "");
    const oTel = otHam.length === 10 && otHam[0] === "5" ? "0" + otHam : otHam.length === 11 && otHam.startsWith("05") ? otHam : otHam.length === 12 && otHam.startsWith("905") ? "0" + otHam.slice(2) : "";
    if (!oTel) return json({ ok: false, mesaj: "Geçerli bir cep telefonu yaz (05XX XXX XX XX)." });
    if (await denemeSay("ogretmen_kayit", "genel", 60) >= 10) return json({ ok: false, mesaj: "Çok fazla kayıt denemesi. Bir saat sonra tekrar dene." });
    await denemeYaz("ogretmen_kayit", "genel", { ad: kullanici });
    const [{ data: t1 }, s1] = await Promise.all([supabase.from("teachers").select("id").ilike("username", likeKacir(kullanici)).limit(1), studentByNameGenel(kullanici)]);
    if ((t1 && t1.length) || s1) return json({ ok: false, mesaj: "Bu kullanıcı adı alınmış. Başka bir kullanıcı adı dene." });
    const HARF = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let kod = "";
    for (let i = 0; i < 10 && !kod; i++) {
      const aday = Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => HARF[b % HARF.length]).join("");
      const { data: var_ } = await supabase.from("teachers").select("id").ilike("invite_code", aday).limit(1);
      if (!var_ || !var_.length) kod = aday;
    }
    const ek = await supabase.from("teachers").insert({ username: kullanici, full_name: adSoyad, email: eposta, phone: oTel, school: kurum || null, password_hash: await hashPassword(sifre), invite_code: kod, is_admin: false, active: true }).select("id").single();
    if (ek.error) return json({ ok: false, mesaj: "Kayıt yapılamadı: " + ek.error.message }, 500);
    _yoneticiler.t = 0;
    for (const e of (await yoneticiler()).epostalar) await kuyrugaEkle({ to_email: e, kind: "ogretmen_kayit", subject: `Yeni öğretmen kaydı – ${adSoyad}`,
      html: mailKabugu("Yeni Öğretmen Kaydı", `<p><b>${hk(adSoyad)}</b> (${hk(kullanici)}) öğretmen olarak kayıt oldu.</p><p>Kurum: <b>${hk(kurum || "-")}</b><br>E-posta: ${hk(eposta)}<br>Öğretmen kodu: <b>${kod}</b></p><p>Hesap hemen açıldı. Bu öğretmen sadece kendi kodunu giren öğrencileri görebilir. Hesabı kapatmak için Öğretmen Paneli → Öğretmenler bölümünü kullanabilirsin.</p>`) });
    await kuyrugaEkle({ to_email: eposta, kind: "ogretmen_kayit", subject: "Diji-Medu İngilizce öğretmen hesabın hazır",
      html: mailKabugu("Hoş geldiniz", `<p>Merhaba ${hk(adSoyad)},</p><p>Öğretmen hesabınız açıldı. Kullanıcı adınız: <b>${hk(kullanici)}</b></p><p style="font-size:18px">Öğretmen kodunuz: <b style="letter-spacing:3px">${kod}</b></p><p>Öğrencileriniz kayıt olurken bu kodu yazarsa size bağlanır. Onların değerlendirmelerini, mesajlarını, ödevlerini sadece siz görürsünüz; öğrenciler diğer tüm öğrencilerle lig ve yarışmalarda birlikte yarışmaya devam eder.</p>`) });
    return json({ ok: true, kod, kullanici });
  }
  /* [v4.0] Öğretmenin kendi bilgileri (kodunu panelde görmek için) ve yöneticinin öğretmen listesi */
  if (op === "ogretmenBilgim") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const [{ data: t }, { count }] = await Promise.all([supabase.from("teachers").select("username,full_name,email,school,invite_code,is_admin").eq("id", a.teacher_id).maybeSingle(),
      ogrFiltre(supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "approved"))]);
    return json({ ok: true, kullanici: t?.username, adSoyad: t?.full_name, email: t?.email, kurum: t?.school, kod: t?.invite_code, yonetici: !!t?.is_admin, ogrenciSayisi: count || 0 });
  }
  if (op === "ogretmenleriGetir") {
    const deny = await requireTeacher(a); if (deny) return deny;
    if (!a.yonetici) return json({ ok: false, mesaj: "Sadece yönetici." }, 403);
    const [{ data: tl }, { data: st }] = await Promise.all([supabase.from("teachers").select("id,username,full_name,email,school,invite_code,is_admin,active,created_at,last_login_at").order("created_at"), supabase.from("students").select("teacher_id").eq("status", "approved")]);
    const say = new Map<string, number>(); (st || []).forEach((x: any) => say.set(x.teacher_id || "-", (say.get(x.teacher_id || "-") || 0) + 1));
    return json({ ok: true, bagimsiz: say.get("-") || 0, liste: (tl || []).map((t: any) => ({ id: t.id, kullanici: t.username, adSoyad: t.full_name, email: t.email, kurum: t.school, kod: t.invite_code, yonetici: !!t.is_admin, aktif: t.active !== false, ogrenci: say.get(t.id) || 0, kayit: t.created_at, sonGiris: t.last_login_at })) });
  }
  if (op === "ogretmenAktifPasif") {
    const deny = await requireTeacher(a); if (deny) return deny;
    if (!a.yonetici) return json({ ok: false, mesaj: "Sadece yönetici." }, 403);
    const { data: t } = await supabase.from("teachers").select("id,is_admin").eq("id", String(body.id || "")).maybeSingle();
    if (!t || t.is_admin) return json({ ok: false, mesaj: "Bu hesap değiştirilemez." });
    await supabase.from("teachers").update({ active: bool(body.aktif) }).eq("id", t.id);
    if (!bool(body.aktif)) await supabase.from("portal_sessions").delete().eq("teacher_id", t.id);
    await audit(a, "ogretmenAktifPasif", String(t.id), { aktif: bool(body.aktif) });
    return json({ ok: true });
  }
  /* [v4.0] Bağımsız öğrenci sonradan öğretmen koduyla öğretmenine bağlanabilir */
  if (op === "ogretmenKoduBagla") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    if (s.teacher_id) return json({ ok: false, mesaj: "Zaten bir öğretmene bağlısın." });
    const kod = String(body.kod || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const t = kod ? (await supabase.from("teachers").select("id,full_name,username,email,active").ilike("invite_code", kod).limit(1)).data?.[0] : null;
    if (!t || t.active === false) return json({ ok: false, mesaj: "Öğretmen kodu bulunamadı." });
    await supabase.from("students").update({ teacher_id: t.id }).eq("id", s.id);
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(t.email || "").trim())) await kuyrugaEkle({ to_email: String(t.email).trim(), kind: "kayit", student_id: s.id, subject: `${s.username} artık senin öğrencin`,
      html: mailKabugu("Yeni Öğrenci", `<p><b>${hk(s.username)}</b> öğretmen kodunu girerek sana bağlandı. Artık onun değerlendirmelerini, mesajlarını ve ödevlerini sen yönetiyorsun.</p>`) });
    return json({ ok: true, ogretmen: t.full_name || t.username });
  }
  if (op === "kayitOl") {
    // [YAMA 9] doğrulama + saatte 20 kayıt sınırı (zararlı kod ve sahte kayıt koruması)
    const username = String(body.ogrenciAdi || "").trim().replace(/\s+/g, " ");
    const password = String(body.sifre || "");
    if (!/^[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû .'-]{3,50}$/.test(username)) return json({ status: "error", message: "Ad soyad sadece harflerden oluşmalı (3-50 karakter)." });
    if (password.length < 4 || password.length > 64) return json({ status: "error", message: "Şifre 4-64 karakter olmalı." });
    /* [v4.1] Yeni kayıtlarda geçerli veli telefonu ve e-postası zorunlu */
    const telHam = String(body.telefon || "").replace(/\D/g, "");
    const tel = telHam.length === 10 && telHam[0] === "5" ? "0" + telHam : telHam.length === 11 && telHam.startsWith("05") ? telHam : telHam.length === 12 && telHam.startsWith("905") ? "0" + telHam.slice(2) : "";
    if (!tel) return json({ status: "error", message: "Geçerli bir veli cep telefonu yaz (05XX XXX XX XX)." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(body.email || "").trim())) return json({ status: "error", message: "Geçerli bir veli e-posta adresi yaz. Onay ve gelişim raporları bu adrese gelecek." });
    if (await denemeSay("kayit", "genel", 60) >= 20) return json({ status: "error", message: "Çok fazla kayıt denemesi. Bir saat sonra tekrar dene." });
    await denemeYaz("kayit", "genel", { ad: username });
    const existing = await studentByName(username);
    if (existing && existing.status !== "rejected") return json({ status: "error", message: "Bu kullanıcı adı zaten kayıtlı." });
    const { data: ayniOgrt } = await supabase.from("teachers").select("id").ilike("username", likeKacir(username)).limit(1);
    if (ayniOgrt && ayniOgrt.length) return json({ status: "error", message: "Bu kullanıcı adı zaten kayıtlı." });
    /* [v4.0] İsteğe bağlı öğretmen kodu: girilirse o öğretmene bağlanır, boşsa bağımsız */
    const kod = String(body.ogretmenKodu || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    let ogretmen: any = null;
    if (kod) {
      ogretmen = (await supabase.from("teachers").select("id,email,full_name,username,active").ilike("invite_code", kod).limit(1)).data?.[0] || null;
      if (!ogretmen || ogretmen.active === false) return json({ status: "error", message: "Öğretmen kodu bulunamadı. Kodu kontrol et ya da boş bırakıp bağımsız kayıt ol." });
    }
    const payload = {
      username, password_hash: await hashPassword(password), phone: tel || null,
      class_no: num(body.sinif, 0) || null, branch: temizMetin(body.sube, 10) || null,
      email: String(body.email || "").trim().slice(0, 120), status: "pending",
      kvkk_approved_at: body.kvkkOnayTarihi || new Date().toISOString()
    };
    (payload as any).teacher_id = ogretmen ? ogretmen.id : null;
    if (existing) await supabase.from("students").update(payload).eq("id", existing.id);
    else await supabase.from("students").insert(payload);
    /* Sorumlu öğretmene (yoksa yöneticiye) e-posta: yeni kayıt onay bekliyor */
    const alicilar = ogretmen && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(ogretmen.email || "").trim()) ? [String(ogretmen.email).trim()] : (await yoneticiler()).epostalar;
    for (const e of alicilar) await kuyrugaEkle({ to_email: e, kind: "kayit", subject: `Yeni öğrenci kaydı onay bekliyor – ${username}`,
      html: mailKabugu("Yeni Öğrenci Kaydı", `<p><b>${hk(username)}</b> portala kayıt oldu ve onayını bekliyor.</p><table style="border-collapse:collapse">
<tr><td style="padding:4px 10px">Sınıf / şube</td><td style="padding:4px 10px"><b>${hk(payload.class_no || "-")} ${hk(payload.branch || "")}</b></td></tr>
<tr><td style="padding:4px 10px">Veli telefonu</td><td style="padding:4px 10px">${hk(payload.phone || "-")}</td></tr>
<tr><td style="padding:4px 10px">Veli e-postası</td><td style="padding:4px 10px">${hk(payload.email || "-")}</td></tr>
<tr><td style="padding:4px 10px">Bağlantı</td><td style="padding:4px 10px">${ogretmen ? "Senin öğretmen kodunla kayıt oldu" : "Bağımsız öğrenci (öğretmen kodu girmedi)"}</td></tr></table>
<p>Onaylamak için portalda <b>Öğretmen Paneli → Onay Bekleyen Kayıtlar</b> bölümüne gir.</p>`) });
    return json({ status: "success", ogretmen: ogretmen ? (ogretmen.full_name || ogretmen.username) : "" });
  }
  if (op === "sifreDegistir") {
    const username = String(body.ogrenciAdi || "").trim(), phone = String(body.telefon || "").trim();
    // [YAMA 10] saatte 5 deneme sınırı
    if (await denemeSay("sifre_hata", encName(username), 60) >= 5) return json({ status: "error", message: "Çok fazla deneme. Bir saat sonra tekrar dene." });
    const yeni = String(body.yeniSifre || "");
    if (yeni.length < 4 || yeni.length > 64) return json({ status: "error", message: "Yeni şifre 4-64 karakter olmalı." });
    const s = await studentByName(username);
    if (!s || !phone || String(s.phone || "").replace(/\D/g, "") !== phone.replace(/\D/g, "")) {
      await denemeYaz("sifre_hata", encName(username));
      return json({ status: "error", message: "Kullanıcı bilgileri eşleşmedi." });
    }
    await supabase.from("students").update({ password_hash: await hashPassword(yeni), updated_at: new Date().toISOString() }).eq("id", s.id);
    await supabase.from("portal_sessions").delete().eq("student_id", s.id);   // eski oturumları kapat
    return json({ status: "success" });
  }

  // [v3.7] Öğretmen panelinden öğrenci şifresi sıfırlama (eski şifre görülmez, yenisi belirlenir)
  if (op === "ogrenciSifreSifirla") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const s = await studentByName(String(body.ogrenci || ""));
    if (!s) return json({ ok: false, mesaj: "Öğrenci bulunamadı." }, 404);
    const yeni = String(body.yeniSifre || "").trim();
    if (yeni.length < 4 || yeni.length > 64) return json({ ok: false, mesaj: "Yeni şifre 4-64 karakter olmalı." }, 400);
    await supabase.from("students").update({ password_hash: await hashPassword(yeni), updated_at: new Date().toISOString() }).eq("id", s.id);
    await supabase.from("portal_sessions").delete().eq("student_id", s.id);   /* öğrencinin açık oturumları kapanır */
    await audit(a, "ogrenciSifreSifirla", s.username, {});
    return json({ ok: true, mesaj: `${s.username} için yeni şifre kaydedildi.`, ogrenci: s.username });
  }

  // [v3.9] ÖDEVLER: öğretmen sınıf + şubeye Ders Çalış konusu ya da mini oyun verir
  const ODEV_OYUN: Record<string, string> = { ky: "Kelime Laboratuvarı", jp: "Risk Balonları", bosluk: "Eksik Harf", hafiza: "Hafıza Sandığı", yagmur: "Hız Fırtınası", asmaca: "Harf Avı", kelimebul: "Şifre Kırıcı", eslestirme: "Eş Bul", tren: "Kelime Treni", dikte: "Kulak Dedektifi", cumle: "Cümle Ustası" };
  const hedefOgrenciler = async (sinifNo: number, sube: string) => {
    const { data } = await ogrFiltre(supabase.from("students").select("id,username,branch,class_no").eq("status", "approved").eq("class_no", sinifNo));
    return (data || []).filter((x: any) => !sube || encName(x.branch) === encName(sube));
  };
  if (op === "odevVer") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const sinifNo = num(body.sinif), sube = String(body.sube || "").trim();
    if (sinifNo < 1 || sinifNo > 8) return json({ ok: false, mesaj: "Sınıf seçmelisin." }, 400);
    const liste = arr(body.odevler).slice(0, 40), satirlar: any[] = [];
    for (const o of liste) {
      if (o && o.tur === "ders" && o.konu) satirlar.push({ kind: "ders", title: `📘 ${String(o.konu).slice(0, 120)}`, payload: { seviye: String(o.seviye || ""), kategori: String(o.kategori || ""), konu: String(o.konu) } });
      else if (o && o.tur === "oyun" && ODEV_OYUN[o.oyun]) {
        const un = arr(o.uniteler).map((x: any) => num(x)).filter((x: number) => x > 0).slice(0, 12), hy = Math.min(3, Math.max(1, num(o.hedefYildiz, 2)));
        satirlar.push({ kind: "oyun", title: `🎮 ${ODEV_OYUN[o.oyun]} · ${un.length ? un.join(", ") + ". ünite" : "tüm üniteler"} · ${"⭐".repeat(hy)}`, payload: { oyun: o.oyun, sinif: sinifNo, uniteler: un, hedefYildiz: hy } });
      }
    }
    if (!satirlar.length) return json({ ok: false, mesaj: "En az bir konu ya da oyun seçmelisin." }, 400);
    const ortak = { teacher_id: a.teacher_id || null, class_no: sinifNo, branch: sube, due_date: String(body.sonTarih || "").slice(0, 10) || null, note: String(body.not || "").slice(0, 300) || null, active: true };
    const { error } = await supabase.from("assignments").insert(satirlar.map(x => ({ ...ortak, ...x })));
    if (error) return json({ ok: false, mesaj: error.message }, 500);
    const ogr = await hedefOgrenciler(sinifNo, sube);
    await audit(a, "odevVer", `${sinifNo}${sube ? "/" + sube : ""}`, { adet: satirlar.length });
    return json({ ok: true, eklenen: satirlar.length, ogrenciSayisi: ogr.length });
  }
  if (op === "odevListesiOgretmen") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const { data: odevler } = await ogrFiltre(supabase.from("assignments").select("*").eq("active", true).order("created_at", { ascending: false }).limit(150));
    const ids = (odevler || []).map((x: any) => x.id);
    const { data: durum } = ids.length ? await supabase.from("assignment_status").select("assignment_id,student_id,stars").in("assignment_id", ids) : { data: [] };
    const { data: ogr } = await ogrFiltre(supabase.from("students").select("id,username,branch,class_no,teacher_id").eq("status", "approved"));
    const Yo = await yoneticiler();
    const yapan = new Map<string, any>(); (durum || []).forEach((x: any) => yapan.set(x.assignment_id + "|" + x.student_id, x));
    return json({ ok: true, liste: (odevler || []).map((o: any) => {
      const hedef = (ogr || []).filter((s: any) => Number(s.class_no) === Number(o.class_no) && (!o.branch || encName(s.branch) === encName(o.branch)) && (!o.teacher_id || Yo.ids.has(o.teacher_id) || s.teacher_id === o.teacher_id));
      const yapti = hedef.filter((s: any) => yapan.has(o.id + "|" + s.id)).map((s: any) => s.username);
      return { id: o.id, tur: o.kind, baslik: o.title, sinif: o.class_no, sube: o.branch, sonTarih: o.due_date, not: o.note, atandi: o.created_at, hedef: hedef.length, yapanlar: yapti, yapmayanlar: hedef.map((s: any) => s.username).filter((x: string) => !yapti.includes(x)) };
    }) });
  }
  if (op === "odevSil") {
    const deny = await requireTeacher(a); if (deny) return deny;
    await ogrFiltre(supabase.from("assignments").update({ active: false }).eq("id", num(body.id)));
    await audit(a, "odevSil", String(body.id), {});
    return json({ ok: true });
  }
  if (op === "odevlerim") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json({ ok: true, liste: [] });
    const { data: odevler } = await supabase.from("assignments").select("*").eq("active", true).eq("class_no", Number(s.class_no) || -1).order("created_at", { ascending: false }).limit(60);
    const Yd = await yoneticiler();
    const benim = (odevler || []).filter((o: any) => (!o.branch || encName(o.branch) === encName(s.branch)) && (!o.teacher_id || Yd.ids.has(o.teacher_id) || o.teacher_id === s.teacher_id));
    const ids = benim.map((o: any) => o.id);
    const { data: durum } = ids.length ? await supabase.from("assignment_status").select("assignment_id,stars,done_at").eq("student_id", s.id).in("assignment_id", ids) : { data: [] };
    const d = new Map((durum || []).map((x: any) => [x.assignment_id, x]));
    return json({ ok: true, liste: benim.map((o: any) => ({ id: o.id, tur: o.kind, baslik: o.title, veri: o.payload, sonTarih: o.due_date, not: o.note, atandi: o.created_at, yapildi: d.has(o.id), yildiz: (d.get(o.id) as any)?.stars || 0 })) });
  }
  if (op === "odevTamamla") {
    const name = String(body.ogrenci || ""); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    const { data: o } = await supabase.from("assignments").select("*").eq("id", num(body.id)).eq("active", true).maybeSingle();
    const Yt = await yoneticiler();
    if (!o || Number(o.class_no) !== Number(s.class_no) || (o.branch && encName(o.branch) !== encName(s.branch)) || (o.teacher_id && !Yt.ids.has(o.teacher_id) && o.teacher_id !== s.teacher_id)) return json({ ok: false, mesaj: "Bu ödev sana ait değil." }, 403);
    if (o.kind === "oyun" && num(body.yildiz) < num(o.payload?.hedefYildiz, 1)) return json({ ok: false, mesaj: "Hedef yıldıza ulaşılmadı." });
    await supabase.from("assignment_status").upsert({ assignment_id: o.id, student_id: s.id, score: num(body.puan) || null, stars: num(body.yildiz) || null }, { onConflict: "assignment_id,student_id", ignoreDuplicates: true });
    return json({ ok: true });
  }

  // ============================================================ HERKESE AÇIK İÇERİK
  if (op === "kelimelerGetir") {
    const data = await hepsiniGetir(() => supabase.from("word_bank").select("class_no,unit_no,english,turkish,extra").eq("active", true).order("class_no").order("unit_no").order("english"));
    return json((data || []).map(x => ({ sinif: x.class_no, unite: x.unit_no, ingilizce: x.english, turkce: x.turkish, ...(x.extra || {}) })));
  }
  if (op === "etkinlikTanimlariGetir") {
    const { data } = await supabase.from("activities").select("*").eq("active", true).order("display_name");
    return json((data || []).map((x: any) => ({ etkinlikKodu: x.code, gorunenAd: x.display_name, kategori: x.category, disLink: x.external_link, ogretmenYorumu: x.teacher_comment, siraNo: x.content?.siraNo, satirIndex: x.content?._sourceRow || x.content?.siraNo, ogrenciAdi: x.content?.ogrenciAdi, yapildiMi: false, ...(x.content || {}) })));
  }
  if (op === "kategorileriGetir") {
    const { data } = await supabase.from("lesson_topics").select("category").eq("active", true);
    return json([...new Set((data || []).map(x => x.category))]);
  }
  if (op === "konusmaEsAnlamlarGetir") return json([]);
  if (op === "tumVideolariGetir") {
    const { data } = await supabase.from("videos").select("*").eq("active", true).order("title");
    return json((data || []).map(v => ({ satirIndex: v.external_row_index, baslik: v.title, kategori: v.category, link: v.url, aciklama: v.description, ...(v.content || {}) })));
  }
  if (op === "ozellikListesiGetir") {
    const { data } = await supabase.from("feature_flags").select("code,name,target_type,target_value,enabled").order("name");
    return json((data || []).map(x => ({ kod: x.code, ad: x.name || x.code, hedefTipi: x.target_type, hedefDegeri: x.target_value, durum: x.enabled })));
  }
  if (op === "dersKonulariGetir") {
    const { data } = await supabase.from("lesson_topics").select("id,level,category,topic_name,sort_no,content").eq("active", true).order("sort_no");
    const done = new Set<string>();
    if (a) {
      const s = await hedefOgrenci(a, String(val(body, q, "ogrenci")));
      // [YAMA 11] "tamamlandı" sadece test geçilince; "bilmiyordum" işareti tamamlandı sayılmıyordu ama sayılıyordu
      if (s) { const p = await supabase.from("lesson_progress").select("topic_name").eq("student_id", s.id).eq("test_success", true); for (const x of p.data || []) if (x.topic_name) done.add(String(x.topic_name)); }
    }
    return json((data || []).map((x: any) => ({ seviye: x.level, kategori: x.category, konuAdi: x.topic_name, siraNo: x.sort_no, durum: done.has(x.topic_name) ? "tamamlandi" : "", ...(x.content || {}) })));
  }
  if (op === "dersKonuDetayGetir") {
    const level = String(val(body, q, "seviye")), category = String(val(body, q, "kategori")), topic = String(val(body, q, "konu"));
    const { data } = await supabase.from("lesson_topics").select("*").eq("level", level).eq("category", category).eq("topic_name", topic).maybeSingle();
    return json(data?.content || data || {});
  }
  if (op === "dogruYanlisSorulariGetir") {
    const code = String(val(body, q, "etkinlikKodu"));
    const { data } = await supabase.from("activities").select("content").eq("code", code).maybeSingle();
    return json(data?.content?.questions || []);
  }
  if (op === "gununKonusuGetir") return json(null);

  // ============================================================ ÖĞRETMEN: KAYIT ONAYI
  if (op === "bekleyenKayitlariGetir") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const { data } = await supabase.from("students").select("id,username,phone,class_no,branch,email,created_at").eq("status", "pending").order("created_at");
    return json({ liste: data || [] });
  }
  if (op === "kayitOnayla" || op === "kayitReddet") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const s = await studentByName(String(body.ogrenciAdi || ""));
    if (!s) return json({ status: "error", message: "Öğrenci bulunamadı." });
    await supabase.from("students").update({ status: op === "kayitOnayla" ? "approved" : "rejected", updated_at: new Date().toISOString() }).eq("id", s.id);
    await audit(a, op, s.username);
    if (op === "kayitOnayla" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s.email || "").trim())) await kuyrugaEkle({ student_id: s.id, to_email: String(s.email).trim(), kind: "onay", subject: `Kaydınız onaylandı – ${s.username}`,
      html: mailKabugu("Kayıt Onayı", `<p>Sayın Veli,</p><p><b>${hk(s.username)}</b> adına yapılan Diji-Medu İngilizce Portalı kaydı <b>${hk(a.ogretmenAdi || "öğretmen")}</b> tarafından onaylandı. 🎉</p><p>Artık kayıtta belirlenen kullanıcı adı ve şifreyle giriş yapılabilir:</p><p style="text-align:center"><a href="${PORTAL_URL}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:bold">Portala git</a></p>`) });
    return json({ status: "success" });
  }

  // ============================================================ ENERJİ
  if (op === "enerjiDurumuGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    let s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    s = await enerjiYenile(s);
    return json({ enerjiKalan: s.energy ?? 0, enerjiMax: s.energy_max ?? ENERJI_TAVAN, ...dolumBilgi(s) });
  }
  if (op === "enerjiDegistir") {
    const name = String(body.ogrenci || ""); const deny = await requireStudent(a, name); if (deny) return deny;
    let s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    s = await enerjiYenile(s);
    let fark = Math.trunc(num(body.fark));
    const sebep = String(body.sebep || (bool(body.hediye) ? "hediye" : (fark < 0 ? "oyun" : ""))).toLowerCase().slice(0, 20);
    const max = Number(s.energy_max || ENERJI_TAVAN);
    let tavan = max, mesaj = "";
    /* [v3.6] Öğrenci enerjiyi sadece tanımlı yollardan kazanabilir; her yolun kendi günlük sınırı var */
    if (a.role === "student" && fark > 0) {
      const { data: bugunH } = await supabase.from("energy_transactions").select("change_amount,reason")
        .eq("student_id", s.id).gt("change_amount", 0).gte("created_at", bugunBasi());
      const h = bugunH || [];
      const topla = (r: string) => h.filter((x: any) => x.reason === r).reduce((t: number, x: any) => t + Number(x.change_amount || 0), 0);
      const say = (r: string) => h.filter((x: any) => x.reason === r).length;
      if (sebep === "gunluk") {
        if (say("gunluk") > 0) { fark = 0; mesaj = "Günlük hediyeni bugün zaten aldın."; }
        else { const seri = Number(s.streak || 0); fark = seri > 0 && seri % 7 === 0 ? 10 : 5; tavan = max + 10; }
      } else if (sebep === "satin") {
        if (say("satin") >= 3) return json({ ok: false, status: "error", mesaj: "Bugün en fazla 3 kez enerji alabilirsin. Yarın yine gel!", enerjiKalan: s.energy, enerjiMax: max, ...dolumBilgi(s) });
        fark = Math.min(fark, max - s.energy);
        if (fark <= 0) return json({ ok: false, status: "error", mesaj: "Enerjin zaten dolu!", enerjiKalan: s.energy, enerjiMax: max, ...dolumBilgi(s) });
      } else if (sebep === "ders") {
        fark = Math.max(0, Math.min(fark, 6, 30 - topla("ders"))); tavan = max + 10;
      } else if (sebep === "hediye") {
        fark = Math.max(0, Math.min(fark, 5, 15 - topla("hediye"))); tavan = max + 10;
      } else {
        fark = Math.max(0, Math.min(fark, 3, 6 - topla(sebep || "diger")));
      }
    }
    if (fark < -25) fark = -25;
    const once = s.energy;
    const next = fark >= 0 ? Math.max(once, Math.min(tavan, once + fark)) : Math.max(0, once + fark);
    const patch: any = { energy: next, updated_at: new Date().toISOString() };
    if (once >= max && next < max) patch.energy_updated_at = new Date().toISOString();   // dolum sayacı harcamayla başlar
    await supabase.from("students").update(patch).eq("id", s.id);
    if (next !== once) await supabase.from("energy_transactions").insert({ student_id: s.id, change_amount: next - once, balance_after: next, reason: sebep || (fark < 0 ? "oyun" : "diger") });
    s.energy = next; if (patch.energy_updated_at) s.energy_updated_at = patch.energy_updated_at;
    return json({ ok: true, status: "success", enerjiKalan: next, enerjiMax: max, eklenen: next - once, mesaj, ...dolumBilgi(s) });
  }
  if (op === "enerjiGonder") {
    const g = String(val(body, q, "gonderen")), al = String(val(body, q, "alici"));
    const deny = await requireStudent(a, g); if (deny) return deny;
    const gs = await hedefOgrenci(a, g), as = await studentByName(al);
    if (!gs || !as) return json({ status: "error", message: "Öğrenci bulunamadı." });
    // [YAMA 13] kendine gönderme yok, miktar her zaman 1, günde 1 gönderim
    if (gs.id === as.id) return json({ status: "error", message: "Kendine enerji gönderemezsin. 😄" });
    const { count } = await supabase.from("feed_events").select("id", { count: "exact", head: true })
      .eq("student_id", gs.id).eq("event_type", "energy_send").gte("created_at", bugunBasi());
    if ((count || 0) >= 1) return json({ status: "error", message: "Bugün enerji hediyeni zaten gönderdin. Yarın yine gönderebilirsin!" });
    const next = Math.min(as.energy_max, as.energy + 1);
    await supabase.from("students").update({ energy: next }).eq("id", as.id);
    await supabase.from("energy_transactions").insert({ student_id: as.id, change_amount: next - as.energy, balance_after: next, reason: "öğrenci hediyesi" });
    await supabase.from("feed_events").insert({ student_id: gs.id, target_student_id: as.id, event_type: "energy_send", payload: { amount: 1, student_name: gs.username, target_name: as.username, icon: "⚡", message: "enerji gönderdi" } });
    await supabase.from("notifications").insert({ recipient_student_id: as.id, sender_student_id: gs.id, type: "enerji", message: `${gs.username} sana 1 ⚡ enerji gönderdi!` });
    return json({ status: "success", enerjiKalan: next });
  }

  // ============================================================ LİDERLİK
  if (leaderboardKey[op]) { const deny = await requireStudent(a, String(body.isim || body.ogrenci || "")); if (deny) return deny; return leaderboardSave(op, body, a); }
  if (leaderboardGetKey[op]) { const deny = await requireStudent(a, ""); if (deny) return deny; return leaderboardGet(op, body, q); }

  if (op === "hizliPuanEkle") {
    const name = String(body.ogrenci || ""); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    const unique = temizMetin(body.tekBonusAnahtari, 120);
    let amount = num(body.puan);
    // [YAMA 14] Öğrenci kendi ders puanını sınırsız artırabiliyordu: en fazla 1,5 ve tek seferlik anahtar zorunlu
    if (a.role === "student") {
      if (!unique) return json({ status: "error", message: "Geçersiz bonus." }, 400);
      amount = Math.max(0, Math.min(1.5, amount));
    }
    if (unique) {
      const { data: old } = await supabase.from("points_transactions").select("id").eq("student_id", s.id).eq("unique_key", unique).maybeSingle();
      if (old) return json({ status: "success", verildiMi: false });
    }
    const balance = Math.min(100, Number(s.points || 0) + amount);
    await supabase.from("students").update({ points: balance, updated_at: new Date().toISOString() }).eq("id", s.id);
    await supabase.from("points_transactions").insert({ student_id: s.id, change_amount: amount, balance_after: balance, reason: temizMetin(body.sebep, 120), unique_key: unique || null });
    return json({ status: "success", verildiMi: true });
  }

  // ============================================================ OTURUM KAYITLARI
  if (op === "kaydet") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    const sure = Math.max(Number(s.total_seconds || 0), num(val(body, q, "toplamsure")));   // süre geriye gitmez
    await supabase.from("students").update({ total_seconds: sure, updated_at: new Date().toISOString() }).eq("id", s.id);
    return json({ status: "success" });
  }
  if (op === "sonGirisGuncelle") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (s) await supabase.from("students").update({ last_login_at: new Date().toISOString() }).eq("id", s.id);
    return json({ status: "success" });
  }
  if (op === "sinifSec") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (s) await supabase.from("students").update({ selected_class: num(val(body, q, "sinif")) }).eq("id", s.id);
    return json({ status: "success" });
  }

  // ============================================================ PARKUR İLERLEMESİ
  if (op === "buyuSeviyeIlerlemeGetir" || op === "konusmaSeviyeIlerlemeGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json([]);
    const mode = op.startsWith("buyu") ? "buyu" : "konusma";
    const { data } = await supabase.from("level_completions").select("level_no").eq("student_id", s.id).eq("mode", mode);
    return json([...new Set((data || []).map(x => x.level_no))].sort((x: any, y: any) => x - y));
  }
  // [v3.8] Parkur durağını İLK kez geçen öğrenciye sunucu +6 ⚡ verir (tekrar oynamada verilmez, günde en fazla 36)
  if (op === "buyuSeviyeTamamla" || op === "konusmaSeviyeTamamla" || op === "seviyeTamamla") {
    const name = String(val(body, q, "ogrenci") || ""); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    const kayit = op === "seviyeTamamla"
      ? { student_id: s.id, mode: "external", class_no: num(val(body, q, "sinif")), unit_no: num(val(body, q, "unite")), level_no: num(val(body, q, "seviye")) }
      : { student_id: s.id, mode: op.startsWith("buyu") ? "buyu" : "konusma", class_no: 0, unit_no: 0, level_no: num(body.seviyeNo) };
    const { data: vardi } = await supabase.from("level_completions").select("student_id").eq("student_id", s.id).eq("mode", kayit.mode)
      .eq("class_no", kayit.class_no).eq("unit_no", kayit.unit_no).eq("level_no", kayit.level_no).limit(1);
    await supabase.from("level_completions").upsert(kayit, { onConflict: "student_id,mode,class_no,unit_no,level_no" });
    let eklenen = 0, enerjiKalan: number | undefined, enerjiMax: number | undefined;
    if (!(vardi && vardi.length) && a.role === "student") {
      let st = await enerjiYenile(s);
      const max = Number(st.energy_max || ENERJI_TAVAN);
      const { data: bugun } = await supabase.from("energy_transactions").select("change_amount").eq("student_id", s.id).eq("reason", "parkur").gte("created_at", bugunBasi());
      const verilen = (bugun || []).reduce((t: number, x: any) => t + Number(x.change_amount || 0), 0);
      const hak = Math.max(0, Math.min(6, 36 - verilen));
      const once = Number(st.energy || 0), sonra = Math.min(max + 10, once + hak);
      eklenen = sonra - once;
      if (eklenen > 0) {
        await supabase.from("students").update({ energy: sonra, updated_at: new Date().toISOString() }).eq("id", s.id);
        await supabase.from("energy_transactions").insert({ student_id: s.id, change_amount: eklenen, balance_after: sonra, reason: "parkur" });
      }
      enerjiKalan = sonra; enerjiMax = max;
    }
    return json({ status: "success", ilkKez: !(vardi && vardi.length), eklenenEnerji: eklenen, enerjiKalan, enerjiMax });
  }
  if (op === "ilerlemeOzet") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json({ ok: false });
    // [YAMA 16] Dünya haritası { ok, ba:[...], kp:[...] } bekliyordu; sadece ders ilerlemesi dönüyordu
    const { data: lv } = await supabase.from("level_completions").select("mode,level_no").eq("student_id", s.id);
    const { data } = await supabase.from("lesson_progress").select("*").eq("student_id", s.id);
    const liste = (m: string) => [...new Set((lv || []).filter(x => x.mode === m).map(x => x.level_no))].sort((x: any, y: any) => x - y);
    return json({ ok: true, ba: liste("buyu"), kp: liste("konusma"), dersler: data || [], toplam: (data || []).length });
  }

  // ============================================================ DERS ÇALIŞ
  if (op === "dersBilmiyordumToggle") {
    const name = String(body.ogrenci || ""); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    // [YAMA 17] gerçek aç/kapa: her basışta yeni satır açıyordu
    const { data: var_ } = await supabase.from("lesson_progress").select("id").eq("student_id", s.id).eq("topic_name", body.konuAdi).eq("knew_it", false).limit(1);
    if (var_ && var_.length) { await supabase.from("lesson_progress").delete().eq("id", var_[0].id); return json({ status: "success", durum: false }); }
    await supabase.from("lesson_progress").insert({ student_id: s.id, level: body.seviye, category: body.kategori, topic_name: body.konuAdi, knew_it: false });
    return json({ status: "success", durum: true });
  }
  if (op === "dersTestSonucKaydet") {
    const name = String(body.ogrenci || ""); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    await supabase.from("lesson_progress").insert({ student_id: s.id, level: body.seviye, category: body.kategori, topic_name: body.konuAdi, test_success: !!body.basariliMi });
    return json({ status: "success" });
  }

  // ============================================================ EK VERİ (oyun ilerlemesi)
  if (op === "ekVeriGetir") {
    const name = String(val(body, q, "ogrenci")), key = String(val(body, q, "anahtar")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json(null);
    const { data } = await supabase.from("extra_data").select("value").eq("student_id", s.id).eq("key_name", key).maybeSingle();
    return json(data?.value ?? null);
  }
  if (op === "ekVeriKaydet") {
    const name = String(body.ogrenci || ""), key = temizMetin(body.anahtar, 60); const deny = await requireStudent(a, name); if (deny) return deny;
    if (a?.role === "teacher" && encName(name) === "teacher" && key === "yo") {
      let tv: any = null; try { tv = typeof body.deger === "string" ? JSON.parse(body.deger) : body.deger; } catch (_) { tv = null; }
      if (!tv || typeof tv !== "object") return json({ status: "error", message: "Geçersiz veri." }, 400);
      if (JSON.stringify(tv).length > 200000) return json({ status: "error", message: "Veri çok büyük." }, 413);
      const { data: tEski } = await supabase.from("teachers").select("game_data").eq("id", a.teacher_id).maybeSingle();
      const tTaban = num(body._taban, -1);
      if (tEski?.game_data && tTaban >= 0 && num(tEski.game_data.guncelleme) > tTaban) return json({ status: "eski", message: "Bu cihazdaki veri eski; sunucudaki yeniden yükleniyor." }, 409);
      await supabase.from("teachers").update({ game_data: tv, game_data_at: new Date().toISOString() }).eq("id", a.teacher_id);
      return json({ status: "success" });
    }
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    let value: any = {}; try { value = typeof body.deger === "string" ? JSON.parse(body.deger) : body.deger; } catch (_) { value = body.deger; }
    if (JSON.stringify(value ?? null).length > 200000) return json({ status: "error", message: "Veri çok büyük." }, 413);
    // [v4.4] Veri koruma: eski ya da boş bir cihaz, sunucudaki daha yeni veriyi ezemez
    if (key === "yo" && value && typeof value === "object") {
      const { data: eski } = await supabase.from("extra_data").select("value").eq("student_id", s.id).eq("key_name", "yo").maybeSingle();
      let e: any = eski?.value || {}; if (typeof e === "string") { try { e = JSON.parse(e); } catch (_) { e = {}; } }
      const taban = num(body._taban, -1);
      const eskiSurum = taban >= 0 && num(e.guncelleme) > taban;                                           /* başka cihaz bu arada daha yeni kaydetti */
      const ligGeri = e.lig && value.lig && e.lig.hafta && e.lig.hafta === value.lig.hafta && num(value.lig.xp) < num(e.lig.xp);
      const gunGeri = e.xpGun && value.xpGun && e.xpGun.tarih && e.xpGun.tarih === value.xpGun.tarih && num(value.xpGun.xp) < num(e.xpGun.xp);
      if (eskiSurum || ligGeri || gunGeri) {
        await audit(a, "eski_veri_reddedildi", s.username, { eskiSurum, ligGeri, gunGeri, gelenAltin: num(value.altin), kayitliAltin: num(e.altin) });
        return json({ status: "eski", message: "Bu cihazdaki veri eski; sunucudaki yeniden yükleniyor." }, 409);
      }
    }
    // [YAMA 18] Hile sınırı: tek kayıtta haftalık XP en fazla +3000, altın en fazla +1000 artabilir
    if (key === "yo" && a.role === "student" && value && typeof value === "object") {
      const { data: eski } = await supabase.from("extra_data").select("value").eq("student_id", s.id).eq("key_name", "yo").maybeSingle();
      let e: any = eski?.value || {}; if (typeof e === "string") { try { e = JSON.parse(e); } catch (_) { e = {}; } }
      if (e.lig && value.lig && e.lig.hafta === value.lig.hafta && num(value.lig.xp) > num(e.lig.xp) + 3000) { value.lig.xp = num(e.lig.xp) + 3000; await audit(a, "hile_sinir", "lig.xp"); }
      if (num(value.altin) > num(e.altin) + 1000) { value.altin = num(e.altin) + 1000; await audit(a, "hile_sinir", "altin"); }
    }
    await supabase.from("extra_data").upsert({ student_id: s.id, key_name: key, value, updated_at: new Date().toISOString() }, { onConflict: "student_id,key_name" });
    if (key === "yo" && value && typeof value === "object") {
      const {data: kept}=await supabase.from("extra_data").select("value").eq("student_id",s.id).eq("key_name","yo").maybeSingle();
      if(kept?.value)value=kept.value;
      const patch: any = {};
      if (num(value.altin, -1) >= 0) patch.gold = num(value.altin);
      if (value.lig && typeof value.lig === "object") { const p = (s.profile && typeof s.profile === "object") ? { ...s.profile } : {}; p.lig = { ...(p.lig || {}), xp: num(value.lig.xp), hafta: value.lig.hafta }; patch.profile = p; }
      if (Object.keys(patch).length) await supabase.from("students").update(patch).eq("id", s.id);
    }
    return json({ status: "success" });
  }
  if (op === "ekVeriTumu") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const { data } = await supabase.from("extra_data").select("student_id,key_name,value");
    return json(data || []);
  }
  if (op === "ekVeriOzet") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const { data } = await supabase.from("extra_data").select("student_id,key_name");
    return json({ toplam: (data || []).length });
  }
  if (op === "sosyalOgrencilerGetir") {
    const deny = await requireStudent(a, ""); if (deny) return deny;
    const { data: students } = await supabase.from("students").select("id,username,class_no,status,points,xp,gold,streak,profile").eq("role", "student").eq("status", "approved").order("username");
    const { data: scores } = await supabase.from("game_scores").select("student_id,score,played_on,created_at").order("played_on", { ascending: true }).limit(5000);
    const by = new Map<string, any[]>();
    for (const r of scores || []) { if (!r.student_id) continue; if (!by.has(r.student_id)) by.set(r.student_id, []); by.get(r.student_id)!.push(r); }
    const list = (students || []).map((s: any) => {
      const p = (s.profile && typeof s.profile === "object") ? s.profile : {}, rows = by.get(s.id) || [], daily = new Map<string, number[]>();
      for (const r of rows) { const d = String(r.played_on || r.created_at || "").slice(0, 10); if (!daily.has(d)) daily.set(d, []); daily.get(d)!.push(Number(r.score || 0)); }
      const hist = [...daily.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([t, v]) => ({ tarih: t, genel: Math.round(v.reduce((x, n) => x + n, 0) / Math.max(1, v.length) * 10) / 10 }));
      const avg = rows.length ? Math.round(rows.reduce((x, r) => x + Number(r.score || 0), 0) / rows.length * 10) / 10 : Number(p.genelOrtalama || 0);
      const lig = p.lig && typeof p.lig === "object" ? p.lig : { hafta: "", xp: Number(s.xp || 0) };
      const rozetListesi = Array.isArray(p.rozetListesi) && p.rozetListesi.length ? p.rozetListesi : PUBLIC_BADGES;
      // Not: telefon, e-posta, şifre ve öğretmen notları bu listede YOK (herkese açık)
      return { id: s.id, ogrenci: s.username, sinif: s.class_no || "", Sinif: s.class_no || "", durum: s.status, genelPuan: Number(p.genelPuan ?? avg), genelOrtalama: Number(p.genelOrtalama ?? avg) || avg, puan: Number(s.points || 0), xp: Number(s.xp || 0), altin: Number(s.gold || 0), streak: Number(s.streak || 0), lig, rozetListesi, gelisimSerisi: Array.isArray(p.gelisimSerisi) && p.gelisimSerisi.length ? p.gelisimSerisi : hist, denemeSerisi: Array.isArray(p.denemeSerisi) ? p.denemeSerisi : [], seviyeIlerleme: Array.isArray(p.seviyeIlerleme) ? p.seviyeIlerleme : [], okumaOrt: Number(p.okumaOrt || 0), yazmaOrt: Number(p.yazmaOrt || 0), vocabOrt: Number(p.vocabOrt || 0), konusmaOrt: Number(p.konusmaOrt || 0), grammarOrt: Number(p.grammarOrt || 0) };
    });
    return json(list);
  }

  // ============================================================ BİLDİRİMLER
  if (op === "bildirimlerim") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json({ liste: [] });
    let query = supabase.from("notifications").select("*,sender:students!notifications_sender_student_id_fkey(username)").eq("recipient_student_id", s.id).order("created_at", { ascending: false }).limit(200);
    if (q.get("tumu") !== "1" && body.tumu !== "1") query = query.is("read_at", null);
    const { data } = await query;
    // [YAMA 19] gönderen alanında kimlik numarası yerine isim
    return json({ liste: (data || []).map((x: any) => ({ sat: x.id, tarih: x.created_at, gonderen: x.sender?.username || "", tur: x.type, metin: x.message, okundu: !!x.read_at, duyuruId: x.payload?.duyuruId || null })) });
  }
  if (op === "bildirimOkundu") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    const ids = String(val(body, q, "satirlar")).split(",").filter(Boolean);
    if (ids.length) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_student_id", s.id).in("id", ids);
    else await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_student_id", s.id).is("read_at", null);
    return json({ status: "success" });
  }
  if (op === "bildirimGonder") {
    // [YAMA 20] GİRİŞ YAPMADAN herkes, herkes adına bildirim gönderebiliyordu
    const alici = String(val(body, q, "alici")), gonderen = String(val(body, q, "gonderen"));
    const deny = await requireStudent(a, gonderen); if (deny) return deny;
    const sender = await hedefOgrenci(a, gonderen), receiver = await studentByName(alici);
    if (!receiver) return json({ status: "error" });
    const tur = temizMetin(val(body, q, "tur"), 30);
    if (!["tebrik", "begeni", "takip", "duello", "duelloYanit", "duelloSonuc", "duelloOyun", "enerji", "hediye"].includes(tur)) return json({ status: "error", message: "Geçersiz bildirim türü." }, 400);
    if (sender) {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("sender_student_id", sender.id).gte("created_at", new Date(Date.now() - 3600000).toISOString());
      if ((count || 0) >= 40) return json({ status: "error", message: "Çok fazla bildirim gönderdin, biraz bekle." });
    }
    await supabase.from("notifications").insert({ recipient_student_id: receiver.id, sender_student_id: sender?.id || null, type: tur, message: temizMetin(val(body, q, "metin"), 300) });
    return json({ status: "success" });
  }
  if (op === "yeniPuanBildirimleriGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json([]);
    const { data } = await supabase.from("points_transactions").select("id,change_amount,reason,created_at").eq("student_id", s.id).order("created_at", { ascending: false }).limit(20);
    return json((data || []).map(x => ({ id: x.id, degisim: x.change_amount, sebep: x.reason, tarih: x.created_at })));
  }

  // ============================================================ MEDU AKIŞ
  if (op === "akisTumu") {
    const deny = await requireStudent(a, ""); if (deny) return deny;
    const { data } = await supabase.from("feed_events").select("id,student_id,event_type,target_student_id,payload,created_at,students!feed_events_student_id_fkey(username)").order("created_at", { ascending: false }).limit(200);
    const liste = (data || []).map((e: any) => {
      const p = e.payload || {}, ad = e.students?.username || p.student_name || "";
      let ikon = p.icon || "✨", metin = p.message || "Yeni bir hareket yaptı";
      if (e.event_type === "game_score") metin = `${p.game_name || p.game_key || "Oyunda"} ${p.score ?? 0} puan kazandı`;
      else if (e.event_type === "energy_send") metin = `${p.amount ?? 1} enerji gönderdi`;
      else if (e.event_type === "duel_invite") metin = `⚔️ ${p.game_name || "bir oyun"} düellosuna çağırdı`;
      else if (e.event_type === "level_complete") metin = `${p.mode_name || "Parkurda"} ${p.level ?? ""}. seviyeyi tamamladı`;
      return { k: e.id, t: e.created_at, ogr: ad, ad, tur: "arti", ikon, metin, g: false };
    }).filter((x: any) => x.ogr && !["takip", "begeni", "tebrik", "like", "congrats"].includes(String(x.tur)));
    return json({ liste });
  }
  if (op === "akisOlaylariGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json({ takip: [], begeni: [], tebrik: [] });
    const { data } = await supabase.from("feed_events").select("event_type,target_student_id,payload").or("student_id.eq." + s.id + ",target_student_id.eq." + s.id).order("created_at", { ascending: false }).limit(300);
    const out: any = { takip: [], begeni: [], tebrik: [] };
    for (const e of data || []) { const p = e.payload || {}, target = p.target_name || ""; if (e.event_type === "takip" && target) out.takip.push(target); if ((e.event_type === "begeni" || e.event_type === "like") && target) out.begeni.push(target); if ((e.event_type === "tebrik" || e.event_type === "congrats") && target) out.tebrik.push(target); }
    return json(out);
  }
  if (op === "akisOlayToggle") {
    const name = String(body.ogrenci || ""); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name);
    const hedef = String(body.hedef || "").trim(), tur = String(body.tur || "").trim().toLowerCase();
    if (!["takip", "begeni", "tebrik"].includes(tur)) return json({ status: "error", aktif: false, message: "Geçersiz tür." }, 400);
    const target = await studentByName(hedef);
    if (!s || !target) return json({ status: "error", aktif: false });
    const { data: existing } = await supabase.from("feed_events").select("id").eq("student_id", s.id).eq("event_type", tur).eq("target_student_id", target.id).maybeSingle();
    if (existing?.id) { await supabase.from("feed_events").delete().eq("id", existing.id); return json({ status: "success", aktif: false }); }
    await supabase.from("feed_events").insert({ student_id: s.id, event_type: tur, target_student_id: target.id, payload: { target_name: target.username, active: true } });
    return json({ status: "success", aktif: true });
  }

  // ============================================================ DUYURULAR
  if (op === "duyuruListesiGetir") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }); return json(data || []);
  }
  if (op === "duyurulariGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json(null);
    const { data } = await supabase.from("announcements").select("*").eq("active", true).order("created_at", { ascending: false });
    const { data: okunan } = await supabase.from("announcement_reads").select("announcement_id").eq("student_id", s.id);
    const gordu = new Set((okunan || []).map((x: any) => x.announcement_id));
    const hedefMi = (d: any) => d.target_type === "all" || d.target_type === "tumogrenciler" ||
      (d.target_type === "sinif" && Array.isArray(d.target_list) && d.target_list.map(String).includes(String(s.class_no))) ||
      (Array.isArray(d.target_list) && d.target_list.map(String).map(encName).includes(encName(s.username)));
    // [YAMA 21] görülmemiş ilk duyuru gelir (önceden hep en yenisi, görülmüş olsa da)
    const d = (data || []).filter(hedefMi).find((x: any) => !gordu.has(x.id));
    return json(d ? { id: d.id, baslik: d.title, mesaj: d.message, hedefTipi: d.target_type, hedefDegeri: Array.isArray(d.target_list) ? d.target_list.join(",") : "", gosterimSinir: d.display_limit || 0, tema: d.theme || "mavi", aktif: d.active ? "evet" : "hayir", tarih: d.created_at, gorselLink: d.image_link || "" } : null);
  }
  if (op === "duyuruGecmisiGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json([]);
    const { data } = await supabase.from("announcement_reads").select("announcement_id,seen_at,announcements(title,message,theme,created_at)").eq("student_id", s.id).order("seen_at", { ascending: false });
    return json((data || []).map((x: any) => ({ announcement_id: x.announcement_id, seen_at: x.seen_at, baslik: x.announcements?.title, mesaj: x.announcements?.message, tema: x.announcements?.theme, tarih: x.announcements?.created_at })));
  }
  if (op === "duyuruGorulduIsaretle") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    await supabase.from("announcement_reads").upsert({ announcement_id: val(body, q, "duyuruId"), student_id: s.id }, { onConflict: "announcement_id,student_id" });
    return json({ status: "success" });
  }
  if (op === "duyuruEkle") {
    const deny = await requireTeacher(a); if (deny) return deny;
    await supabase.from("announcements").insert({ title: temizMetin(body.baslik, 120), message: temizMetin(body.mesaj, 2000), image_link: body.gorselLink || null, target_type: body.hedefTipi || "all", target_list: arr(body.hedefListesi), display_limit: num(body.gosterimSinir) || null, theme: body.tema || null });
    return json({ status: "success" });
  }
  if (op === "duyuruAktifPasif") {
    const deny = await requireTeacher(a); if (deny) return deny;
    await ogrFiltre(supabase.from("announcements").update({ active: bool(body.durum) }).eq("id", body.duyuruId)); return json({ status: "success" });
  }
  if (op === "duyuruSil") {
    const deny = await requireTeacher(a); if (deny) return deny;
    await ogrFiltre(supabase.from("announcements").delete().eq("id", body.duyuruId)); return json({ status: "success" });
  }

  // ============================================================ ETKİNLİK / VİDEO
  if (op === "etkinlikleriGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json([]);
    const { data } = await supabase.from("student_activities").select("*,activities(*)").eq("student_id", s.id).order("assigned_at", { ascending: false });
    return json((data || []).map((x: any) => ({ atandi: x.assigned_at || null, etkinlikKodu: x.activities?.code, gorunenAd: x.activities?.display_name, kategori: x.activities?.category, disLink: x.activities?.external_link, ogretmenYorumu: x.activities?.teacher_comment, siraNo: x.activities?.content?.siraNo, satirIndex: x.activities?.content?._sourceRow || x.activities?.content?.siraNo, yapildiMi: x.status === "completed", atanmaTarihi: x.assigned_at, ...(x.activities?.content || {}) })));
  }
  if (op === "etkinlikYapildiIsaretle") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    const idx = num(val(body, q, "satirIndex"));
    const { data: acts } = await supabase.from("activities").select("id,content").eq("active", true);
    const act = (acts || []).find((x: any) => Number(x.content?._sourceRow || x.content?.siraNo) === idx);
    // [YAMA 22] tabloda (student_id, activity_id) benzersizliği yok; upsert sessizce hata veriyordu
    if (act) {
      const { data: var_ } = await supabase.from("student_activities").select("id").eq("student_id", s.id).eq("activity_id", act.id).limit(1);
      if (var_ && var_.length) await supabase.from("student_activities").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", var_[0].id);
      else await supabase.from("student_activities").insert({ student_id: s.id, activity_id: act.id, status: "completed", completed_at: new Date().toISOString() });
    }
    return json({ status: "success" });
  }
  if (op === "etkinlikAta" || op === "disLinkEtkinlikAta") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const code = String(body.etkinlikKodu || ("external_" + Date.now()));
    let activity: any = null;
    if (op === "disLinkEtkinlikAta") {
      // [YAMA 23] var olmayan sütunlarla (target_type, target_value) upsert ediliyordu; dış link hiç atanamıyordu
      const r = await supabase.from("activities").upsert({ code, display_name: temizMetin(body.gorunenAd, 120) || code, category: temizMetin(body.kategori, 60), external_link: String(body.disLink || ""), teacher_comment: temizMetin(body.ogretmenYorumu, 500) }, { onConflict: "code" }).select().single();
      activity = r.data;
    } else {
      activity = (await supabase.from("activities").select("*").eq("code", code).maybeSingle()).data;
    }
    if (!activity) return json({ status: "error", message: "Etkinlik bulunamadı." });
    let n = 0;
    for (const name of arr(body.ogrenciAdiListesi)) {
      const s = await studentByName(String(name)); if (!s) continue;
      await supabase.from("student_activities").insert({ student_id: s.id, activity_id: activity.id, assigned_by: a.teacher_id, status: "assigned" }); n++;
    }
    return json({ status: "success", atanan: n });
  }
  if (op === "videolariGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json([]);
    const { data } = await supabase.from("student_videos").select("video_id,watched_at,videos(*)").eq("student_id", s.id);
    return json((data || []).map((x: any) => ({ satirIndex: x.videos?.external_row_index, baslik: x.videos?.title, kategori: x.videos?.category, link: x.videos?.url, izlendiMi: !!x.watched_at, ...(x.videos?.content || {}) })));
  }
  if (op === "videoIzlendiIsaretle") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    const v = (await supabase.from("videos").select("id").eq("external_row_index", num(val(body, q, "satirIndex"))).maybeSingle()).data;
    if (v) await supabase.from("student_videos").upsert({ student_id: s.id, video_id: v.id, watched_at: new Date().toISOString() }, { onConflict: "student_id,video_id" });
    return json({ status: "success" });
  }
  if (op === "videoOgrenciEkle") {
    const deny = await requireTeacher(a); if (deny) return deny;
    for (const name of arr(body.ogrenciAdiListesi)) { const s = await studentByName(String(name)); if (!s) continue; for (const idx of arr(body.satirIndexListesi)) { const v = (await supabase.from("videos").select("id").eq("external_row_index", num(idx)).maybeSingle()).data; if (v) await supabase.from("student_videos").upsert({ student_id: s.id, video_id: v.id }, { onConflict: "student_id,video_id" }); } }
    return json({ status: "success" });
  }

  // ============================================================ OKUMA
  if (op === "okumaHiziKaydet") {
    const name = String(body.ogrenci || ""); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    await supabase.from("reading_results").insert({ student_id: s.id, class_label: temizMetin(body.sinif, 20), words_read: Math.max(0, num(body.okunanKelime)), duration_seconds: Math.max(0, num(body.gecenSure)), wpm: Math.max(0, Math.min(400, num(body.wpm))), text_title: temizMetin(body.metinBasligi, 120) });
    return json({ status: "success" });
  }
  if (op === "okumaGecmisGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json([]);
    const { data } = await supabase.from("reading_results").select("*").eq("student_id", s.id).order("created_at", { ascending: false }).limit(100); return json(data || []);
  }

  // ============================================================ ÖĞRETMEN: RAPOR
  if (op === "raporVeriGetir") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const s = await studentByName(String(val(body, q, "ogrenci"))); if (!s) return json({});
    const { data } = await supabase.from("teacher_reports").select("*").eq("student_id", s.id).order("report_date", { ascending: false });
    return json({ ogrenci: s.username, raporlar: data || [], kitapBilgi: (s.profile || {}).kitapBilgi || {} });
  }
  if (op === "rubrikKaydet") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const s = await studentByName(String(val(body, q, "ogrenci"))); if (!s) return json({ status: "error" });
    await supabase.from("teacher_reports").insert({
      student_id: s.id, teacher_id: a.teacher_id, report_date: val(body, q, "tarih") || new Date().toISOString().slice(0, 10),
      next_report_date: val(body, q, "sonrakitarih") || null, book_name: val(body, q, "kitapadi"), page_no: num(val(body, q, "sayfa")),
      target: val(body, q, "hedef"), read_count: num(val(body, q, "okunansayisi")), last_attempt: bool(val(body, q, "sondeneme")),
      reading_score: num(val(body, q, "okuma")), writing_score: num(val(body, q, "yazma")), vocabulary_score: num(val(body, q, "vocab")),
      speaking_score: num(val(body, q, "konusma")), grammar_score: num(val(body, q, "grammar")),
      homework_feedback: val(body, q, "odevdonut"), next_homework: val(body, q, "sonrakiodev")
    });
    return json({ status: "success" });
  }
  if (op === "raporMail") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const metin = String(body.metin || ""), tel = String(body.telefon || "").replace(/\D/g, "").slice(-10);
    const { data: st } = await ogrFiltre(supabase.from("students").select("id,username,phone,email").eq("status", "approved"));
    let s: any = (st || []).find((x: any) => String(body.ogrenci || "") && encName(x.username) === encName(body.ogrenci));
    if (!s && tel.length === 10) s = (st || []).find((x: any) => String(x.phone || "").replace(/\D/g, "").slice(-10) === tel);
    if (!s) { const k = metin.toLocaleLowerCase("tr"); s = (st || []).filter((x: any) => x.username && x.username.length > 2 && k.includes(String(x.username).toLocaleLowerCase("tr"))).sort((x: any, y: any) => y.username.length - x.username.length)[0]; }
    if (!s) return json({ ok: false, mesaj: "Raporun öğrencisi bulunamadı" });
    if (!epostaGecerli(s.email)) return json({ ok: false, mesaj: s.username + " için veli e-postası kayıtlı değil", ogrenci: s.username });
    const html = mailKabugu("Gelişim Raporu", metniHtmlYap(metin));
    const on = new Date(Date.now() - 15 * 60000).toISOString();
    const { data: bekleyen } = await supabase.from("mail_queue").select("id").eq("student_id", s.id).eq("kind", "rapor").is("sent_at", null).gte("created_at", on).order("id", { ascending: false }).limit(1);
    if (bekleyen && bekleyen.length) await supabase.from("mail_queue").update({ html, text_body: metin, send_after: new Date().toISOString() }).eq("id", bekleyen[0].id);
    else await kuyrugaEkle({ student_id: s.id, to_email: String(s.email).trim(), kind: "rapor", subject: `Diji-Medu İngilizce Gelişim Raporu – ${s.username}`, html, text_body: metin });
    await audit(a, "raporMail", s.username, { uzunluk: metin.length });
    return json({ ok: true, status: "success", ogrenci: s.username, email: String(s.email).trim(), mesaj: "Rapor e-posta kuyruğunda, birkaç dakika içinde gider." });
  }
  if (op === "planTikGuncelle") {
    // [YAMA 25] Yıllık plan öğretmen işidir; öğrenci kendi planını işaretleyebiliyordu
    const deny = await requireTeacher(a); if (deny) return deny;
    const s = await studentByName(String(val(body, q, "ogrenci"))); if (!s) return bulunamadi();
    const code = String(val(body, q, "plankodu")); const week = num(val(body, q, "hafta"));
    let plan = (await supabase.from("annual_plans").select("*").eq("plan_code", code).maybeSingle()).data;
    if (!plan) plan = (await supabase.from("annual_plans").insert({ plan_code: code, title: code, total_weeks: week, plan_data: [] }).select().single()).data;
    await supabase.from("student_plan_progress").upsert({ student_id: s.id, plan_id: plan.id, week_no: week, completed: bool(val(body, q, "isaretli")), updated_at: new Date().toISOString() }, { onConflict: "student_id,plan_id,week_no" });
    return json({ status: "success" });
  }
  if (op === "ozellikIzniKaydet") {
    const deny = await requireTeacher(a); if (deny) return deny;
    if (yoneticiOlmayan(a)) {   /* sınıf/şube geneli izinler herkesi etkiler: sadece yönetici; öğretmen kendi öğrencisine özel izin verebilir */
      if (String(body.hedefTipi) !== "ogrenci") return json({ status: "error", message: "Sınıf ve şube geneli izinleri sadece yönetici değiştirebilir. Öğrencine özel izin verebilirsin." }, 403);
      if (!(await studentByName(String(body.hedefDegeri || "")))) return json({ status: "error", message: "Bu öğrenci sana kayıtlı değil." }, 403);
    }
    await supabase.from("feature_flags").upsert({ code: body.ozellikKodu, name: body.ozellikKodu, target_type: body.hedefTipi, target_value: body.hedefDegeri || "", enabled: bool(body.durum), updated_at: new Date().toISOString() }, { onConflict: "code,target_type,target_value" });
    return json({ status: "success" });
  }

  // ============================================================ MESAJLAŞMA
  if (op === "sohbetGetir") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json([]);
    const { data } = await supabase.from("chat_messages").select("*").eq("student_id", s.id).order("created_at"); return json(data || []);
  }
  if (op === "sohbetMesajGonder") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    const mesaj = temizMetin(val(body, q, "mesaj"), 1000); if (!mesaj) return json({ status: "error", message: "Boş mesaj." });
    const { count } = await supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("student_id", s.id).gte("created_at", new Date(Date.now() - 86400000).toISOString());
    if ((count || 0) >= 50) return json({ status: "limit_doldu", limit: 50 });
    await supabase.from("chat_messages").insert({ student_id: s.id, sender_role: "student", message: mesaj });
    try {
      const { data: yakin } = await supabase.from("mail_queue").select("id").eq("student_id", s.id).eq("kind", "mesaj").gte("created_at", new Date(Date.now() - 30 * 60000).toISOString()).limit(1);
      if (!yakin || !yakin.length) for (const e of await sorumluEpostalar(s)) await kuyrugaEkle({ student_id: s.id, to_email: e, kind: "mesaj", subject: `💬 ${s.username} sana mesaj gönderdi`,
        html: mailKabugu("Yeni Öğrenci Mesajı", `<p><b>${hk(s.username)}</b> portaldan mesaj gönderdi:</p><blockquote style="margin:10px 0;padding:10px 14px;background:#faf7ff;border-left:4px solid #7c3aed;border-radius:8px">${metniHtmlYap(mesaj)}</blockquote><p>Cevaplamak için portalda <b>Öğretmen Paneli → Mesajlar</b> bölümüne gir. (Aynı öğrenciden 30 dakika içinde gelen diğer mesajlar için ayrıca e-posta gönderilmez.)</p>`) });
    } catch (e) { console.error("mesaj e-postası", e); }
    return json({ status: "success" });
  }
  if (op === "ogretmenSohbetListesi") {
    const deny = await requireTeacher(a); if (deny) return deny;
    const { data } = await supabase.from("chat_messages").select("student_id,created_at,message,sender_role,read_at,students(username)").order("created_at", { ascending: false }).limit(500);
    const map = new Map<string, any>(), okunmamis = new Map<string, number>();
    for (const m of data || []) { if (!map.has(m.student_id)) map.set(m.student_id, m); if (m.sender_role === "student" && !m.read_at) okunmamis.set(m.student_id, (okunmamis.get(m.student_id) || 0) + 1); }
    return json([...map.values()].map((x: any) => ({ ogrenci: x.students?.username, mesaj: x.message, tarih: x.created_at, okunmamis: okunmamis.get(x.student_id) || 0 })));
  }
  if (op === "ogretmenSohbetAc") {
    const deny = await requireTeacher(a); if (deny) return deny; const s = await studentByName(String(val(body, q, "ogrenci"))); if (!s) return json([]);
    const { data } = await supabase.from("chat_messages").select("*").eq("student_id", s.id).order("created_at");
    await supabase.from("chat_messages").update({ read_at: new Date().toISOString() }).eq("student_id", s.id).eq("sender_role", "student").is("read_at", null);
    return json(data || []);
  }
  if (op === "ogretmenCevapGonder") {
    const deny = await requireTeacher(a); if (deny) return deny; const s = await studentByName(String(val(body, q, "ogrenci"))); if (!s) return json({ status: "error" });
    await supabase.from("chat_messages").insert({ student_id: s.id, sender_role: "teacher", message: temizMetin(val(body, q, "mesaj"), 2000) }); return json({ status: "success" });
  }

  // ============================================================ DÜELLO (eski basit sürüm; yeni Düello Arenası 4. aşamada)
  if (op === "duellolarim") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return json({ liste: [] });
    const { data } = await supabase.from("duels").select("*,sender:students!duels_sender_student_id_fkey(username),receiver:students!duels_receiver_student_id_fkey(username)").or("sender_student_id.eq." + s.id + ",receiver_student_id.eq." + s.id).order("created_at", { ascending: false }).limit(50);
    return json({ liste: (data || []).map((x: any) => ({ id: x.id, gonderen: x.sender?.username || "", alici: x.receiver?.username || "", durum: x.status === "accepted" ? "kabul" : x.status === "rejected" ? "red" : "bekliyor", oyun: x.sender_payload?.oyun || "", kazanan: x.receiver_payload?.kazanan || x.sender_payload?.kazanan || "", benPuan: x.sender_payload?.benPuan ?? null, rakipPuan: x.sender_payload?.rakipPuan ?? null, kalanDk: Math.max(0, 1440 - Math.round((Date.now() - new Date(x.created_at).getTime()) / 60000)) })) });
  }
  if (op === "duelloGonder") {
    const g = String(val(body, q, "gonderen")), al = String(val(body, q, "alici")); const deny = await requireStudent(a, g); if (deny) return deny;
    const gs = await hedefOgrenci(a, g), as = await studentByName(al); if (!gs || !as) return json({ status: "error" });
    // [YAMA 26] kendine düello yok, günde en fazla 5 düello
    if (gs.id === as.id) return json({ status: "error", message: "Kendinle düello yapamazsın. 😄" });
    const { count } = await supabase.from("duels").select("id", { count: "exact", head: true }).eq("sender_student_id", gs.id).gte("created_at", bugunBasi());
    if ((count || 0) >= 5) return json({ status: "error", message: "Bugün 5 düello gönderdin. Yarın yine gel! ⚔️" });
    const oyun = temizMetin(val(body, q, "oyun"), 40);
    await supabase.from("duels").insert({ sender_student_id: gs.id, receiver_student_id: as.id, sender_payload: { oyun } });
    await supabase.from("feed_events").insert({ student_id: gs.id, target_student_id: as.id, event_type: "duel_invite", payload: { game_name: oyun, student_name: gs.username, target_name: as.username, icon: "⚔️" } });
    return json({ status: "success" });
  }
  if (op === "duelloYanit") {
    const name = String(val(body, q, "ogrenci")); const deny = await requireStudent(a, name); if (deny) return deny;
    const s = await hedefOgrenci(a, name); if (!s) return bulunamadi();
    await supabase.from("duels").update({ status: bool(val(body, q, "kabul")) ? "accepted" : "rejected", responded_at: new Date().toISOString() }).eq("id", val(body, q, "id")).eq("receiver_student_id", s.id); return json({ status: "success" });
  }

  // ============================================================ SINIF İÇİ PUAN
  if (op === "sinifIciPuanVer") {
    const deny = await requireTeacher(a); if (deny) return deny; const list = arr(body.ogrenciler), applied: any[] = [], skipped: any[] = [];
    for (const name of list) { const s = await studentByName(String(name)); if (!s) continue; const next = Math.max(0, Math.min(100, Number(s.points || 0) + num(body.degisim))); if (next === Number(s.points || 0)) { skipped.push(s.username); continue; } await supabase.from("students").update({ points: next }).eq("id", s.id); await supabase.from("points_transactions").insert({ student_id: s.id, change_amount: next - Number(s.points || 0), balance_after: next, reason: temizMetin(body.sebep, 120) || "Sınıf içi puan" }); applied.push(s.username); }
    const action = await supabase.from("class_point_actions").insert({ teacher_id: a.teacher_id, student_ids: applied, change_amount: num(body.degisim), reason: body.sebep || "" }).select().single();
    return json({ status: "success", uygulanan: applied, atlanan: skipped, zamanDamgasi: action.data?.action_at || new Date().toISOString() });
  }
  if (op === "sinifIciGeriAl") {
    const deny = await requireTeacher(a); if (deny) return deny;
    // [YAMA 27] .eq("undone_at", null) hiçbir satırla eşleşmez; geri alma hiç çalışmıyordu
    const ts = String(body.zamanDamgasi || "");
    const { data: action } = await supabase.from("class_point_actions").select("*").eq("action_at", ts).is("undone_at", null).maybeSingle();
    if (!action) return json({ status: "error", message: "Geri alınacak işlem bulunamadı." });
    if (yoneticiOlmayan(a) && action.teacher_id !== a.teacher_id) return json({ status: "error", message: "Bu işlem başka bir öğretmene ait." }, 403);
    for (const name of arr(action.student_ids)) { const s = await studentByName(String(name)); if (s) await supabase.from("students").update({ points: Math.max(0, Number(s.points || 0) - Number(action.change_amount || 0)) }).eq("id", s.id); }
    await supabase.from("class_point_actions").update({ undone_at: new Date().toISOString() }).eq("id", action.id);
    return json({ status: "success" });
  }

  return json({ status: "error", message: "Bilinmeyen işlem: " + op }, 404);
}

Deno.serve(async (req) => {
  try { return await handle(req); }
  catch (e) { console.error(e); return json({ status: "error", ok: false, mesaj: "Sunucu hatası, tekrar dene.", message: "Sunucu hatası" }, 500); }
});
