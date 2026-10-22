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
  aliasOf?: CompanionState;
}

export const COMPANION_ART = {
  framed: false,
  basePath: '/companion/',
};

export const COMPANION_POSES: Record<CompanionState, CompanionPose> = {
  idle: { src: 'shaghol-idle.webp' },
  greeting: { src: 'shaghol-greeting.webp' },
  thinking: { src: 'shaghol-thinking.webp' },
  searching: { src: 'shaghol-searching.webp' },
  reviewing_cv: { src: 'shaghol-reviewing_cv.webp' },
  writing_proposal: { src: 'shaghol-writing_proposal.webp' },
  success: { src: 'shaghol-success.webp' },
  error: { src: 'shaghol-error.webp' },
};

export function resolvePoseSrc(state: CompanionState): string | null {
  const seen = new Set<CompanionState>();
  let current: CompanionState | undefined = state;
  while (current && !seen.has(current)) {
    seen.add(current);
    const pose: CompanionPose | undefined = COMPANION_POSES[current];
    if (pose?.src) return `${COMPANION_ART.basePath}${pose.src}`;
    current = pose?.aliasOf;
  }
  return null;
}

export const ALL_POSE_SOURCES = Array.from(
  new Set(Object.keys(COMPANION_POSES).map((s) => resolvePoseSrc(s as CompanionState)).filter(Boolean) as string[])
);
