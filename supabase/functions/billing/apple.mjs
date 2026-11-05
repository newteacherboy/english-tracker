// App Store abonelikleri: StoreKit 2 imzalı işlemlerinin (JWS) doğrulanması. Deno (Edge) ve Node testleri ortak.
// Dış kütüphane yok: x5c zinciri (yaprak → ara → Apple Root CA - G3) WebCrypto ile doğrulanır.
//   - Kök sertifika, Apple'ın yayımladığı G3 parmak iziyle birebir aynı olmalı.
//   - Ara sertifika kökle, yaprak arayla imzalanmış olmalı; Apple'ın uzantı OID'leri bulunmalı.
//   - JWS imzası (ES256) yaprak anahtarıyla doğrulanır; sertifikalar imza tarihinde geçerli olmalı.
import { PRODUCTS, accountRef } from './play.mjs';

export const BUNDLE_ID = 'com.dijimedu.ingilizce';
// Apple Root CA - G3, SHA-256 (support.apple.com kök sertifika listesi).
export const APPLE_ROOT_G3_SHA256 = '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';
const OID_LEAF = '1.2.840.113635.100.6.11.1';
const OID_INTERMEDIATE = '1.2.840.113635.100.6.2.1';
const PERIODS = ['aylik', 'yillik'];

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64u = s => b64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const utf8 = bytes => new TextDecoder().decode(bytes);

// ---- en küçük DER okuyucu
function tlv(d, at) {
  const tag = d[at]; let len = d[at + 1], hdr = 2;
  if (len & 0x80) { const n = len & 0x7f; if (n < 1 || n > 4) throw Error('der'); len = 0; for (let i = 0; i < n; i++) len = len * 256 + d[at + 2 + i]; hdr = 2 + n; }
  const start = at + hdr, end = start + len;
  if (end > d.length) throw Error('der');
  return { tag, start, end, at, raw: d.subarray(at, end), body: d.subarray(start, end) };
}
function children(d, node) { const out = []; for (let p = node.start; p < node.end;) { const c = tlv(d, p); out.push(c); p = c.end; } return out; }
function oid(bytes) {
  const parts = [Math.floor(bytes[0] / 40), bytes[0] % 40]; let v = 0;
  for (let i = 1; i < bytes.length; i++) { v = v * 128 + (bytes[i] & 0x7f); if (!(bytes[i] & 0x80)) { parts.push(v); v = 0; } }
  return parts.join('.');
}
function time(node) {
  const s = utf8(node.body);
  const m = node.tag === 0x17 ? /^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/.exec(s) : /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/.exec(s);
  if (!m) throw Error('der_time');
  let y = Number(m[1]); if (node.tag === 0x17) y += y < 50 ? 2000 : 1900;
  return Date.UTC(y, m[2] - 1, m[3], m[4], m[5], m[6]);
}
export function parseCert(der) {
  const cert = tlv(der, 0), [tbs, alg, sig] = children(der, cert);
  const f = children(der, tbs); let i = f[0].tag === 0xa0 ? 1 : 0;
  const validity = children(der, f[i + 3]), spki = f[i + 5];
  const curveOid = oid(children(der, children(der, spki)[0])[1].body);
  const exts = [];
  const extBlock = f.find(x => x.tag === 0xa3);
  if (extBlock) for (const e of children(der, children(der, extBlock)[0])) exts.push(oid(children(der, e)[0].body));
  return {
    tbs: tbs.raw, spki: spki.raw, sigAlg: oid(children(der, alg)[0].body), signature: sig.body.subarray(1),
    curve: { '1.2.840.10045.3.1.7': 'P-256', '1.3.132.0.34': 'P-384' }[curveOid],
    notBefore: time(validity[0]), notAfter: time(validity[1]), extensions: exts,
  };
}
// DER ECDSA imzası (SEQ{r,s}) → WebCrypto'nun beklediği r||s.
function rawSig(der, size) {
  const seq = tlv(der, 0), [r, s] = children(der, seq), out = new Uint8Array(size * 2);
  const put = (v, off) => { let b = v.body; while (b.length > size && b[0] === 0) b = b.subarray(1); if (b.length > size) throw Error('sig'); out.set(b, off + size - b.length); };
  put(r, 0); put(s, size); return out;
}
const HASH = { '1.2.840.10045.4.3.2': 'SHA-256', '1.2.840.10045.4.3.3': 'SHA-384' };
async function key(cert) {
  if (!cert.curve) throw Error('apple_curve');
  return crypto.subtle.importKey('spki', cert.spki, { name: 'ECDSA', namedCurve: cert.curve }, false, ['verify']);
}
async function signedBy(child, parent) {
  const hash = HASH[child.sigAlg]; if (!hash) throw Error('apple_sigalg');
  const size = parent.curve === 'P-384' ? 48 : 32;
  return crypto.subtle.verify({ name: 'ECDSA', hash }, await key(parent), rawSig(child.signature, size), child.tbs);
}

