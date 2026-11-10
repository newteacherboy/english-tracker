// Diji Medu abonelikleri (Google Play ve App Store). Plan yalnızca mağazadan doğrulanan satın almadan doğar.
//   POST {action:'status'}                       → plan, sınırlar, ürünler, hesap referansı
//   POST {action:'verify', productId, purchaseToken} → Google'dan doğrula, onayla (acknowledge), hakkı yaz
//   POST /rtdn?secret=…                            → Play gerçek zamanlı bildirimleri (yenileme, iptal, iade)
//   POST {action:'verifyApple', signedTransaction}  → StoreKit 2 imzalı işlemi Apple zinciriyle doğrula, hakkı yaz
//   POST /apple                                    → App Store Server Notifications V2 (imzalı; gizli değer gerekmez)
// Gizli değer: GOOGLE_PLAY_SERVICE_ACCOUNT (JSON). İsteğe bağlı: PLAY_RTDN_SECRET.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { PACKAGE_NAME, PRODUCTS, productsFor, accountRef, tokenKey, interpret, serviceJwt, parseRtdn } from './play.mjs';
import { AD_DEFAULTS, normalizeAdSettings } from './ad-settings.mjs';
import { verifyAppleJws, interpretApple, appleTokenFor } from './apple.mjs';

