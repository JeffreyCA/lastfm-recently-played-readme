import { DEFAULT_THEME, isThemeName, type ThemeName } from './render/themes';

/**
 * Where the loved-track heart is drawn.
 *
 * - `off`         no heart
 * - `between`     in the gutter between art and text, loved tracks only
 * - `between-all` same gutter, but not-loved tracks get a muted heart too
 * - `title`       immediately after the track title
 * - `time`        left of the timestamp / "Scrobbling now" label
 */
export const LOVED_MODES = ['off', 'between', 'between-all', 'title', 'time'] as const;
export type LovedMode = (typeof LOVED_MODES)[number];

export function isLovedMode(value: string): value is LovedMode {
  return (LOVED_MODES as readonly string[]).includes(value);
}

/**
 * Profile stats under the header.
 *
 * - `off`          hidden
 * - `block`        labelled columns, as on the Last.fm profile page
 * - `block-center` the same columns, centred in the card
 * - `compact`      one centred line, value then label
 */
export const STATS_MODES = ['off', 'block', 'block-center', 'compact'] as const;
export type StatsMode = (typeof STATS_MODES)[number];

/**
 * What sits below the track list.
 *
 * - `off`   nothing
 * - `stats` the compact stats line, centred
 * - `wave`  a dot-field wave, as quiet decoration
 *
 * The footer holds one thing at a time. When `profile` puts the picture and
 * username down here, that *is* the footer and this is ignored.
 */
export const FOOTER_MODES = ['off', 'stats', 'wave'] as const;
export type FooterMode = (typeof FOOTER_MODES)[number];

/**
 * Where the profile (picture and/or username) is placed.
 *
 * Placement is separate from content: `avatar` and `username` say what the
 * profile contains, and this says where it goes. Folding the two together is
 * what made `avatar` look like a header-only switch.
 */
export const PROFILE_POSITIONS = ['header', 'footer-left', 'footer-right', 'off'] as const;
export type ProfilePosition = (typeof PROFILE_POSITIONS)[number];

/** Whether the profile sits in the footer, and on which side. */
export function footerProfileAlign(p: ProfilePosition): 'left' | 'right' | null {
  if (p === 'footer-left') return 'left';
  if (p === 'footer-right') return 'right';
  return null;
}

/**
 * A caller-supplied background color.
 *
 * Validated to a strict hex form rather than escaped, because this value is
 * interpolated into an SVG attribute: an allowlist is the only way to be sure
 * nothing else can ride along.
 *
 * A leading `#` is rejected rather than tolerated. In a URL it would have to
 * be written `%23`, and accepting the raw form encourages `bg_color=#abc`,
 * where everything from the `#` is treated as a page anchor and never reaches
 * the server - which looks like the parameter being ignored.
 */
