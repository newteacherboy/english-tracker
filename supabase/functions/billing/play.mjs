// Google Play abonelik kuralları: Deno (Edge Function) ve Node testleri aynı dosyayı kullanır.
export const PACKAGE_NAME = 'com.dijimedu.ingilizce';

// Play Console'da açılacak abonelikler. Her birinde iki temel plan: "aylik" ve "yillik".
export const PRODUCTS = Object.freeze({
  diji_pro: { role: 'student', plan: 'pro', name: 'Pro', listPrice: { aylik: 45, yillik: 380 } },
  diji_premium_pro: { role: 'student', plan: 'premium_pro', name: 'Premium Pro', listPrice: { aylik: 79, yillik: 700 } },
  teacher_pro: { role: 'teacher', plan: 'pro', name: 'Öğretmen Pro', listPrice: { aylik: 59, yillik: 490 } },
  teacher_premium_pro: { role: 'teacher', plan: 'premium_pro', name: 'Öğretmen Premium Pro', listPrice: { aylik: 149, yillik: 1190 } },
});
export const BASE_PLANS = Object.freeze(['aylik', 'yillik']);

export function productsFor(role) {
  return Object.entries(PRODUCTS).filter(([, p]) => p.role === role).map(([id, p]) => ({ id, ...p, basePlans: BASE_PLANS }));
}

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export async function sha256(text) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}
// Satın alma bu hesaba bağlanır (Play'in obfuscatedAccountId alanı, en fazla 64 karakter, kişisel veri içermez).
export async function accountRef(role, id) {
  return sha256('diji-medu:' + role + ':' + id);
}
export async function tokenKey(purchaseToken) {
  return 'play:' + await sha256(purchaseToken);
}

const ACTIVE = new Set(['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_CANCELED', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD']);
const PENDING = new Set(['SUBSCRIPTION_STATE_PENDING']);

// subscriptionsv2.get yanıtını defter durumuna çevirir.
export function interpret(sub, now = Date.now()) {
  if (!sub || typeof sub !== 'object') throw Error('invalid_subscription');
  const items = Array.isArray(sub.lineItems) ? sub.lineItems : [];
  const item = items.find(i => PRODUCTS[i?.productId]) || null;
  const productId = item?.productId || null;
  const expiry = item?.expiryTime ? Date.parse(item.expiryTime) : NaN;
  const validUntil = Number.isFinite(expiry) ? new Date(expiry).toISOString() : null;
  let state;
  if (!productId) state = 'invalid';
  else if (PENDING.has(sub.subscriptionState)) state = 'pending';
  else if (ACTIVE.has(sub.subscriptionState) && Number.isFinite(expiry) && expiry > now) state = 'verified';
  else state = 'expired';
  return {
    state, productId, validUntil,
    basePlanId: item?.offerDetails?.basePlanId || null,
    needsAck: state === 'verified' && sub.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    accountRef: sub.externalAccountIdentifiers?.obfuscatedExternalAccountId || null,
    linkedToken: typeof sub.linkedPurchaseToken === 'string' ? sub.linkedPurchaseToken : null,
    orderId: typeof sub.latestOrderId === 'string' ? sub.latestOrderId : null,
    test: !!sub.testPurchase,
  };
}

function b64url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
// Servis hesabı ile Google OAuth için imzalı JWT (RS256).
export async function serviceJwt(sa, nowSec = Math.floor(Date.now() / 1000)) {
  if (!sa?.client_email || !sa?.private_key) throw Error('service_account_missing');
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: nowSec, exp: nowSec + 3600 }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + body));
  return head + '.' + body + '.' + b64url(sig);
}

// Pub/Sub gerçek zamanlı geliştirici bildirimini çözer.
export function parseRtdn(body) {
  const data = body?.message?.data;
  if (typeof data !== 'string' || data.length > 20000) return null;
  let msg; try { msg = JSON.parse(atob(data)); } catch { return null; }
  if (msg?.packageName !== PACKAGE_NAME) return null;
  const n = msg.subscriptionNotification;
  if (!n || typeof n.purchaseToken !== 'string' || !PRODUCTS[n.subscriptionId]) return { test: !!msg.testNotification };
  return { purchaseToken: n.purchaseToken, productId: n.subscriptionId, type: n.notificationType, eventId: body.message.messageId || null };
}
