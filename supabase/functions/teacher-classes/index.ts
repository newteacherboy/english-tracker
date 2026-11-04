// Öğretmen sınıfları (çoklu sınıf). Yalnız öğretmen oturumu; her işlem öğretmenin kendi kayıtlarıyla sınırlı.
//   POST {action:'list'}                                   → plan, sınır, sınıflar (öğrencileriyle), sınıfı tanımlanmamış öğrenciler
//   POST {action:'create', classNo, branch, name?}         → yeni sınıf + katılım kodu (plan sınırı: Free 1, Pro 5, Premium Pro sınırsız)
//   POST {action:'update', classId, name?, newCode?, archive?}
//   POST {action:'move', studentId, classId}               → öğrenciyi kendi sınıflarından birine taşı
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { classError, cleanName, isUuid } from './rules.mjs';

const key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const db = createClient(Deno.env.get('SUPABASE_URL')!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,x-diji-token', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

async function teacher(req: Request): Promise<string | null> {
  const token = req.headers.get('x-diji-token') || '';
  if (token.length < 16 || token.length > 1024) return null;
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const { data: s, error } = await db.from('portal_sessions').select('teacher_id,role,expires_at').eq('token_hash', hash).maybeSingle();
  if (error) throw Error('session_unavailable');
  if (!s || s.role !== 'teacher' || !s.teacher_id || !(Date.parse(s.expires_at) > Date.now())) return null;
  const { data: t } = await db.from('teachers').select('active,frozen_at').eq('id', s.teacher_id).maybeSingle();
  return t?.active && !t.frozen_at ? s.teacher_id as string : null;
}

async function list(id: string) {
  const { data, error } = await db.rpc('dm_teacher_classes_list', { p_teacher: id });
  if (error) throw error;
  return { ok: true, ...data };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ ok: false, mesaj: 'POST gerekli.' }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 4096) return reply({ ok: false, mesaj: 'İstek çok büyük.' }, 413);
    let body: any; try { body = JSON.parse(raw || '{}'); } catch { return reply({ ok: false, mesaj: 'Geçersiz istek.' }, 400); }
    const id = await teacher(req);
    if (!id) return reply({ ok: false, mesaj: 'Öğretmen olarak giriş yapmalısın.' }, 401);

    if (body.action === 'list') return reply(await list(id));
    let r;
    if (body.action === 'create') {
      r = await db.rpc('dm_class_create', { p_teacher: id, p_class_no: Math.floor(Number(body.classNo)), p_branch: String(body.branch || '').slice(0, 20), p_name: cleanName(body.name) });
    } else if (body.action === 'update') {
      if (!isUuid(body.classId)) return reply({ ok: false, mesaj: 'Sınıf seçilmedi.' }, 400);
      r = await db.rpc('dm_class_update', { p_teacher: id, p_class: body.classId, p_name: body.name === undefined ? null : cleanName(body.name) ?? '', p_new_code: body.newCode === true, p_archive: body.archive === true });
    } else if (body.action === 'move') {
      if (!isUuid(body.classId) || !isUuid(body.studentId)) return reply({ ok: false, mesaj: 'Öğrenci ve sınıf seçilmeli.' }, 400);
      r = await db.rpc('dm_class_move_student', { p_teacher: id, p_student: body.studentId, p_class: body.classId });
    } else return reply({ ok: false, mesaj: 'Geçersiz işlem.' }, 400);

    if (r.error) { const e = classError(r.error); return reply({ ok: false, ...e }, e.limit ? 402 : 400); }
    return reply({ ...(await list(id)), result: r.data });
  } catch (e) {
    console.error('teacher-classes', e);
    return reply({ ok: false, mesaj: 'Sınıflar şu an yüklenemedi. Biraz sonra tekrar dene.' }, 503);
  }
});
