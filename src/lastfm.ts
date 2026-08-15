import { cacheGet, cachePut, type WaitUntilCtx } from './cache';
import { LASTFM_BUDGET_MS } from './util/deadline';

const API_ROOT = 'https://ws.audioscrobbler.com/2.0/';

/**
 * Timeout for the upstream call. Defaults to the Last.fm slice of the shared
 * request deadline; callers pass a smaller value when time is already spent.
 */
export const LASTFM_TIMEOUT_MS = LASTFM_BUDGET_MS;

export interface Track {
  name: string;
  artist: string;
  album: string;
  url: string;
  nowPlaying: boolean;
  /** Unix seconds; null while now playing. */
  playedAt: number | null;
  /** Best available album art URL, or null when Last.fm has no real image. */
  image: string | null;
  /** Whether the requesting user has loved this track (needs `extended=1`). */
  loved: boolean;
}

/** Profile data for the header avatar and stats strip. */
export interface UserInfo {
  name: string;
  url: string;
  /** Avatar URL, or null when the account uses the default image. */
  image: string | null;
  playcount: number;
  artistCount: number;
  trackCount: number;
}

export class LastfmError extends Error {
  constructor(
    message: string,
    readonly code: number | null = null,
  ) {
    super(message);
    this.name = 'LastfmError';
  }
}

/** Last.fm serves this hash as its "no album art" placeholder. */
const PLACEHOLDER_ART = '2a96cbd8b46e442fc41c2b86b821562f';

interface RawImage {
  '#text'?: string;
  size?: string;
}

interface RawTrack {
  name?: string;
  url?: string;
  artist?: { '#text'?: string; name?: string } | string;
  album?: { '#text'?: string } | string;
  image?: RawImage[];
  date?: { uts?: string };
  '@attr'?: { nowplaying?: string };
  /** Present only with `extended=1`; "1" when loved. */
  loved?: string | number;
}

function textOf(value: { '#text'?: string; name?: string } | string | undefined): string {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return value['#text'] ?? value.name ?? '';
}

/** Prefers `large` (174px) art, falling back through the available sizes. */
function pickImage(images: RawImage[] | undefined): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;

  const bySize = new Map<string, string>();
  for (const img of images) {
    const url = img?.['#text']?.trim();
    if (url) bySize.set(img.size ?? '', url);
  }

  const preference = ['large', 'extralarge', 'medium', 'mega', 'small', ''];
  for (const size of preference) {
    const url = bySize.get(size);
    if (url && !url.includes(PLACEHOLDER_ART)) return url;
  }
  return null;
}

function normalizeTrack(raw: RawTrack): Track {
  const nowPlaying = raw['@attr']?.nowplaying === 'true';
  const uts = raw.date?.uts ? Number.parseInt(raw.date.uts, 10) : NaN;

  return {
    name: (raw.name ?? '').trim() || 'Unknown track',
    artist: textOf(raw.artist).trim() || 'Unknown artist',
    album: textOf(raw.album).trim(),
    url: typeof raw.url === 'string' ? raw.url : '',
    nowPlaying,
    playedAt: nowPlaying || !Number.isFinite(uts) ? null : uts,
    image: pickImage(raw.image),
    loved: raw.loved === '1' || raw.loved === 1,
  };
}

/**
 * Last.fm returns `track` as a bare object rather than an array when the result
 * contains exactly one item. Normalising this is not optional - it is the single
 * most common cause of crashes in clients for this API.
 */
function toArray(value: unknown): RawTrack[] {
  if (Array.isArray(value)) return value as RawTrack[];
  if (value && typeof value === 'object') return [value as RawTrack];
  return [];
}

