// Voice match: turns a few seconds of speech into a small "voice fingerprint"
// and compares fingerprints. Shared by the browser (which records) and the
// server (which stores the owner's fingerprint and decides).
//
// The fingerprint describes the shape of the voice, not the words:
//   - 12 MFCCs (the vocal tract's spectral envelope), mean and spread,
//   - the typical pitch of the voice.
// This is a classic, lightweight speaker-verification approach. It reliably
// separates clearly different voices (for example a man and a woman, or an
// adult and a child) but it is NOT bank-grade: similar voices and recordings
// can pass. A product would use a trained speaker-embedding model with liveness
// checks. The interface (extractEmbedding / buildProfile / compareToProfile)
// stays the same, so the model can be swapped in later.

export const VOICEPRINT_VERSION = 1;
const TARGET_RATE = 16000;
const FRAME = 400; // 25 ms at 16 kHz
const HOP = 160; // 10 ms
const NFFT = 512;
const MELS = 26;
const CEPS = 12;
export const MIN_VOICED_FRAMES = 35; // about a third of a second of speech

// ---- signal helpers -----------------------------------------------------------

function downsample(samples, rate) {
  if (rate <= TARGET_RATE) return { data: samples, rate };
  const factor = Math.max(1, Math.floor(rate / TARGET_RATE));
  const out = new Float32Array(Math.floor(samples.length / factor));
  for (let i = 0; i < out.length; i += 1) {
    let sum = 0;
    for (let j = 0; j < factor; j += 1) sum += samples[i * factor + j];
    out[i] = sum / factor;
  }
  return { data: out, rate: rate / factor };
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k += 1) {
        const angle = step * k;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const a = start + k;
        const b = a + half;
        const tr = re[b] * cos - im[b] * sin;
        const ti = re[b] * sin + im[b] * cos;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

const melOf = (hz) => 2595 * Math.log10(1 + hz / 700);
const hzOf = (mel) => 700 * (10 ** (mel / 2595) - 1);

let cachedBank = null;
function melBank(rate) {
  if (cachedBank && cachedBank.rate === rate) return cachedBank.bank;
  const low = melOf(80);
  const high = melOf(Math.min(7600, rate / 2));
  const points = Array.from({ length: MELS + 2 }, (_, i) => hzOf(low + ((high - low) * i) / (MELS + 1)));
  const bins = points.map((hz) => Math.floor(((NFFT + 1) * hz) / rate));
  const bank = [];
  for (let m = 1; m <= MELS; m += 1) {
    const filter = new Float32Array(NFFT / 2 + 1);
    for (let k = bins[m - 1]; k < bins[m]; k += 1) filter[k] = (k - bins[m - 1]) / Math.max(1, bins[m] - bins[m - 1]);
    for (let k = bins[m]; k < bins[m + 1]; k += 1) filter[k] = (bins[m + 1] - k) / Math.max(1, bins[m + 1] - bins[m]);
    bank.push(filter);
  }
  cachedBank = { rate, bank };
  return bank;
}

const HAMMING = Float32Array.from({ length: FRAME }, (_, i) => 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (FRAME - 1)));

function pitchOf(frame, rate) {
  const minLag = Math.floor(rate / 400);
  const maxLag = Math.min(frame.length - 1, Math.floor(rate / 60));
  let energy = 0;
  for (let i = 0; i < frame.length; i += 1) energy += frame[i] * frame[i];
  if (energy <= 1e-9) return null;
  let bestLag = 0;
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let i = 0; i + lag < frame.length; i += 1) sum += frame[i] * frame[i + lag];
    const norm = sum / energy;
    if (norm > best) {
      best = norm;
      bestLag = lag;
    }
  }
  return best > 0.35 && bestLag ? rate / bestLag : null;
}

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

// ---- fingerprint ------------------------------------------------------------------

// samples: Float32Array of mono audio in [-1, 1]. Returns null when there is
// not enough speech in it to say anything.
export function extractEmbedding(samples, sampleRate) {
  if (!samples || samples.length < FRAME * 4) return null;
  const { data, rate } = downsample(samples, sampleRate);
  const bank = melBank(rate);

  const frames = [];
  for (let start = 0; start + FRAME <= data.length; start += HOP) {
    let energy = 0;
    for (let i = 0; i < FRAME; i += 1) energy += data[start + i] * data[start + i];
    frames.push({ start, rms: Math.sqrt(energy / FRAME) });
  }
  if (frames.length < 10) return null;

  // Speech frames: clearly louder than the quiet parts of this recording.
  const levels = frames.map((frame) => frame.rms).sort((a, b) => a - b);
  const floor = levels[Math.floor(levels.length * 0.15)];
  const loud = levels[Math.floor(levels.length * 0.95)];
  const gate = Math.max(floor * 3, loud * 0.12, 0.004);
  const voiced = frames.filter((frame) => frame.rms >= gate);
  if (voiced.length < MIN_VOICED_FRAMES) return null;

  const ceps = [];
  const pitches = [];
  const re = new Float32Array(NFFT);
  const im = new Float32Array(NFFT);
  const logMel = new Float32Array(MELS);

  for (const { start } of voiced) {
    re.fill(0);
    im.fill(0);
    let previous = start > 0 ? data[start - 1] : 0;
    const raw = data.subarray(start, start + FRAME);
    for (let i = 0; i < FRAME; i += 1) {
      const value = raw[i] - 0.97 * previous; // pre-emphasis
      previous = raw[i];
      re[i] = value * HAMMING[i];
    }
    fft(re, im);
    for (let m = 0; m < MELS; m += 1) {
      const filter = bank[m];
      let sum = 0;
      for (let k = 0; k <= NFFT / 2; k += 1) {
        if (filter[k]) sum += filter[k] * (re[k] * re[k] + im[k] * im[k]);
      }
      logMel[m] = Math.log(sum + 1e-10);
    }
    const c = new Float32Array(CEPS);
    for (let n = 1; n <= CEPS; n += 1) {
      let sum = 0;
      for (let m = 0; m < MELS; m += 1) sum += logMel[m] * Math.cos((Math.PI * n * (m + 0.5)) / MELS);
      c[n - 1] = sum * Math.sqrt(2 / MELS);
    }
    ceps.push(c);
    const pitch = pitchOf(raw, rate);
    if (pitch) pitches.push(pitch);
  }

  const mean = new Array(CEPS).fill(0);
  for (const c of ceps) for (let i = 0; i < CEPS; i += 1) mean[i] += c[i] / ceps.length;
  const spread = new Array(CEPS).fill(0);
  for (const c of ceps) for (let i = 0; i < CEPS; i += 1) spread[i] += (c[i] - mean[i]) ** 2 / ceps.length;
  for (let i = 0; i < CEPS; i += 1) spread[i] = Math.sqrt(spread[i]);

  const f0 = pitches.length >= voiced.length * 0.2 ? median(pitches) : null;
  const round = (value) => Math.round(value * 1000) / 1000;
  return {
    version: VOICEPRINT_VERSION,
    mean: mean.map(round),
    spread: spread.map(round),
    f0: f0 ? Math.round(f0 * 10) / 10 : null,
    voicedFrames: voiced.length
  };
}

