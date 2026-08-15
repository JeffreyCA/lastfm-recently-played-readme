import { cacheGet, cachePut, type WaitUntilCtx } from './cache';
import { ART_BUDGET_MS, MIN_ART_BUDGET_MS } from './util/deadline';

/**
 * Album art has to be inlined as a data URI: GitHub renders the widget inside an
 * <img>, and an SVG in that context cannot load any external resource.
 *
 * Camo's size ceiling is 5 MiB (CAMO_LENGTH_LIMIT) and its socket timeout is
 * ~10s, so the real constraints are our own latency budget and payload sanity,
 * not Camo. We stay far below both.
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
 * Only Last.fm's own image CDNs are ever fetched. This keeps the endpoint from
 * becoming an open proxy.
 *
 * Last.fm has used several hostnames over the years and currently serves art
 * from `lastfm-img.freetls.fastly.net`. Rather than pin one name (which silently
 * breaks all art the moment they rotate it), we accept any `lastfm*` label on
 * their known CDN domains. The label prefix keeps other tenants of the shared
 * `freetls.fastly.net` domain out.
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
 * The multiplier is a deliberate payload/quality tradeoff. This SVG is fetched
 * on every profile view, so bytes matter: at 2.0x a 3-track card weighs ~130 KB,
 * at 1.6x it is ~30 KB. 1.6x snaps the art slot to Last.fm's 64px variant,
 * which is still sharper than the slot on a 1x display and acceptable on 2x.
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

async function fetchOne(
  url: string,
  cacheSeconds: number,
  timeoutMs: number,
  ctx?: WaitUntilCtx,
): Promise<string | null> {
  const key = `art:v1:${url}`;
  const cached = await cacheGet(key);
  if (cached !== null) return cached === '' ? null : cached;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'image/*' },
      signal: AbortSignal.timeout(timeoutMs),
      // The allowlist above is the open-proxy boundary, and it only validates
      // the URL we start with. Following a redirect would fetch a host that
      // was never checked, so take the 3xx as a response and let the `res.ok`
      // check below discard it.
      //
      // Must be 'manual', not 'error': workers only implement 'follow' and
      // 'manual', and 'error' throws a TypeError on the edge - which local
      // `wrangler dev` does not reproduce.
      redirect: 'manual',
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
    if (!contentType.startsWith('image/')) return null;

    const declared = Number.parseInt(res.headers.get('content-length') ?? '', 10);
    if (Number.isFinite(declared) && declared > MAX_BYTES_PER_IMAGE) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES_PER_IMAGE) return null;

    const dataUri = `data:${contentType};base64,${bytesToBase64(new Uint8Array(buffer))}`;
    await cachePut(key, dataUri, cacheSeconds, ctx);
    return dataUri;
  } catch (err) {
    // Surfaced via `wrangler tail`; art is decorative so the render continues.
    console.log('[art] fetch failed', err instanceof Error ? err.name : String(err), url);
    // Timeout, DNS failure, abort - art is decorative, so degrade silently.
    // Cache the miss briefly so one broken URL doesn't stall every render.
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
  // Not enough of the shared budget left to risk it; render placeholders.
  if (timeoutMs < MIN_ART_BUDGET_MS) return urls.map(() => null);

  const results = await Promise.allSettled(
    urls.map((url) => {
      if (!url || !isAllowedArtUrl(url)) return Promise.resolve(null);
      return fetchOne(sizedArtUrl(url, displayPx), cacheSeconds, timeoutMs, ctx);
    }),
  );

  return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
}
