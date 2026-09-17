/**
 * How often the product sheet may be re-read.
 *
 * Its own module because both the admin page and the API need it, and
 * `sync-catalogue` is server-only — importing this from a Client Component must
 * not drag Prisma and the viaSocket credentials into the browser bundle.
 */
export const SYNC_INTERVALS = [5, 10, 20, 30, 60, 120] as const;

/** Spelled out, because "120" reads worse than "2 hours". */
export const INTERVAL_LABELS: Record<number, string> = {
  5: "every 5 minutes",
  10: "every 10 minutes",
  20: "every 20 minutes",
  30: "every 30 minutes",
  60: "every hour",
  120: "every 2 hours",
};
