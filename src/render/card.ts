import type { Track, UserInfo } from '../lastfm';
import { footerProfileAlign } from '../options';
import type { LovedMode, WidgetOptions } from '../options';
import { waveDecor } from './decor';
import { escapeCss, escapeXml } from './escape';
import { FONT_STACK } from './font';
import {
  avatarPlaceholder,
  heart,
  HEART_INK_INSET_RATIO,
  LASTFM_RED,
  lastfmLogo,
  logoAscent,
  logoDescent,
  logoWidth,
  vinylPlaceholder,
} from './icons';
import {
  estimateLayoutWidth,
  estimateWidth,
  truncateToWidth,
} from './measure';
import { resolveTheme, type Theme } from './themes';

/* -------------------------------------------------------------------------- */
/* Type metrics                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Metrics for the system font stack, as a fraction of font size.
 *
 * SVG positions text by baseline, but a reader aligns things by what they can
 * see. Measured from the resolved stack rather than estimated: Canvas
 * TextMetrics at 1000px gives cap 0.7031, ascender 0.75, x-height 0.5 and
 * descender 0.2344. Earlier guesses of 0.72/0.21 put the descender ~10% too
 * shallow, which showed up as text sitting low against the artwork.
 */
const CAP_RATIO = 0.7031;
const DESC_RATIO = 0.2344;

/** Baseline that puts the optical centre of a line of `size` on `centreY`. */
function centredBaseline(centreY: number, size: number): number {
  return centreY + ((CAP_RATIO - DESC_RATIO) / 2) * size;
}

/**
 * Optical centre of a line of text: midway between its cap height and its
 * baseline. Descenders hang below a line rather than belonging to it, so
 * centring against the full ink extent puts adjacent glyphs visibly low.
 */
function capCentre(baseline: number, size: number): number {
  return baseline - (CAP_RATIO * size) / 2;
}

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

const PAD_X = 16;

/**
 * The single constant governing vertical rhythm.
 *
 * The card is a stack of sections divided by hairline rules. Every section
 * keeps exactly this much clearance from its boundary, whether that boundary
 * is a rule or the card edge. That's why it's one constant rather than
 * several: the header centres between the top edge and the first rule by
 * construction, and the gap between two rows is exactly twice this, with the
 * rule centred in it.
 */
const SECTION_PAD = 12;

const TITLE_SIZE = 14;
const ARTIST_SIZE = 13;
/** Right-hand meta: timestamp and the "Scrobbling now" label. */
const META_SIZE = 11.5;

/** Baseline-to-baseline distance between the title and artist lines. */
const LINE_GAP = 19;

/**
 * The art tile is as tall as the text block's full ink, from the title's cap
 * height to the artist's descender. Derived rather than chosen: pick a size
 * independently and the two drift apart whenever a font size changes.
 *
 * It also sets the row height, so the gaps a reader actually notices - above
 * and below the artwork, the heaviest element in the row - stay the uniform
 * SECTION_PAD.
 */
const ART_SIZE = Math.round(CAP_RATIO * TITLE_SIZE + LINE_GAP + DESC_RATIO * ARTIST_SIZE);
const ART_GAP = 12;

/**
 * Where the title's baseline sits within the row.
 *
 * A text block reads as running from the first line's cap height to the last
 * line's *baseline* - descenders hang below it rather than belonging to it -
 * so that extent, not the ink extent, is what gets centred on the tile.
 * Hanging the text from the tile's top instead (the obvious reading of
 * "align them") leaves the artwork looking about 1.4px low.
 */
const TITLE_BASELINE_IN_ROW = ART_SIZE / 2 - (LINE_GAP - CAP_RATIO * TITLE_SIZE) / 2;

/** Rows are the same height with or without art, so the rhythm never jumps. */
const ROW_H = ART_SIZE;

const HEADER_TITLE_SIZE = 16;
const USER_SIZE = 12.5;
const LOGO_H = 14;
const LOGO_GAP = 9;
const AVATAR_SIZE = 22;
const AVATAR_GAP = 5;

const HEART_SIZE = 11;
/** Gutter width consumed by `loved=between` / `between-all`. */
const HEART_GUTTER = HEART_SIZE + 7;
const HEART_TEXT_GAP = 5;
/**
 * The heart glyph carries ~1px of its own padding inside its box, so the gap
 * after a title needs to be smaller than a plain text gap to look equal.
 */
const HEART_TITLE_GAP = 4;

