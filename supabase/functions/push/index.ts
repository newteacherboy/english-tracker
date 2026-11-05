// Anlık bildirimler: Android (FCM HTTP v1) ve iPhone (APNs, doğrudan Apple).
//  - Öğrenci oturumu: register / unregister (cihaz jetonu)
//  - Yönetici oturumu ('teacher' kullanıcı adlı yönetici): adminStats / adminSend
// Gizli değerler: FCM_SERVICE_ACCOUNT (Firebase > Proje ayarları > Hizmet hesapları > yeni özel anahtar, JSON)
//   APNS_KEY_P8 (.p8 içeriği; Apple Developer > Keys > "Diji Medu Push"). Key ID 8W84J5T9X6 ve Team ID S6VSP7F35Q gizli değil, kodda varsayılan.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { cleanText, validToken, fcmMessage, deadToken, apnsMessage, apnsDead, IOS_TOPIC } from './rules.mjs';

const key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const db = createClient(Deno.env.get('SUPABASE_URL')!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,x-diji-token', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

const b64url = (v: string | ArrayBuffer) => {
  const bytes = typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(v);
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
let cached: { value: string; until: number; project: string } | null = null;
async function fcmAuth() {
  if (cached && cached.until > Date.now() + 60000) return cached;
  const sa = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT') || 'null');
  if (!sa?.client_email || !sa?.private_key || !sa?.project_id) throw Error('fcm_not_configured');
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const k = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', k, new TextEncoder().encode(head + '.' + body));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + body + '.' + b64url(sig) }), signal: AbortSignal.timeout(10000) });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw Error('fcm_auth_failed');
  cached = { value: j.access_token, until: Date.now() + Number(j.expires_in || 3600) * 1000, project: sa.project_id };
  return cached;
}

// APNs sağlayıcı jetonu (ES256, en fazla saatte bir yenilenir; Apple 20-60 dk arası öneriyor).
let apnsCached: { value: string; until: number } | null = null;
async function apnsAuth() {
  if (apnsCached && apnsCached.until > Date.now()) return apnsCached.value;
  const p8 = Deno.env.get('APNS_KEY_P8') || '', kid = Deno.env.get('APNS_KEY_ID') || '8W84J5T9X6', team = Deno.env.get('APNS_TEAM_ID') || 'S6VSP7F35Q';
  if (!p8) throw Error('apns_not_configured');
  const der = Uint8Array.from(atob(p8.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
  const k = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64url(JSON.stringify({ alg: 'ES256', kid })), body = b64url(JSON.stringify({ iss: team, iat: Math.floor(Date.now() / 1000) }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, new TextEncoder().encode(head + '.' + body));
  apnsCached = { value: head + '.' + body + '.' + b64url(sig), until: Date.now() + 40 * 60000 };
  return apnsCached.value;
}

async function session(req: Request) {
  const token = req.headers.get('x-diji-token') || '';
  if (token.length < 16 || token.length > 1024) return null;
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const { data } = await db.from('portal_sessions').select('student_id,teacher_id,role,expires_at,teacher_portal_access_id').eq('token_hash', hash).maybeSingle();
  if (!data || !Number.isFinite(Date.parse(data.expires_at)) || Date.parse(data.expires_at) <= Date.now()) return null;
  return data;
}
async function isAdmin(s: any) {
  if (!s || s.role !== 'teacher' || !s.teacher_id) return null;
  const { data: t } = await db.from('teachers').select('username,is_admin,active,frozen_at').eq('id', s.teacher_id).maybeSingle();
  return t && t.is_admin && t.active && !t.frozen_at && String(t.username).toLowerCase() === 'teacher' ? t : null;
}

type Device = { token: string; platform: string };
async function sendAll(devices: Device[], msg: { title: string; body: string; tab?: string }) {
  let sent = 0, failed = 0, missing = 0; const dead: string[] = [];
  const android = devices.filter(d => d.platform !== 'ios').map(d => d.token), ios = devices.filter(d => d.platform === 'ios').map(d => d.token);
  // Bir platformun anahtarı eksikse diğeri yine gönderilir.
  let auth: { value: string; project: string } | null = null;
  if (android.length) { try { auth = await fcmAuth(); } catch { missing += android.length; } }
  let apns = '';
  if (ios.length) { try { apns = await apnsAuth(); } catch { missing += ios.length; } }
  if (!auth && !apns) throw Error(android.length ? 'fcm_not_configured' : 'apns_not_configured');
  const iosBody = JSON.stringify(apnsMessage(msg));
  for (let i = 0; apns && i < ios.length; i += 20) {
    await Promise.all(ios.slice(i, i + 20).map(async t => {
      try {
        const r = await fetch('https://api.push.apple.com/3/device/' + t, { method: 'POST', headers: { authorization: 'bearer ' + apns, 'apns-topic': IOS_TOPIC, 'apns-push-type': 'alert', 'apns-priority': '10' }, body: iosBody, signal: AbortSignal.timeout(10000) });
        if (r.ok) { sent++; return; }
        const j = await r.json().catch(() => ({}));
        failed++; if (apnsDead(r.status, j)) dead.push(t);
      } catch { failed++; }
    }));
  }
  const tokens = auth ? android : [];
  const url = auth ? `https://fcm.googleapis.com/v1/projects/${auth.project}/messages:send` : '';
  for (let i = 0; i < tokens.length; i += 20) {
    await Promise.all(tokens.slice(i, i + 20).map(async t => {
      try {
        const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + auth!.value, 'Content-Type': 'application/json' }, body: JSON.stringify(fcmMessage(t, msg)), signal: AbortSignal.timeout(10000) });
        if (r.ok) { sent++; return; }
        const j = await r.json().catch(() => ({}));
        failed++; if (deadToken(r.status, j)) dead.push(t);
      } catch { failed++; }
    }));
  }
  if (dead.length) await db.from('dm_push_tokens').delete().in('token', dead);
  return { sent, failed: failed + missing, removed: dead.length };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  let body: any;
  try { const raw = await req.text(); if (raw.length > 8192) return reply({ error: 'Request too large' }, 413); body = JSON.parse(raw); } catch { return reply({ error: 'Invalid request' }, 400); }
  if (!body || typeof body !== 'object') return reply({ error: 'Invalid request' }, 400);
  const s = await session(req);
  if (!s) return reply({ ok: false, mesaj: 'Oturum gerekli.' }, 401);

  if (body.action === 'register' || body.action === 'unregister') {
    if (s.role !== 'student' || !s.student_id || s.teacher_portal_access_id) return reply({ ok: false, mesaj: 'Öğrenci oturumu gerekli.' }, 401);
    if (!validToken(body.token)) return reply({ ok: false, mesaj: 'Geçersiz jeton.' }, 400);
    if (body.action === 'unregister') { await db.from('dm_push_tokens').delete().eq('token', body.token).eq('student_id', s.student_id); return reply({ ok: true }); }
    const { error } = await db.from('dm_push_tokens').upsert({ token: body.token, student_id: s.student_id, platform: body.platform === 'ios' ? 'ios' : 'android', updated_at: new Date().toISOString(), last_error: null }, { onConflict: 'token' });
    return error ? reply({ ok: false, mesaj: 'Kaydedilemedi.' }, 503) : reply({ ok: true });
  }

  const admin = await isAdmin(s);
  if (!admin) return reply({ ok: false, mesaj: 'Bu işlem yalnız yönetici hesabına açık.' }, 403);
  if (body.action === 'adminStats') {
    const { data: all } = await db.from('dm_push_tokens').select('student_id,platform').limit(20000);
    const count = all?.length || 0, students = new Set((all || []).map(r => r.student_id)).size, iosDevices = (all || []).filter(r => r.platform === 'ios').length;
    const { data: log } = await db.from('dm_push_log').select('created_at,target,title,sent,failed').order('id', { ascending: false }).limit(10);
    return reply({ ok: true, devices: count || 0, students: students || 0, configured: !!Deno.env.get('FCM_SERVICE_ACCOUNT'), iosDevices, iosConfigured: !!Deno.env.get('APNS_KEY_P8'), log: log || [] });
  }
  if (body.action === 'adminSend') {
    const title = cleanText(body.title, 60), text = cleanText(body.body, 200), tab = cleanText(body.tab, 20);
    if (!title || !text) return reply({ ok: false, mesaj: 'Başlık ve metin gerekli.' }, 400);
    let q = db.from('dm_push_tokens').select('token,platform');
    let target = 'all';
    if (body.target === 'user') {
      const username = cleanText(body.username, 80);
      const { data: st } = await db.from('students').select('id').ilike('username', username.replace(/[\\%_]/g, '\\$&')).maybeSingle();
      if (!st) return reply({ ok: false, mesaj: 'Öğrenci bulunamadı.' }, 404);
      q = q.eq('student_id', st.id); target = 'user:' + username;
    }
    const { data: rows, error } = await q.limit(20000);
    if (error) return reply({ ok: false, mesaj: 'Liste okunamadı.' }, 503);
    const tokens = (rows || []) as Device[];
    if (!tokens.length) return reply({ ok: false, mesaj: target === 'all' ? 'Henüz bildirime izin veren cihaz yok.' : 'Bu öğrencinin bildirime izin veren cihazı yok.' }, 404);
    let result;
    try { result = await sendAll(tokens, { title, body: text, tab }); }
    catch (e) { return reply({ ok: false, mesaj: String((e as Error).message) === 'fcm_not_configured' ? 'Firebase anahtarı (FCM_SERVICE_ACCOUNT) henüz eklenmedi.' : String((e as Error).message) === 'apns_not_configured' ? 'Apple bildirim anahtarı (APNS_KEY_P8) henüz eklenmedi.' : 'Bildirim servisi şu an yanıt vermiyor.' }, 503); }
    await db.from('dm_push_log').insert({ sent_by: admin.username, target, title, body: text, ...result });
    return reply({ ok: true, ...result });
  }
  return reply({ ok: false, mesaj: 'Geçersiz işlem.' }, 400);
});
