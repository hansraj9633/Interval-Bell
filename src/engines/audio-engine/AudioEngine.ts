import {SoundId} from '../../types';
import {getSoundById} from './sounds';

type ActiveMode = 'idle' | 'preview' | 'loop';

interface ActiveVoice {
  stop: (immediate?: boolean) => void;
}

/**
 * Single-instance Web Audio API synthesis engine.
 * Guarantees zero overlapping audio players and immediate stop-on-dismiss.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeVoices: Set<ActiveVoice> = new Set();
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private previewEndTimer: ReturnType<typeof setTimeout> | null = null;
  private mode: ActiveMode = 'idle';
  private currentSoundId: SoundId | null = null;
  private currentVolume = 0.8;
  private generation = 0;
  private listeners: Set<() => void> = new Set();

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.currentVolume;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getState(): {mode: ActiveMode; soundId: SoundId | null} {
    return {mode: this.mode, soundId: this.currentSoundId};
  }

  public setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.02);
    }
  }

  public stop(): void {
    this.generation += 1;
    if (this.loopTimer !== null) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.previewEndTimer !== null) {
      clearTimeout(this.previewEndTimer);
      this.previewEndTimer = null;
    }
    for (const voice of Array.from(this.activeVoices)) {
      voice.stop(true);
    }
    this.activeVoices.clear();
    const changed = this.mode !== 'idle' || this.currentSoundId !== null;
    this.mode = 'idle';
    this.currentSoundId = null;
    if (changed) {
      this.notify();
    }
  }

  public preview(soundId: SoundId, volume: number): void {
    this.stop();
    this.setVolume(volume);
    const ctx = this.ensureContext();
    if (!ctx) return;

    const gen = this.generation;
    this.mode = 'preview';
    this.currentSoundId = soundId;
    this.notify();

    this.triggerSoundPhrase(ctx, soundId, gen);
    const def = getSoundById(soundId);
    this.previewEndTimer = setTimeout(() => {
      if (this.generation === gen && this.mode === 'preview') {
        this.mode = 'idle';
        this.currentSoundId = null;
        this.notify();
      }
    }, Math.min(def.loopIntervalMs, 2800));
  }

  public startLoop(soundId: SoundId, volume: number): void {
    // Enforce single active loop player — stops any prior preview or loop immediately
    this.stop();
    this.setVolume(volume);
    const ctx = this.ensureContext();
    if (!ctx) return;

    const gen = this.generation;
    this.mode = 'loop';
    this.currentSoundId = soundId;
    this.notify();

    const def = getSoundById(soundId);
    const tick = () => {
      if (this.generation !== gen || this.mode !== 'loop') return;
      this.triggerSoundPhrase(ctx, soundId, gen);
      this.loopTimer = setTimeout(tick, def.loopIntervalMs);
    };

    tick();
  }

  public playCompletionCue(soundId: SoundId, volume: number): void {
    this.stop();
    this.setVolume(volume);
    const ctx = this.ensureContext();
    if (!ctx) return;

    const gen = this.generation;
    // Gentle ascending two-note completion cadence
    this.playTone(ctx, 523.25, 'sine', 0, 0.9, 0.22, gen);
    this.playTone(ctx, 659.25, 'sine', 0.22, 1.4, 0.24, gen);
    this.playTone(ctx, 783.99, 'sine', 0.44, 1.8, 0.18, gen);
    // Also echo base sound softly if desired
    if (soundId === 'classic-bell' || soundId === 'soft-bell') {
      this.playBellHarmonic(ctx, 392, 0.5, 2.0, 0.16, gen);
    }
  }

  private registerVoice(voice: ActiveVoice): void {
    this.activeVoices.add(voice);
  }

  private unregisterVoice(voice: ActiveVoice): void {
    this.activeVoices.delete(voice);
  }

  private triggerSoundPhrase(ctx: AudioContext, soundId: SoundId, gen: number): void {
    if (this.generation !== gen || !this.masterGain) return;

    switch (soundId) {
      case 'soft-bell': {
        this.playBellHarmonic(ctx, 432, 0, 2.3, 0.34, gen);
        break;
      }
      case 'classic-bell': {
        this.playBellHarmonic(ctx, 587.33, 0, 2.1, 0.36, gen);
        this.playTone(ctx, 1174.66, 'sine', 0, 0.9, 0.12, gen);
        break;
      }
      case 'double-bell': {
        this.playBellHarmonic(ctx, 528, 0, 1.4, 0.32, gen);
        this.playBellHarmonic(ctx, 528, 0.55, 1.9, 0.34, gen);
        break;
      }
      case 'birds': {
        this.playBirdChirp(ctx, 2100, 2750, 0.02, 0.14, 0.18, gen);
        this.playBirdChirp(ctx, 2400, 3100, 0.24, 0.12, 0.15, gen);
        this.playBirdChirp(ctx, 1950, 2600, 0.65, 0.16, 0.17, gen);
        this.playBirdChirp(ctx, 2500, 2200, 0.88, 0.15, 0.14, gen);
        break;
      }
      case 'rain': {
        this.playFilteredNoise(ctx, 'bandpass', 1100, 0.7, 0, 2.4, 0.22, gen);
        this.playTone(ctx, 740, 'sine', 0.3, 0.35, 0.08, gen);
        this.playTone(ctx, 987, 'sine', 1.1, 0.35, 0.07, gen);
        break;
      }
      case 'forest': {
        this.playFilteredNoise(ctx, 'lowpass', 520, 0.9, 0, 2.6, 0.24, gen);
        this.playTone(ctx, 293.66, 'sine', 0.15, 2.1, 0.12, gen);
        this.playTone(ctx, 440, 'sine', 0.35, 1.9, 0.08, gen);
        break;
      }
      case 'soft-chime': {
        this.playTone(ctx, 587.33, 'triangle', 0, 1.3, 0.2, gen);
        this.playTone(ctx, 783.99, 'triangle', 0.28, 1.4, 0.18, gen);
        this.playTone(ctx, 1046.5, 'sine', 0.56, 1.6, 0.16, gen);
        break;
      }
      case 'gentle-piano': {
        // Warm D major 9th felt chord
        this.playFeltNote(ctx, 293.66, 0, 2.2, 0.2, gen);
        this.playFeltNote(ctx, 440.0, 0.08, 2.1, 0.16, gen);
        this.playFeltNote(ctx, 554.37, 0.16, 2.0, 0.14, gen);
        this.playFeltNote(ctx, 659.25, 0.24, 1.9, 0.12, gen);
        break;
      }
      case 'digital-beep': {
        this.playTone(ctx, 880, 'sine', 0, 0.14, 0.26, gen, 0.005);
        this.playTone(ctx, 1046.5, 'sine', 0.2, 0.18, 0.26, gen, 0.005);
        break;
      }
      case 'short-beep': {
        this.playTone(ctx, 784, 'sine', 0, 0.16, 0.28, gen, 0.005);
        break;
      }
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    delaySec: number,
    durationSec: number,
    peakGain: number,
    gen: number,
    attackSec = 0.02
  ): void {
    if (this.generation !== gen || !this.masterGain) return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + attackSec);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(this.masterGain);

    const voice: ActiveVoice = {
      stop: (immediate = false) => {
        try {
          const t = ctx.currentTime;
          gain.gain.cancelScheduledValues(t);
          if (immediate) {
            gain.gain.setValueAtTime(gain.gain.value, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.02);
            osc.stop(t + 0.03);
          } else {
            osc.stop(t);
          }
        } catch {
          // Ignore already-stopped nodes
        }
      },
    };

    this.registerVoice(voice);
    osc.onended = () => {
      this.unregisterVoice(voice);
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // ignore
      }
    };

    osc.start(now);
    osc.stop(now + durationSec + 0.04);
  }

  private playBellHarmonic(
    ctx: AudioContext,
    baseFreq: number,
    delaySec: number,
    durationSec: number,
    peakGain: number,
    gen: number
  ): void {
    // Rich singing-bowl / bell partial ratios
    this.playTone(ctx, baseFreq, 'sine', delaySec, durationSec, peakGain, gen, 0.01);
    this.playTone(ctx, baseFreq * 2.0, 'sine', delaySec, durationSec * 0.72, peakGain * 0.38, gen, 0.008);
    this.playTone(ctx, baseFreq * 2.76, 'sine', delaySec, durationSec * 0.45, peakGain * 0.18, gen, 0.005);
  }

  private playFeltNote(
    ctx: AudioContext,
    freq: number,
    delaySec: number,
    durationSec: number,
    peakGain: number,
    gen: number
  ): void {
    if (this.generation !== gen || !this.masterGain) return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + durationSec);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    const voice: ActiveVoice = {
      stop: () => {
        try {
          const t = ctx.currentTime;
          gain.gain.cancelScheduledValues(t);
          gain.gain.setValueAtTime(gain.gain.value, t);
          gain.gain.linearRampToValueAtTime(0.0001, t + 0.02);
          osc.stop(t + 0.03);
        } catch {
          // ignore
        }
      },
    };

    this.registerVoice(voice);
    osc.onended = () => {
      this.unregisterVoice(voice);
      try {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // ignore
      }
    };

    osc.start(now);
    osc.stop(now + durationSec + 0.04);
  }

  private playBirdChirp(
    ctx: AudioContext,
    startFreq: number,
    endFreq: number,
    delaySec: number,
    durationSec: number,
    peakGain: number,
    gen: number
  ): void {
    if (this.generation !== gen || !this.masterGain) return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + durationSec * 0.7);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.05, now + durationSec);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(this.masterGain);

    const voice: ActiveVoice = {
      stop: () => {
        try {
          const t = ctx.currentTime;
          gain.gain.cancelScheduledValues(t);
          gain.gain.linearRampToValueAtTime(0.0001, t + 0.015);
          osc.stop(t + 0.025);
        } catch {
          // ignore
        }
      },
    };

    this.registerVoice(voice);
    osc.onended = () => {
      this.unregisterVoice(voice);
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // ignore
      }
    };

    osc.start(now);
    osc.stop(now + durationSec + 0.03);
  }

  private playFilteredNoise(
    ctx: AudioContext,
    filterType: BiquadFilterType,
    centerFreq: number,
    q: number,
    delaySec: number,
    durationSec: number,
    peakGain: number,
    gen: number
  ): void {
    if (this.generation !== gen || !this.masterGain) return;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    // Pink-ish smoothed noise
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.14;
    }

    const now = ctx.currentTime + delaySec;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(centerFreq, now);
    filter.Q.setValueAtTime(q, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.45);
    gain.gain.setValueAtTime(peakGain, now + durationSec - 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    const voice: ActiveVoice = {
      stop: () => {
        try {
          const t = ctx.currentTime;
          gain.gain.cancelScheduledValues(t);
          gain.gain.setValueAtTime(gain.gain.value, t);
          gain.gain.linearRampToValueAtTime(0.0001, t + 0.02);
          source.stop(t + 0.03);
        } catch {
          // ignore
        }
      },
    };

    this.registerVoice(voice);
    source.onended = () => {
      this.unregisterVoice(voice);
      try {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // ignore
      }
    };

    source.start(now);
    source.stop(now + durationSec + 0.04);
  }
}

export const audioEngine = new AudioEngine();