const STATS_LABEL_SIZE = 10;
const STATS_VALUE_SIZE = 15;
const STATS_TRACKING = 0.8;
const STATS_COL_GAP = 22;
const STATS_LINE_GAP = 18;
/** Stats belong to the header block, so they sit closer than a section break. */
const STATS_TOP_GAP = 10;
/** Uppercase San Francisco labels are wider than the general font allowance. */
const STATS_LABEL_WIDTH_ALLOWANCE = 1.18;

/** One-line variant: value then label, repeated, centred. */
const COMPACT_VALUE_SIZE = 13;
const COMPACT_LABEL_SIZE = 9.5;
/** Between a value and its own label. */
const COMPACT_PAIR_GAP = 5;
/** Between one value/label pair and the next. */
const COMPACT_GROUP_GAP = 16;

/** Height of the wave footer, and the smaller pad below it: the band already
 *  carries slack because the dots never reach its edges. */
const FOOTER_WAVE_H = 30;
const FOOTER_WAVE_PAD = 4;

const EQ_BARS = 3;
const EQ_BAR_W = 3;
const EQ_BAR_GAP = 2;
const EQ_H = 11;
const EQ_WIDTH = EQ_BARS * (EQ_BAR_W + EQ_BAR_GAP) - EQ_BAR_GAP;
/** Space between the equaliser and the "Scrobbling now" label. */
const EQ_TEXT_GAP = 5;
/** Midpoint between the measured Windows-like and macOS status-label widths. */
const NOW_PLAYING_WIDTH_SCALE = 1.04;

/** Art is fetched at this display size; exported so the fetcher stays in sync. */
export const ART_DISPLAY_PX = ART_SIZE;

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export interface CardInput {
  options: WidgetOptions;
  tracks: Track[];
  /** Parallel to `tracks`; null where art was unavailable. */
  art: (string | null)[];
  /** Profile data, when `avatar` or `stats` is enabled. */
  user?: UserInfo | null;
  /** Inlined avatar data URI, or null to fall back to the placeholder. */
  avatarImage?: string | null;
  /** Injectable for deterministic tests. */
  now?: number;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
/** Average lengths, so "1mo" means a month rather than exactly 30 days. */
const MONTH = 2629800;
const YEAR = 12 * MONTH;

/**
 * Always relative, never an absolute date.
 *
 * An absolute date would be ambiguous anyway: the card is rendered
 * server-side with no knowledge of the reader's timezone or locale, so
 * "Jul 20" could be off by a day and would read as US-formatted to everyone.
 */
export function relativeTime(playedAtSeconds: number, nowMs: number): string {
  const diff = Math.max(0, Math.floor(nowMs / 1000) - playedAtSeconds);

  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
  if (diff < MONTH) return `${Math.floor(diff / WEEK)}w ago`;
  if (diff < YEAR) return `${Math.floor(diff / MONTH)}mo ago`;
  return `${Math.floor(diff / YEAR)}y ago`;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * The exact scrobble time, for the timestamp's tooltip only.
 *
 * Stated in UTC and spelled with a month name, for the same reason the
 * visible label stays relative: the card is rendered server-side with no
 * idea of the reader's timezone or locale, so a bare numeric date would be
 * wrong by up to a day and read as US-formatted to everyone. Naming the zone
 * makes it merely offset rather than ambiguous. Built from the UTC getters
 * rather than Intl, which the runtime need not carry.
 */
export function absoluteTime(playedAtSeconds: number): string {
  const date = new Date(playedAtSeconds * 1000);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()} ` +
    `at ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  );
}

/**
 * Tooltip for a track's title and artist lines.
 *
 * Truncated lines mean this is often the only place the full text exists, so
 * the album is included too - it appears nowhere else on the card. The
 * scrobble time stays out of it deliberately; that belongs to the timestamp,
 * which has its own.
 */
export function trackTooltip(track: Track): string {
  const lines = [track.name, `by ${track.artist}`];
  if (track.album) lines.push(`from ${track.album}`);
  return lines.join('\n');
}

