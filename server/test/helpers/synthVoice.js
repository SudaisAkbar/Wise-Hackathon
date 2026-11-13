// Synthetic "voices" for tests: a pulse train (the vocal folds) at a given
// pitch, shaped by resonances (the vocal tract), with syllable-like pauses.
// Different pitch and resonances stand in for different people.
export const VOICES = {
  owner: { f0: 205, formants: [[750, 90], [1250, 110], [2800, 160]] }, // an older woman
  ownerTired: { f0: 196, formants: [[740, 95], [1270, 115], [2760, 170]] }, // same person, another day
  man: { f0: 112, formants: [[620, 80], [1050, 100], [2450, 150]] },
  child: { f0: 290, formants: [[900, 110], [1600, 130], [3200, 180]] },
  similarWoman: { f0: 228, formants: [[820, 90], [1450, 110], [2950, 160]] }
};

function resonator(input, rate, freq, bandwidth) {
  const r = Math.exp((-Math.PI * bandwidth) / rate);
  const a1 = 2 * r * Math.cos((2 * Math.PI * freq) / rate);
  const a2 = -r * r;
  const out = new Float32Array(input.length);
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i += 1) {
    const y = input[i] + a1 * y1 + a2 * y2;
    out[i] = y;
    y2 = y1;
    y1 = y;
  }
  return out;
}

let seed = 7;
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

export function speak(voice, { seconds = 1.6, rate = 48000, noise = 0.003, variant = 0 } = {}) {
  const n = Math.floor(seconds * rate);
  const source = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / rate;
    // Syllables: 4 per second, with short pauses and a little pitch movement.
    const syllable = (t * 4 + variant * 0.37) % 1;
    const voicedNow = syllable < 0.72 && t > 0.15 && t < seconds - 0.1;
    const f0 = voice.f0 * (1 + 0.06 * Math.sin(2 * Math.PI * (0.7 + variant * 0.1) * t));
    phase += f0 / rate;
    if (voicedNow && phase >= 1) {
      phase -= 1;
      source[i] = 1;
    }
  }
  let signal = source;
  let mix = new Float32Array(n);
  for (const [freq, bw] of voice.formants) {
    const shaped = resonator(signal, rate, freq * (1 + variant * 0.01), bw);
    for (let i = 0; i < n; i += 1) mix[i] += shaped[i];
  }
  let peak = 0;
  for (let i = 0; i < n; i += 1) peak = Math.max(peak, Math.abs(mix[i]));
  for (let i = 0; i < n; i += 1) mix[i] = (mix[i] / peak) * 0.5 + (random() * 2 - 1) * noise;
  return mix;
}
