export const CONFIRMATION = 'HESABIMI SİL';
const allowedOrigins = new Set(['https://panel.ogretmencocuk.com']);
export async function sha256(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), x => x.toString(16).padStart(2, '0')).join('');
}
export async function verifyPassword(password, stored) {
  try {
    const p = String(stored || '').split('$');
    if (p.length !== 4 || p[0] !== 'pbkdf2') return false;
    const rounds = Number(p[1]);
    if (!Number.isInteger(rounds) || rounds < 100000 || rounds > 1000000) return false;
    const decode = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const salt = decode(p[2]), expected = decode(p[3]);
    if (salt.length !== 16 || expected.length !== 32) return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: rounds, hash: 'SHA-256' }, key, 256));
    let difference = 0;
    for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
    return difference === 0;
  } catch (_) { return false; }
}
const escapeLike = value => value.replace(/[\\%_]/g, s => '\\' + s);
export async function cleanupAuth(db) {
  const { data, error } = await db.rpc('diji_deletion_claim_auth', { p_limit: 10 });
  if (error) throw new Error('cleanup_unavailable');
  let completed = 0;
  for (const item of data || []) {
    const { error: authError } = await db.auth.admin.deleteUser(item.auth_user_id);
    if (!authError || authError.status === 404 || authError.code === 'user_not_found') {
      const { error: queueError } = await db.from('diji_deletion_auth_queue').delete().eq('auth_user_id', item.auth_user_id);
      if (!queueError) completed++;
    }
  }
  return completed;
}
export async function handleRequest(req, db) {
  const origin = req.headers.get('origin');
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (origin && allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const respond = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
  if (origin && !allowedOrigins.has(origin)) return respond({ ok: false, message: 'İzin verilmeyen kaynak.' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return respond({ ok: false, message: 'POST gerekli.' }, 405);
  try {
    if (Number(req.headers.get('content-length') || '0') > 8192) return respond({ ok: false }, 413);
    const raw = await req.text();
    if (raw.length > 8192) return respond({ ok: false }, 413);
    let body;
    try { body = JSON.parse(raw); } catch (_) { return respond({ ok: false, message: 'Geçersiz istek.' }, 400); }
    if (!body || Array.isArray(body) || typeof body !== 'object') return respond({ ok: false }, 400);
    if (body.operation === 'cleanup') {
      const { data, error } = await db.from('diji_deletion_worker_settings').select('worker_key').eq('id', true).single();
      const given = req.headers.get('x-diji-delete-worker') || '';
      if (error || !data || given.length < 32 || await sha256(given) !== await sha256(data.worker_key))
        return respond({ ok: false }, 403);
      return respond({ ok: true, completed: await cleanupAuth(db) });
    }
    if (body.operation === 'prepare') {
      const username = typeof body.username === 'string' ? body.username.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const role = body.role;
      if (!['student', 'teacher'].includes(role) || !username || username.length > 100 || !password || password.length > 256)
        return respond({ ok: false, message: 'Hesap türünü, kullanıcı adını ve şifreni kontrol et.' }, 400);
      const { data: settings, error: settingsError } = await db.from('diji_deletion_worker_settings').select('worker_key').eq('id', true).single();
      if (settingsError || !settings) throw new Error('settings_unavailable');
      const target = await sha256(settings.worker_key + '|' + role + '|' + username.toLocaleLowerCase('tr'));
      const { data: allowed, error: rateError } = await db.rpc('diji_deletion_rate_allow', { p_target_hash: target });
      if (rateError) throw new Error('rate_unavailable');
      if (!allowed) return respond({ ok: false, message: 'Çok fazla deneme. 15 dakika sonra tekrar dene.' }, 429);
      const { data: accounts, error: accountError } = await db.from(role === 'teacher' ? 'teachers' : 'students')
        .select('id,username,password_hash').ilike('username', escapeLike(username)).limit(2);
      if (accountError) throw new Error('account_unavailable');
      const account = accounts?.length === 1 ? accounts[0] : null;
      if (!account || !await verifyPassword(password, account.password_hash))
        return respond({ ok: false, message: 'Hesap türü, kullanıcı adı veya şifre hatalı.' }, 401);
      const ticket = crypto.randomUUID() + '-' + crypto.randomUUID();
      const { error } = await db.from('diji_deletion_tickets').insert({
        token_hash: await sha256(ticket), account_id: account.id, account_role: role,
        password_hash_snapshot: account.password_hash
      });
      if (error) throw new Error('ticket_unavailable');
      return respond({ ok: true, ticket, username: account.username, role, expiresIn: 300 });
    }
    if (body.operation === 'confirm') {
      if (body.confirmation !== CONFIRMATION || typeof body.ticket !== 'string' || body.ticket.length < 60 || body.ticket.length > 100)
        return respond({ ok: false, message: 'Son onayı tamamla.' }, 400);
      const { data, error } = await db.rpc('diji_delete_account', {
        p_ticket_hash: await sha256(body.ticket), p_confirmation: body.confirmation
      });
      if (error) {
        const messages = {
          last_admin: 'Son aktif yönetici hesabı silinemez. Önce başka bir aktif yönetici tanımlanmalı.',
          ticket_expired: 'Onay süresi doldu. Şifreni yeniden doğrula.',
          reauth_required: 'Şifren değişmiş. Güncel şifrenle yeniden doğrula.',
          account_missing: 'Hesap bulunamadı. Silinmiş olabilir.'
        };
        const code = Object.keys(messages).find(key => error.message?.includes(key));
        return respond({ ok: false, message: messages[code] || 'Silme tamamlanamadı. Tekrar dene.' }, code === 'last_admin' ? 409 : 400);
      }
      if (!data?.ok) throw new Error('deletion_unavailable');
      if (data.google_cleanup_pending) {
        // A durable scheduled queue retries Auth failures without manual intervention.
        try { await cleanupAuth(db); } catch (_) {}
      }
      return respond({ ok: true, message: 'İngilizce hesabın ve ona bağlı aktif kayıtlar silindi.' });
    }
    return respond({ ok: false, message: 'Bilinmeyen işlem.' }, 400);
  } catch (_) {
    // Never log requests, passwords, tickets or database rows.
    return respond({ ok: false, message: 'İşlem şu anda tamamlanamıyor. Lütfen tekrar dene.' }, 503);
  }
}
