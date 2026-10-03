const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../supabase/functions/diji-api/index.ts'), 'utf8');
const block = source.slice(source.indexOf('  // Google Auth is an additional'), source.indexOf('  // [YAMA 7]'));
const run = new (Object.getPrototypeOf(async function () {}).constructor)('req', 'body', 'q', 'supabase', 'json', 'studentByNameGenel', 'verifyPassword', 'issueSession', 'denemeSay', 'denemeYaz', 'encName', 'const op = body.islem;\n' + block);
function fixture(options = {}) {
  let inserts = 0, sessions = 0;
  const student = { id: 'student-1', username: 'Existing', status: options.status || 'approved', password_hash: 'hash' };
  const client = {
    auth: { getUser: async token => ({ data: { user: token === 'valid' ? { id: 'google-1', identities: [{ provider: options.provider || 'google' }] } : null } }) },
    from(table) {
      const builder = {
        select() { return this; }, eq() { return this; }, limit() { return this; },
        async maybeSingle() { return { data: table === 'students' ? student : options.mapping || null }; },
        async insert() { inserts++; return { error: options.conflict ? { code: '23505' } : null }; },
        update() { return this; }, then(resolve) { resolve({ error: null }); }
      };
      return builder;
    }
  };
  return {
    async call(body, token = 'valid', method = 'POST') {
      return run(new Request('https://example.test', { method, headers: { authorization: 'Bearer ' + token } }), body, new URLSearchParams(), client,
        (data, status = 200) => ({ data, status }), async () => student, async password => password === 'correct',
        async () => { sessions++; return 'portal-token'; }, async () => options.locked ? 5 : 0, async () => {}, x => x.toLowerCase());
    }, counts: () => ({ inserts, sessions })
  };
}
test('invalid token and non-Google identity never issue portal sessions', async () => {
  for (const [options, token] of [[{}, 'forged'], [{ provider: 'email' }, 'valid']]) {
    const f = fixture(options); assert.equal((await f.call({ islem: 'googleGiris' }, token)).status, 401); assert.equal(f.counts().sessions, 0);
  }
});
test('unlinked Google identity requires verification without creating student data', async () => {
  const f = fixture(); assert.equal((await f.call({ islem: 'googleGiris' })).data.baglantiGerekli, true); assert.deepEqual(f.counts(), { inserts: 0, sessions: 0 });
});
test('wrong password and locked account cannot link', async () => {
  for (const [options, password, status] of [[{}, 'wrong', 401], [{ locked: true }, 'correct', 429]]) {
    const f = fixture(options); assert.equal((await f.call({ islem: 'googleBagla', ogrenci: 'Existing', sifre: password })).status, status); assert.deepEqual(f.counts(), { inserts: 0, sessions: 0 });
  }
});
test('approved student links to same student ID and receives legacy session', async () => {
  const f = fixture(); const r = await f.call({ islem: 'googleBagla', ogrenci: 'Existing', sifre: 'correct' });
  assert.equal(r.data.token, 'portal-token'); assert.equal(r.data.ogrenci, 'Existing'); assert.deepEqual(f.counts(), { inserts: 1, sessions: 1 });
});
test('existing mapping logs in without inserting a student or new mapping', async () => {
  const f = fixture({ mapping: { student_id: 'student-1' } }); assert.equal((await f.call({ islem: 'googleGiris' })).data.ok, true); assert.deepEqual(f.counts(), { inserts: 0, sessions: 1 });
});
test('pending student, different mapping and uniqueness conflict fail closed', async () => {
  for (const [options, status] of [[{ status: 'pending' }, 403], [{ mapping: { student_id: 'other' } }, 409], [{ conflict: true }, 409]]) {
    const f = fixture(options); assert.equal((await f.call({ islem: 'googleBagla', ogrenci: 'Existing', sifre: 'correct' })).status, status); assert.equal(f.counts().sessions, 0);
  }
});
test('GET cannot initiate login or account linking', async () => {
  const f = fixture(); assert.equal((await f.call({ islem: 'googleBagla' }, 'valid', 'GET')).status, 405); assert.deepEqual(f.counts(), { inserts: 0, sessions: 0 });
});
