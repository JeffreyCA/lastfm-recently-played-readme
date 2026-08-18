import { cacheGet, cachePut, type WaitUntilCtx } from './cache';
import { count, logWarn } from './log';
import { ART_BUDGET_MS, MIN_ART_BUDGET_MS } from './util/deadline';

/**
 * Album art has to be inlined as a data URI: GitHub renders the widget inside an
 * <img>, and an SVG in that context cannot load any external resource.
 *
 * Camo's ceiling is 5 MiB (CAMO_LENGTH_LIMIT) with a ~10s socket timeout, but
 * we stay far below both - the real constraints are our own latency budget
 * and payload sanity.
 */

/**
 * Album art timeout, drawn from whatever the shared request deadline has left
 * after Last.fm has responded. See util/deadline.ts.
 */
const ART_TIMEOUT_MS = ART_BUDGET_MS;
const MAX_BYTES_PER_IMAGE = 200 * 1024;

/**
 * How long to remember that art could not be fetched. Kept short because most
 * failures here are transient (timeout, cold connection); caching them for long
 * makes one unlucky request blank out a cover for everyone until it expires.
 */
const NEGATIVE_CACHE_SECONDS = 60;

/**
 * Only Last.fm's own image CDNs are fetched - this is the open-proxy boundary.
 *
 * Last.fm currently serves art from `lastfm-img.freetls.fastly.net` but has
 * rotated hostnames before, silently breaking all art each time. Rather than
 * pin one name, we accept any `lastfm*` label on their known CDN domains; the
 * label prefix keeps other tenants of the shared `freetls.fastly.net` domain
 * out.
 */
const ALLOWED_ART_HOSTS = new Set([
  'lastfm-img.freetls.fastly.net',
  'lastfm.freetls.fastly.net',
  'images.lastfm.freetls.fastly.net',
  'lastfm-img2.akamaized.net',
]);

const ALLOWED_ART_HOST_PATTERNS = [
  /^lastfm[a-z0-9-]*\.freetls\.fastly\.net$/,
  /^lastfm[a-z0-9-]*\.akamaized\.net$/,
];

/** Sizes Last.fm actually serves under /i/u/. */
const AVAILABLE_SIZES = [34, 64, 174, 300];

export function isAllowedArtUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    if (ALLOWED_ART_HOSTS.has(url.hostname)) return true;
    return ALLOWED_ART_HOST_PATTERNS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

/**
 * Rewrites the size segment of a Last.fm image URL so we download the smallest
 * variant that still looks sharp, instead of a 300px JPEG for a ~34px slot.
 *
 * The multiplier is a payload/quality tradeoff: this SVG is fetched on every
 * profile view, so bytes matter. At 2.0x a 3-track card weighs ~130 KB, at
 * 1.6x it is ~30 KB. 1.6x snaps to Last.fm's 64px variant - sharper than the
 * slot needs on 1x, acceptable on 2x.
 */
const ART_DPR = 1.6;

