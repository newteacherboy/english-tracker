// Okul parkuru durak numaraları.
//   Kelime durağı : 200000 + sınıf*10000 + ünite*100 + 50 + parça
//   Kalıp durağı  : 300000 + sınıf*10000 + ünite*100 + 50 + grup   (grup = 4 kelime durağı)
// İki bant arasındaki fark 100000 = 10*10000 olduğu için ünite ve parça çıkarımı
// her iki bantta aynı aritmetikle çalışır; yalnızca sınıf çıkarımı taban gerektirir.
export const PARKUR_KELIME_TABAN = 200000;
export const PARKUR_KALIP_TABAN = 300000;
export const kalipDuragiMi = stop => Number(stop) >= PARKUR_KALIP_TABAN;
export const durakTaban = stop => (kalipDuragiMi(stop) ? PARKUR_KALIP_TABAN : PARKUR_KELIME_TABAN);
export const durakSinif = stop => Math.floor((Number(stop) - durakTaban(stop)) / 10000);
export const durakUnite = stop => Math.floor(((Number(stop) - durakTaban(stop)) % 10000) / 100);
export const durakParca = stop => Number(stop) % 100 - 51;