/** 30529 -> "30,529". Avoids depending on Intl being present in the runtime. */
export function formatCount(n: number): string {
  return String(Math.max(0, Math.floor(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Only ever emit links to Last.fm over https.
 *
 * The URL arrives in the upstream payload, so treating it as trusted would let
 * anything Last.fm returned - or anything injected into a cached response -
 * become a `javascript:` href in the rendered card.
 */
export function safeTrackUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (url.hostname !== 'www.last.fm' && url.hostname !== 'last.fm') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Primitives                                                                 */
/* -------------------------------------------------------------------------- */

interface TextOptions {
  size: number;
  fill: string;
  weight?: number;
  anchor?: 'start' | 'end';
  className?: string;
  tracking?: number;
  /**
   * Pins the rendered advance to the same width used by surrounding layout.
   * Use only when a non-text sibling depends on an estimated text width.
   */
  textLength?: number;
  /**
   * Native tooltip, shown wherever the SVG is interactive. Inert inside an
   * <img> like every other hover affordance here, so nothing may depend on it.
   */
  tooltip?: string;
}

/** Every piece of text in the card goes through here, so escaping is uniform. */
function text(
  content: string,
  x: number,
  y: number,
  {
    size,
    fill,
    weight,
    anchor,
    className,
    tracking,
    textLength,
    tooltip,
  }: TextOptions,
): string {
  return (
    `<text${className ? ` class="${className}"` : ''} x="${round(x)}" y="${round(y)}"` +
    `${anchor === 'end' ? ' text-anchor="end"' : ''}` +
    ` font-family="${FONT_STACK}" font-size="${size}"` +
    `${weight ? ` font-weight="${weight}"` : ''}` +
    `${tracking ? ` letter-spacing="${tracking}"` : ''}` +
    `${textLength !== undefined ? ` textLength="${round(textLength)}" lengthAdjust="spacing"` : ''}` +
    ` fill="${fill}">` +
    // <title> is metadata, not rendered content, so it can sit inside <text>
    // without affecting the glyphs.
    `${tooltip ? `<title>${escapeXml(tooltip)}</title>` : ''}` +
    `${escapeXml(content)}</text>`
  );
}

function link(href: string, body: string, className: string, label?: string): string {
  return (
    `<a class="${className}" href="${escapeXml(href)}" target="_blank" rel="noopener noreferrer"` +
    `${label ? ` aria-label="${escapeXml(label)}"` : ''}>${body}</a>`
  );
}

/** Hairline rule spanning the content width, centred on `y`. */
function rule(y: number, width: number, color: string): string {
  return `<rect x="${PAD_X}" y="${round(y - 0.5)}" width="${width - PAD_X * 2}" height="1" fill="${color}"/>`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Three bars, matching the icon Last.fm uses on its own site. The staggered
 * delays keep them from moving as one block.
 */
function equaliser(x: number, baseline: number, color: string, idPrefix: string): string {
  const delays = [0, 300, 150];
  const bars = delays
    .map((delay, i) => {
      const bx = x + i * (EQ_BAR_W + EQ_BAR_GAP);
      return (
        `<rect class="${idPrefix}-eq" x="${round(bx)}" y="${round(baseline - EQ_H)}"` +
        ` width="${EQ_BAR_W}" height="${EQ_H}" rx="1.5" fill="${color}" style="animation-delay:${delay}ms"/>`
      );
    })
    .join('');
  return `<g>${bars}</g>`;
}

function artTile(dataUri: string | null, x: number, y: number, ctx: Ctx, index: number): string {
  if (!dataUri) {
    return vinylPlaceholder(x, y, ART_SIZE, ctx.theme.placeholder, ctx.theme.placeholderInk);
  }
  const clipId = `${ctx.idPrefix}-clip${index}`;
  return (
    `<clipPath id="${clipId}"><rect x="${x}" y="${round(y)}" width="${ART_SIZE}" height="${ART_SIZE}" rx="4"/></clipPath>` +
    `<image x="${x}" y="${round(y)}" width="${ART_SIZE}" height="${ART_SIZE}" href="${dataUri}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>`
  );
}

function avatarTile(dataUri: string | null, cx: number, cy: number, ctx: Ctx): string {
  if (!dataUri) {
    return avatarPlaceholder(cx, cy, AVATAR_SIZE, ctx.theme.placeholder, ctx.theme.placeholderInk);
  }
  const clipId = `${ctx.idPrefix}-avatar`;
  const r = AVATAR_SIZE / 2;
  return (
    `<clipPath id="${clipId}"><circle cx="${round(cx)}" cy="${round(cy)}" r="${r}"/></clipPath>` +
    `<image x="${round(cx - r)}" y="${round(cy - r)}" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" href="${dataUri}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>`
  );
}

/* -------------------------------------------------------------------------- */
/* Sections                                                                   */
/* -------------------------------------------------------------------------- */

/** Values shared by every section, resolved once per render. */
interface Ctx {
  options: WidgetOptions;
  theme: Theme;
  idPrefix: string;
  width: number;
  /** x of the right content edge. */
  rightEdge: number;
  /** x where the title/artist column starts, after art and any heart gutter. */
  textX: number;
  /** Whether the heart gutter is actually reserved for this render. */
  gutter: boolean;
  profileHref: string;
}

/** Whether a loved mode can reserve the gutter column between art and text. */
function usesGutter(mode: LovedMode): boolean {
  return mode === 'between' || mode === 'between-all';
}

/**
 * Visual bounds of the header's contents relative to its shared baseline.
 *
 * The band is symmetric about the title's cap-to-baseline center: the logo,
 * title and username share one typographic baseline, and the avatar is
 * centered on the same optical line. Taking the largest reach on either side
 * centers the cluster without platform-specific SVG baseline keywords.
 */
function headerExtent(options: WidgetOptions): { top: number; bottom: number } {
  const center = -(CAP_RATIO * HEADER_TITLE_SIZE) / 2;
  const spans: Array<[number, number]> = [[-CAP_RATIO * HEADER_TITLE_SIZE, 0]];

  if (options.logo) {
    spans.push([-logoAscent(LOGO_H), logoDescent(LOGO_H)]);
  }

  if (options.profile === 'header') {
    if (options.username) spans.push([-CAP_RATIO * USER_SIZE, 0]);
    if (options.avatar) spans.push([center - AVATAR_SIZE / 2, center + AVATAR_SIZE / 2]);
  }

  let half = 0;
  for (const [top, bottom] of spans) {
    half = Math.max(half, center - top, bottom - center);
  }

  return { top: center - half, bottom: center + half };
}

function renderHeader(ctx: Ctx, baseline: number, avatarImage: string | null): string {
  const { theme, options, idPrefix, rightEdge } = ctx;
  const parts: string[] = [];
  const avatarCenterY = capCentre(baseline, HEADER_TITLE_SIZE);

  // Right: the profile, when it lives here. `avatar` and `username` say what
  // it contains; `profile` says where it goes.
  const inHeader = options.profile === 'header';
  const showName = inHeader && options.username;
  const showAvatar = inHeader && options.avatar;

  const nameWidth = showName ? estimateWidth(options.user, USER_SIZE, 600) : 0;
  const avatarGap = showName && showAvatar ? AVATAR_GAP : 0;
  let rightUsed = nameWidth;

  let identity = '';
  if (showAvatar) {
    const cx = rightEdge - nameWidth - avatarGap - AVATAR_SIZE / 2;
    identity += avatarTile(avatarImage, cx, avatarCenterY, ctx);
    rightUsed += avatarGap + AVATAR_SIZE;
  }
  if (showName) {
    identity += text(options.user, rightEdge, baseline, {
      size: USER_SIZE,
      weight: 600,
      fill: theme.title,
      anchor: 'end',
      className: `${idPrefix}-u`,
      textLength: showAvatar ? nameWidth : undefined,
    });
  }
  if (identity) {
    // With no name the link carries no text, so it needs an explicit
    // accessible name.
    parts.push(
      link(
        ctx.profileHref,
        identity,
        `${idPrefix}-a`,
        showName ? undefined : `${options.user} on Last.fm`,
      ),
    );
  }

  // Left: wordmark then title, sharing the same baseline as the username.
  let titleX = PAD_X;
  if (options.logo) {
    parts.push(
      link(
        ctx.profileHref,
        lastfmLogo(PAD_X, baseline, LOGO_H, options.logoColor ?? LASTFM_RED, `${idPrefix}-g`),
        `${idPrefix}-a`,
        `${options.user} on Last.fm`,
      ),
    );
    titleX = PAD_X + logoWidth(LOGO_H) + LOGO_GAP;
  }

  const available = rightEdge - titleX - rightUsed - 12;
  const headerTitle = truncateToWidth('Recently Played', HEADER_TITLE_SIZE, available, 600);
  parts.push(
    text(headerTitle, titleX, baseline, {
      size: HEADER_TITLE_SIZE,
      weight: 600,
      fill: theme.title,
      textLength:
        headerTitle !== 'Recently Played'
          ? estimateWidth(headerTitle, HEADER_TITLE_SIZE, 600)
          : undefined,
    }),
  );

  return parts.join('');
}

interface StatColumn {
  label: string;
  value: string;
}

/** A section's markup together with the height it consumed. */
interface Section {
  svg: string;
  height: number;
}

const EMPTY_SECTION: Section = { svg: '', height: 0 };

/** Width a letter-spaced stats label occupies. */
function labelWidth(label: string, size: number, weight: number): number {
  return (
    estimateWidth(label, size, weight) * STATS_LABEL_WIDTH_ALLOWANCE +
    STATS_TRACKING * Math.max(0, label.length - 1)
  );
}

/**
 * How many leading items fit in `available`, and how wide they are together.
 * Trailing items are dropped rather than allowed to overflow a narrow card.
 */
function fitItems(widths: number[], available: number, gap: number): { count: number; total: number } {
  let count = 0;
  let total = 0;
  for (const width of widths) {
    const next = total + width + (count ? gap : 0);
    if (next > available) break;
    total = next;
    count++;
  }
  return { count, total };
}

function renderStats(
  ctx: Ctx,
  top: number,
  user: UserInfo | null | undefined,
  centred: boolean,
): Section {
  const columns = statColumns(user);
  const labelBaseline = top + CAP_RATIO * STATS_LABEL_SIZE;
  const valueBaseline = labelBaseline + STATS_LINE_GAP;
  const height = valueBaseline + DESC_RATIO * STATS_VALUE_SIZE - top;

  // Column widths are needed up front so the group can be centred as a unit,
  // rather than each column being centred in its own share of the card.
  const labelWidths = columns.map((col) => labelWidth(col.label, STATS_LABEL_SIZE, 500));
  const valueWidths = columns.map((col) =>
    estimateLayoutWidth(col.value, STATS_VALUE_SIZE, 600),
  );
  const widths = columns.map((_, i) => Math.max(labelWidths[i]!, valueWidths[i]!));
  const { count, total } = fitItems(widths, ctx.width - PAD_X * 2, STATS_COL_GAP);
  if (count === 0) return EMPTY_SECTION;

  const parts: string[] = [];
  let x = centred ? (ctx.width - total) / 2 : PAD_X;

  for (let i = 0; i < count; i++) {
    const col = columns[i]!;
    parts.push(
      text(col.label, x, labelBaseline, {
        size: STATS_LABEL_SIZE,
        weight: 500,
        fill: ctx.theme.meta,
        tracking: STATS_TRACKING,
      }),
      text(col.value, x, valueBaseline, {
        size: STATS_VALUE_SIZE,
        weight: 600,
        fill: ctx.theme.title,
      }),
    );
    x += widths[i]! + STATS_COL_GAP;
  }

  return { svg: parts.join(''), height };
}

function statColumns(user: UserInfo | null | undefined): StatColumn[] {
  return [
    { label: 'SCROBBLES', value: formatCount(user?.playcount ?? 0) },
    { label: 'ARTISTS', value: formatCount(user?.artistCount ?? 0) },
    { label: 'TRACKS', value: formatCount(user?.trackCount ?? 0) },
  ];
}

/** One centred line, each stat as a value followed by its label. */
function renderStatsCompact(ctx: Ctx, top: number, user: UserInfo | null | undefined): Section {
  const baseline = top + CAP_RATIO * COMPACT_VALUE_SIZE;
  const height = (CAP_RATIO + DESC_RATIO) * COMPACT_VALUE_SIZE;

  const columns = statColumns(user);
  const valueWidths = columns.map((col) =>
    estimateLayoutWidth(col.value, COMPACT_VALUE_SIZE, 600),
  );
  const labelWidths = columns.map((col) =>
    labelWidth(col.label, COMPACT_LABEL_SIZE, 600),
  );
  const pairWidths = columns.map((_, i) => valueWidths[i]! + COMPACT_PAIR_GAP + labelWidths[i]!);

  const { count } = fitItems(pairWidths, ctx.width - PAD_X * 2, COMPACT_GROUP_GAP);
  if (count === 0) return EMPTY_SECTION;

  const spans: string[] = [];
  for (let i = 0; i < count; i++) {
    const col = columns[i]!;
    if (i > 0) {
      spans.push(
        `<tspan textLength="${COMPACT_GROUP_GAP}" lengthAdjust="spacingAndGlyphs">&#160;</tspan>`,
      );
    }
    spans.push(
      `<tspan font-size="${COMPACT_VALUE_SIZE}" fill="${ctx.theme.title}">${escapeXml(col.value)}</tspan>`,
      `<tspan textLength="${COMPACT_PAIR_GAP}" lengthAdjust="spacingAndGlyphs">&#160;</tspan>`,
      `<tspan font-size="${COMPACT_LABEL_SIZE}" letter-spacing="${STATS_TRACKING}" fill="${ctx.theme.meta}">${escapeXml(col.label)}</tspan>`,
    );
  }

  return {
    svg:
      `<text x="${round(ctx.width / 2)}" y="${round(baseline)}" text-anchor="middle"` +
      ` font-family="${FONT_STACK}" font-weight="600">${spans.join('')}</text>`,
    height,
  };
}

function renderRow(
  ctx: Ctx,
  top: number,
  track: Track,
  artUri: string | null,
  index: number,
  now: number,
): string {
  const { theme, options, idPrefix, rightEdge, textX } = ctx;
  const mode = options.loved;
  const midY = top + ROW_H / 2;
  const parts: string[] = [];

  // Art and text share a vertical centre: see TITLE_BASELINE_IN_ROW.
  const titleBaseline = top + TITLE_BASELINE_IN_ROW;
  const artistBaseline = titleBaseline + LINE_GAP;

  if (options.art) parts.push(artTile(artUri, PAD_X, top, ctx, index));

  if (ctx.gutter) {
    // With artwork the heart sits in a gutter between two blocks, so centring
    // it in that span reads as even - offsetting from the artwork instead
    // leaves more space on the art side than the text side.
    //
    // Without artwork the heart becomes the row's leading element, and
    // centring leaves it floating a full PAD_X from the card edge while
    // nearly touching the title. Align its ink to the text edge instead, so
    // the heart column lines up with the rest of the left column.
    const cx = options.art
      ? (PAD_X + ART_SIZE + textX) / 2
      : PAD_X - HEART_SIZE * HEART_INK_INSET_RATIO + HEART_SIZE / 2;
    if (track.loved) {
      parts.push(heart(cx, midY, HEART_SIZE, theme.loved));
    } else if (mode === 'between-all') {
      parts.push(heart(cx, midY, HEART_SIZE, theme.lovedOff));
    }
  }

  // The meta column is a single line, so it centres on the row rather than
  // sitting on the artist baseline beside a two-line block.
  const metaBaseline = centredBaseline(midY, META_SIZE);
  let metaWidth = 0;
  let metaSvg = '';

  if (track.nowPlaying) {
    const label = 'Scrobbling now';
    const labelWidth = estimateWidth(label, META_SIZE) * NOW_PLAYING_WIDTH_SCALE;
    metaWidth = EQ_WIDTH + EQ_TEXT_GAP + labelWidth;
    metaSvg =
      equaliser(rightEdge - metaWidth, metaBaseline, theme.accent, idPrefix) +
      text(label, rightEdge, metaBaseline, {
        size: META_SIZE,
        fill: theme.accent,
        anchor: 'end',
        textLength: labelWidth,
      });
  } else if (options.time && track.playedAt !== null) {
    const label = relativeTime(track.playedAt, now);
    metaWidth = estimateLayoutWidth(label, META_SIZE);
    metaSvg = text(label, rightEdge, metaBaseline, {
      size: META_SIZE,
      fill: theme.meta,
      anchor: 'end',
      // The label is relative because an absolute one cannot be localised
      // server-side; the exact time is still worth having on hover.
      tooltip: `Scrobbled ${absoluteTime(track.playedAt)}`,
    });
  }

  // Only worth drawing beside something: with timestamps off and no
  // now-playing label, a `time` heart would sit alone against the right edge.
  if (mode === 'time' && track.loved && metaWidth > 0) {
    // Against the meta text's optical centre, not the row's: a timestamp with
    // a descender ("48m ago") sits higher in the row than its ink box implies.
    parts.push(
      heart(
        rightEdge - metaWidth - HEART_TEXT_GAP - HEART_SIZE / 2,
        capCentre(metaBaseline, META_SIZE),
        HEART_SIZE,
        theme.loved,
      ),
    );
    metaWidth += HEART_TEXT_GAP + HEART_SIZE;
  }

  const metaReserve = metaWidth > 0 ? metaWidth + 10 : 0;
  const titleHeart = mode === 'title' && track.loved;
  const titleReserve = titleHeart ? HEART_SIZE + HEART_TITLE_GAP : 0;

  const titleMaxWidth = rightEdge - textX - metaReserve - titleReserve;
  const title = truncateToWidth(track.name, TITLE_SIZE, titleMaxWidth, 600);
  const titleWidth = estimateWidth(title, TITLE_SIZE, 600);
  const artist = truncateToWidth(track.artist, ARTIST_SIZE, rightEdge - textX - metaReserve);
  const artistWidth = estimateWidth(artist, ARTIST_SIZE);

  // The title links where the SVG is interactive (direct view, <object>,
  // inline). GitHub embeds it through an <img>, which is inert - the link is
  // ignored there rather than breaking anything.
  const tooltip = trackTooltip(track);
  const titleSvg = text(title, textX, titleBaseline, {
    size: TITLE_SIZE,
    weight: 600,
    fill: theme.title,
    className: `${idPrefix}-t`,
    textLength: titleHeart || title !== track.name ? titleWidth : undefined,
    tooltip,
  });
  const href = safeTrackUrl(track.url);

  parts.push(
    href ? link(href, titleSvg, `${idPrefix}-a`) : titleSvg,
    text(artist, textX, artistBaseline, {
      size: ARTIST_SIZE,
      fill: theme.artist,
      // The artist line is truncated on the same terms as the title, so it
      // gets the same description rather than a shorter one.
      textLength: artist !== track.artist ? artistWidth : undefined,
      tooltip,
    }),
    metaSvg,
  );

  if (titleHeart) {
    const cx = textX + titleWidth + HEART_TITLE_GAP + HEART_SIZE / 2;
    parts.push(heart(cx, capCentre(titleBaseline, TITLE_SIZE), HEART_SIZE, theme.loved));
  }

  return parts.join('');
}

/**
 * The profile in the footer. Content follows `avatar`/`username` exactly as it
 * does in the header - only the placement differs.
 */
function renderFooterProfile(
  ctx: Ctx,
  top: number,
  avatarImage: string | null,
  align: 'left' | 'right',
): Section {
  const { theme, options, idPrefix } = ctx;
  const showAvatar = options.avatar;
  const showName = options.username;
  if (!showAvatar && !showName) return EMPTY_SECTION;

  const height = showAvatar ? AVATAR_SIZE : (CAP_RATIO + DESC_RATIO) * USER_SIZE;
  const midY = top + height / 2;

  const nameWidth = showName ? estimateWidth(options.user, USER_SIZE, 600) : 0;
  const gap = showAvatar && showName ? AVATAR_GAP : 0;
  const avatarX =
    align === 'left' ? PAD_X : ctx.rightEdge - (showName ? nameWidth + gap : 0) - AVATAR_SIZE;
  const nameX =
    align === 'left' ? PAD_X + (showAvatar ? AVATAR_SIZE + gap : 0) : ctx.rightEdge;

  let body = '';
  if (showAvatar) body += avatarTile(avatarImage, avatarX + AVATAR_SIZE / 2, midY, ctx);
  if (showName) {
    body += text(
      options.user,
      nameX,
      centredBaseline(midY, USER_SIZE),
      {
        size: USER_SIZE,
        weight: 600,
        fill: theme.title,
        anchor: align === 'right' ? 'end' : undefined,
        className: `${idPrefix}-u`,
        textLength: align === 'right' && showAvatar ? nameWidth : undefined,
      },
    );
  }

  return {
    svg: link(
      ctx.profileHref,
      body,
      `${idPrefix}-a`,
      showName ? undefined : `${options.user} on Last.fm`,
    ),
    height,
  };
}

function renderStyle(ctx: Ctx): string {
  const { idPrefix, theme } = ctx;
  return (
    `<style>` +
    `.${idPrefix}-eq{transform-box:fill-box;transform-origin:bottom;animation:${idPrefix}-bounce 900ms ease-in-out infinite alternate}` +
    `@keyframes ${idPrefix}-bounce{from{transform:scaleY(0.22)}to{transform:scaleY(1)}}` +
    // Hover resolves only where the SVG is interactive; in an <img> (i.e. on
    // GitHub) these rules are inert and the card renders in its base colors.
    `.${idPrefix}-a{cursor:pointer}` +
    `.${idPrefix}-t,.${idPrefix}-u{transition:fill 180ms ease-in-out}` +
    `.${idPrefix}-g{transition:opacity 180ms ease-in-out}` +
    `.${idPrefix}-a:hover .${idPrefix}-t,.${idPrefix}-a:hover .${idPrefix}-u{fill:${theme.titleHover}}` +
    // The wordmark fades rather than recoloring: repainting a brand mark
    // would misrepresent it.
    `.${idPrefix}-a:hover .${idPrefix}-g{opacity:0.75}` +
    `@media (prefers-reduced-motion:reduce){.${idPrefix}-eq{animation:none}.${idPrefix}-t,.${idPrefix}-u,.${idPrefix}-g{transition:none}}` +
    `</style>`
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

export function renderCard({
  options,
  tracks,
  art,
  user,
  avatarImage,
  now = Date.now(),
}: CardInput): string {
  const theme = resolveTheme(options.theme, {
    bg: options.bgColor,
    title: options.textColor,
    artist: options.artistColor,
    meta: options.metaColor,
    accent: options.accentColor,
    loved: options.lovedColor,
  });
  const { width } = options;

  // `between` only earns its gutter if something is actually in it, otherwise
  // the whole list is indented for no visible reason. `between-all` always
  // draws a heart, so it always reserves it.
  const gutter =
    usesGutter(options.loved) &&
    (options.loved === 'between-all' || tracks.some((t) => t.loved));

  const ctx: Ctx = {
    options,
    theme,
    // A stable, render-scoped id prefix keeps clipPath/animation ids from
    // colliding when several of these widgets appear on one page.
    idPrefix: `lfm${Math.abs(hashSeed(options.user + tracks.length)).toString(36)}`,
    width,
    rightEdge: width - PAD_X,
    gutter,
    textX: PAD_X + (options.art ? ART_SIZE + ART_GAP : 0) + (gutter ? HEART_GUTTER : 0),
    profileHref: `https://www.last.fm/user/${encodeURIComponent(options.user)}`,
  };

  const body: string[] = [];
  let y = SECTION_PAD;
  let statsShown = false;

  if (options.header) {
    const extent = headerExtent(options);
    const baseline = Math.round(y - extent.top);
    body.push(renderHeader(ctx, baseline, avatarImage ?? null));
    // Section boundaries stay on whole pixels so their 1px rules remain crisp.
    y = Math.round(baseline + extent.bottom);
  }

  if (options.stats !== 'off') {
    const section =
      options.stats === 'compact'
        ? renderStatsCompact(ctx, y + (options.header ? STATS_TOP_GAP : 0), user)
        : renderStats(
            ctx,
            y + (options.header ? STATS_TOP_GAP : 0),
            user,
            options.stats === 'block-center',
          );

    // Nothing fits on a very narrow card; skip the gap too rather than leave
    // an empty band.
    if (section.height > 0) {
      body.push(section.svg);
      y = Math.round(y + (options.header ? STATS_TOP_GAP : 0) + section.height);
      statsShown = true;
    }
  }

  // Rule closing the header block. The clearance either side of it is the same
  // SECTION_PAD used between rows, so the whole stack shares one rhythm.
  if (options.header || statsShown) {
    y += SECTION_PAD;
    if (tracks.length > 0) body.push(rule(y, width, theme.divider));
    y += SECTION_PAD;
  }

  tracks.forEach((track, i) => {
    body.push(renderRow(ctx, y, track, art[i] ?? null, i, now));
    y += ROW_H;

    if (i < tracks.length - 1) {
      y += SECTION_PAD;
      body.push(rule(y, width, theme.divider));
      y += SECTION_PAD;
    }
  });

  y += SECTION_PAD;

  // Footer: exactly one thing sits below the tracks. When `profile` puts the
  // picture and username down here, that *is* the footer and `footer` is
  // ignored - combining them left the card bottom-heavy and the controls
  // confusing.
  const footerAlign = footerProfileAlign(options.profile);

  if (footerAlign || options.footer === 'stats') {
    const top = y + SECTION_PAD;
    const section = footerAlign
      ? renderFooterProfile(ctx, top, avatarImage ?? null, footerAlign)
      : renderStatsCompact(ctx, top, user);
    // Only draw the rule if something ended up under it.
    if (section.height > 0) {
      body.push(rule(y, width, theme.divider), section.svg);
      y = Math.round(top + section.height) + SECTION_PAD;
    }
  } else if (options.footer === 'wave') {
    // The wave is its own visual break, so it gets no rule above it.
    body.push(waveDecor(PAD_X, y, width - PAD_X * 2, FOOTER_WAVE_H, theme.meta));
    y += FOOTER_WAVE_H + FOOTER_WAVE_PAD;
  }

  const height = round(y);
  const altText = buildAltText(tracks);

  // The background comes from the resolved theme, which already accounts for
  // any caller-supplied color - including over `transparent`.
  const bg = theme.bg;
  const background =
    bg === 'none'
      ? ''
      : `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${options.radius}" fill="${escapeCss(bg)}" stroke="${escapeCss(theme.border)}"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(altText)}">` +
    // Browsers show <title> as the tab title, so it names the card rather than
    // describing it: a tab reading "Last played: ..." is unrecognisable once
    // the track changes. The description stays on aria-label, which is what
    // assistive tech reads for a role="img" element.
    `<title>${escapeXml(buildCardTitle(options.user))}</title>` +
    renderStyle(ctx) +
    background +
    body.join('') +
    `</svg>`
  );
}

function buildCardTitle(user: string): string {
  return `Last.fm Recently Played - ${user}`;
}

function buildAltText(tracks: Track[]): string {
  if (tracks.length === 0) return 'No recent Last.fm tracks';
  const first = tracks[0]!;
  const lead = first.nowPlaying
    ? `Scrobbling now: ${first.name} by ${first.artist}`
    : `Last played: ${first.name} by ${first.artist}`;
  return tracks.length > 1 ? `${lead} (+${tracks.length - 1} more)` : lead;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}
