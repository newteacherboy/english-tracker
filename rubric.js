// Seçilen tiklere göre 100 üzerinden puan hesaplayan fonksiyon
function calculateRubricScore() {
  // İlk bölüm (Rutinler) - Her biri 100 puan üzerinden ağırlıklandırılır
  const homework = parseFloat(document.getElementById('rb-homework')?.value || 0);
  const revision = parseFloat(document.getElementById('rb-revision')?.value || 0);
  const material = parseFloat(document.getElementById('rb-material')?.value || 0);
  
  // Ana Beceriler (0-100 arası manuel girilenler)
  const vocab = parseFloat(document.getElementById('rb-vocab')?.value || 0);
  const speaking = parseFloat(document.getElementById('rb-speaking')?.value || 0);
  const reading = parseFloat(document.getElementById('rb-reading')?.value || 0);
  const writing = parseFloat(document.getElementById('rb-writing')?.value || 0);
  const grammar = parseFloat(document.getElementById('rb-grammar')?.value || 0);

  // Derse Katılım Ortalaması (1-5 arası yıldızlar veya puanlar -> 100'e tamamlanır)
  const participation = parseFloat(document.getElementById('rb-participation')?.value || 5) * 20;
  const focus = parseFloat(document.getElementById('rb-focus')?.value || 5) * 20;

  // Tüm kriterlerin ortalamasını alıyoruz (Toplam 10 kriter odağı)
  const totalAverage = (homework + revision + material + vocab + speaking + reading + writing + grammar + participation + focus) / 10;
  
  // Ekranda canlı olarak sonucu göster
  const resultDiv = document.getElementById('rubric-result');
  if (resultDiv) {
    resultDiv.innerHTML = `Genel Ders Performansı: <strong>%${Math.round(totalAverage)}</strong>`;
  }
  
  return {
    average: Math.round(totalAverage),
    details: { vocab, speaking, reading, writing, grammar }
  };
}

// Değerlendirme Formunun Şık Tasarımını Ekrana Basan Fonksiyon
function showTeacherRubricPanel() {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  contentDiv.innerHTML = `
    <div style="max-width: 600px; margin: 20px auto; padding: 20px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); font-family: sans-serif;">
      <h2 style="color: #1e293b; text-align: center; margin-bottom: 20px; font-size: 20px; font-weight: 700;">🇬🇧 İngilizce Ders İçi Rubrik</h2>
      
      <!-- 1. BÖLÜM: RUTİNLER -->
      <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #475569; text-transform: uppercase;">1. Ön Hazırlık & Rutinler</h3>
        
        <div style="margin-bottom: 10px;">
          <label style="display:block; font-size: 13px; font-weight:600; margin-bottom:4px;">Ödev Kontrolü:</label>
          <select id="rb-homework" onchange="calculateRubricScore()" style="width:100%; padding:8px; border-radius:8px; border:1px solid #cbd5e1;">
            <option value="100">Evet (Eksiksiz) - 100 Puan</option>
            <option value="50">Kısmen (Eksik/Geç) - 50 Puan</option>
            <option value="0">Hayır (Yapılmamış) - 0 Puan</option>
          </select>
        </div>

        <div style="margin-bottom: 10px;">
          <label style="display:block; font-size: 13px; font-weight:600; margin-bottom:4px;">Tekrar Durumu:</label>
          <select id="rb-revision" onchange="calculateRubricScore()" style="width:100%; padding:8px; border-radius:8px; border:1px solid #cbd5e1;">
            <option value="100">Hazır (Tekrar Yapılmış) - 100 Puan</option>
            <option value="50">Hatırlamakta Zorlanıyor - 50 Puan</option>
            <option value="0">Hiç Bakmamış - 0 Puan</option>
          </select>
        </div>
      </div>

      <!-- 2. BÖLÜM: 5 TEMEL BECERİ -->
      <div style="margin-bottom: 20px; padding: 15px; background: #f0f9ff; border-radius: 12px; border: 1px solid #bae6fd;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #0369a1; text-transform: uppercase;">2. 5 Temel Beceri Puanı (0-100)</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="display:block; font-size:12px; font-weight:600;">📚 Kelime (Vocab):</label>
            <input type="number" id="rb-vocab" value="100" min="0" max="100" oninput="calculateRubricScore()" style="width:90%; padding:8px; border-radius:8px; border:1px solid #cbd5e1;">
          </div>
          <div>
            <label style="display:block; font-size:12px; font-weight:600;">🗣️ Konuşma (Speaking):</label>
            <input type="number" id="rb-speaking" value="100" min="0" max="100" oninput="calculateRubricScore()" style="width:90%; padding:8px; border-radius:8px; border:1px solid #cbd5e1;">
          </div>
          <div>
            <label style="display:block; font-size:12px; font-weight:600;">📖 Okuma (Reading):</label>
            <input type="number" id="rb-reading" value="100" min="0" max="100" oninput="calculateRubricScore()" style="width:90%; padding:8px; border-radius:8px; border:1px solid #cbd5e1;">
          </div>
          <div>
            <label style="display:block; font-size:12px; font-weight:600;">✍️ Yazma (Writing):</label>
            <input type="number" id="rb-writing" value="100" min="0" max="100" oninput="calculateRubricScore()" style="width:90%; padding:8px; border-radius:8px; border:1px solid #cbd5e1;">
          </div>
          <div style="grid-column: span 2;">
            <label style="display:block; font-size:12px; font-weight:600;">🧠 Dil Bilgisi (Grammar):</label>
            <input type="number" id="rb-grammar" value="100" min="0" max="100" oninput="calculateRubricScore()" style="width:95%; padding:8px; border-radius:8px; border:1px solid #cbd5e1;">
          </div>
        </div>
      </div>

      <!-- 3. BÖLÜM: FOCUS -->
      <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #475569; text-transform: uppercase;">3. Katılım & Odak (1-5 Yıldız)</h3>
        <div style="display:flex; gap:15px;">
          <div style="flex:1;">
            <label style="font-size:12px; font-weight:600;">Derse Katılım:</label>
            <select id="rb-participation" onchange="calculateRubricScore()" style="width:100%; padding:8px; border-radius:8px; border:1px solid #cbd5e1;">
              <option value="5">5 - Mükemmel</option>
              <option value="4">4 - İyi</option>
              <option value="3">3 - Orta</option>
              <option value="2">2 - Geliştirilmeli</option>
              <option value="1">1 - Zayıf</option>
            </select>
          </div>
          <div style="flex:1;">
            <label style="font-size:12px; font-weight:600;">Odaklanma:</label>
            <select id="rb-focus" onchange="calculateRubricScore()" style="width:100%; padding:8px; border-radius:8px; border:1px solid #cbd5e1;">
              <option value="5">5 - Mükemmel</option>
              <option value="4">4 - İyi</option>
              <option value="3">3 - Orta</option>
              <option value="2">2 - Geliştirilmeli</option>
              <option value="1">1 - Zayıf</option>
            </select>
          </div>
        </div>
      </div>

      <!-- CANLI SONUÇ EKRANI -->
      <div id="rubric-result" style="text-align:center; margin-top:20px; padding:15px; background:#10b981; color:white; border-radius:12px; font-size:16px; font-weight:600;">
        Genel Ders Performansı: <strong>%100</strong>
      </div>
      
      <p style="text-align:center; font-size:11px; color:#94a3b8; margin-top:15px;">
        *Burada hesapladığınız puanları Google Sheets tablonuza doğrudan işleyebilirsiniz.
      </p>
    </div>
  `;
  calculateRubricScore(); // İlk açılışta hesaplamayı tetikle
}
