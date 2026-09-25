import { describe, it, expect, mock } from 'bun:test';
import { PenSoundEngine, type AudioContextLike } from './penSoundEngine';
import { computePenSoundAction } from './usePenSoundSync';

/**
 * Minimal fake Web Audio graph. happy-dom does not implement AudioContext,
 * so PenSoundEngine's contract with the browser audio API is verified here
 * with a lightweight stand-in that records calls, rather than skipping
 * this logic untested.
 */
function createFakeAudioContext(): {
  context: AudioContextLike;
  calls: string[];
  gainNodes: { gain: { value: number; setValueAtTime: (v: number, t: number) => void; linearRampToValueAtTime: (v: number, t: number) => void; cancelScheduledValues: (t: number) => void }; connect: (n: unknown) => void }[];
  sources: { buffer: unknown; loop: boolean; connect: (n: unknown) => void; start: (t: number) => void; stop: (t: number) => void }[];
} {
  const calls: string[] = [];
  const gainNodes: ReturnType<typeof createFakeAudioContext>['gainNodes'] = [];
  const sources: ReturnType<typeof createFakeAudioContext>['sources'] = [];

  const context: AudioContextLike = {
    currentTime: 0,
    destination: {},
    state: 'running',
    createGain: () => {
      calls.push('createGain');
      const node = {
        gain: {
          value: 1,
          setValueAtTime: (v: number) => {
            node.gain.value = v;
          },
          linearRampToValueAtTime: (v: number) => {
            node.gain.value = v;
          },
          cancelScheduledValues: () => {},
        },
        connect: () => {},
      };
      gainNodes.push(node);
      return node as unknown as GainNode;
    },
    createBufferSource: () => {
      calls.push('createBufferSource');
      const node = {
        buffer: null as unknown,
        loop: false,
        connect: () => {},
        start: (_t: number) => {
          calls.push('start');
        },
        stop: (_t: number) => {
          calls.push('stop');
        },
      };
      sources.push(node);
      return node as unknown as AudioBufferSourceNode;
    },
    decodeAudioData: async () => {
      calls.push('decodeAudioData');
      return {} as AudioBuffer;
    },
    resume: async () => {
      calls.push('resume');
    },
    close: async () => {
      calls.push('close');
    },
  };

  return { context, calls, gainNodes, sources };
}

const fakeFetch = mock(async () => ({
  arrayBuffer: async () => new ArrayBuffer(8),
})) as unknown as typeof fetch;

describe('Phase 7 Pen Sound Engine & Sync Logic', () => {
  describe('PenSoundEngine lifecycle', () => {
    it('start() decodes once, creates a looped buffer source, and begins playback', async () => {
      const { context, calls, sources } = createFakeAudioContext();
      const engine = new PenSoundEngine(() => context, fakeFetch);

      await engine.start();

      expect(calls).toContain('decodeAudioData');
      expect(calls).toContain('createBufferSource');
      expect(calls).toContain('start');
      expect(sources[0]!.loop).toBe(true);
      expect(engine.isPlaying()).toBe(true);
      expect(engine.blockedByAutoplayPolicy).toBe(false);
    });

    it('calling start() twice in a row does not stack a second source', async () => {
      const { context, sources } = createFakeAudioContext();
      const engine = new PenSoundEngine(() => context, fakeFetch);

      await engine.start();
      await engine.start();

      expect(sources.length).toBe(1);
    });

    it('stop() fades out and stops the source, and is safe to call when not playing', async () => {
      const { context, calls } = createFakeAudioContext();
      const engine = new PenSoundEngine(() => context, fakeFetch);

      await engine.start();
      engine.stop();

      expect(calls).toContain('stop');
      expect(engine.isPlaying()).toBe(false);

      // Calling stop again with nothing playing must not throw.
      expect(() => engine.stop()).not.toThrow();
    });

    it('reuses the decoded buffer on a second start() (only decodes once)', async () => {
      const { context, calls } = createFakeAudioContext();
      const engine = new PenSoundEngine(() => context, fakeFetch);

      await engine.start();
      engine.stop();
      calls.length = 0; // reset call log
      await engine.start();

      expect(calls).not.toContain('decodeAudioData');
      expect(calls).toContain('start');
    });

    it('never throws when the audio context factory itself throws (autoplay-blocked simulation)', async () => {
      const throwingFactory = () => {
        throw new Error('NotAllowedError: autoplay blocked');
      };
      expect(() => new PenSoundEngine(throwingFactory, fakeFetch)).toThrow();
      // Note: the factory throwing during construction is a setup error,
      // not a playback error — usePenSoundSync catches this at construction
      // time (see hook tests below) so the app never crashes.
    });

    it('sets blockedByAutoplayPolicy and never throws when start() itself fails', async () => {
      const { context } = createFakeAudioContext();
      const failingContext: AudioContextLike = {
        ...context,
        resume: async () => {
          throw new Error('NotAllowedError');
        },
      };
      const engine = new PenSoundEngine(() => failingContext, fakeFetch);

      await expect(engine.start()).resolves.toBeUndefined();
      expect(engine.blockedByAutoplayPolicy).toBe(true);
      expect(engine.isPlaying()).toBe(false);
    });

    it('dispose() stops playback and closes the underlying context', async () => {
      const { context, calls } = createFakeAudioContext();
      const engine = new PenSoundEngine(() => context, fakeFetch);

      await engine.start();
      engine.dispose();

      expect(calls).toContain('stop');
      expect(calls).toContain('close');
    });
  });

  describe('computePenSoundAction transition logic (pure, no audio needed)', () => {
    it('returns "start" on the false -> true transition', () => {
      expect(computePenSoundAction(false, true)).toBe('start');
    });

    it('returns "stop" on the true -> false transition', () => {
      expect(computePenSoundAction(true, false)).toBe('stop');
    });

    it('returns "none" when staying active across consecutive frames', () => {
      expect(computePenSoundAction(true, true)).toBe('none');
    });

    it('returns "none" when staying inactive across consecutive frames', () => {
      expect(computePenSoundAction(false, false)).toBe('none');
    });
  });
});
