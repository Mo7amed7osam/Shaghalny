import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { COMPANION_ART, resolvePoseSrc } from './companionAssets';
import type { CompanionState } from './types';

interface CompanionCharacterProps {
  state: CompanionState;
  size?: number;
  className?: string;
  /** Decorative by default; the surrounding control carries the label. */
  label?: string;
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

export function CompanionCharacter({ state, size = 56, className, label }: CompanionCharacterProps) {
  const src = resolvePoseSrc(state);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!src || loaded[src] || failed[src]) return;
    const img = new Image();
    img.onload = () => setLoaded((p) => ({ ...p, [src]: true }));
    img.onerror = () => setFailed((p) => ({ ...p, [src]: true }));
    img.src = src;
  }, [src, loaded, failed]);

  const showArt = Boolean(src && loaded[src] && !failed[src]);

  return (
    <span
      className={cn(
        'shaghol-char relative inline-flex shrink-0 items-center justify-center overflow-hidden',
        COMPANION_ART.framed && showArt ? 'rounded-[28%] bg-[#160f2e] ring-1 ring-brand-500/30' : 'rounded-[28%] bg-brand-50 dark:bg-brand-500/15',
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
          <img key={src} src={src!} alt="" draggable={false} className="shaghol-char__img h-full w-full object-cover" />
        ) : (
          <span className="block h-full w-full p-[14%]">
            <PlaceholderRobot />
          </span>
        )}
      </span>
    </span>
  );
}
