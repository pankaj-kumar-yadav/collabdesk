import type { Role } from "@collabdesk/shared";

export const ROLE_BADGE_CLASS = {
  owner:
    "border-transparent bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  editor:
    "border-transparent bg-sky-500/15 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  viewer:
    "border-transparent bg-zinc-500/15 text-zinc-700 dark:bg-zinc-400/15 dark:text-zinc-300",
} as const satisfies Record<Role, string>;