export function sizedArtUrl(raw: string, displayPx: number): string {
  const target = displayPx * ART_DPR;
  const snapped = AVAILABLE_SIZES.find((s) => s >= target) ?? AVAILABLE_SIZES[AVAILABLE_SIZES.length - 1]!;
  return raw.replace(/\/i\/u\/[^/]+\//, `/i/u/${snapped}s/`);
}

/** btoa() on a large spread array blows the stack; chunk it. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Fetches and inlines one cover, pushing a short tag onto `failures` for every
 * way that can not happen. All of them end in a placeholder tile and a card
 * that renders perfectly, so counting them is the only way a rotated CDN
 * hostname shows up at all.
 */
async function fetchOne(
  url: string,
  cacheSeconds: number,
  timeoutMs: number,
  failures: string[],
  ctx?: WaitUntilCtx,
): Promise<string | null> {
  const key = `art:v1:${url}`;
  const cached = await cacheGet(key);
  if (cached !== null) return cached === '' ? null : cached;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'image/*' },
      signal: AbortSignal.timeout(timeoutMs),
      // The allowlist above only validates the URL we start with; a redirect
      // would fetch a host that was never checked, so take the 3xx as-is and
      // let the `res.ok` check below discard it.
      //
      // Must be 'manual', not 'error': workers only implement 'follow' and
      // 'manual', and 'error' throws a TypeError on the edge - which local
      // `wrangler dev` does not reproduce.
      redirect: 'manual',
    });
    if (!res.ok) {
      failures.push(`http_${res.status}`);
      return null;
    }

    const contentType = (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
    if (!contentType.startsWith('image/')) {
      failures.push('not_image');
      return null;
    }

    const declared = Number.parseInt(res.headers.get('content-length') ?? '', 10);
    if (Number.isFinite(declared) && declared > MAX_BYTES_PER_IMAGE) {
      failures.push('too_large');
      return null;
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES_PER_IMAGE) {
      failures.push('too_large');
      return null;
    }

    const dataUri = `data:${contentType};base64,${bytesToBase64(new Uint8Array(buffer))}`;
    await cachePut(key, dataUri, cacheSeconds, ctx);
    return dataUri;
  } catch (err) {
    failures.push(err instanceof Error ? err.name : 'unknown');
    // Timeout, DNS failure, abort - degrade silently, and cache the miss
    // briefly so one broken URL doesn't stall every render.
    await cachePut(key, '', NEGATIVE_CACHE_SECONDS, ctx);
    return null;
  }
}

export interface InlineArtOptions {
  urls: (string | null)[];
  displayPx: number;
  cacheSeconds: number;
  /** Time left for art. Art is skipped entirely below MIN_ART_BUDGET_MS. */
  timeoutMs?: number;
  ctx?: WaitUntilCtx;
}

/**
 * Resolves art for every track in parallel. Failures come back as null and the
 * card falls back to a placeholder tile - a missing cover must never take the
 * whole widget down.
 */
export async function inlineArt({
  urls,
  displayPx,
  cacheSeconds,
  timeoutMs = ART_TIMEOUT_MS,
  ctx,
}: InlineArtOptions): Promise<(string | null)[]> {
  const wanted = urls.filter((url): url is string => Boolean(url)).length;

  // Not enough of the shared budget left to risk it; render placeholders.
  if (timeoutMs < MIN_ART_BUDGET_MS) {
    // Means upstream ate the whole budget - the number to tune if it recurs.
    if (wanted > 0) {
      logWarn('art', `art skipped, no budget left: ${count(wanted, 'image')}`, {
        skipped: 'deadline',
        total: wanted,
        budget_ms: Math.round(timeoutMs),
      });
    }
    return urls.map(() => null);
  }

  const failures: string[] = [];
  const blockedHosts = new Set<string>();

  const results = await Promise.allSettled(
    urls.map((url) => {
      if (!url) return Promise.resolve(null);
      if (!isAllowedArtUrl(url)) {
        // Never fetched, so `fetchOne` cannot see it - catches the allowlist
        // naming a host Last.fm no longer serves from, otherwise silent.
        blockedHosts.add(hostOf(url));
        return Promise.resolve(null);
      }
      return fetchOne(sizedArtUrl(url, displayPx), cacheSeconds, timeoutMs, failures, ctx);
    }),
  );

  const images = results.map((r) => (r.status === 'fulfilled' ? r.value : null));

  // Aggregated, not one line per cover: a broken CDN fails every image on
  // every request, so volume must not multiply by track count.
  const missing = images.filter((image, i) => urls[i] && image === null).length;
  if (missing > 0) {
    logWarn('art', `art: ${missing} of ${count(wanted, 'image')} failed`, {
      total: wanted,
      failed: missing,
      errors: [...new Set(failures)],
      blocked_hosts: blockedHosts.size > 0 ? [...blockedHosts] : undefined,
    });
  }

  return images;
}

/** Hostname only: the actionable part, and it keeps the field groupable. */
function hostOf(raw: string): string {
  try {
    return new URL(raw).hostname;
  } catch {
    return 'invalid';
  }
}
