/**
 * Shared request deadline.
 *
 * Camo abandons an origin after ~10s (CAMO_SOCKET_TIMEOUT), and a request that
 * dies at the proxy renders as a broken image with no explanation. Independent
 * per-call timeouts don't protect against that, because they add up: a slow
 * Last.fm response plus a slow art fetch can exceed the ceiling even when each
 * individual timeout looks reasonable.
 *
 * So the whole request shares one budget. Last.fm gets a generous slice (it is
 * genuinely sluggish at times), and album art - which is decorative - gets
 * whatever is left. If too little remains, art is skipped and the card renders
 * with placeholder tiles rather than risking the entire image.
 */
export class Deadline {
  private readonly startedAt: number;

  constructor(
    private readonly totalMs: number,
    startedAt: number = Date.now(),
  ) {
    this.startedAt = startedAt;
  }

  /** Milliseconds left in the overall budget. */
  remaining(): number {
    return Math.max(0, this.totalMs - (Date.now() - this.startedAt));
  }

  /** The smaller of `maxMs` and whatever is left. */
  slice(maxMs: number): number {
    return Math.min(maxMs, this.remaining());
  }
}

/**
 * Total wall-clock budget for a widget request. Deliberately ~2s below Camo's
 * ~10s ceiling so a slow-but-successful render still reaches the proxy.
 */
export const TOTAL_BUDGET_MS = 8000;

/** Last.fm can be slow; give it the majority of the budget. */
export const LASTFM_BUDGET_MS = 5000;

/** Album art is decorative and fetched in parallel. */
export const ART_BUDGET_MS = 4500;

/** Below this, skip art entirely rather than risk blowing the budget. */
export const MIN_ART_BUDGET_MS = 600;