// İmzalı Apple JWS'ini doğrular ve yükünü döner. rootFingerprint yalnız testlerde değişir.
export async function verifyAppleJws(jws, { rootFingerprint = APPLE_ROOT_G3_SHA256, now = Date.now() } = {}) {
  if (typeof jws !== 'string' || jws.length > 30000) throw Error('apple_jws');
  const parts = jws.split('.'); if (parts.length !== 3) throw Error('apple_jws');
  const header = JSON.parse(utf8(b64u(parts[0])));
  if (header.alg !== 'ES256' || !Array.isArray(header.x5c) || header.x5c.length !== 3) throw Error('apple_header');
  const ders = header.x5c.map(b64);
  if (hex(await crypto.subtle.digest('SHA-256', ders[2])) !== rootFingerprint) throw Error('apple_root');
  const [leaf, mid, root] = ders.map(parseCert);
  if (!leaf.extensions.includes(OID_LEAF) || !mid.extensions.includes(OID_INTERMEDIATE)) throw Error('apple_oid');
  if (!(await signedBy(mid, root)) || !(await signedBy(leaf, mid))) throw Error('apple_chain');
  const payload = JSON.parse(utf8(b64u(parts[1])));
  const at = Number(payload.signedDate) || now;
  for (const c of [leaf, mid, root]) if (at < c.notBefore || at > c.notAfter) throw Error('apple_expired_cert');
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await key(leaf), b64u(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) throw Error('apple_signature');
  return payload;
}

// accountRef (64 hex) → appAccountToken (UUID, küçük harf). iOS eklentisi aynı dönüşümü yapar.
export function appAccountToken(ref) {
  const h = String(ref || '').toLowerCase().replace(/[^0-9a-f]/g, '');
  if (h.length < 32) return null;
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join('-');
}
export async function appleTokenFor(role, id) { return appAccountToken(await accountRef(role, id)); }

// App Store ürün kimliği "<ürün>_<dönem>" → defterdeki ürün anahtarı.
export function productKey(storeProductId) {
  for (const p of PERIODS) if (String(storeProductId).endsWith('_' + p)) {
    const base = String(storeProductId).slice(0, -(p.length + 1));
    if (PRODUCTS[base]) return { key: base, period: p };
  }
  return null;
}
// Doğrulanmış işlemi defter durumuna çevirir.
export function interpretApple(tx, now = Date.now()) {
  const product = productKey(tx?.productId);
  const expires = Number(tx?.expiresDate);
  const validUntil = Number.isFinite(expires) ? new Date(expires).toISOString() : null;
  let state;
  if (tx?.bundleId !== BUNDLE_ID || !product || !tx.originalTransactionId) state = 'invalid';
  else if (tx.revocationDate) state = 'revoked';
  else if (Number.isFinite(expires) && expires > now) state = 'verified';
  else state = 'expired';
  return {
    state, productId: product?.key || null, period: product?.period || null, validUntil,
    originalTransactionId: tx?.originalTransactionId ? String(tx.originalTransactionId) : null,
    appAccountToken: tx?.appAccountToken ? String(tx.appAccountToken).toLowerCase() : null,
    test: tx?.environment !== 'Production',
  };
}
