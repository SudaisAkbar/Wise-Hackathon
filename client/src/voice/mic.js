// Records the microphone continuously into a rolling 12-second buffer while
// voice mode is on. Speech recognition runs separately (it is the browser's
// own); this recording is only used to check WHO is speaking (voice match)
// and to show a live level. Nothing here is uploaded: only a 25-number voice
// fingerprint leaves the browser.

const SECONDS = 12;

export class MicMonitor {
  constructor() {
    this.ctx = null;
    this.stream = null;
    this.node = null;
    this.ring = null;
    this.total = 0;
    this.rate = 48000;
    this.level = 0;
  }

  get running() {
    return Boolean(this.ctx && this.stream);
  }

  async start() {
    if (this.running) {
      await this.ctx.resume().catch(() => {});
      return;
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
    });
    const Context = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Context();
    await this.ctx.resume().catch(() => {});
    this.rate = this.ctx.sampleRate;
    this.ring = new Float32Array(Math.round(this.rate * SECONDS));
    this.total = 0;

    const source = this.ctx.createMediaStreamSource(this.stream);
    // ScriptProcessor is old but works everywhere without a separate worklet file.
    this.node = this.ctx.createScriptProcessor(2048, 1, 1);
    this.node.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const size = this.ring.length;
      let sum = 0;
      for (let i = 0; i < input.length; i += 1) {
        this.ring[(this.total + i) % size] = input[i];
        sum += input[i] * input[i];
      }
      this.total += input.length;
      const rms = Math.sqrt(sum / input.length);
      this.level = Math.max(rms, this.level * 0.85);
    };
    source.connect(this.node);
    this.node.connect(this.ctx.destination); // the processor only runs when connected; it outputs silence
  }

  // A position in the recording, to cut a segment out later.
  mark() {
    return this.total;
  }

  slice(from, to = this.total) {
    if (!this.ring) return null;
    const size = this.ring.length;
    const start = Math.max(from, to - size, 0);
    const length = Math.max(0, to - start);
    const out = new Float32Array(length);
    for (let i = 0; i < length; i += 1) out[i] = this.ring[(start + i) % size];
    return out;
  }

  lastSeconds(seconds) {
    return this.slice(this.total - Math.round(seconds * this.rate));
  }

  stop() {
    try {
      this.node?.disconnect();
      this.stream?.getTracks().forEach((track) => track.stop());
      this.ctx?.close();
    } catch {
      /* already stopped */
    }
    this.ctx = null;
    this.stream = null;
    this.node = null;
  }
}
