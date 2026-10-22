import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { EyeOff, MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanionCharacter } from './CompanionCharacter';
import { useLivingPose } from './useLivingPose';
import { useIdleActivity } from './useIdleActivity';
import type { CompanionStrings } from './companionI18n';
import type { CompanionState } from './types';

const POS_KEY = 'shaghol:pos:v2';
const MARGIN = 12;
const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 550;

// Stored as distance from the right/bottom edges so the character stays
// anchored bottom-right across viewport changes.
type Anchor = { right: number; bottom: number };

const readAnchor = (): Anchor | null => {
  try {
    const raw = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    return raw && Number.isFinite(raw.right) && Number.isFinite(raw.bottom) ? raw : null;
  } catch {
    return null;
  }
};
// Fixed positioning is relative to the layout viewport without scrollbars.
const viewportSize = () => ({ w: document.documentElement.clientWidth || window.innerWidth, h: document.documentElement.clientHeight || window.innerHeight });

const writeAnchor = (a: Anchor) => {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(a));
  } catch {
    /* per-viewer convenience only */
  }
};

interface LauncherProps {
  t: CompanionStrings;
  dir: 'ltr' | 'rtl';
  state: CompanionState;
  /** Reserved space at the bottom (mobile tab bar). */
  bottomInset: number;
  size: number;
  dismissed: boolean;
  bubble: string | null;
  greetKey: number;
  onOpen: () => void;
  onHide: () => void;
  onRestore: () => void;
  onBubbleDismiss: () => void;
  panelId: string;
}

export interface LauncherHandle {
  focus: () => void;
}

