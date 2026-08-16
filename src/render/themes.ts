import { contrastRatio, isLight, mix, parseRgba } from './color';

export interface Theme {
  /** Card background. `none` renders a transparent card. */
  bg: string;
  border: string;
  /** Track title color. */
  title: string;
  /** Artist / secondary line color. */
  artist: string;
  /** Timestamp + footer color. */
  meta: string;
  /** Now-playing accent (equaliser bars, "Scrobbling now" label). */
  accent: string;
  /** Placeholder tile fill when album art or an avatar is missing. */
  placeholder: string;
  /** Glyph color drawn on top of `placeholder`. */
  placeholderInk: string;
  /** Loved-track heart. Deliberately not `accent`: accent is blue in some
   * palettes, and a blue heart reads as a different thing entirely.
   */
  loved: string;
  /** Heart shown for not-loved tracks when `loved=between-all`. */
  lovedOff: string;
  /** Hairline rule between track rows. Should be barely perceptible. */
  divider: string;
  /** Track title color on hover, where the SVG is interactive. */
  titleHover: string;
}

export const THEMES = {
  /**
   * Neutral-cool charcoal (#151B23). The supporting greys carry the same
   * slight blue cast as the background; pure neutral greys read as muddy
   * against it, and GitHub-blue greys read as purple.
   */
  dark: {
    bg: '#151b23',
    border: '#2a323d',
    title: '#e9eef5',
    artist: '#9fadbd',
    meta: '#7d8b9c',
    accent: '#d51007',
    placeholder: '#1d242e',
    // Deliberately higher contrast against its tile than the other themes
    // use. The same ratio reads weaker the darker the backdrop, and the
    // avatar glyph is small and fine-lined, so a placeholder that looks
    // right at 32px on nord disappears at 22px here.
    placeholderInk: '#435060',
    loved: '#e02d24',
    lovedOff: '#3a4451',
    divider: '#232b36',
    titleHover: '#e02d24',
  },
  /**
   * The neutral charcoal this card used before moving to a cooler base.
   * Kept as its own theme: hue-free greys sit differently against #212121
   * than the blue-tinted set does against #151b23.
   */
  legacy: {
    bg: '#212121',
    border: '#2f2f2f',
    title: '#f0f0f0',
    artist: '#b0b0b0',
    meta: '#8a8a8a',
    accent: '#d51007',
    placeholder: '#2b2b2b',
    // Lifted to match dark; see the note there.
    placeholderInk: '#585858',
    loved: '#e02d24',
    lovedOff: '#4a4a4a',
    divider: '#2e2e2e',
    titleHover: '#e02d24',
  },
  light: {
    bg: '#ffffff',
    border: '#d0d7de',
    title: '#1f2328',
    artist: '#59636e',
    meta: '#818b98',
    accent: '#d51007',
    placeholder: '#eaeef2',
    placeholderInk: '#c8d1da',
    loved: '#d51007',
    lovedOff: '#c8d1da',
    divider: '#eaeef2',
    titleHover: '#d51007',
  },
  nord: {
    bg: '#2e3440',
    border: '#3b4252',
    title: '#eceff4',
    artist: '#88c0d0',
    meta: '#7b88a1',
    accent: '#88c0d0',
    placeholder: '#3b4252',
    placeholderInk: '#4c566a',
    loved: '#bf616a',
    lovedOff: '#4c566a',
    divider: '#3b4252',
    titleHover: '#88c0d0',
  },
  catppuccin: {
    bg: '#1e1e2e',
    border: '#313244',
    title: '#cdd6f4',
    artist: '#cba6f7',
    meta: '#7f849c',
    accent: '#f38ba8',
    placeholder: '#313244',
    placeholderInk: '#45475a',
    loved: '#f38ba8',
    lovedOff: '#45475a',
    divider: '#313244',
    titleHover: '#f38ba8',
  },
  transparent: {
    bg: 'none',
    border: 'none',
    title: '#8b949e',
    artist: '#8b949e',
    meta: '#6e7681',
    accent: '#d51007',
    placeholder: '#6e768133',
    placeholderInk: '#8b949e55',
    loved: '#d51007',
    lovedOff: '#6e768155',
    divider: '#8b949e33',
    titleHover: '#d51007',
  },
} as const satisfies Record<string, Theme>;

