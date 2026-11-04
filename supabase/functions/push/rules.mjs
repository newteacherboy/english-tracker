// Bildirim gönderimi için saf yardımcılar (Deno ve Node testleri ortak).
export function cleanText(v, max) {
  return String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
export function validToken(t) {
  return typeof t === 'string' && t.length >= 20 && t.length <= 4096 && /^[A-Za-z0-9_:\-.]+$/.test(t);
}
// FCM HTTP v1 mesajı. Uygulama içi yönlendirme için yalnız izinli sekme adları.
const TABS = ['parkur', 'oyunlar', 'magaza', 'derscalis', 'arkadaslar', 'profil'];
export function fcmMessage(token, { title, body, tab }) {
  const data = { kaynak: 'dm' };
  if (TABS.includes(tab)) data.tab = tab;
  return { message: { token, notification: { title, body }, data, android: { priority: 'normal', notification: { channel_id: 'genel', icon: 'ic_stat_dm', color: '#0F8B7D' } } } };
}
// Jeton artık geçersizse (uygulama silinmiş vb.) kayıttan çıkarılmalı.
export function deadToken(status, json) {
  const code = json?.error?.details?.find?.(d => d.errorCode)?.errorCode || json?.error?.status;
  return status === 404 || code === 'UNREGISTERED' || (status === 400 && code === 'INVALID_ARGUMENT');
}
