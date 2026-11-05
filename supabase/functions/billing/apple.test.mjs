// node --test supabase/functions/billing/apple.test.mjs  (openssl gerekir)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash, createPrivateKey, sign as nodeSign } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyAppleJws, interpretApple, appAccountToken, productKey, appleTokenFor } from './apple.mjs';

// Apple'ınkine benzer zincir: P-384 kök → P-256 ara (OID ...6.2.1) → P-256 yaprak (OID ...6.11.1).
function chain() {
  const dir = mkdtempSync(path.join(tmpdir(), 'apple-')), f = n => path.join(dir, n);
  const run = (...a) => execFileSync('openssl', a, { stdio: 'pipe' });
  writeFileSync(f('ext.cnf'), '[mid]\nbasicConstraints=critical,CA:true\n1.2.840.113635.100.6.2.1=DER:05:00\n[leaf]\nbasicConstraints=CA:false\n1.2.840.113635.100.6.11.1=DER:05:00\n');
  run('ecparam', '-name', 'secp384r1', '-genkey', '-noout', '-out', f('root.key'));
  run('req', '-x509', '-new', '-key', f('root.key'), '-subj', '/CN=Test Root G3', '-days', '30', '-sha384', '-out', f('root.pem'));
  for (const [n, parent, ext] of [['mid', 'root', 'mid'], ['leaf', 'mid', 'leaf']]) {
    run('ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', f(n + '.key'));
    run('req', '-new', '-key', f(n + '.key'), '-subj', '/CN=' + n, '-out', f(n + '.csr'));
    run('x509', '-req', '-in', f(n + '.csr'), '-CA', f(parent + '.pem'), '-CAkey', f(parent + '.key'), '-CAcreateserial', '-days', '30',
      parent === 'root' ? '-sha384' : '-sha256', '-extfile', f('ext.cnf'), '-extensions', ext, '-out', f(n + '.pem'));
  }
  const der = n => run('x509', '-in', f(n + '.pem'), '-outform', 'DER');
  const certs = ['leaf', 'mid', 'root'].map(der);
  return { x5c: certs.map(c => c.toString('base64')), rootFp: createHash('sha256').update(certs[2]).digest('hex'), leafKey: createPrivateKey(readFileSync(f('leaf.key'))) };
}
const c = chain();
const b64u = v => Buffer.from(v).toString('base64url');
function jws(payload, x5c = c.x5c) {
  const head = b64u(JSON.stringify({ alg: 'ES256', x5c })) + '.' + b64u(JSON.stringify(payload));
  return head + '.' + b64u(nodeSign('sha256', Buffer.from(head), { key: c.leafKey, dsaEncoding: 'ieee-p1363' }));
}
const now = Date.now();
const tx = { bundleId: 'com.dijimedu.ingilizce', productId: 'diji_pro_yillik', originalTransactionId: '2000001', transactionId: '2000005',
  expiresDate: now + 86400000, signedDate: now, environment: 'Sandbox', appAccountToken: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE' };

test('valid Apple-style chain and signature return the payload', async () => {
  const p = await verifyAppleJws(jws(tx), { rootFingerprint: c.rootFp });
  assert.equal(p.originalTransactionId, '2000001');
});
test('wrong root, tampered payload or swapped chain are rejected', async () => {
  await assert.rejects(verifyAppleJws(jws(tx)), /apple_root/); // gerçek Apple kökü değil
  const [h, , s] = jws(tx).split('.');
  await assert.rejects(verifyAppleJws(h + '.' + b64u(JSON.stringify({ ...tx, productId: 'diji_premium_pro_yillik' })) + '.' + s, { rootFingerprint: c.rootFp }), /apple_signature/);
  await assert.rejects(verifyAppleJws(jws(tx, [c.x5c[1], c.x5c[0], c.x5c[2]]), { rootFingerprint: c.rootFp }), /apple_oid|apple_chain/);
});
test('interpretation: product, period, states, account token', () => {
  const i = interpretApple(tx, now);
  assert.deepEqual([i.state, i.productId, i.period, i.test, i.appAccountToken], ['verified', 'diji_pro', 'yillik', true, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee']);
  assert.equal(interpretApple({ ...tx, expiresDate: now - 1 }, now).state, 'expired');
  assert.equal(interpretApple({ ...tx, revocationDate: now }, now).state, 'revoked');
  assert.equal(interpretApple({ ...tx, bundleId: 'x' }, now).state, 'invalid');
  assert.equal(productKey('diji_premium_pro_aylik').key, 'diji_premium_pro');
  assert.equal(productKey('baska_aylik'), null);
});
test('account token matches the iOS plugin conversion', async () => {
  assert.equal(appAccountToken('0123456789abcdef0123456789abcdef00'), '01234567-89ab-cdef-0123-456789abcdef');
  assert.match(await appleTokenFor('student', 'x'), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});
