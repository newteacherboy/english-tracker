// Abonelik ekranının saf mantığı (test edilebilir, DOM'suz).
// Plan kartlarında yalnızca bu sürümde gerçekten çalışan özellikler yazılır.
export const PLAN_FEATURES = Object.freeze({
  student: {
    free: ['Tüm parkurlar, Ders Çalış ve oyunlar', 'Günde 25 enerji', 'Premium Oyunlarda 3 deneme', 'Reklamlı'],
    diji_pro: ['Reklamsız (banner ve geçiş reklamı yok)', 'Günde 40 enerji', 'Her gün +30 altın', 'Ayda 2 seri kalkanı', 'Mola Vakti: her oyun günde 3 kez', 'Premium Oyunlar: günde 5 bölüm'],
    diji_premium_pro: ['Pro\'daki her şey', 'Sınırsız enerji', 'Sınırsız Premium Oyunlar', 'Her gün +75 altın', 'Ayda 5 seri kalkanı', 'Mola Vakti: her oyun günde 5 kez'],
  },
  teacher: {
    free: ['1 sınıf, 40 öğrenci', 'Öğrenci takibi ve ödev', 'Reklamsız'],
    teacher_pro: ['5 sınıf, 200 öğrenci', 'Detaylı öğrenci raporları', 'Sınırsız ödev'],
    teacher_premium_pro: ['Sınırsız sınıf, 500 öğrenci', 'Sınıflar arası lig ve karşılaştırma', 'Yöneticiyle iletişim'],
  },
});
// Öğretmen paketleri satışta (10 Kasım 2026). Paket ekranı artık sitede (ingilizce/dm-satis.js).
export const SALE_OPEN = Object.freeze({ student: true, teacher: true });
const RANK = { free: 0, pro: 1, premium_pro: 2 };
const PERIOD_LABEL = { aylik: 'ay', yillik: 'yıl' };

// Play'den gelen fiyatı tercih eder; gelmezse liste fiyatını yazar (satın alma yine Play fiyatıyla olur).
export function priceFor(product, storeProduct, basePlanId) {
  const offers = (storeProduct?.offers || []).filter(o => o.basePlanId === basePlanId);
  const base = offers.find(o => !o.offerId) || offers[0];
  const paid = base?.phases?.filter(p => Number(p.micros) > 0).at(-1);
  const trial = offers.find(o => o.offerId && o.phases?.some(p => Number(p.micros) === 0));
  const list = product.listPrice?.[basePlanId];
  return {
    text: paid?.price || (list != null ? list.toLocaleString('tr-TR') + ' TL' : '—'),
    per: PERIOD_LABEL[basePlanId] || basePlanId,
    available: !!base,
    trialDays: trial ? 7 : 0,
  };
}

export function yearlySaving(product) {
  const m = product.listPrice?.aylik, y = product.listPrice?.yillik;
  if (!m || !y) return 0;
  return Math.round((1 - y / (m * 12)) * 100);
}

export function planCards({ role, plan, products, storeProducts = [], period = 'aylik' }) {
  const features = PLAN_FEATURES[role] || PLAN_FEATURES.student;
  const byId = Object.fromEntries(storeProducts.map(p => [p.id, p]));
  const cards = [{ id: 'free', name: role === 'teacher' ? 'Öğretmen Free' : 'Free', plan: 'free', price: { text: '0 TL', per: '', available: false, trialDays: 0 },
    features: features.free, current: plan === 'free', action: plan === 'free' ? 'current' : 'none' }];
  for (const p of products) {
    const price = priceFor(p, byId[p.id], period);
    const current = plan === p.plan;
    let action = 'buy';
    if (!SALE_OPEN[role]) action = 'soon';
    else if (current) action = 'current';
    else if (RANK[p.plan] < RANK[plan]) action = 'none';
    else if (!price.available) action = 'unavailable';
    cards.push({ id: p.id, name: p.name, plan: p.plan, price, saving: period === 'yillik' ? yearlySaving(p) : 0, features: features[p.id] || [], current, action });
  }
  return cards;
}

// Çocuklara yönelik uygulama: satın almadan önce veli kapısı.
export function parentGate(random = Math.random) {
  const a = 3 + Math.floor(random() * 7), b = 6 + Math.floor(random() * 4);
  return { question: `Devam etmek için veliden yardım iste: ${a} × ${b} kaç?`, answer: a * b };
}
export function gatePassed(gate, input) {
  return String(input ?? '').trim() !== '' && Number(String(input).trim()) === gate.answer;
}
