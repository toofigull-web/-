import penScratchAsset from './assets/penScratch.mp3';

/**
 * Minimal shape of the Web Audio APIs PenSoundEngine depends on. Declared
 * explicitly (rather than importing the full lib.dom AudioContext type
 * everywhere) so a lightweight fake can be substituted in tests without a
 * real browser audio stack.
 */
export interface AudioContextLike {
  currentTime: number;
  destination: AudioDestinationNode | unknown;
  state: string;
  createGain(): GainNode;
  createBufferSource(): AudioBufferSourceNode;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer>;
  resume?(): Promise<void>;
  close?(): Promise<void>;
}

export type AudioContextFactory = () => AudioContextLike;

const FADE_SECONDS = 0.02; // ~20ms fade in/out to avoid clicks at loop edges.

function defaultAudioContextFactory(): AudioContextLike {
  const Ctor =
    (typeof window !== 'undefined' &&
      ((window as unknown as { AudioContext?: new () => AudioContextLike }).AudioContext ||
        (window as unknown as { webkitAudioContext?: new () => AudioContextLike })
          .webkitAudioContext)) ||
    undefined;
  if (!Ctor) {
    throw new Error('Web Audio API is not available in this environment.');
  }
  return new Ctor();
}

/**
 * Plays the pen-scratch sound on a loop with short fade envelopes, on its
 * own isolated gain node. Fully separate from any future voiceover/music
 * channel (neither exists yet).
 */
export class PenSoundEngine {
  private readonly context: AudioContextLike;
  private readonly fetchImpl: typeof fetch;
  private buffer: AudioBuffer | null = null;
  private loadPromise: Promise<AudioBuffer> | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private volume = 1;
  private playing = false;
  private disposed = false;
  /** Set true if starting playback ever throws (e.g. autoplay policy
   * blocking audio before a user gesture). Playback is then a silent
   * no-op rather than a thrown error. */
  public blockedByAutoplayPolicy = false;

  constructor(
    audioContextFactory: AudioContextFactory = defaultAudioContextFactory,
    fetchImpl: typeof fetch = fetch,
  ) {
    this.context = audioContextFactory();
    this.fetchImpl = fetchImpl;
  }

  private async ensureLoaded(): Promise<AudioBuffer> {
    if (this.buffer) return this.buffer;
    if (!this.loadPromise) {
      this.loadPromise = this.fetchImpl(penScratchAsset)
        .then((res) => res.arrayBuffer())
        .then((data) => this.context.decodeAudioData(data))
        .then((decoded) => {
          this.buffer = decoded;
          return decoded;
        });
    }
    return this.loadPromise;
  }

  /**
   * Begins looped playback with a short fade-in. Safe to call multiple
   * times in a row while already playing (no-ops rather than stacking
   * sources). Never throws — if the browser's autoplay policy blocks
   * playback (no user gesture yet), it fails silently and sets
   * `blockedByAutoplayPolicy = true` instead.
   */
  async start(): Promise<void> {
    if (this.disposed || this.playing) return;

    try {
      const buffer = await this.ensureLoaded();
      if (this.disposed) return;

      const gain = this.context.createGain();
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const now = this.context.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(this.volume, now + FADE_SECONDS);

      source.connect(gain);
      gain.connect(this.context.destination as AudioNode);

      if (this.context.resume) {
        await this.context.resume();
      }
      source.start(0);

      this.source = source;
      this.gainNode = gain;
      this.playing = true;
    } catch {
      // Autoplay-policy or decode failure: fail silently, never throw.
      this.blockedByAutoplayPolicy = true;
      this.playing = false;
    }
  }

  /**
   * Fades out over a short envelope, then stops the source. Safe to call
   * when not currently playing (no-op).
   */
  stop(): void {
    if (!this.playing || !this.source || !this.gainNode) return;

    const now = this.context.currentTime;
    try {
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
      this.source.stop(now + FADE_SECONDS);
    } catch {
      // Source may already be stopped/finished; nothing further to do.
    }

    this.source = null;
    this.gainNode = null;
    this.playing = false;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume, this.context.currentTime);
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
    void this.context.close?.();
  }
}
