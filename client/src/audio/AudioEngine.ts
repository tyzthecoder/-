import type { Tone } from '../content/depth';
import { toneWeights } from '../content/depth';

// A fully generative, three-zone ambient engine. There are no audio assets
// to license or ship — every tone is synthesized with the Web Audio API and
// crossfaded continuously by scroll depth, so the soundtrack shifts exactly
// in step with the visuals without ever needing a hard cut between tracks.

interface ZoneVoice {
  oscillators: OscillatorNode[];
  filter: BiquadFilterNode;
  gain: GainNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
}

const ZONE_CHORDS: Record<Tone, number[]> = {
  // Bright, consonant, wide — major-ish pad.
  light: [261.63, 329.63, 392.0, 440.0],
  // Suspended, ambiguous — neither happy nor sad.
  mid: [220.0, 261.63, 293.66, 349.23],
  // Tight, dissonant intervals (minor seconds) for unease, plus a sub rumble.
  deep: [55.0, 110.0, 116.54, 207.65],
};

const ZONE_FILTER_FREQ: Record<Tone, number> = {
  light: 2200,
  mid: 1100,
  deep: 420,
};

const ZONE_WAVE: Record<Tone, OscillatorType> = {
  light: 'triangle',
  mid: 'sine',
  deep: 'sine',
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muteGain: GainNode | null = null;
  private zones: Partial<Record<Tone, ZoneVoice>> = {};
  private noise: { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private started = false;
  private targetVolume = 0.16;

  get isStarted() {
    return this.started;
  }

  /** Must be called from within a user gesture (click) due to autoplay policies. */
  start() {
    if (this.started) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.targetVolume;

    this.muteGain = this.ctx.createGain();
    this.muteGain.gain.value = 1;

    this.master.connect(this.muteGain).connect(this.ctx.destination);

    (Object.keys(ZONE_CHORDS) as Tone[]).forEach((tone) => {
      this.zones[tone] = this.buildZone(tone);
    });

    this.noise = this.buildNoiseBed();

    this.started = true;
    this.setDepth(0);
  }

  private buildZone(tone: Tone): ZoneVoice {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = ZONE_FILTER_FREQ[tone];
    filter.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.value = 0; // crossfaded in by setDepth()

    filter.connect(gain).connect(this.master!);

    const oscillators = ZONE_CHORDS[tone].map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = ZONE_WAVE[tone];
      osc.frequency.value = freq;
      osc.detune.value = (i % 2 === 0 ? -1 : 1) * (3 + i * 2); // gentle chorus/beating

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 1 / (ZONE_CHORDS[tone].length + 1);

      osc.connect(voiceGain).connect(filter);
      osc.start();
      return osc;
    });

    // A slow, slightly irregular LFO breathes the filter cutoff so the pad
    // never feels static, even holding still on one depth for a long time.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = tone === 'deep' ? 0.035 : tone === 'mid' ? 0.06 : 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = ZONE_FILTER_FREQ[tone] * (tone === 'deep' ? 0.35 : 0.2);
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    return { oscillators, filter, gain, lfo, lfoGain };
  }

  private buildNoiseBed() {
    const ctx = this.ctx!;
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Brown-ish noise: integrate white noise so it reads as "wind" rather than hiss.
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(filter).connect(gain).connect(this.master!);
    source.start();

    return { source, filter, gain };
  }

  /** Called continuously (throttled by the caller) as scroll depth changes, t in [0,1]. */
  setDepth(t: number) {
    if (!this.started || !this.ctx) return;
    const weights = toneWeights(t);
    const now = this.ctx.currentTime;
    const smoothing = 2.2; // seconds — how gently zones crossfade

    (Object.keys(weights) as Tone[]).forEach((tone) => {
      const zone = this.zones[tone];
      if (!zone) return;
      zone.gain.gain.setTargetAtTime(weights[tone] * 0.9, now, smoothing);
    });

    if (this.noise) {
      // Noise bed grows with depth — subtle shimmer up top, a low unsettling
      // wind by the bottom.
      const noiseLevel = 0.015 + t * 0.09;
      this.noise.gain.gain.setTargetAtTime(noiseLevel, now, smoothing);
      this.noise.filter.frequency.setTargetAtTime(500 - t * 300, now, smoothing);
    }
  }

  setMuted(muted: boolean) {
    if (!this.ctx || !this.muteGain) return;
    const now = this.ctx.currentTime;
    this.muteGain.gain.setTargetAtTime(muted ? 0 : 1, now, 0.25);
    if (this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume().catch(() => {});
    }
  }

  dispose() {
    if (!this.ctx) return;
    Object.values(this.zones).forEach((zone) => {
      zone?.oscillators.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      try {
        zone?.lfo.stop();
      } catch {
        /* already stopped */
      }
    });
    try {
      this.noise?.source.stop();
    } catch {
      /* already stopped */
    }
    this.ctx.close().catch(() => {});
    this.ctx = null;
    this.started = false;
  }
}

export const audioEngine = new AudioEngine();