export type ThemeName = keyof typeof THEMES;

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

export const DEFAULT_THEME: ThemeName = 'dark';

export function isThemeName(value: string): value is ThemeName {
  return Object.prototype.hasOwnProperty.call(THEMES, value);
}

/**
 * Caller-supplied colors, each null when not given.
 *
 * These are roles, not elements: `meta` is the timestamp, the footer and the
 * stats labels together. Everything else in `Theme` is derived, because it is a
 * relationship rather than a choice - mixing `title` toward `bg` reproduces the
 * presets' own dividers and placeholders closely.
 *
 * Two pairs look mergeable and are not. `artist` and `meta` differ by 21 and 41
 * out of 255 in `nord` and `catppuccin`, which pair a hued artist line with a
 * neutral grey timestamp; and `nord`'s accent is blue, so `loved` cannot follow
 * it without turning the heart blue.
 */
export interface ThemeOverrides {
  bg?: string | null;
  title?: string | null;
  /** The artist line. */
  artist?: string | null;
  /** Timestamps, the footer, and the stats labels. */
  meta?: string | null;
  accent?: string | null;
  loved?: string | null;
}

/** WCAG AA for body text; the card's smaller type is where it matters. */
const MIN_CONTRAST = 4.5;

/** Ratios measured from the presets - see `color.ts` and the tests. */
const DERIVED = {
  artist: 0.31,
  meta: 0.48,
  border: 0.89,
  divider: 0.92,
  placeholder: 0.92,
  placeholderInk: 0.77,
  lovedOff: 0.75,
} as const;

function hasOverride(overrides: ThemeOverrides | undefined): overrides is ThemeOverrides {
  return Boolean(overrides && Object.values(overrides).some(Boolean));
}

export function resolveTheme(
  name: string | null | undefined,
  overrides?: ThemeOverrides,
): Theme {
  const base: Theme = name && isThemeName(name) ? THEMES[name] : THEMES[DEFAULT_THEME];

  // The common path. Returning the preset object itself - rather than a copy
  // built from the same values - keeps existing cards provably unchanged.
  if (!hasOverride(overrides)) return base;

  const bg = overrides.bg ?? base.bg;

  // A background alone can make a theme unreadable - `?bg_color=ffffff` on the
  // dark theme painted #e9eef5 onto white. Borrow the inks from whichever
  // built-in palette suits it, which keeps the result looking designed in a way
  // that computing a contrasting grey does not.
  const contrast = contrastRatio(bg, base.title);
  const ink: Theme =
    contrast !== null && contrast < MIN_CONTRAST ? (isLight(bg) ? THEMES.light : THEMES.dark) : base;

  const title = overrides.title ?? ink.title;
  const accent = overrides.accent ?? ink.accent;
  const loved = overrides.loved ?? ink.loved;

  // Supporting colors are only re-derived when the pair they hang off has
  // moved, and only when there is a background to fade toward: `transparent`
  // has `bg: 'none'`, and mixing toward nothing collapses them onto the title.
  const mixable = parseRgba(bg) !== null;
  const derive = mixable && (title !== ink.title || bg !== ink.bg);
  const from = (ratio: number, fallback: string): string =>
    derive ? mix(title, bg, ratio) : fallback;

  return {
    bg,
    title,
    artist: overrides.artist ?? from(DERIVED.artist, ink.artist),
    accent,
    loved,
    meta: overrides.meta ?? from(DERIVED.meta, ink.meta),
    border: from(DERIVED.border, ink.border),
    divider: from(DERIVED.divider, ink.divider),
    placeholder: from(DERIVED.placeholder, ink.placeholder),
    placeholderInk: from(DERIVED.placeholderInk, ink.placeholderInk),
    // Tied to the heart rather than the text, so a custom heart keeps its
    // muted form in the same hue.
    lovedOff:
      overrides.loved && mixable
        ? mix(loved, bg, DERIVED.lovedOff)
        : from(DERIVED.lovedOff, ink.lovedOff),
    // The presets mostly set these equal already; where they differ it is a
    // nudge that only makes sense against that palette's own accent.
    titleHover: overrides.accent ?? ink.titleHover,
  };
}
