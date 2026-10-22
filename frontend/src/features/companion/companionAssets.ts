import type { CompanionState } from './types';

/**
 * Character artwork manifest. Files live in `frontend/public/companion/`.
 * `aliasOf` reuses another pose until dedicated art exists; a missing or
 * failing file falls back to the built-in placeholder robot.
 * `framed: true` is for art with an opaque backdrop (shown inside a rounded
 * frame); the current poses are transparent cut-outs on a shared 320×316
 * canvas, aligned on the feet baseline and antenna, so they float freely.
 */
export interface CompanionPose {
  src?: string;
  /** Same pose with eyes closed, used for occasional blinks. */
  blink?: string;
  aliasOf?: CompanionState;
}

export const COMPANION_ART = {
  framed: false,
  basePath: '/companion/',
};

export const COMPANION_POSES: Record<CompanionState, CompanionPose> = {
  idle: { src: 'shaghol-idle.webp', blink: 'shaghol-idle-blink.webp' },
  greeting: { src: 'shaghol-greeting.webp' },
  thinking: { src: 'shaghol-thinking.webp', blink: 'shaghol-thinking-blink.webp' },
  searching: { src: 'shaghol-searching.webp' },
  reviewing_cv: { src: 'shaghol-reviewing_cv.webp' },
  writing_proposal: { src: 'shaghol-writing_proposal.webp', blink: 'shaghol-writing_proposal-blink.webp' },
  success: { src: 'shaghol-success.webp' },
  error: { src: 'shaghol-error.webp', blink: 'shaghol-error-blink.webp' },
};

function resolvePose(state: CompanionState): CompanionPose | null {
  const seen = new Set<CompanionState>();
  let current: CompanionState | undefined = state;
  while (current && !seen.has(current)) {
    seen.add(current);
    const pose: CompanionPose | undefined = COMPANION_POSES[current];
    if (pose?.src) return pose;
    current = pose?.aliasOf;
  }
  return null;
}

export function resolvePoseSrc(state: CompanionState, blink = false): string | null {
  const pose = resolvePose(state);
  if (!pose?.src) return null;
  const file = blink && pose.blink ? pose.blink : pose.src;
  return `${COMPANION_ART.basePath}${file}`;
}

export function hasBlink(state: CompanionState): boolean {
  return Boolean(resolvePose(state)?.blink);
}

/**
 * Frame-by-frame wave (8 frames from the waving sheet), aligned to the idle
 * pose on the same 320×316 canvas. Played once over ~1.2s.
 */
export const WAVE_FRAMES = Array.from({ length: 8 }, (_, i) => `${COMPANION_ART.basePath}shaghol-wave-${i + 1}.webp`);
export const WAVE_FRAME_MS = 150;

export const ALL_POSE_SOURCES = Array.from(
  new Set(
    [
      ...Object.keys(COMPANION_POSES).flatMap((s) => [resolvePoseSrc(s as CompanionState), resolvePoseSrc(s as CompanionState, true)]),
      ...WAVE_FRAMES,
    ].filter(Boolean) as string[]
  )
);
