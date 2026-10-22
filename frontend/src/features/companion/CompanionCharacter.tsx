import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ALL_POSE_SOURCES, COMPANION_ART, resolvePoseSrc } from './companionAssets';
import type { CompanionState } from './types';

interface CompanionCharacterProps {
  state: CompanionState;
  size?: number;
  /** Show the eyes-closed frame for this pose, when one exists. */
  blink?: boolean;
  /** An animation frame to show instead of the pose (e.g. the wave). */
  frameSrc?: string | null;
  /** Extra transparent margin of `frameSrc` beyond the pose canvas (fractions). */
  frameBleed?: { x: number; y: number } | null;
  className?: string;
  /** Decorative by default; the surrounding control carries the label. */
  label?: string;
}

// Decode every pose once so pose switches and blinks never flash.
const loaded = new Set<string>();
const failed = new Set<string>();
let preloadStarted = false;
const listeners = new Set<() => void>();
const requested = new Set<string>();
/** Decode frames ahead of time; animations only show frames that are ready. */
export function preloadFrames(sources: string[]) {
  if (typeof window === 'undefined') return;
  sources.forEach((src) => {
    if (requested.has(src)) return;
    requested.add(src);
    const img = new Image();
    img.onload = () => { loaded.add(src); listeners.forEach((l) => l()); };
    img.onerror = () => { failed.add(src); listeners.forEach((l) => l()); };
    img.src = src;
  });
}
export const framesReady = (sources: string[]) => sources.every((s) => loaded.has(s));
function preloadAll() {
  if (preloadStarted) return;
  preloadStarted = true;
  preloadFrames(ALL_POSE_SOURCES);
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

export function CompanionCharacter({ state, size = 56, blink = false, frameSrc = null, frameBleed = null, className, label }: CompanionCharacterProps) {
  const [, force] = useState(0);
  useEffect(() => {
    preloadAll();
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const base = resolvePoseSrc(state);
  const blinkSrc = blink ? resolvePoseSrc(state, true) : null;
  // Animation frames only show once decoded, so a slow network never flashes.
  const src = frameSrc && loaded.has(frameSrc) ? frameSrc : blinkSrc && loaded.has(blinkSrc) ? blinkSrc : base;
  const animating = src === frameSrc;
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
      <span className="shaghol-char__body relative block h-full w-full">
        {showArt ? (
          <img
            // Pose changes fade in; blinks and wave frames swap instantly.
            key={animating ? 'frames' : base || undefined}
            src={src!}
            alt=""
            draggable={false}
            className={cn('shaghol-char__img pointer-events-none h-full w-full select-none', framed ? 'object-cover' : 'object-contain')}
            // Bleed frames are drawn larger and offset so the robot itself
            // lands exactly where the pose art is; extras spill outside.
            style={
              animating && frameBleed
                ? {
                    position: 'absolute',
                    left: `${-frameBleed.x * 100}%`,
                    top: `${-frameBleed.y * 100}%`,
                    width: `${(1 + 2 * frameBleed.x) * 100}%`,
                    height: `${(1 + 2 * frameBleed.y) * 100}%`,
                    maxWidth: 'none',
                  }
                : undefined
            }
          />
        ) : (
          <span className="block h-full w-full p-[14%]">
            <PlaceholderRobot />
          </span>
        )}
      </span>
    </span>
  );
}
