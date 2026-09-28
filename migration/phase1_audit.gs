/**
 * Diji-Medu Migration Phase 1
 * READ-ONLY AUDIT / DRY-RUN
 *
 * Safe to add to the existing Apps Script project.
 * This file does NOT modify production data.
 */

const MIGRATION_AUDIT_VERSION = 'phase-1-readonly-2026-09-28';

const MIGRATION_POLICY = {
  protected: new Set([
    'İngilizce',
    'DersKonulari',
    'DersUygulamaTest',
    'Kelimeler',
    'KonusmaEsAnlamlar',
    'Kategoriler',
    'BoslukDoldurma',
    'Dogru_Yanlis_Sorular',
    'OzellikIzinleri',
    'Rozetler'
  ]),
  longTerm: new Set([
    'Dersler',
    'DersIlerleme',
    'DersBilmiyordum',
    'SeviyeIlerleme',
    'KonusmaSeviyeIlerleme',
    'BuyuIlerleme',
    'Puanlama',
    'Kitaplar',
    'Okuma_Hizi',
    'Oturum Saniye',
    'XP_Tablosu',
    'XP_Haftalik',
    'Duello',
    'Sohbet',
    'Etkinlik_Yapilan',
    'Video_Izlenenler',
    'AtamaGunlugu',
    'SinifIciPerformans',
    'LiderlikBonusVerilenler'
  ]),
  operational: new Set([
    'Oturumlar',
    'Bildirimler',
    'BildirimGunlugu',
    'DuyuruGorulenler',
    'PuanBildirimDurumu',
    'Akis_Olaylari',
    'Guvenlik_Log'
  ])
};

/**
 * Main read-only audit.
 *
 * Output:
 * - sheet name
 * - row/column counts
 * - policy bucket
 * - headers
 *
 * IMPORTANT: No spreadsheet mutation occurs here.
 */
function migrationPhase1Audit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Aktif Spreadsheet bulunamadı.');

  const sheets = ss.getSheets();
  const report = [];

  sheets.forEach(function(sheet) {
    const name = sheet.getName();
    const range = sheet.getDataRange();
    const values = range.getValues();

    const rows = Math.max(values.length - 1, 0);
    const columns = values.length ? values[0].length : 0;
    const headers = values.length ? values[0].map(String) : [];

    let bucket = 'UNCLASSIFIED';
    if (MIGRATION_POLICY.protected.has(name)) bucket = 'A_PROTECTED';
    else if (MIGRATION_POLICY.longTerm.has(name)) bucket = 'B_LONG_TERM';
    else if (MIGRATION_POLICY.operational.has(name)) bucket = 'C_OPERATIONAL';

    report.push({
      sheet: name,
      rows: rows,
      columns: columns,
      bucket: bucket,
      headers: headers
    });
  });

  report.sort(function(a, b) {
    return b.rows - a.rows;
  });

  Logger.log(JSON.stringify({
    auditVersion: MIGRATION_AUDIT_VERSION,
    timestamp: new Date().toISOString(),
    sheetCount: report.length,
    totalRows: report.reduce(function(sum, x) { return sum + x.rows; }, 0),
    protectedRows: report.filter(function(x) { return x.bucket === 'A_PROTECTED'; })
      .reduce(function(sum, x) { return sum + x.rows; }, 0),
    longTermRows: report.filter(function(x) { return x.bucket === 'B_LONG_TERM'; })
      .reduce(function(sum, x) { return sum + x.rows; }, 0),
    operationalRows: report.filter(function(x) { return x.bucket === 'C_OPERATIONAL'; })
      .reduce(function(sum, x) { return sum + x.rows; }, 0),
    unclassifiedSheets: report.filter(function(x) { return x.bucket === 'UNCLASSIFIED'; })
      .map(function(x) { return x.sheet; }),
    sheets: report
  }, null, 2));

  return report;
}

/**
 * Safety assertion for future cleanup code.
 * Phase 1 does not call this.
 *
 * Any future destructive operation should require an explicit
 * feature flag and a prior dry-run token.
 */
function migrationCleanupGuard_(options) {
  options = options || {};

  if (options.dryRun !== true) {
    throw new Error('SAFETY: Cleanup yalnızca dryRun=true ile başlatılabilir.');
  }

  if (options.approved !== true) {
    throw new Error('SAFETY: Açık onay olmadan cleanup çalıştırılamaz.');
  }

  if (options.migrationHealthy !== true) {
    throw new Error('SAFETY: Migration sağlıklı doğrulanmadan cleanup çalıştırılamaz.');
  }

  throw new Error(
    'SAFETY: Phase 1 cleanup devre dışı. Önce ayrı bir politika + doğrulama katmanı eklenmelidir.'
  );
}