export function parseHexColor(raw: string | null): string | null {
  const value = (raw ?? '').trim().toLowerCase();
  if (!/^([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(value)) return null;
  if (value.length <= 4) {
    return `#${[...value].map((c) => c + c).join('')}`;
  }
  return `#${value}`;
}

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

function parseStats(raw: string | null): StatsMode {
  const value = (raw ?? '').trim().toLowerCase();
  if ((STATS_MODES as readonly string[]).includes(value)) return value as StatsMode;
  // `stats=1` predates the styles and should still mean "show them".
  if (TRUTHY.has(value)) return 'block';
  return 'off';
}

function parseFooter(raw: string | null): FooterMode {
  const value = (raw ?? '').trim().toLowerCase();
  return (FOOTER_MODES as readonly string[]).includes(value) ? (value as FooterMode) : 'off';
}

function parseProfile(raw: string | null): ProfilePosition {
  const value = (raw ?? '').trim().toLowerCase();
  return (PROFILE_POSITIONS as readonly string[]).includes(value)
    ? (value as ProfilePosition)
    : 'header';
}

export interface WidgetOptions {
  user: string;
  count: number;
  theme: ThemeName;
  width: number;
  art: boolean;
  header: boolean;
  radius: number;
  /** Show relative timestamps ("3m ago"). */
  time: boolean;
  /** Last.fm wordmark in the header. Also serves as attribution. */
  logo: boolean;
  /** Where the profile goes. */
  profile: ProfilePosition;
  /** Include the username in the profile. */
  username: boolean;
  /** Include the picture in the profile. Costs one extra upstream call. */
  avatar: boolean;
  /** Scrobbles / artists / tracks strip under the header. */
  stats: StatsMode;
  /** What sits below the track list. */
  footer: FooterMode;
  /** Overrides the theme background, or null to keep it. */
  bgColor: string | null;
  /** Overrides the theme's title color; the supporting greys follow it. */
  textColor: string | null;
  /** Overrides the artist line. */
  artistColor: string | null;
  /** Overrides timestamps, the footer and the stats labels. */
  metaColor: string | null;
  /** Overrides the now-playing accent and the title hover color. */
  accentColor: string | null;
  /** Overrides the loved-track heart. */
  lovedColor: string | null;
  /** Overrides the Last.fm wordmark, which is otherwise their brand red. */
  logoColor: string | null;
  /** Where loved-track hearts are drawn. */
  loved: LovedMode;
}

/**
 * Last.fm usernames are letters, digits, `-` and `_`, and must start with a
 * letter. We validate rather than sanitise: an invalid username can never
 * reach the upstream API, which keeps this endpoint from being used as a
 * general-purpose probe. (URL construction uses URLSearchParams, so injection
 * is not possible regardless - this is about limiting the request surface.)
 *
 * Last.fm caps signups at 15 characters, but older accounts exceed that, so
 * the bound here is deliberately looser than the signup rule.
 */
const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_-]{1,29}$/;

export class OptionsError extends Error {
  constructor(message: string) {
    super(message);
    // Logged as the `err` field; without this every error class reads 'Error'.
    this.name = 'OptionsError';
  }
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function bool(raw: string | null, fallback: boolean): boolean {
  if (raw === null || raw.trim() === '') return fallback;
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return fallback;
}

export const LIMITS = {
  count: { min: 1, max: 10, default: 5 },
  width: { min: 260, max: 1000, default: 400 },
  radius: { min: 0, max: 40, default: 10 },
} as const;

export function parseOptions(params: URLSearchParams): WidgetOptions {
  // Note: `username` is a boolean flag controlling the header, not an alias
  // for `user`. Keeping both meanings on one name would be ambiguous.
  const user = (params.get('user') ?? '').trim();

  if (!user) {
    throw new OptionsError('Missing "user" parameter');
  }
  if (!USERNAME_RE.test(user)) {
    throw new OptionsError('Invalid Last.fm username');
  }

  const themeRaw = (params.get('theme') ?? '').trim().toLowerCase();
  const theme: ThemeName = isThemeName(themeRaw) ? themeRaw : DEFAULT_THEME;

  const lovedRaw = (params.get('loved') ?? '').trim().toLowerCase();

  return {
    user,
    theme,
    loved: isLovedMode(lovedRaw) ? lovedRaw : 'time',
    count: clampInt(params.get('count'), LIMITS.count.default, LIMITS.count.min, LIMITS.count.max),
    width: clampInt(params.get('width'), LIMITS.width.default, LIMITS.width.min, LIMITS.width.max),
    radius: clampInt(params.get('radius'), LIMITS.radius.default, LIMITS.radius.min, LIMITS.radius.max),
    art: bool(params.get('art'), true),
    header: bool(params.get('header'), true),
    time: bool(params.get('time'), true),
    logo: bool(params.get('logo'), true),
    profile: parseProfile(params.get('profile')),
    username: bool(params.get('username'), true),
    avatar: bool(params.get('avatar'), true),
    stats: parseStats(params.get('stats')),
    footer: parseFooter(params.get('footer')),
    bgColor: parseHexColor(params.get('bg_color')),
    // All colors go through the same allowlist. These are interpolated into
    // SVG attributes, so validation - not escaping - is what makes them safe.
    textColor: parseHexColor(params.get('text_color')),
    artistColor: parseHexColor(params.get('artist_color')),
    metaColor: parseHexColor(params.get('meta_color')),
    accentColor: parseHexColor(params.get('accent_color')),
    lovedColor: parseHexColor(params.get('loved_color')),
    logoColor: parseHexColor(params.get('logo_color')),
  };
}
