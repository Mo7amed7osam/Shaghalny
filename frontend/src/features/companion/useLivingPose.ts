import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { hasBlink } from './companionAssets';
import type { CompanionState } from './types';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Length of the one-shot wave; matches the sprite animation in companion.css. */
export const GREET_DURATION_MS = 1200;
const GREET_COOLDOWN_MS = 8000;

/**
 * Small "alive" behaviours layered on top of the companion's task state:
 * occasional blinks, a wave when greeted, and a rare idle glance. Everything
 * is slow and infrequent, and switched off for reduced-motion users.
 */
export function useLivingPose(state: CompanionState, { greetKey = 0, idleVariety = false } = {}) {
  const reduce = useReducedMotion();
  const [blink, setBlink] = useState(false);
  const [override, setOverride] = useState<CompanionState | null>(null);
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
  // The reset lives in a ref so a re-hover inside the cooldown, or a state
  // change mid-wave, can't cancel it and leave the greeting pose stuck.
  const greetReset = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!greetKey || state !== 'idle') return;
    const now = Date.now();
    if (now - lastGreet.current < GREET_COOLDOWN_MS) return;
    lastGreet.current = now;
    setOverride('greeting');
    window.clearTimeout(greetReset.current);
    greetReset.current = window.setTimeout(() => setOverride((o) => (o === 'greeting' ? null : o)), GREET_DURATION_MS);
  }, [greetKey, state]);
  useEffect(() => () => window.clearTimeout(greetReset.current), []);

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

  const pose = state === 'idle' && override ? override : state;
  return { pose, blink: blink && hasBlink(pose) };
}
