import { Hono, type Context } from 'hono';
import { inlineArt } from './art';
import type { WaitUntilCtx } from './cache';
import { getRecentTracks, getUserInfo, LastfmError, type UserInfo } from './lastfm';
import { logCard, startCard, type CardReason } from './log';
import { LIMITS, OptionsError, parseOptions } from './options';
import { ART_DISPLAY_PX, renderCard } from './render/card';
import { renderErrorCard } from './render/error';
import {
  ART_BUDGET_MS,
  Deadline,
  LASTFM_BUDGET_MS,
  TOTAL_BUDGET_MS,
} from './util/deadline';
import { weakHash as hash } from './util/hash';

export interface Env {
  ASSETS: Fetcher;
  /** Secret: `npx wrangler secret put LASTFM_API_KEY` */
  LASTFM_API_KEY?: string;
  UPSTREAM_CACHE_SECONDS?: string;
  ART_CACHE_SECONDS?: string;
}

const app = new Hono<{ Bindings: Env }>();

function intVar(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Errors get a short TTL of their own. A typo'd username should not pin a
 * failure card at the edge for a full minute, and a transient Last.fm outage
 * should clear as soon as it is over.
 */
const ERROR_MAX_AGE_SECONDS = 10;

function svgResponse(
  svg: string,
  etag: string,
  request: Request,
  maxAgeSeconds: number,
): Response {
  const headers: HeadersInit = {
    // Camo only proxies content types on its allowlist. `image/svg+xml` is on
    // it; if the image ever mysteriously fails to render, try dropping the
    // charset suffix as the first debugging step.
    'Content-Type': 'image/svg+xml; charset=utf-8',
    // Matches the upstream Last.fm TTL, so the edge never holds a card longer
    // than the data behind it was going to be reused anyway. `no-cache` would
    // be fresher, but it forces a Worker run per view: Workers Cache only
    // serves - and only collapses concurrent requests for - responses it can
    // reuse without revalidating.
    //
    // `stale-while-revalidate` refreshes behind the reader rather than in
    // front of them, so a scrobble never costs anyone a wait.
    'Cache-Control': `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 5}`,
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
  };

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(svg, { status: 200, headers });
}

function errorResponse(
  request: Request,
  message: string,
  hint: string | undefined,
  params: URLSearchParams,
): Response {
  // Error cards honour the presentational params, so a card that fails still
  // matches the shape the reader asked for. Parsed leniently, since the
  // request may well be malformed - that is why we are here.
  const svg = renderErrorCard({
    message,
    hint,
    theme: params.get('theme') ?? undefined,
    width: clamp(params.get('width'), LIMITS.width),
    radius: clamp(params.get('radius'), LIMITS.radius),
  });
  // Deliberately HTTP 200 - see render/error.ts.
  return svgResponse(svg, `W/"err-${hash(svg)}"`, request, ERROR_MAX_AGE_SECONDS);
}

function clamp(raw: string | null, limit: { min: number; max: number; default: number }): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return limit.default;
  return Math.min(limit.max, Math.max(limit.min, n));
}

