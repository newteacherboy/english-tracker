// Web Speech-compatible facade for the existing games; permissions only on a mic tap.
export function recognitionClass(plugin, EventTargetClass = EventTarget) {
  let current = null, knownAvailable = false;
  const availability = async () => {
    if (knownAvailable) return true;
    const { available } = await plugin.available();
    if (available) knownAvailable = true;
    return available;
  };
  return class NativeRecognition extends EventTargetClass {
    lang = 'en-US'; continuous = false; interimResults = false; maxAlternatives = 3;
    active = false; cancelled = false; blocked = false;
    emit(type, extra = {}) {
      const event = new Event(type);
      Object.assign(event, extra);
      this.dispatchEvent(event);
      this['on' + type]?.(event);
    }
    async run() {
      try {
        const available = await availability();
        if (!available) throw new Error('Konuşma tanıma bu cihazda bulunmuyor.');
        let p = await plugin.checkPermissions();
        if (this.cancelled) return;
        if (p.speechRecognition !== 'granted') p = await plugin.requestPermissions();
        if (p.speechRecognition !== 'granted') throw new Error('Mikrofon izni verilmedi.');
        if (this.cancelled) return;
        this.emit('start');
        const result = await plugin.start({ language: this.lang, maxResults: this.maxAlternatives, partialResults: false, popup: true, prompt: 'İngilizce söyle' });
        if (this.cancelled) return;
        if (result.matches?.length) {
          const alternatives = result.matches.map(transcript => ({ transcript, confidence: 0 }));
          alternatives.isFinal = true;
          this.emit('result', { resultIndex: 0, results: [alternatives] });
        }
      } catch (error) {
        this.blocked = true; // Legacy continuous handlers retry on end; do not loop permission prompts.
        if (!this.cancelled) this.emit('error', { error: 'audio-capture', message: error.message });
      } finally { this.finish(); }
    }
    start() {
      if (this.blocked) throw new Error('Mikrofonu yeniden denemek için düğmeye tekrar dokun.');
      if (this.active || current) throw new Error('Mikrofon zaten kullanılıyor.');
      this.active = true; this.cancelled = false; current = this;
      void this.run();
    }
    finish() {
      if (!this.active) return;
      this.active = false;
      if (current === this) current = null;
      this.emit('end');
    }
    stop() { if (!this.active || this.cancelled) return; this.cancelled = true; void plugin.stop().catch(() => {}).finally(() => this.finish()); }
    abort() { this.stop(); }
  };
}

export function installSpeech(win, recognition, tts) {
  win.SpeechRecognition = win.webkitSpeechRecognition = recognitionClass(recognition, win.EventTarget);
  let epoch = 0, tail = Promise.resolve(), speaking = false, pending = 0, voices = [];
  const synth = {
    get speaking() { return speaking; }, get pending() { return pending > 0; }, paused: false,
    getVoices: () => voices,
    cancel() { epoch++; pending = 0; speaking = false; tail = Promise.resolve(); void tts.stop().catch(() => {}); },
    pause() { this.cancel(); }, resume() {},
    speak(utterance) {
      const ticket = epoch; pending++;
      tail = tail.catch(() => {}).then(async () => {
        if (ticket !== epoch) return;
        pending = Math.max(0, pending - 1); speaking = true;
        utterance.onstart?.(new Event('start'));
        try {
          await tts.speak({ text: String(utterance.text || ''), lang: utterance.lang || 'en-US', rate: Math.max(0.1, Math.min(2, utterance.rate || 1)), pitch: Math.max(0.1, Math.min(2, utterance.pitch || 1)), volume: utterance.volume ?? 1, category: 'playback' });
          if (ticket === epoch) utterance.onend?.(new Event('end'));
        } catch (error) { if (ticket === epoch) utterance.onerror?.(error); }
        finally { if (ticket === epoch) speaking = false; }
      });
    },
    addEventListener() {}, removeEventListener() {}
  };
  Object.defineProperty(win, 'speechSynthesis', { configurable: true, value: synth });
  win.SpeechSynthesisUtterance = class { constructor(text = '') { this.text = text; this.lang = 'en-US'; this.rate = 1; this.pitch = 1; this.volume = 1; } };
  void tts.getSupportedVoices().then(result => {
    voices = (result.voices || []).map(v => ({ ...v, name: v.name, lang: v.lang, localService: true, default: false, voiceURI: v.voiceURI || v.name }));
    synth.onvoiceschanged?.(new Event('voiceschanged'));
  }).catch(() => {});
}

 // Dedicated Papi bridge: events carry a session ID so an old callback cannot grade a new turn.
export function papiRecognitionClass(plugin) {
  let sequence = 0, current = null;
  return class PapiRecognition {
    lang = 'en-US'; interimResults = true; active = false;
    start() {
      if (current) throw Error('Mikrofon zaten kullanılıyor.');
      this.active = true; current = this;
      this.session = Date.now() + '-' + (++sequence);
      void this.run();
    }
    async run() {
      try {
        const handle = await plugin.addListener('speech', e => {
          if (!this.active || e.session !== this.session) return;
          if (e.kind === 'ready') this.onstart?.();
          else if (e.kind === 'speechstart') this.onspeechstart?.();
          else if (e.kind === 'partial' || e.kind === 'final') {
            const result = [{ transcript: e.value, confidence: 0 }];
            result.isFinal = e.kind === 'final';
            this.onresult?.({ results: [result], resultIndex: 0 });
            if (result.isFinal) this.finish();
          } else if (e.kind === 'error') {
            this.onerror?.({ error: e.value }); this.finish();
          }
        });
        if (!this.active) { await handle.remove(); return; }
        this.handle = handle;
        await plugin.start({ session: this.session, language: this.lang });
        if (!this.active) await plugin.abort({ session: this.session });
      } catch (error) {
        if (this.active) { this.onerror?.({ error: error.code || 'audio-capture' }); this.finish(); }
      }
    }
    finish() {
      if (!this.active) return;
      this.active = false;
      if (current === this) current = null;
      if (this.handle) void Promise.resolve(this.handle.remove()).catch(() => {});
      this.onend?.();
    }
    abort() {
      if (!this.active) return;
      this.finish();
      void plugin.abort({ session: this.session }).catch(() => {});
    }
    stop() { this.abort(); }
  };
}
