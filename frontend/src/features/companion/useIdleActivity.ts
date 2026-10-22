import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ACTIVITY_BLEED, IDLE_ACTIVITIES, type IdleActivityName } from './companionAssets';
import { framesReady, preloadFrames } from './CompanionCharacter';

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const FIRST_DELAY: [number, number] = [25000, 40000];
const NEXT_DELAY: [number, number] = [35000, 65000];
const NAMES = Object.keys(IDLE_ACTIVITIES) as IdleActivityName[];

function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

/**
 * Occasional playful idle sequences. Runs only while `enabled` (idle, on
 * screen, not dragged/hidden), the tab is visible and reduced motion is off.
 * Any page interaction restarts the quiet timer; `cancel()` stops a sequence
 * immediately. All timers are cleared when inactive or unmounted.
 */
export function useIdleActivity(enabled: boolean) {
  const reduce = useReducedMotion();
  const visible = usePageVisible();
  const active = enabled && visible && !reduce;
  const [playing, setPlaying] = useState<{ name: IdleActivityName; frame: number } | null>(null);
  const last = useRef<IdleActivityName | null>(null);
  const played = useRef(false);
  const waitTimer = useRef<number>();
  const frameTimer = useRef<number>();
  const [quietKey, setQuietKey] = useState(0);

  const clearTimers = () => {
    window.clearTimeout(waitTimer.current);
    window.clearTimeout(frameTimer.current);
  };

  const cancel = useCallback(() => {
    window.clearTimeout(frameTimer.current);
    setPlaying(null);
    setQuietKey((k) => k + 1);
  }, []);

  // User activity anywhere on the page resets the quiet period (throttled).
  useEffect(() => {
    if (!active) return;
    let lastBump = 0;
    const bump = () => {
      const now = Date.now();
      if (now - lastBump < 1000) return;
      lastBump = now;
      if (!frameTimer.current) setQuietKey((k) => k + 1);
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, [active]);

  // Schedule the next activity after a quiet period.
  useEffect(() => {
    if (!active || playing) return;
    const [min, max] = played.current ? NEXT_DELAY : FIRST_DELAY;
    const choices = NAMES.filter((n) => n !== last.current);
    const name = choices[Math.floor(Math.random() * choices.length)] || NAMES[0];
    // Decode the chosen frames well before they're needed.
    preloadFrames(IDLE_ACTIVITIES[name].frames);
    waitTimer.current = window.setTimeout(() => {
      if (!framesReady(IDLE_ACTIVITIES[name].frames)) {
        setQuietKey((k) => k + 1);
        return;
      }
      last.current = name;
      played.current = true;
      setPlaying({ name, frame: 0 });
    }, rand(min, max));
    return () => window.clearTimeout(waitTimer.current);
  }, [active, playing, quietKey]);

  // Step through frames with per-frame timing, then return to idle.
  useEffect(() => {
    if (!playing) return;
    const { name, frame } = playing;
    const seq = IDLE_ACTIVITIES[name];
    frameTimer.current = window.setTimeout(() => {
      frameTimer.current = undefined;
      setPlaying(frame + 1 < seq.frames.length ? { name, frame: frame + 1 } : null);
    }, seq.durations[frame]);
    return () => {
      window.clearTimeout(frameTimer.current);
      frameTimer.current = undefined;
    };
  }, [playing]);

  // Leaving the active state stops everything at once.
  useEffect(() => {
    if (active) return;
    clearTimers();
    setPlaying(null);
  }, [active]);

  useEffect(() => clearTimers, []);

  // Dev-only hook for QA: window.__shagholIdle('coffee') plays one now.
  useEffect(() => {
    if (!import.meta.env.DEV || !active) return;
    const w = window as unknown as { __shagholIdle?: (n: IdleActivityName) => void };
    w.__shagholIdle = (n) => {
      preloadFrames(IDLE_ACTIVITIES[n].frames);
      window.clearTimeout(waitTimer.current);
      last.current = n;
      played.current = true;
      setPlaying({ name: n, frame: 0 });
    };
    return () => {
      delete w.__shagholIdle;
    };
  }, [active]);

  return {
    activity: playing?.name ?? null,
    frameSrc: playing ? IDLE_ACTIVITIES[playing.name].frames[playing.frame] : null,
    bleed: playing ? ACTIVITY_BLEED : null,
    cancel,
  };
}
