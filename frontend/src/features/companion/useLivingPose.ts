import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { WAVE_FRAMES, WAVE_FRAME_MS, hasBlink } from './companionAssets';
import type { CompanionState } from './types';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Small "alive" behaviours layered on top of the companion's task state:
 * occasional blinks, a wave when greeted, and a rare idle glance. Everything
 * is slow and infrequent, and switched off for reduced-motion users.
 */
export function useLivingPose(state: CompanionState, { greetKey = 0, idleVariety = false, paused = false } = {}) {
  const reduce = useReducedMotion();
  const [blink, setBlink] = useState(false);
  const [override, setOverride] = useState<CompanionState | null>(null);
  const [waveFrame, setWaveFrame] = useState<number | null>(null);
  const lastGreet = useRef(0);

  // Blink every few seconds on poses that have an eyes-closed frame.
  useEffect(() => {
    if (reduce) return;
    let open: number | undefined;
    let close: number | undefined;
    const schedule = () => {
      open = window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          setBlink(true);
          close = window.setTimeout(() => setBlink(false), 140);
        }
        schedule();
      }, rand(2800, 6200));
    };
    schedule();
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(close);
    };
  }, [reduce]);

  // Wave when greeted (first appearance, hover), at most every 8 seconds.
  // Plays the 8 wave frames once; reduced motion gets the still greeting pose.
  useEffect(() => {
    if (!greetKey || state !== 'idle' || paused) return;
    const now = Date.now();
    if (now - lastGreet.current < 8000) return;
    lastGreet.current = now;
    if (reduce) {
      setOverride('greeting');
      const t = window.setTimeout(() => setOverride(null), 1600);
      return () => window.clearTimeout(t);
    }
    let frame = 0;
    setWaveFrame(0);
    const timer = window.setInterval(() => {
      frame += 1;
      if (frame >= WAVE_FRAMES.length) {
        window.clearInterval(timer);
        setWaveFrame(null);
      } else {
        setWaveFrame(frame);
      }
    }, WAVE_FRAME_MS);
    return () => {
      window.clearInterval(timer);
      setWaveFrame(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greetKey]);

  // A task state or a drag always wins over the wave.
  useEffect(() => {
    if (state !== 'idle' || paused) setWaveFrame(null);
  }, [state, paused]);

  // A rare, quiet glance while idle so the character doesn't feel frozen.
  useEffect(() => {
    if (reduce || !idleVariety || state !== 'idle') return;
    let t: number | undefined;
    let back: number | undefined;
    const schedule = () => {
      t = window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          setOverride((o) => o || 'thinking');
          back = window.setTimeout(() => setOverride((o) => (o === 'thinking' ? null : o)), 2400);
        }
        schedule();
      }, rand(28000, 48000));
    };
    schedule();
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(back);
    };
  }, [reduce, idleVariety, state]);

  const pose = state === 'idle' && !paused && override ? override : state;
  const waving = waveFrame !== null && state === 'idle' && !paused;
  return {
    pose,
    blink: !waving && blink && hasBlink(pose),
    frameSrc: waving ? WAVE_FRAMES[waveFrame] : null,
  };
}