// ---- comparing -------------------------------------------------------------------

const MEAN_SCALE = 1.6;
const SPREAD_SCALE = 1.2;
const PITCH_SCALE = 0.12; // a 12% pitch difference counts as one unit

export function isEmbedding(value) {
  return Boolean(
    value &&
      value.version === VOICEPRINT_VERSION &&
      Array.isArray(value.mean) && value.mean.length === CEPS && value.mean.every(Number.isFinite) &&
      Array.isArray(value.spread) && value.spread.length === CEPS && value.spread.every(Number.isFinite) &&
      (value.f0 === null || (Number.isFinite(value.f0) && value.f0 > 40 && value.f0 < 600)) &&
      Number.isFinite(value.voicedFrames)
  );
}

export function distance(a, b) {
  let sum = 0;
  let dims = 0;
  for (let i = 0; i < CEPS; i += 1) {
    // Low-order coefficients carry most of the speaker information.
    const weight = i < 6 ? 1 : 0.6;
    sum += weight * ((a.mean[i] - b.mean[i]) / MEAN_SCALE) ** 2;
    sum += 0.5 * weight * ((a.spread[i] - b.spread[i]) / SPREAD_SCALE) ** 2;
    dims += 1.5 * weight;
  }
  if (a.f0 && b.f0) {
    sum += 4 * (Math.log(a.f0 / b.f0) / PITCH_SCALE) ** 2;
    dims += 4;
  }
  return Math.sqrt(sum / dims);
}

function average(embeddings) {
  const mean = new Array(CEPS).fill(0);
  const spread = new Array(CEPS).fill(0);
  for (const e of embeddings) {
    for (let i = 0; i < CEPS; i += 1) {
      mean[i] += e.mean[i] / embeddings.length;
      spread[i] += e.spread[i] / embeddings.length;
    }
  }
  const pitches = embeddings.map((e) => e.f0).filter(Boolean);
  const f0 = pitches.length ? Math.exp(pitches.reduce((sum, p) => sum + Math.log(p), 0) / pitches.length) : null;
  return { version: VOICEPRINT_VERSION, mean, spread, f0, voicedFrames: 0 };
}

// Builds the owner's profile from the enrollment samples. The threshold comes
// from how much the owner's own samples differ from each other, so a steady
// voice gets a tight profile and a variable one a looser profile.
export function buildProfile(embeddings, { sensitivity = 1 } = {}) {
  const usable = embeddings.filter(isEmbedding);
  if (usable.length < 2) throw new Error('At least two voice samples are needed');
  const center = average(usable);
  const selfDistances = usable.map((sample, i) => distance(sample, average(usable.filter((_, j) => j !== i))));
  const spreadOfOwner = Math.max(...selfDistances);
  const threshold = Math.min(1.6, Math.max(0.55, spreadOfOwner * 1.6 + 0.25)) / sensitivity;
  return {
    version: VOICEPRINT_VERSION,
    center,
    threshold: Math.round(threshold * 1000) / 1000,
    samples: usable.length,
    createdAt: new Date().toISOString()
  };
}

// decision: 'match', 'mismatch', or 'uncertain' (too little speech, or too close to call).
export function compareToProfile(profile, embedding, { sensitivity = 1 } = {}) {
  if (!isEmbedding(embedding) || embedding.voicedFrames < MIN_VOICED_FRAMES) {
    return { decision: 'uncertain', distance: null, score: null };
  }
  const d = distance(profile.center, embedding);
  const threshold = profile.threshold / sensitivity;
  const score = Math.max(0, Math.min(1, 1 - d / (2 * threshold)));
  // Between the threshold and 1.5x the threshold the voice is "close": not
  // trusted for money, but not treated as a stranger either.
  const decision = d <= threshold ? 'match' : d <= threshold * 1.5 ? 'uncertain' : 'mismatch';
  return {
    decision,
    distance: Math.round(d * 1000) / 1000,
    threshold: Math.round(threshold * 1000) / 1000,
    score: Math.round(score * 100) / 100
  };
}
