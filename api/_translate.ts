/**
 * Translation from the parameters the Vercel endpoint accepted into the ones
 * the Cloudflare Worker takes.
 *
 * This is the only part of the shim with any judgement in it, so it is kept
 * pure and separate from the request handling: the mapping is what needs
 * testing, and none of it needs a network.
 *
 * The rule throughout is to be lenient. The old endpoint answered a bad value
 * with HTTP 400 and a JSON body, which in a README renders as a broken image
 * with no explanation. Anything unrecognised is dropped or clamped instead,
 * and genuine failures (an unknown user, say) are left to the Worker, which
 * draws them as a card.
 */

/** Where the Worker lives. Overridable with `WORKER_ORIGIN` for testing. */
export const DEFAULT_WORKER_ORIGIN = 'https://lastfm-recently-played.jeffreyca.workers.dev';

/**
 * `maxage` bounds. The old endpoint defaulted to 120s; this is a little longer
 * because the directive now reaches the caller.
 *
 * Vercel's proxy consumes `s-maxage` and `stale-while-revalidate` and strips
 * them before the response leaves the CDN, so a response carrying only those
 * arrived at GitHub's image proxy as the platform default - `max-age=0,
 * must-revalidate` - and every view of every README revalidated against the
 * function. Sending a real `max-age` alongside them is what stops that, and it
 * makes this number the staleness a reader can actually see.
 */
export const MAX_AGE = { min: 60, max: 3600, default: 180 } as const;

/**
 * `loved_style` was a number. The Worker names the same placements.
 *
 * 1 and 2 both sat right of the album art; 2 also drew a muted heart on tracks
 * that were not loved, which is exactly the `between` / `between-all` split.
 */
const LOVED_STYLES: Record<string, string> = {
  '1': 'between',
  '2': 'between-all',
  '3': 'title',
  '4': 'time',
};

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

const HEADER_STYLES = new Set([
  'none',
  'compact',
  'normal',
  'compact_stats',
  'normal_stats',
  'compact_stats_only',
  'normal_stats_only',
]);

const FOOTER_STYLES = new Set([
  'none',
  'wave',
  'compact',
  'normal',
  'compact_stats',
  'normal_stats',
]);

const SHOW_USER = new Set(['never', 'always', 'header', 'footer']);

function str(params: URLSearchParams, key: string): string {
  return (params.get(key) ?? '').trim().toLowerCase();
}

function pick(params: URLSearchParams, key: string, allowed: Set<string>, fallback: string): string {
  const value = str(params, key);
  return allowed.has(value) ? value : fallback;
}

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export interface Translation {
  /** Query string for the Worker's `/svg` endpoint. */
  params: URLSearchParams;
  /** `s-maxage` for our own response, which is what `maxage` always meant. */
  maxAgeSeconds: number;
}

export function translate(query: URLSearchParams): Translation {
  const out = new URLSearchParams();

  // Forwarded as given, including when absent or nonsense: the Worker
  // validates the username and renders a card explaining what went wrong.
  out.set('user', (query.get('user') ?? '').trim());

  // Numbers are forwarded raw rather than clamped here, because the Worker
  // clamps to its own bounds. Doing it in both places means two sets of limits
  // to keep in step, and the Worker's are the ones that matter.
  for (const [from, to] of [
    ['count', 'count'],
    ['width', 'width'],
    ['border_radius', 'radius'],
  ] as const) {
    const raw = (query.get(from) ?? '').trim();
    if (raw !== '') out.set(to, raw);
  }

  // `theme` is new: the old endpoint had no such parameter, so there is nothing
  // to translate. It is forwarded when given, and otherwise left off so the
  // Worker's default applies - existing embeds pick up the newer palette
  // rather than staying on `legacy`, which is a deliberate change.
  const theme = str(query, 'theme');
  if (theme !== '') out.set('theme', theme);

  // `bg_color` means the same thing on both sides. A leading `#` was rejected
  // by both, and is dropped here rather than passed on to be rejected again -
  // in a URL it would have to be written `%23` anyway.
  const bgColor = (query.get('bg_color') ?? '').trim().replace(/^#/, '');
  if (bgColor !== '') out.set('bg_color', bgColor);

  // `loved` was a boolean and `loved_style` chose the placement; the Worker
  // folds both into one parameter, where `off` is the "don't" case.
  const lovedStyle = str(query, 'loved_style');
  out.set(
    'loved',
    TRUTHY.has(str(query, 'loved')) ? (LOVED_STYLES[lovedStyle] ?? LOVED_STYLES['1']!) : 'off',
  );

  // `header_size` was the original name and `header_style` superseded it, with
  // the newer name winning when both are present.
  const headerStyle = str(query, 'header_style');
  const headerRaw = HEADER_STYLES.has(headerStyle)
    ? headerStyle
    : pick(query, 'header_size', HEADER_STYLES, 'normal');

  // `compact` vs `normal` only ever changed type and icon sizes, which the
  // Worker does not distinguish. What survives is whether the "Recently
  // Played" row is drawn at all, and whether stats come with it.
  const statsOnly = headerRaw.endsWith('_stats_only');
  const headerShown = !(headerRaw === 'none' || statsOnly);
  out.set('header', headerShown ? '1' : '0');

  const footerRaw = pick(query, 'footer_style', FOOTER_STYLES, 'none');
  const showUser = pick(query, 'show_user', SHOW_USER, 'never');

  // `always` put the profile in both the header and the footer. The Worker
  // holds one profile, so the header wins - it is the more prominent of the
  // two, and the placement `always` and `header` agree on.
  //
  // A footer profile also needed a footer to sit in. `footer_style=none` drew
  // no footer at all, and `wave` drew the decoration *instead of* the profile
  // row, so `show_user=footer` showed nothing in either case. A header profile
  // likewise went with the header, so hiding the header hid it too - and
  // saying so here spares the Worker a profile lookup it would never draw.
  const footerHoldsProfile = footerRaw !== 'none' && footerRaw !== 'wave';
  const wanted =
    showUser === 'never'
      ? 'off'
      : showUser === 'footer'
        ? footerHoldsProfile
          ? 'footer-right'
          : 'off'
        : 'header';
  const profile = wanted === 'header' && !headerShown ? 'off' : wanted;
  out.set('profile', profile);

  // Stats were centred only when nothing shared the row with them, which is
  // what `show_user` asked for rather than what survived the header being
  // hidden - so this follows the request, not the resolved placement.
  let stats = 'off';
  if (headerRaw.includes('stats')) {
    stats = statsOnly && wanted !== 'header' ? 'block-center' : 'block';
  }

  let footer = 'off';
  if (footerRaw.includes('stats')) {
    if (profile === 'footer-right') {
      // The Worker's footer holds exactly one thing, and the profile has it.
      // Rather than drop the stats, they move up under the header, which keeps
      // both pieces of information on the card.
      if (stats === 'off') stats = 'block';
    } else {
      footer = 'stats';
    }
  } else if (footerRaw === 'wave') {
    footer = 'wave';
  }

  // `footer_style=compact|normal` was only ever a container for the footer
  // profile, so it maps to nothing: `show_user` has already placed it.

  out.set('stats', stats);
  out.set('footer', footer);

  return {
    params: out,
    maxAgeSeconds: clampInt(str(query, 'maxage'), MAX_AGE.min, MAX_AGE.max, MAX_AGE.default),
  };
}
