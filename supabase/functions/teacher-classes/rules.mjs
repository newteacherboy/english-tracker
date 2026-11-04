// Saf yardımcılar (Node testlerinde de çalışır).
export const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export function cleanName(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return s || null;
}

// Veritabanı hatasını kullanıcı mesajına çevirir. Yalnız bizim yazdığımız P0001 mesajları gösterilir.
export function classError(err) {
  if (err?.code !== 'P0001') return { mesaj: 'İşlem tamamlanamadı.' };
  const m = /^PLAN_LIMIT:(\d+)$/.exec(String(err.message || ''));
  if (m) return { limit: Number(m[1]), mesaj: `Planındaki sınıf sınırına ulaştın (${m[1]} sınıf). Daha fazla sınıf için planını yükseltebilirsin.` };
  return { mesaj: String(err.message || 'İşlem tamamlanamadı.') };
}
