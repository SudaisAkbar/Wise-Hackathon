// The voice engine: one place that owns the microphone, speech recognition
// and speech output, so the screens only ask for "speak this", "listen once"
// or "wait for Hey Wise".
//
// Listening uses the browser's speech recognition (Chrome and Edge). At the
// same time the microphone is recorded locally to make a voice fingerprint of
// what was said, so the server can tell whether it was the owner speaking.
import { MicMonitor } from './mic.js';
import { extractEmbedding } from '../../../shared/voiceprint.js';
import { hasWakePhrase } from '../../../shared/spoken.js';

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition || null : null;
const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

const ERRORS = {
  'not-allowed': 'blocked',
  'service-not-allowed': 'blocked',
  'audio-capture': 'blocked',
  'no-speech': 'no-speech',
  network: 'network',
  'language-not-supported': 'network'
};

const norm = (value) => String(value || '').replace('_', '-').toLowerCase();

function splitSentences(text) {
  // Split only where a sentence mark is followed by a space, so "636.12" stays whole.
  return String(text)
    .split(/(?<=[.!?।۔]["”»“]?)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

class VoiceEngine {
  constructor() {
    this.mic = new MicMonitor();
    this.state = {
      enabled: false,
      micError: null,
      mode: 'off', // off | wake | listen | speak
      level: 0,
      canListen: Boolean(Recognition),
      canSpeak: Boolean(synth),
      ttsBlocked: false,
      lastHeard: ''
    };
    this.listeners = new Set();
    this.voices = [];
    this.recognition = null;
    this.speakRun = 0;
    this.wakeRun = 0;
    this.utterance = null;
    if (synth) {
      const load = () => {
        try {
          this.voices = synth.getVoices();
        } catch {
          this.voices = [];
        }
      };
      load();
      synth.addEventListener?.('voiceschanged', load);
    }
  }

  // ---- state for React ------------------------------------------------------

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.state;

  set(patch) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  // Must be called from a tap the first time: browsers only allow the
  // microphone and speech after the person has interacted with the page.
  async enable() {
    if (!this.state.enabled) {
      try {
        await this.mic.start();
        this.set({ micError: null });
      } catch (error) {
        this.set({ micError: error?.name === 'NotAllowedError' ? 'blocked' : 'unavailable' });
      }
      if (synth) {
        try {
          const warmup = new SpeechSynthesisUtterance(' ');
          warmup.volume = 0;
          synth.speak(warmup);
        } catch {
          /* fine */
        }
      }
      this.set({ enabled: true });
      this.watchLevel();
    } else {
      await this.mic.start().catch(() => {});
    }
    return this.state.enabled;
  }

  watchLevel() {
    if (this.levelTimer) return;
    this.levelTimer = setInterval(() => {
      const level = Math.min(1, this.mic.level * 6);
      if (Math.abs(level - this.state.level) > 0.03) this.set({ level });
    }, 90);
  }

  hasVoiceFor(locale) {
    return Boolean(this.findVoice(locale));
  }

  findVoice(locale) {
    if (!this.voices.length && synth) this.voices = synth.getVoices();
    const wanted = norm(locale);
    const language = wanted.split('-')[0];
    const matches = this.voices.filter((voice) => norm(voice.lang).split('-')[0] === language);
    if (!matches.length) return null;
    const score = (voice) =>
      (norm(voice.lang) === wanted ? 4 : 0) + (/natural|neural|online/i.test(voice.name) ? 2 : 0) + (/google/i.test(voice.name) ? 1 : 0);
    return [...matches].sort((a, b) => score(b) - score(a))[0];
  }

  fingerprint(samples) {
    if (!samples || samples.length < 4000) return null;
    try {
      return extractEmbedding(samples, this.mic.rate);
    } catch {
      return null;
    }
  }

  // ---- speaking ---------------------------------------------------------------

  cancelSpeak() {
    this.speakRun += 1;
    this.utterance = null;
    try {
      synth?.cancel();
    } catch {
      /* nothing to cancel */
    }
    if (this.state.mode === 'speak') this.set({ mode: 'off' });
  }

  // alternatives: [{ locale, text }] in order of preference. Resolves when done.
  speak(alternatives, { rate = 0.95 } = {}) {
    this.cancelSpeak();
    const run = this.speakRun;
    return new Promise((resolve) => {
      if (!synth) {
        resolve({ spoken: false });
        return;
      }
      const start = (waited = 0) => {
        if (run !== this.speakRun) return resolve({ spoken: false, cancelled: true });
        let choice = null;
        for (const option of alternatives || []) {
          const voice = this.findVoice(option.locale);
          if (voice) {
            choice = { text: option.text, voice };
            break;
          }
        }
        if (!choice && waited < 800 && !this.voices.length) {
          setTimeout(() => start(waited + 100), 100);
          return;
        }
        if (!choice) return resolve({ spoken: false });

        const parts = splitSentences(choice.text);
        let index = 0;
        let watchdog = null;
        let anyStarted = false;
        this.set({ mode: 'speak' });

        const next = () => {
          clearTimeout(watchdog);
          if (run !== this.speakRun) return resolve({ spoken: anyStarted, cancelled: true });
          if (index >= parts.length) {
            this.utterance = null;
            if (this.state.mode === 'speak') this.set({ mode: 'off' });
            return resolve({ spoken: true });
          }
          const part = parts[index];
          index += 1;
          const utterance = new SpeechSynthesisUtterance(part);
          utterance.voice = choice.voice;
          utterance.lang = choice.voice.lang;
          utterance.rate = rate;
          let moved = false;
          const advance = () => {
            if (moved) return;
            moved = true;
            next();
          };
          utterance.onstart = () => {
            anyStarted = true;
            if (this.state.ttsBlocked) this.set({ ttsBlocked: false });
          };
          utterance.onend = advance;
          utterance.onerror = (event) => {
            if (event.error === 'interrupted' || event.error === 'canceled') return;
            if (event.error === 'not-allowed') this.set({ ttsBlocked: true });
            advance();
          };
          this.utterance = utterance;
          watchdog = setTimeout(advance, 2500 + part.length * 120);
          synth.speak(utterance);
        };
        setTimeout(next, 60);
      };
      start();
    });
  }

  // ---- listening ----------------------------------------------------------------

  stopRecognition({ discard = false } = {}) {
    const recognition = this.recognition;
    if (!recognition) return;
    try {
      if (discard) {
        recognition.discarded = true;
        recognition.abort();
      } else {
        recognition.stop();
      }
    } catch {
      /* already stopped */
    }
  }

  // Ends the current utterance now (for hold-to-talk) and keeps what was heard.
  finishListening() {
    this.stopRecognition();
  }

  // Listens for one utterance. Resolves { text, embedding } or { error }.
  listenOnce({ locale, onInterim } = {}) {
    if (!Recognition) return Promise.resolve({ error: 'unsupported' });
    this.cancelSpeak();
    this.cancelWake();
    this.stopRecognition({ discard: true });

    return new Promise((resolve) => {
      const recognition = new Recognition();
      recognition.lang = locale;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      this.recognition = recognition;

      let finalText = '';
      let interimText = '';
      let failed = null;
      let mark = this.mic.mark();
      this.set({ mode: 'listen' });

      recognition.onstart = () => {
        mark = this.mic.mark();
      };
      recognition.onresult = (event) => {
        interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript;
          else interimText += result[0].transcript;
        }
        onInterim?.(`${finalText} ${interimText}`.trim());
      };
      recognition.onerror = (event) => {
        if (event.error === 'aborted') return;
        failed = ERRORS[event.error] || 'network';
      };
      recognition.onend = () => {
        if (this.recognition === recognition) this.recognition = null;
        if (this.state.mode === 'listen') this.set({ mode: 'off' });
        if (recognition.discarded) return resolve({ error: 'aborted' });
        const text = (finalText || interimText).trim();
        if (!text) return resolve({ error: failed || 'no-speech' });
        // A little audio from just before recognition started, in case the
        // person began talking straight away.
        const samples = this.mic.slice(mark - Math.round(this.mic.rate * 0.4));
        this.set({ lastHeard: text });
        resolve({ text, embedding: this.fingerprint(samples) });
      };

      try {
        recognition.start();
      } catch {
        this.recognition = null;
        this.set({ mode: 'off' });
        resolve({ error: 'unsupported' });
      }
    });
  }

  // Waits, as long as it takes, for "Hey Wise". Resolves { text, embedding },
  // or null when cancelled.
  waitForWake({ locale = 'en-US', onHeard } = {}) {
    if (!Recognition) return Promise.resolve(null);
    this.cancelWake();
    this.stopRecognition({ discard: true });
    const run = ++this.wakeRun;
    this.set({ mode: 'wake' });

    return new Promise((resolve) => {
      let failures = 0;
      const begin = () => {
        if (run !== this.wakeRun) return resolve(null);
        const recognition = new Recognition();
        recognition.lang = locale;
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 3;
        this.recognition = recognition;
        let done = false;

        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            for (let a = 0; a < result.length; a += 1) {
              const text = result[a].transcript;
              onHeard?.(text);
              if (!done && hasWakePhrase(text)) {
                done = true;
                // The wake phrase is the last thing said: fingerprint the last seconds.
                const samples = this.mic.lastSeconds(2.6);
                recognition.discarded = true;
                try {
                  recognition.abort();
                } catch {
                  /* fine */
                }
                this.wakeRun += 1;
                this.set({ mode: 'off', lastHeard: text });
                resolve({ text, embedding: this.fingerprint(samples) });
                return;
              }
            }
          }
        };
        recognition.onerror = (event) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') failures = 99;
          else if (event.error !== 'no-speech' && event.error !== 'aborted') failures += 1;
        };
        recognition.onend = () => {
          if (this.recognition === recognition) this.recognition = null;
          if (done || recognition.discarded || run !== this.wakeRun) return;
          if (failures > 5) {
            this.set({ mode: 'off' });
            resolve(null);
            return;
          }
          // Chrome ends continuous recognition after a while: just start again.
          setTimeout(begin, failures ? 800 : 150);
        };
        try {
          recognition.start();
        } catch {
          setTimeout(begin, 500);
        }
      };
      begin();
    });
  }

  cancelWake() {
    if (this.state.mode === 'wake') {
      this.wakeRun += 1;
      this.stopRecognition({ discard: true });
      this.set({ mode: 'off' });
    } else {
      this.wakeRun += 1;
    }
  }

  stopAll() {
    this.cancelSpeak();
    this.cancelWake();
    this.stopRecognition({ discard: true });
    this.set({ mode: 'off' });
  }
}

export const engine = new VoiceEngine();