async function handleWidget(c: Context<{ Bindings: Env }>): Promise<Response> {
  const request = c.req.raw;
  const url = new URL(c.req.url);
  const params = url.searchParams;
  const trace = startCard(request, url);

  // Every rendered failure exits through here, so `card` fires exactly once.
  const fail = (
    reason: CardReason,
    message: string,
    hint?: string,
    err?: unknown,
  ): Response => {
    logCard(trace, { outcome: 'error', reason, err });
    return errorResponse(request, message, hint, params);
  };

  let ctx: WaitUntilCtx | undefined;
  try {
    // Hono throws here when no ExecutionContext is available (e.g. some tests).
    ctx = c.executionCtx as WaitUntilCtx;
  } catch {
    ctx = undefined;
  }

  try {
    const options = parseOptions(params);
    const deadline = new Deadline(TOTAL_BUDGET_MS);

    if (!c.env.LASTFM_API_KEY) {
      return fail(
        'not_configured',
        'Service not configured',
        'Missing LASTFM_API_KEY on the server',
      );
    }

    const upstreamCache = intVar(c.env.UPSTREAM_CACHE_SECONDS, 60);
    const lastfmTimeout = deadline.slice(LASTFM_BUDGET_MS);
    // Note: `stats` is a mode string now, so `'off'` is truthy - compare it
    // rather than relying on truthiness, or every request fetches the profile.
    // The profile needs the account regardless of where it is placed.
    const showsProfile = options.profile !== 'off' && (options.avatar || options.username);
    const needsProfile =
      (showsProfile && options.avatar) || options.stats !== 'off' || options.footer === 'stats';

    // Profile data is one extra endpoint, run concurrently with the tracks
    // call: the pair costs the slower of the two, not their sum. It is
    // decorative, so a failure degrades the card rather than failing the
    // request - only the tracks call can reject.
    const [tracks, profile] = await Promise.all([
      getRecentTracks({
        user: options.user,
        limit: options.count,
        apiKey: c.env.LASTFM_API_KEY,
        cacheSeconds: upstreamCache,
        timeoutMs: lastfmTimeout,
        ctx,
      }),
      needsProfile
        ? getUserInfo({
            user: options.user,
            apiKey: c.env.LASTFM_API_KEY,
            cacheSeconds: upstreamCache,
            timeoutMs: lastfmTimeout,
            ctx,
          }).catch((): UserInfo | null => null)
        : Promise.resolve(null),
    ]);

    if (tracks.length === 0) {
      return fail(
        'no_tracks',
        'No recent tracks',
        `${options.user} has not scrobbled anything yet`,
      );
    }

    const artCache = intVar(c.env.ART_CACHE_SECONDS, 86400);
    // Art gets whatever Last.fm left behind, so a slow upstream degrades to
    // placeholder tiles instead of blowing Camo's ~10s ceiling.
    const artTimeout = deadline.slice(ART_BUDGET_MS);

    const wantsAvatar = showsProfile && options.avatar && Boolean(profile?.image);
    const [art, avatarImages] = await Promise.all([
      options.art
        ? inlineArt({
            urls: tracks.map((t) => t.image),
            displayPx: ART_DISPLAY_PX,
            cacheSeconds: artCache,
            timeoutMs: artTimeout,
            ctx,
          })
        : Promise.resolve(tracks.map(() => null)),
      wantsAvatar
        ? inlineArt({
            urls: [profile!.image],
            displayPx: 20,
            cacheSeconds: artCache,
            timeoutMs: artTimeout,
            ctx,
          })
        : Promise.resolve([null]),
    ]);

    const svg = renderCard({
      options,
      tracks,
      art,
      user: profile,
      avatarImage: avatarImages[0] ?? null,
    });
    logCard(trace, { outcome: 'ok', tracks: tracks.length });
    return svgResponse(svg, `W/"${hash(svg)}"`, request, upstreamCache);
  } catch (err) {
    if (err instanceof OptionsError) {
      return fail('bad_options', err.message, 'Check the ?user= parameter', err);
    }
    if (err instanceof LastfmError) {
      const notFound = err.code === 6;
      return fail(
        notFound ? 'user_not_found' : 'upstream',
        err.message,
        notFound ? 'Check the spelling of the Last.fm username' : 'Try again in a moment',
        err,
      );
    }

    return fail('unhandled', 'Something went wrong', 'Try again in a moment', err);
  }
}

app.get('/svg', handleWidget);

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    configured: Boolean(c.env.LASTFM_API_KEY),
    time: new Date().toISOString(),
  }),
);

// Static assets are served before the Worker runs, so anything reaching here is
// genuinely unmatched.
app.notFound((c) => c.text('Not found', 404));

export default app;