export const CompanionLauncher = forwardRef<LauncherHandle, LauncherProps>(function CompanionLauncher(
  { t, dir, state, bottomInset, size, dismissed, bubble, greetKey, onOpen, onHide, onRestore, onBubbleDismiss, panelId },
  ref
) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => buttonRef.current?.focus() }), []);

  const [anchor, setAnchor] = useState<Anchor>(() => readAnchor() || { right: 20, bottom: 20 + bottomInset });
  const [viewport, setViewport] = useState(viewportSize);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinnedControls, setPinnedControls] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hoverGreet, setHoverGreet] = useState(0);
  const drag = useRef<{ id: number; sx: number; sy: number; right: number; bottom: number; moved: boolean; long: boolean; timer?: number } | null>(null);
  const suppressClick = useRef(false);

  const clamp = useCallback(
    (a: Anchor): Anchor => ({
      right: Math.min(Math.max(a.right, MARGIN), Math.max(MARGIN, viewport.w - size - MARGIN)),
      bottom: Math.min(Math.max(a.bottom, MARGIN + bottomInset), Math.max(MARGIN + bottomInset, viewport.h - size - MARGIN)),
    }),
    [viewport, size, bottomInset]
  );

  // Re-clamp on resize, rotation and when the reserved bottom space changes.
  useEffect(() => {
    const onResize = () => setViewport(viewportSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const pos = clamp(anchor);

  useEffect(() => {
    if (!pinnedControls) return;
    const timer = window.setTimeout(() => setPinnedControls(false), 5000);
    return () => window.clearTimeout(timer);
  }, [pinnedControls]);

  const { pose, blink, frameSrc: waveSrc } = useLivingPose(state, { greetKey: greetKey + hoverGreet, idleVariety: true, paused: dragging });
  // Idle activities yield to everything: task states, drags, the wave and clicks.
  const idle = useIdleActivity(!dismissed && state === 'idle' && !dragging);
  const cancelIdle = idle.cancel;
  useEffect(() => {
    if (waveSrc && idle.activity) cancelIdle();
  }, [waveSrc, idle.activity, cancelIdle]);
  const frameSrc = waveSrc || idle.frameSrc;
  const frameBleed = waveSrc ? null : idle.bleed;

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    cancelIdle();
    const d = { id: e.pointerId, sx: e.clientX, sy: e.clientY, right: pos.right, bottom: pos.bottom, moved: false, long: false, timer: undefined as number | undefined };
    // Touch users get the controls with a long press.
    d.timer = window.setTimeout(() => {
      if (drag.current === d && !d.moved) {
        d.long = true;
        setPinnedControls(true);
      }
    }, LONG_PRESS_MS);
    drag.current = d;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      window.clearTimeout(d.timer);
      setDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    }
    setAnchor(clamp({ right: d.right - dx, bottom: d.bottom - dy }));
  };

  const endPointer = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    window.clearTimeout(d.timer);
    if (d.moved || d.long) suppressClick.current = true;
    if (d.moved) {
      setDragging(false);
      setAnchor((a) => {
        const next = clamp(a);
        writeAnchor(next);
        return next;
      });
    }
    drag.current = null;
  };

  const onClick = () => {
    cancelIdle();
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (dismissed) onRestore();
    else onOpen();
  };

  // Arrow keys reposition the character for keyboard users.
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 48 : 16;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    cancelIdle();
    setAnchor((a) => {
      const cur = clamp(a);
      const next = clamp({ right: cur.right + m[0], bottom: cur.bottom + m[1] });
      writeAnchor(next);
      return next;
    });
  };

  // Controls and bubbles open towards the middle of the screen.
  const onRightHalf = viewport.w - pos.right - size / 2 > viewport.w / 2;
  const showControls = !dismissed && !dragging && (hovered || focused || pinnedControls);
  const peekSize = Math.round(size * 0.55);

  if (dismissed) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={onRestore}
        aria-label={t.reopen}
        title={t.reopen}
        className="shaghol-peek fixed z-[45] cursor-pointer appearance-none border-0 bg-transparent p-0 opacity-80 outline-none transition-[transform,opacity] duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:ring-offset-ink-dark-bg"
        style={{ right: -peekSize * 0.35, bottom: pos.bottom, width: peekSize, height: peekSize, borderRadius: 12 }}
      >
        <CompanionCharacter state="idle" size={peekSize} />
      </button>
    );
  }

  return (
    <div
      className="fixed z-[45]"
      style={{ right: pos.right, bottom: pos.bottom, width: size, height: size }}
      onMouseEnter={() => {
        setHovered(true);
        setHoverGreet((n) => n + 1);
      }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
    >
      {bubble && !dragging && (
        <div
          dir={dir}
          role="status"
          className={cn(
            'shaghol-bubble absolute bottom-[calc(100%-6px)] flex w-max max-w-[220px] items-start gap-1 rounded-2xl border border-ink-200 bg-white px-3 py-2 text-[13px] leading-5 text-ink-800 shadow-elevated dark:border-ink-dark-border dark:bg-ink-dark-surface dark:text-ink-dark-text',
            onRightHalf ? 'right-[40%] rounded-br-sm' : 'left-[40%] rounded-bl-sm'
          )}
        >
          <button type="button" className="text-start" onClick={onOpen}>
            {bubble}
          </button>
          <button type="button" onClick={onBubbleDismiss} className="-me-1 shrink-0 rounded p-0.5 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200" aria-label={t.minimize}>
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-label={t.openLabel}
        aria-describedby={`${panelId}-drag-hint`}
        aria-expanded={false}
        aria-controls={panelId}
        className={cn(
          'shaghol-float block h-full w-full appearance-none rounded-2xl border-0 bg-transparent p-0 shadow-none outline-none [-webkit-tap-highlight-color:transparent]',
          'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          dragging ? 'cursor-grabbing' : 'cursor-pointer'
        )}
        style={{ touchAction: 'none' }}
      >
        <CompanionCharacter state={dragging ? 'idle' : pose} blink={blink && !frameSrc} frameSrc={frameSrc} frameBleed={frameBleed} size={size} />
        <span id={`${panelId}-drag-hint`} className="sr-only">{t.dragHint}</span>
      </button>

      {showControls && (
        <div className={cn('shaghol-controls absolute top-1/2 flex -translate-y-1/2 flex-col gap-1.5', onRightHalf ? 'right-full me-1' : 'left-full ms-1')}>
          <button
            type="button"
            onClick={onOpen}
            aria-label={t.openLabel}
            title={t.openChat}
            className="grid h-8 w-8 place-items-center rounded-full border border-ink-200 bg-white text-brand-700 shadow-soft transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:bg-ink-dark-surface dark:text-brand-200 dark:hover:bg-white/10"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onHide}
            aria-label={t.close}
            title={t.close}
            className="grid h-8 w-8 place-items-center rounded-full border border-ink-200 bg-white text-ink-600 shadow-soft transition-colors hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:bg-ink-dark-surface dark:text-ink-300 dark:hover:bg-white/10"
          >
            <EyeOff className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
});
