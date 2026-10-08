/* Benim Dünyam · öğrencinin kendi istatistikleri.
   Oyun skorları, tamamlanan konular ve parkur durakları gün gün özetlenir.
   Sadece öğrenci oturumunda, sadece kendi verisi için çalışır. */
export function myWorldAPI(db: any, json: any) {
  const cache = new Map<string, { at: number, body: any }>();
  const gun = (v: any) => {
    if (!v) return '';
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  };
  async function hepsi(sorgu: () => any, sinir = 6000) {
    const out: any[] = [];
    for (let i = 0; i < sinir; i += 1000) {
      const { data, error } = await sorgu().range(i, i + 999);
      if (error) throw error;
      out.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    return out;
  }
  async function ozet(id: string) {
    const bas = new Date(Date.now() - 366 * 864e5).toISOString();
    const [oyunlar, dersler, duraklar] = await Promise.all([
      hepsi(() => db.from('game_scores').select('game_key,correct_count,wrong_count,played_on').eq('student_id', id).gte('played_on', bas.slice(0, 10)).order('played_on', { ascending: true })),
      hepsi(() => db.from('lesson_progress').select('completed_at').eq('student_id', id).eq('test_success', true).gte('completed_at', bas)),
      hepsi(() => db.from('level_completions').select('completed_at').eq('student_id', id).gte('completed_at', bas)),
    ]);
    const gunler: Record<string, { o: number, d: number, y: number, m: number, l: number, p: number }> = {};
    const al = (g: string) => (gunler[g] ||= { o: 0, d: 0, y: 0, m: 0, l: 0, p: 0 });
    const oyunTur: Record<string, { o: number, d: number }> = {};
    for (const r of oyunlar) {
      const g = gun(r.played_on); if (!g) continue;
      const d = Math.max(0, Number(r.correct_count) || 0), y = Math.max(0, Number(r.wrong_count) || 0), x = al(g);
      x.o++; x.d += d; x.y += y; if (d > 0 && y === 0) x.m++;
      const k = String(r.game_key || '').slice(0, 40); if (k) { const t = (oyunTur[k] ||= { o: 0, d: 0 }); t.o++; t.d += d; }
    }
    for (const r of dersler) { const g = gun(r.completed_at); if (g) al(g).l++; }
    for (const r of duraklar) { const g = gun(r.completed_at); if (g) al(g).p++; }
    return { ok: true, bugun: gun(new Date().toISOString()), gunler, oyunTur };
  }
  return {
    async handle(op: string, _body: any, _q: any, a: any) {
      if (op !== 'benimIstatistik') return null;
      if (!a) return json({ ok: false, hata: 'oturum', mesaj: 'Oturum gerekli.' }, 401);
      if (a.role !== 'student' || !a.student_id) return json({ ok: false, hata: 'yetki', mesaj: 'Bu ekran öğrenciler içindir.' }, 403);
      const c = cache.get(a.student_id);
      if (c && Date.now() - c.at < 60000) return json(c.body);
      try {
        const body = await ozet(a.student_id);
        if (cache.size > 5000) cache.clear();
        cache.set(a.student_id, { at: Date.now(), body });
        return json(body);
      } catch (e) {
        console.error('benimIstatistik', e);
        return json({ ok: false, mesaj: 'İstatistikler şu an alınamadı.' }, 500);
      }
    },
    invalidate(id: string) { cache.delete(id); },
  };
}
