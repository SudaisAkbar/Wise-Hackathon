// The owner's voice profile and the voice-match settings.
// The profile is kept in a small file so it survives a server restart and a
// demo reset (the person should not have to teach their voice again).
import fs from 'node:fs';
import path from 'node:path';
import { config, serverRoot } from '../config.js';
import { buildProfile, compareToProfile, isEmbedding } from '../../../shared/voiceprint.js';

const file = () => config.voiceprintFile || path.join(serverRoot, '.data', 'voiceprint.json');

const state = {
  profile: null,
  // enabled: voice match is used at all. sensitivity: 0.8 relaxed, 1 normal, 1.25 strict.
  settings: { enabled: true, sensitivity: 1 },
  last: null // the most recent decision, for the presenter panel
};

function load() {
  try {
    const saved = JSON.parse(fs.readFileSync(file(), 'utf8'));
    if (saved?.profile?.center && isEmbedding(saved.profile.center)) state.profile = saved.profile;
    if (saved?.settings) state.settings = { ...state.settings, ...saved.settings };
  } catch {
    /* no saved profile yet */
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify({ profile: state.profile, settings: state.settings }, null, 2));
  } catch (error) {
    console.warn(`[voice] could not save the voice profile: ${error.message}`);
  }
}

load();

export function voiceStatus() {
  return {
    enrolled: Boolean(state.profile),
    enabled: state.settings.enabled,
    active: Boolean(state.profile) && state.settings.enabled,
    sensitivity: state.settings.sensitivity,
    samples: state.profile?.samples ?? 0,
    enrolledAt: state.profile?.createdAt ?? null,
    last: state.last
  };
}

export const voiceCheckActive = () => Boolean(state.profile) && state.settings.enabled;

export function enroll(embeddings) {
  state.profile = buildProfile(embeddings);
  state.last = null;
  save();
  return voiceStatus();
}

export function forgetVoice() {
  state.profile = null;
  state.last = null;
  save();
  return voiceStatus();
}

export function updateVoiceSettings({ enabled, sensitivity } = {}) {
  if (typeof enabled === 'boolean') state.settings.enabled = enabled;
  if ([0.8, 1, 1.25].includes(sensitivity)) state.settings.sensitivity = sensitivity;
  save();
  return voiceStatus();
}

// Returns 'match', 'mismatch', 'uncertain', or 'off' when voice match is not in use.
export function checkVoice(embedding, purpose = 'speech') {
  if (!voiceCheckActive()) return { decision: 'off' };
  const result = compareToProfile(state.profile, embedding, { sensitivity: state.settings.sensitivity });
  state.last = { ...result, purpose, at: new Date().toISOString() };
  return result;
}

// Tests only.
export function _resetVoiceForTests() {
  state.profile = null;
  state.settings = { enabled: true, sensitivity: 1 };
  state.last = null;
}
