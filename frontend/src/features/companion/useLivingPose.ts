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
          close = window.setTimeout(() => setBlink(false), 110);
        }
        schedule();
      }, rand(1500, 3500));
    };
    schedule();
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(close);
    };
  }, [reduce]);

  // Wave every time it's greeted (first appearance, each hover). A wave that's
  // already playing finishes instead of restarting, so quick re-hovers don't
  // stutter. Reduced motion gets the still greeting pose instead.
  const waveTimer = useRef<number>();
  useEffect(() => {
    if (!greetKey || state !== 'idle' || paused) return;
    const now = Date.now();
    const busyFor = reduce ? 1600 : WAVE_FRAMES.length * WAVE_FRAME_MS;
    if (now - lastGreet.current < busyFor) return;
    lastGreet.current = now;
    window.clearInterval(waveTimer.current);
    if (reduce) {
      setOverride('greeting');
      waveTimer.current = window.setTimeout(() => setOverride(null), 1600);
      return;
    }
    let frame = 0;
    setWaveFrame(0);
    waveTimer.current = window.setInterval(() => {
      frame += 1;
      if (frame >= WAVE_FRAMES.length) {
        window.clearInterval(waveTimer.current);
        setWaveFrame(null);
      } else {
        setWaveFrame(frame);
      }
    }, WAVE_FRAME_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greetKey]);
  useEffect(() => () => window.clearInterval(waveTimer.current), []);

  // A task state or a drag always wins over the wave.
  useEffect(() => {
    if (state !== 'idle' || paused) {
      window.clearInterval(waveTimer.current);
      setWaveFrame(null);
    }
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
