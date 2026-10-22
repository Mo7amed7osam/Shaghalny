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

/**
 * Bump when artwork changes. File names stay the same, so without a version
 * browsers, proxies and the service worker can keep serving old pixels
 * (e.g. the opaque framed art after the switch to transparent cut-outs).
 */
export const COMPANION_ASSET_VERSION = '2026-10-22-transparent';
const asset = (file: string) => `${COMPANION_ART.basePath}${file}?v=${COMPANION_ASSET_VERSION}`;

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
  return asset(file);
}

export function hasBlink(state: CompanionState): boolean {
  return Boolean(resolvePose(state)?.blink);
}

/**
 * Frame-by-frame wave (8 frames from the waving sheet), aligned to the idle
 * pose on the same 320×316 canvas. Played once over ~1.2s.
 */
export const WAVE_FRAMES = Array.from({ length: 8 }, (_, i) => asset(`shaghol-wave-${i + 1}.webp`));
export const WAVE_FRAME_MS = 150;

/**
 * Idle activities: occasional playful sequences while nobody interacts.
 * Frames sit on a larger 400×396 canvas (40px transparent bleed on every side
 * of the 320×316 pose canvas) so mugs, arms and sparkles fit; feet and scale
 * match the idle pose. `durations` are per-frame (ms), with comedic holds.
 */
export const ACTIVITY_BLEED = { x: 40 / 320, y: 40 / 316 };
export type IdleActivityName = 'sleepy' | 'coffee';
export const IDLE_ACTIVITIES: Record<IdleActivityName, { frames: string[]; durations: number[] }> = {
  // Drowsy, nods off (long hold), startles awake, looks around, back to idle.
  sleepy: {
    frames: Array.from({ length: 8 }, (_, i) => asset(`shaghol-sleepy-${i + 1}.webp`)),
    durations: [300, 380, 420, 700, 160, 340, 340, 300],
  },
  // Grabs a mug, long contented sip (hold), a happy "ah!", puts it away.
  coffee: {
    frames: Array.from({ length: 8 }, (_, i) => asset(`shaghol-coffee-${i + 1}.webp`)),
    durations: [200, 300, 300, 450, 650, 500, 300, 250],
  },
};

export const ALL_POSE_SOURCES = Array.from(
  new Set(
    [
      ...Object.keys(COMPANION_POSES).flatMap((s) => [resolvePoseSrc(s as CompanionState), resolvePoseSrc(s as CompanionState, true)]),
      ...WAVE_FRAMES,
    ].filter(Boolean) as string[]
  )
);
