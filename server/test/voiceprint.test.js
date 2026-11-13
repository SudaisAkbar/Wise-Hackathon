import test from 'node:test';
import assert from 'node:assert/strict';
import { extractEmbedding, buildProfile, compareToProfile, isEmbedding } from '../../shared/voiceprint.js';
import { VOICES, speak } from './helpers/synthVoice.js';

const fp = (voice, variant, seconds = 1.6, rate = 48000) => extractEmbedding(speak(VOICES[voice], { variant, seconds, rate }), rate);
const profile = buildProfile([fp('owner', 1), fp('owner', 2), fp('owner', 3)]);

test('a fingerprint is small, valid and finds the pitch', () => {
  const e = fp('owner', 4);
  assert.ok(isEmbedding(e));
  assert.ok(Math.abs(e.f0 - 205) < 15, `pitch ${e.f0}`);
  assert.ok(e.voicedFrames > 80);
});

test('the owner matches, on another day and at another sample rate', () => {
  assert.equal(compareToProfile(profile, fp('owner', 5)).decision, 'match');
  assert.equal(compareToProfile(profile, fp('ownerTired', 6)).decision, 'match');
  assert.equal(compareToProfile(profile, fp('owner', 7, 1.6, 16000)).decision, 'match');
});

test('clearly different voices are rejected', () => {
  assert.equal(compareToProfile(profile, fp('man', 1)).decision, 'mismatch');
  assert.equal(compareToProfile(profile, fp('child', 2)).decision, 'mismatch');
});

test('a similar voice is never a match, and too little speech is uncertain', () => {
  assert.notEqual(compareToProfile(profile, fp('similarWoman', 3)).decision, 'match');
  assert.equal(extractEmbedding(new Float32Array(48000), 48000), null, 'silence has no fingerprint');
  assert.equal(compareToProfile(profile, null).decision, 'uncertain');
  assert.equal(compareToProfile(profile, { version: 1, mean: [1], spread: [1], f0: 100, voicedFrames: 50 }).decision, 'uncertain');
});

test('a profile needs at least two good samples', () => {
  assert.throws(() => buildProfile([fp('owner', 8)]));
  assert.throws(() => buildProfile([null, { nonsense: true }]));
});
