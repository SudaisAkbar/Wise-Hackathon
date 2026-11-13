// Shared test setup: no network, no Claude key, a throwaway voice profile file.
import os from 'node:os';
import path from 'node:path';
import { config } from '../../src/config.js';
import { resetStore } from '../../src/store.js';
import { _resetVoiceForTests } from '../../src/voice/profile.js';
import { extractEmbedding } from '../../../shared/voiceprint.js';
import { VOICES, speak } from './synthVoice.js';

export function freshState() {
  config.anthropicApiKey = '';
  config.helpLiveFetch = false;
  config.arrivalDelayMs = 10;
  config.voiceprintFile = path.join(os.tmpdir(), `wise-voice-test-${process.pid}.json`);
  _resetVoiceForTests();
  resetStore();
}

let variant = 0;
// A voice fingerprint as the browser would send it.
export function voiceOf(name, seconds = 1.6) {
  variant += 1;
  return { embedding: extractEmbedding(speak(VOICES[name], { variant, seconds }), 48000) };
}