const key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const db = createClient(Deno.env.get('SUPABASE_URL')!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,x-diji-token', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

const TEACHER_LIMITS: Record<string, unknown> = {
  free: { plan: 'free', classes: 1, students: 40, activeHomework: 2, liveContestsPerMonth: 4, reports: false, parentReport: null, giftPro: 0, adminContact: false },
  pro: { plan: 'pro', classes: 5, students: 200, activeHomework: null, liveContestsPerMonth: null, reports: true, parentReport: 'monthly', giftPro: 0, adminContact: false },
  premium_pro: { plan: 'premium_pro', classes: null, students: 500, activeHomework: null, liveContestsPerMonth: null, reports: true, parentReport: 'weekly', giftPro: 3, adminContact: true },
};

let cachedToken: { value: string; until: number } | null = null;
async function googleToken() {
  if (cachedToken && cachedToken.until > Date.now() + 60000) return cachedToken.value;
  const sa = JSON.parse(Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT') || 'null');
  const r = await fetch(sa?.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: await serviceJwt(sa) }),
    signal: AbortSignal.timeout(10000),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw Error('google_auth_failed');
  cachedToken = { value: j.access_token, until: Date.now() + Number(j.expires_in || 3600) * 1000 };
  return cachedToken.value;
}
const api = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PACKAGE_NAME;
async function fetchSubscription(purchaseToken: string) {
  const r = await fetch(api + '/purchases/subscriptionsv2/tokens/' + encodeURIComponent(purchaseToken), { headers: { Authorization: 'Bearer ' + await googleToken() }, signal: AbortSignal.timeout(10000) });
  if (r.status === 404 || r.status === 410) return null;
  if (!r.ok) throw Error('google_unavailable');
  return await r.json();
}
async function acknowledge(productId: string, purchaseToken: string) {
  const r = await fetch(api + '/purchases/subscriptions/' + productId + '/tokens/' + encodeURIComponent(purchaseToken) + ':acknowledge',
    { method: 'POST', headers: { Authorization: 'Bearer ' + await googleToken(), 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10000) });
  if (!r.ok && r.status !== 400) throw Error('google_ack_failed'); // 400: zaten onaylanmış.
}

async function session(req: Request) {
  const token = req.headers.get('x-diji-token') || '';
  if (token.length < 16 || token.length > 1024) return null;
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const { data: s, error } = await db.from('portal_sessions').select('student_id,teacher_id,role,expires_at,teacher_portal_access_id').eq('token_hash', hash).maybeSingle();
  if (error) throw Error('session_unavailable');
  if (!s || !Number.isFinite(Date.parse(s.expires_at)) || Date.parse(s.expires_at) <= Date.now()) return null;
  if (s.role === 'student' && s.student_id && !s.teacher_portal_access_id) {
    const { data: st } = await db.from('students').select('id,username,status,role,frozen_at,profile').eq('id', s.student_id).maybeSingle();
    if (!st || st.status !== 'approved' || st.role !== 'student' || st.frozen_at) return null;
    const guest = st.username === 'dijimedu_demo' || st.profile?.teacher_portal_guest === true || String(st.profile?.teacher_portal_guest) === 'true' || / · (Misafir|Öğretmen Denemesi) [a-f0-9]{8}$/.test(st.username || '');
    // Demo hesap (App Store / Play inceleme ekibi) yalnız test (sandbox) ödemeleriyle satın alabilir; gerçek ödeme reddedilir.
    const demo = st.username === 'dijimedu_demo';
    return { role: 'student', id: st.id as string, canBuy: !guest || demo, sandboxOnly: demo };
  }
  if (s.role === 'teacher' && s.teacher_id) return { role: 'teacher', id: s.teacher_id as string, canBuy: true };
  return null;
}

async function status(acct: { role: string; id: string; canBuy: boolean }) {
  const { data: plan, error } = await db.rpc('dm_plan', { actor: acct.id, account_role: acct.role });
  if (error) throw Error('plan_unavailable');
  const limits = acct.role === 'student' ? (await db.rpc('dm_plan_limits', { plan })).data : TEACHER_LIMITS[plan] || TEACHER_LIMITS.free;
  const { data: ent } = await db.from('dm_entitlements').select('product_key,valid_until,provider').eq('account_id', acct.id).eq('account_role', acct.role).eq('state', 'active');
  return { ok: true, role: acct.role, plan, limits, canBuy: acct.canBuy, accountRef: acct.canBuy ? await accountRef(acct.role, acct.id) : null, products: productsFor(acct.role), entitlements: ent || [] };
}

// Google'dan gelen durumu deftere yazar. account verilmezse (bildirim) mevcut kayıttan bulunur.
async function record(purchaseToken: string, sub: any, account?: { role: string; id: string }) {
  const info = interpret(sub);
  if (info.state === 'invalid') return { ok: false, reason: 'unknown_product' };
  const ref = await tokenKey(purchaseToken);
  const { data: existing } = await db.from('dm_payment_transactions').select('id,account_id,account_role').eq('provider', 'google').eq('provider_transaction_id', ref).maybeSingle();
  const owner = account || (existing?.account_id ? { role: existing.account_role, id: existing.account_id } : null);
  if (!owner) return { ok: false, reason: 'unknown_purchase' };
  if (PRODUCTS[info.productId!].role !== owner.role) return { ok: false, reason: 'wrong_role' };
  if (info.accountRef && info.accountRef !== await accountRef(owner.role, owner.id)) return { ok: false, reason: 'other_account' };
  const row = { account_id: owner.id, account_role: owner.role, provider: 'google', provider_transaction_id: ref, product_key: info.productId, state: info.state,
    verified_at: info.state === 'verified' ? new Date().toISOString() : null, valid_until: info.validUntil };
  const { data: tx, error } = await db.from('dm_payment_transactions').upsert(row, { onConflict: 'provider,provider_transaction_id' }).select('id').single();
  if (error) throw Error('ledger_unavailable');
  if (info.state === 'verified') {
    const { error: e2 } = await db.from('dm_entitlements').upsert({ account_id: owner.id, account_role: owner.role, product_key: info.productId, provider: 'google', transaction_id: tx.id, state: 'active', valid_until: info.validUntil, updated_at: new Date().toISOString() }, { onConflict: 'account_id,account_role,product_key' });
    if (e2) throw Error('entitlement_unavailable');
    if (info.needsAck) await acknowledge(info.productId!, purchaseToken);
  }
  // Yükseltme/düşürmede eski satın alma kapanır.
  if (info.linkedToken) await db.from('dm_payment_transactions').update({ state: 'expired' }).eq('provider', 'google').eq('provider_transaction_id', await tokenKey(info.linkedToken)).eq('account_id', owner.id);
  return { ok: true, state: info.state, productId: info.productId, validUntil: info.validUntil, test: info.test };
}

// App Store işlemini deftere yazar. Abonelik zinciri originalTransactionId ile tek satırdır (yenileme, yükseltme aynı satır).
async function recordApple(tx: any, account?: { role: string; id: string }) {
  const info = interpretApple(tx);
  if (info.state === 'invalid') return { ok: false, reason: 'unknown_product' };
  const ref = 'apple:' + info.originalTransactionId;
  const { data: existing } = await db.from('dm_payment_transactions').select('id,account_id,account_role').eq('provider', 'apple').eq('provider_transaction_id', ref).maybeSingle();
  const owner = account || (existing?.account_id ? { role: existing.account_role, id: existing.account_id } : null);
  if (!owner) return { ok: false, reason: 'unknown_purchase' };
  if (existing?.account_id && account && (existing.account_id !== account.id || existing.account_role !== account.role)) return { ok: false, reason: 'other_account' };
  if (PRODUCTS[info.productId!].role !== owner.role) return { ok: false, reason: 'wrong_role' };
  if (info.appAccountToken && info.appAccountToken !== await appleTokenFor(owner.role, owner.id)) return { ok: false, reason: 'other_account' };
  const row = { account_id: owner.id, account_role: owner.role, provider: 'apple', provider_transaction_id: ref, product_key: info.productId, state: info.state,
    verified_at: info.state === 'verified' ? new Date().toISOString() : null, valid_until: info.validUntil };
  const { data: saved, error } = await db.from('dm_payment_transactions').upsert(row, { onConflict: 'provider,provider_transaction_id' }).select('id').single();
  if (error) throw Error('ledger_unavailable');
  // Aynı abonelik zincirindeki başka ürün (Pro → Premium Pro yükseltmesi) kapanır.
  await db.from('dm_entitlements').update({ state: 'expired', updated_at: new Date().toISOString() }).eq('provider', 'apple').eq('transaction_id', saved.id).neq('product_key', info.productId);
  const ent = { account_id: owner.id, account_role: owner.role, product_key: info.productId, provider: 'apple', transaction_id: saved.id,
    state: info.state === 'verified' ? 'active' : info.state === 'revoked' ? 'revoked' : 'expired', valid_until: info.validUntil, updated_at: new Date().toISOString() };
  const { error: e2 } = await db.from('dm_entitlements').upsert(ent, { onConflict: 'account_id,account_role,product_key' });
  if (e2) throw Error('entitlement_unavailable');
  return { ok: true, state: info.state, productId: info.productId, validUntil: info.validUntil, test: info.test };
}

// Yönetici paneli: hediye üyelik verme/geri alma ve yeni öğretmenlere otomatik hediye anahtarı.
async function admin(acct: { role: string; id: string }, body: any): Promise<[unknown, number]> {
  if (acct.role !== 'teacher') return [{ ok: false, mesaj: 'Yönetici oturumu gerekli.' }, 403];
  const { data: t } = await db.from('teachers').select('username,is_admin,active,frozen_at').eq('id', acct.id).maybeSingle();
  if (!t || !t.is_admin || !t.active || t.frozen_at || String(t.username).toLowerCase() !== 'teacher') return [{ ok: false, mesaj: 'Bu işlem yalnız yönetici hesabına açık.' }, 403];
  const products = ['teacher_premium_pro', 'teacher_pro', 'diji_premium_pro', 'diji_pro'];
  const campaign = typeof body.campaign === 'string' && /^[a-z0-9-]{3,40}$/.test(body.campaign) ? body.campaign : 'ogretmenler-gunu-2026';
  const months = Math.max(1, Math.min(24, Math.floor(Number(body.months) || 6)));
  const fail = (e: any) => [{ ok: false, mesaj: e?.code === 'P0001' ? e.message : 'İşlem tamamlanamadı.' }, 400] as [unknown, number];
  if (body.action === 'adminList') {
    const { data, error } = await db.rpc('dm_gift_list'); if (error) return fail(error); return [{ ok: true, ...data }, 200];
  }
  if (body.action === 'adminGift' || body.action === 'adminRevoke') {
    const username = String(body.username || '').trim();
    if (!username || username.length > 80 || !products.includes(body.product)) return [{ ok: false, mesaj: 'Kullanıcı adı ve ürün gerekli.' }, 400];
    const { data, error } = body.action === 'adminGift'
      ? await db.rpc('dm_gift_plan', { p_username: username, p_product: body.product, p_months: months, p_campaign: campaign })
      : await db.rpc('dm_gift_revoke', { p_username: username, p_product: body.product });
    if (error) return fail(error);
    const { data: list } = await db.rpc('dm_gift_list');
    return [{ ok: true, result: data, ...(list || {}) }, 200];
  }
  if (body.action === 'adminAuto') {
    const row = { key: 'new_teachers', enabled: body.enabled === true, product_key: products.includes(body.product) ? body.product : 'teacher_premium_pro', months, campaign, updated_at: new Date().toISOString() };
    const { error } = await db.from('dm_gift_settings').upsert(row, { onConflict: 'key' }); if (error) return fail(error);
    const { data: list } = await db.rpc('dm_gift_list');
    return [{ ok: true, ...(list || {}) }, 200];
  }
  // Android reklam ayarları ve tek tuşla kapatma anahtarı (uygulama açılışta okur).
  if (body.action === 'adminAdsGet' || body.action === 'adminAdsSet') {
    if (body.action === 'adminAdsSet') {
      const settings = normalizeAdSettings(body.settings);
      const { error } = await db.from('dm_ad_settings').upsert({ key: 'android', settings, updated_at: new Date().toISOString(), updated_by: t.username }, { onConflict: 'key' });
      if (error) return fail(error);
    }
    const { data, error } = await db.from('dm_ad_settings').select('settings,updated_at').eq('key', 'android').maybeSingle();
    if (error) return fail(error);
    return [{ ok: true, settings: normalizeAdSettings(data?.settings), defaults: AD_DEFAULTS, updatedAt: data?.updated_at || null }, 200];
  }
  return [{ ok: false, mesaj: 'Geçersiz işlem.' }, 400];
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const url = new URL(req.url);
  try {
    if (url.pathname.endsWith('/rtdn')) {
      // Bildirim yalnızca bir token'ı yeniden sorgulatır; durum her zaman Google'dan okunur, gövdeye güvenilmez.
      // PLAY_RTDN_SECRET tanımlıysa ek olarak ?secret= de istenir.
      const secret = Deno.env.get('PLAY_RTDN_SECRET') || '';
      if (secret && url.searchParams.get('secret') !== secret) return reply({ error: 'forbidden' }, 403);
      const n = parseRtdn(await req.json().catch(() => null));
      if (!n?.purchaseToken) return reply({ ok: true, ignored: true });
      if (n.eventId) {
        const { error } = await db.from('dm_payment_events').insert({ provider: 'google', event_id: n.eventId });
        if (error?.code === '23505') return reply({ ok: true, duplicate: true });
      }
      const sub = await fetchSubscription(n.purchaseToken);
      const result = sub ? await record(n.purchaseToken, sub) : { ok: true, gone: true };
      if (n.eventId) await db.from('dm_payment_events').update({ processed_at: new Date().toISOString() }).eq('provider', 'google').eq('event_id', n.eventId);
      return reply(result);
    }
    if (url.pathname.endsWith('/apple')) {
      // Apple bildirimi kendi imzasını taşır: yük ve içindeki işlem ayrı ayrı doğrulanır.
      const raw = await req.text();
      if (raw.length > 60000) return reply({ error: 'Request too large' }, 413);
      let note: any;
      try { note = await verifyAppleJws(JSON.parse(raw).signedPayload); } catch { return reply({ error: 'invalid_signature' }, 400); }
      const id = String(note.notificationUUID || '');
      if (id) {
        const { error } = await db.from('dm_payment_events').insert({ provider: 'apple', event_id: id });
        if (error?.code === '23505') return reply({ ok: true, duplicate: true });
      }
      let result: unknown = { ok: true, ignored: true };
      if (note.data?.signedTransactionInfo) result = await recordApple(await verifyAppleJws(note.data.signedTransactionInfo));
      if (id) await db.from('dm_payment_events').update({ processed_at: new Date().toISOString() }).eq('provider', 'apple').eq('event_id', id);
      return reply(result);
    }
    const raw = await req.text();
    if (raw.length > 32768) return reply({ error: 'Request too large' }, 413);
    let body: any; try { body = JSON.parse(raw || '{}'); } catch { return reply({ error: 'Invalid request' }, 400); }
    const acct = await session(req);
    if (!acct) return reply({ ok: false, mesaj: 'Giriş yapmalısın.' }, 401);
    if (body.action === 'status') return reply(await status(acct));
    if (typeof body.action === 'string' && body.action.startsWith('admin')) return reply(...await admin(acct, body));
    if (body.action === 'verify') {
      if (!acct.canBuy) return reply({ ok: false, mesaj: 'Bu hesapla satın alma yapılamaz.' }, 403);
      const productId = String(body.productId || ''), purchaseToken = String(body.purchaseToken || '');
      if (!PRODUCTS[productId] || PRODUCTS[productId].role !== acct.role || purchaseToken.length < 20 || purchaseToken.length > 4096) return reply({ ok: false, mesaj: 'Geçersiz satın alma.' }, 400);
      const sub = await fetchSubscription(purchaseToken);
      if (!sub) return reply({ ok: false, mesaj: 'Satın alma Google Play\'de bulunamadı.' }, 404);
      if ((acct as any).sandboxOnly && !sub.testPurchase) return reply({ ok: false, mesaj: 'Demo hesapla yalnız test ödemesi yapılabilir.' }, 403);
      const result = await record(purchaseToken, sub, acct);
      if (!result.ok) return reply({ ok: false, mesaj: result.reason === 'other_account' ? 'Bu satın alma başka bir Diji Medu hesabına ait.' : 'Satın alma doğrulanamadı.', reason: result.reason }, 409);
      return reply({ ...result, ...(await status(acct)) });
    }
    if (body.action === 'verifyApple') {
      if (!acct.canBuy) return reply({ ok: false, mesaj: 'Bu hesapla satın alma yapılamaz.' }, 403);
      let tx;
      try { tx = await verifyAppleJws(String(body.signedTransaction || '')); }
      catch { return reply({ ok: false, mesaj: 'Satın alma Apple tarafından doğrulanamadı.' }, 400); }
      if ((acct as any).sandboxOnly && (tx as any)?.environment === 'Production') return reply({ ok: false, mesaj: 'Demo hesapla yalnız test ödemesi yapılabilir.' }, 403);
      const result = await recordApple(tx, acct);
      if (!result.ok) return reply({ ok: false, mesaj: result.reason === 'other_account' ? 'Bu satın alma başka bir Diji Medu hesabına ait.' : 'Satın alma doğrulanamadı.', reason: result.reason }, 409);
      return reply({ ...result, ...(await status(acct)) });
    }
    return reply({ ok: false, mesaj: 'Geçersiz işlem.' }, 400);
  } catch (err) {
    console.error('billing', (err as Error).message);
    return reply({ ok: false, mesaj: 'Abonelik servisi şu an yanıt vermiyor. Biraz sonra tekrar dene.' }, 503);
  }
});