async function callApi(
  params: Record<string, string>,
  apiKey: string,
  timeoutMs: number,
): Promise<string> {
  const url = new URL(API_ROOT);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('format', 'json');

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'lastfm-recently-played (+https://github.com/JeffreyCA/lastfm-priv)',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const aborted = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    throw new LastfmError(aborted ? 'Last.fm timed out' : 'Could not reach Last.fm');
  }

  const body = await response.text();

  // Last.fm signals application errors with a 200 body *and* with 4xx codes,
  // depending on the error. Parse first, then decide.
  //
  // The body is returned as a string rather than the parsed object because
  // that is what gets cached, so callers parse it again on a miss. Threading
  // both through would save one parse per miss at the cost of two code paths.
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new LastfmError(`Last.fm returned a malformed response (HTTP ${response.status})`);
  }

  const asError = parsed as { error?: number; message?: string };
  if (typeof asError?.error === 'number') {
    // 6 = "User not found" is by far the most common and deserves a clear message.
    const message = asError.error === 6 ? 'User not found' : (asError.message ?? 'Last.fm error');
    throw new LastfmError(message, asError.error);
  }

  if (!response.ok) {
    throw new LastfmError(`Last.fm error (HTTP ${response.status})`);
  }

  return body;
}

export function parseRecentTracks(body: string, limit: number): Track[] {
  const parsed = JSON.parse(body) as { recenttracks?: { track?: unknown } };
  const raw = toArray(parsed?.recenttracks?.track);
  return raw.map(normalizeTrack).slice(0, limit);
}

export interface GetRecentTracksOptions {
  user: string;
  limit: number;
  apiKey: string;
  cacheSeconds: number;
  /** Upstream timeout; defaults to the full Last.fm budget. */
  timeoutMs?: number;
  ctx?: WaitUntilCtx;
}

export async function getRecentTracks({
  user,
  limit,
  apiKey,
  cacheSeconds,
  timeoutMs = LASTFM_TIMEOUT_MS,
  ctx,
}: GetRecentTracksOptions): Promise<Track[]> {
  // Cache the upstream payload (not the rendered SVG) so that different themes
  // and widths for the same user share one API call.
  // v2: payloads now come from `extended=1`, so v1 entries lack `loved`.
  const key = `lastfm:v2:${user.toLowerCase()}:${limit}`;

  const cached = await cacheGet(key);
  if (cached !== null) {
    try {
      return parseRecentTracks(cached, limit);
    } catch {
      // Fall through and refetch on a corrupt cache entry.
    }
  }

  const body = await callApi(
    {
      method: 'user.getrecenttracks',
      user,
      limit: String(limit),
      // Adds the per-track `loved` flag. Always requested (even when hearts are
      // off) so every option combination shares a single cache entry.
      extended: '1',
    },
    apiKey,
    timeoutMs,
  );
  const tracks = parseRecentTracks(body, limit);
  await cachePut(key, body, cacheSeconds, ctx);
  return tracks;
}

interface RawUser {
  name?: string;
  url?: string;
  image?: RawImage[];
  playcount?: string;
  artist_count?: string;
  track_count?: string;
}

function int(value: string | undefined): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function parseUserInfo(body: string): UserInfo {
  const parsed = JSON.parse(body) as { user?: RawUser };
  const u = parsed?.user ?? {};
  return {
    name: (u.name ?? '').trim(),
    url: (u.url ?? '').trim(),
    image: pickImage(u.image),
    playcount: int(u.playcount),
    artistCount: int(u.artist_count),
    trackCount: int(u.track_count),
  };
}

export interface GetUserInfoOptions {
  user: string;
  apiKey: string;
  cacheSeconds: number;
  timeoutMs?: number;
  ctx?: WaitUntilCtx;
}

export async function getUserInfo({
  user,
  apiKey,
  cacheSeconds,
  timeoutMs = LASTFM_TIMEOUT_MS,
  ctx,
}: GetUserInfoOptions): Promise<UserInfo> {
  const key = `lastfmuser:v1:${user.toLowerCase()}`;
  const cached = await cacheGet(key);
  if (cached !== null) {
    try {
      return parseUserInfo(cached);
    } catch {
      /* refetch on corrupt entry */
    }
  }

  const body = await callApi({ method: 'user.getinfo', user }, apiKey, timeoutMs);
  const info = parseUserInfo(body);
  await cachePut(key, body, cacheSeconds, ctx);
  return info;
}
