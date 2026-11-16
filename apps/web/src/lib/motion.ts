/** Matches `--ease-out` in globals.css — strong ease-out for UI. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Matches `--ease-in-out` for on-screen morphs. */
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

export const MOTION_DURATION_S = {
  press: 0.14,
  fast: 0.16,
  enter: 0.22,
  modal: 0.25,
} as const;

/** Non-uniform product stagger (ms→s). Caps under ~300ms total. */
export const STAGGER_DELAYS_S = [0, 0.04, 0.07, 0.1, 0.115, 0.13] as const;

export function staggerDelay(index: number): number {
  const last = STAGGER_DELAYS_S[STAGGER_DELAYS_S.length - 1] ?? 0.13;
  return STAGGER_DELAYS_S[index] ?? last;
}
