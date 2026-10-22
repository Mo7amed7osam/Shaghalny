import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ALL_POSE_SOURCES, COMPANION_ART, WAVE_FRAMES, resolvePoseSrc, resolveWaveSrc } from './companionAssets';
import type { CompanionState } from './types';

interface CompanionCharacterProps {
  state: CompanionState;
  size?: number;
  /** Show the eyes-closed frame for this pose, when one exists. */
  blink?: boolean;
  className?: string;
  /** Decorative by default; the surrounding control carries the label. */
  label?: string;
}

// Decode every pose once so pose switches and blinks never flash.
const loaded = new Set<string>();
const failed = new Set<string>();
let preloadStarted = false;
const listeners = new Set<() => void>();
function preloadAll() {
  if (preloadStarted || typeof window === 'undefined') return;
  preloadStarted = true;
  ALL_POSE_SOURCES.forEach((src) => {
    const img = new Image();
    img.onload = () => { loaded.add(src); listeners.forEach((l) => l()); };
    img.onerror = () => { failed.add(src); listeners.forEach((l) => l()); };
    img.src = src;
  });
}

/** Lightweight stand-in used until artwork loads or when a file is missing. */
function PlaceholderRobot() {
  return (
    <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true" shapeRendering="crispEdges">
      <rect x="15" y="2" width="2" height="4" fill="#4f46e5" />
      <rect x="14" y="1" width="4" height="2" fill="#6366f1" />
      <rect x="6" y="6" width="20" height="15" fill="#6366f1" />
      <rect x="4" y="11" width="2" height="5" fill="#4338ca" />
      <rect x="26" y="11" width="2" height="5" fill="#4338ca" />
      <rect x="9" y="9" width="14" height="9" fill="#fdf3dc" />
      <rect x="12" y="12" width="2" height="3" fill="#1e1b4b" />
      <rect x="18" y="12" width="2" height="3" fill="#1e1b4b" />
      <rect x="14" y="16" width="4" height="1" fill="#1e1b4b" />
      <rect x="9" y="22" width="14" height="7" fill="#6366f1" />
      <rect x="14" y="24" width="4" height="2" fill="#fdf3dc" />
      <rect x="10" y="29" width="4" height="2" fill="#312e81" />
      <rect x="18" y="29" width="4" height="2" fill="#312e81" />
    </svg>
  );
}

export function CompanionCharacter({ state, size = 56, blink = false, className, label }: CompanionCharacterProps) {
  const [, force] = useState(0);
  useEffect(() => {
    preloadAll();
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const reduce = useReducedMotion();
  // The animated wave plays over the idle art, which stays mounted underneath
  // so the hand-back to idle doesn't re-trigger the pose fade. Reduced motion
  // or a strip that hasn't loaded falls back to the static greeting pose.
  const waveSrc = reduce ? null : resolveWaveSrc(state);
  const waving = Boolean(waveSrc && loaded.has(waveSrc) && !failed.has(waveSrc));
  const shown: CompanionState = waving ? 'idle' : state;

  const base = resolvePoseSrc(shown);
  const blinkSrc = blink && !waving ? resolvePoseSrc(shown, true) : null;
  const src = blinkSrc && loaded.has(blinkSrc) ? blinkSrc : base;
  const showArt = Boolean(src && loaded.has(src) && !failed.has(src));
  const framed = COMPANION_ART.framed;

  return (
    <span
      className={cn(
        'shaghol-char relative inline-flex shrink-0 items-center justify-center',
        framed && showArt && 'overflow-hidden rounded-[28%] bg-[#160f2e] ring-1 ring-brand-500/30',
        className
      )}
      data-state={state}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="shaghol-char__body block h-full w-full">
        {showArt ? (
          <img
            // Pose changes fade in; blinks swap instantly within the same pose.
            key={base || undefined}
            src={src!}
            alt=""
            draggable={false}
            className={cn(
              'shaghol-char__img pointer-events-none h-full w-full select-none',
              framed ? 'object-cover' : 'object-contain',
              waving && 'invisible'
            )}
          />
        ) : (
          <span className="block h-full w-full p-[14%]">
            <PlaceholderRobot />
          </span>
        )}
        {waving && (
          <span className="absolute inset-0 flex items-center justify-center">
            {/* Same 320×316 canvas as the poses, letterboxed like object-contain. */}
            <span
              className="shaghol-char__img shaghol-wave pointer-events-none block w-full"
              style={{ aspectRatio: '320 / 316', backgroundImage: `url(${waveSrc})`, backgroundSize: `${WAVE_FRAMES * 100}% 100%` }}
            />
          </span>
        )}
      </span>
    </span>
  );
}
