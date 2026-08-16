// Imported with a `.js` extension, which is the ESM convention TypeScript
// expects: the specifier names the file as it will exist at runtime, and TS
// resolves it back to `_translate.ts` when type checking. A `.ts` extension
// here type checks but is emitted unchanged, leaving the deployed function
// importing a file that does not exist.
import { DEFAULT_WORKER_ORIGIN, translate } from './_translate.js';

/**
 * The old Vercel endpoint, kept alive as a shim.
 *
 * Every URL ever pasted into a README points here, so this route cannot go
 * away. It no longer renders anything: it maps the parameters it used to
 * accept onto the ones the Cloudflare Worker takes, forwards the request, and
 * passes the SVG back.
 *
 * Rules inherited from the Worker, for the same reason - the card is displayed
 * inside an `<img>` behind GitHub's Camo proxy:
 *
 * - Never answer with a 4xx. Camo renders it as a broken image and caches the
 *   failure. Anything that goes wrong here still comes back as an SVG at 200.
 * - Finish well inside Camo's ~10s socket timeout. This hop has its own budget
 *   below that, so a slow Worker degrades to the fallback card rather than to
 *   a broken image.
 */

/**
 * Leaves room for the Worker's own deadline plus this round trip, and still
 * lands under Camo's ceiling.
 */
const UPSTREAM_TIMEOUT_MS = 8000;

/** A short TTL for the fallback card, so an outage clears as soon as it ends. */
const FALLBACK_MAX_AGE_SECONDS = 10;

/**
 * How long the CDN may keep serving the last good card if this function itself
 * starts failing.
 *
 * Everything below catches its own errors and answers 200, but nothing here
 * can catch a function timeout or a cold-start crash - those become a Vercel
 * error page, which is a broken image in every README pointing at us. This is
 * the only safety net for that case, so the window is generous.
 */
const STALE_IF_ERROR_SECONDS = 86400;

function workerOrigin(): string {
  const configured = process.env.WORKER_ORIGIN?.trim();
  return configured ? configured.replace(/\/+$/, '') : DEFAULT_WORKER_ORIGIN;
}

/**
 * Drawn only when the Worker cannot be reached at all. Deliberately tiny and
 * static: it must not depend on anything that could also be failing.
 */
function fallbackCard(width: number): string {
  const height = 84;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Last.fm card unavailable">
  <rect width="${width}" height="${height}" rx="10" fill="#212121" stroke="#2f2f2f"/>
  <text x="${width / 2}" y="38" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#f0f0f0">Last.fm card unavailable</text>
  <text x="${width / 2}" y="58" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#8a8a8a">Try again in a moment</text>
</svg>`;
}

function requestedWidth(params: URLSearchParams): number {
  const n = Number.parseInt(params.get('width') ?? '', 10);
  if (!Number.isFinite(n)) return 400;
  return Math.min(800, Math.max(260, n));
}

/**
 * `s-maxage` is what `maxage` always controlled: how long Vercel's CDN holds
 * the response, and it is also what makes the CDN cache a function response at
 * all. `max-age` is sent alongside it because Vercel consumes the CDN
 * directives and strips them - without it the caller is told to revalidate
 * every time, which is an edge request per view of every README embedding the
 * card.
 *
 * The stale window matches the fresh one rather than multiplying it. A wider
 * window mostly helps sparsely-viewed cards, and for those it is the harmful
 * case: the first view after a quiet spell is served the stale copy, so the
 * window is exactly how far out of date that reader can be.
 */
function svgHeaders(maxAgeSeconds: number, etag: string | null, reusable: boolean): Headers {
  // A failure card gets neither of the stale directives. Serving one after the
  // outage it describes has passed is worse than a cache miss, and this
  // response is not worth keeping around as a fallback for anything.
  const stale = reusable
    ? `, stale-while-revalidate=${maxAgeSeconds}, stale-if-error=${STALE_IF_ERROR_SECONDS}`
    : '';

  const headers = new Headers({
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}${stale}`,
    'X-Content-Type-Options': 'nosniff',
  });
  if (etag) headers.set('ETag', etag);
  return headers;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const { params, maxAgeSeconds } = translate(url.searchParams);
    const target = `${workerOrigin()}/svg?${params.toString()}`;

    const forwarded = new Headers({
      Accept: 'image/svg+xml',
      // Identifies this hop in the Worker's logs, so proxied traffic can be
      // told apart from requests that go to the Worker directly.
      'User-Agent': 'lastfm-recently-played-vercel-proxy',
    });
    // Conditional requests are worth forwarding: the Worker answers them with
    // a 304, which costs it no rendering and us no body.
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch) forwarded.set('If-None-Match', ifNoneMatch);

    try {
      const upstream = await fetch(target, {
        headers: forwarded,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });

      if (upstream.status === 304) {
        return new Response(null, {
          status: 304,
          headers: svgHeaders(maxAgeSeconds, upstream.headers.get('etag'), true),
        });
      }

      // The Worker answers 200 even for a card it could not render, so a
      // non-OK status here means the Worker itself is unwell.
      if (!upstream.ok) {
        return new Response(fallbackCard(requestedWidth(url.searchParams)), {
          status: 200,
          headers: svgHeaders(FALLBACK_MAX_AGE_SECONDS, null, false),
        });
      }

      // Read the card fully before answering. Streaming `upstream.body` would
      // start the response sooner, but a failure partway through would then be
      // a truncated SVG that has already committed to 200 - and a half-drawn
      // card is exactly the broken image this is all trying to avoid.
      const body = request.method === 'HEAD' ? null : await upstream.text();
      return new Response(body, {
        status: 200,
        headers: svgHeaders(maxAgeSeconds, upstream.headers.get('etag'), true),
      });
    } catch (err) {
      console.error('Upstream request failed', {
        message: err instanceof Error ? err.message : String(err),
      });
      return new Response(fallbackCard(requestedWidth(url.searchParams)), {
        status: 200,
        headers: svgHeaders(FALLBACK_MAX_AGE_SECONDS, null, false),
      });
    }
  },
};
