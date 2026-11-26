/**
 * Papi Hazine Avı — Web Audio SFX, Tropical Adventure BGM & English Voice Engine
 * - Integrates with Diji-Medu shared-voice.js when available, with crisp Web Speech API fallback.
 * - Independent Music and SFX/Voice toggles.
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.musicTimer = null;
    this.ambientGain = null;
    this.noteIdx = 0;
    this.unlocked = false;
  }

  unlock() {
    if (this.unlocked && this.ctx?.state === 'running') return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.unlocked = true;
      if (this.musicEnabled && !this.musicTimer) this._startMusicLoop();
    } catch (_) {}
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = !!enabled;
    if (!this.musicEnabled) {
      if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    } else if (this.unlocked && !this.musicTimer) {
      this._startMusicLoop();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = !!enabled;
  }

  _tone(freq, dur, type = 'sine', vol = 0.12, delay = 0, slideTo = null) {
    if (!this.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  _noise(dur, vol = 0.06, filterFreq = 1200) {
    if (!this.sfxEnabled || !this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filt);
    filt.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  playFootstep(surface = 'grass') {
    this._noise(0.055, 0.045, surface === 'sand' ? 950 : 620);
  }

  playSplash() {
    this._noise(0.16, 0.075, 1650);
  }

  playJump() {
    this._tone(280, 0.14, 'triangle', 0.11, 0, 560);
  }

  playFlap() {
    this._noise(0.11, 0.06, 520);
    this._tone(340, 0.09, 'sine', 0.06, 0, 480);
  }

  playCollect() {
    this._tone(587.33, 0.12, 'triangle', 0.14, 0);
    this._tone(880.0, 0.18, 'triangle', 0.14, 0.07);
    this._tone(1174.66, 0.24, 'sine', 0.12, 0.14);
  }

  playDoorOpen() {
    this._tone(190, 0.25, 'sawtooth', 0.06, 0, 260);
    this._tone(523.25, 0.16, 'triangle', 0.12, 0.18);
    this._tone(659.25, 0.22, 'triangle', 0.12, 0.28);
  }

  playChestFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, i) => this._tone(n, 0.34, 'triangle', 0.14, i * 0.09));
  }

  playWrong() {
    this._tone(310, 0.14, 'sine', 0.11, 0, 220);
    this._tone(215, 0.18, 'sine', 0.10, 0.11, 175);
  }

  playBirdChirp() {
    this._tone(1650, 0.07, 'sine', 0.035, 0, 2300);
    this._tone(2100, 0.08, 'sine', 0.03, 0.09, 1700);
  }

  _startMusicLoop() {
    // Gentle tropical marimba island melody (pentatonic C major)
    const melody = [523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33,
                    523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 0];
    this.musicTimer = setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const freq = melody[this.noteIdx % melody.length];
      this.noteIdx++;
      if (freq > 0) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.032, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      }
      if (this.noteIdx % 24 === 0 && this.sfxEnabled) this.playBirdChirp();
    }, 460);
  }

  /** Speak English mission instruction via Diji-Medu shared-voice or Web Speech API */
  speakEnglish(text) {
    if (!this.sfxEnabled || !text) return;
    try {
      // 1. Prefer Diji-Medu shared-voice pre-recorded audio if loaded
      if (window.dmSharedVoice && typeof window.dmSharedVoice.play === 'function') {
        const handled = window.dmSharedVoice.play({ text, lang: 'en-US', rate: 0.94, volume: 1 });
        if (handled) return;
      }
      // 2. Fallback to browser Web Speech API
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = 'en-US';
        utt.rate = 0.92;
        utt.pitch = 1.05;
        window.speechSynthesis.speak(utt);
      }
    } catch (_) {}
  }

  dispose() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    try { this.ctx?.close(); } catch (_) {}
  }
}
