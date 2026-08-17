/**
 * Inline vector icons.
 *
 * Everything here is drawn as SVG paths rather than embedded raster images.
 * Inside an <img>-rendered SVG we cannot reference external files, so the only
 * alternative would be base64 rasters - which are far larger, blur on HiDPI
 * displays, and cannot be recolored per theme. Paths solve all three.
 */

/**
 * The official last.fm wordmark, traced from the brand asset and rounded to
 * 1dp (~30% smaller with no visible difference at header sizes). The six
 * original subpaths are merged into one d because they share a fill.
 *
 * Intrinsic viewBox: 708.767 x 179.332.
 */
const LOGO_PATH =
  'M158.4,165.5l-8.4-22.7c0,0-13.6,15.1-33.9,15.1c-18,0-30.8-15.7-30.8-40.7c0-32.1,16.2-43.6,32.1-43.6c23,0,30.3,14.9,36.5,33.9l8.4,26.1c8.4,25.3,24,45.7,69.2,45.7c32.4,0,54.3-9.9,54.3-36c0-21.1-12-32.1-34.5-37.3l-16.7-3.7c-11.5-2.6-14.9-7.3-14.9-15.1c0-8.9,7-14.1,18.5-14.1c12.5,0,19.3,4.7,20.4,15.9l26.1-3.1c-2.1-23.5-18.3-33.1-44.9-33.1c-23.5,0-46.5,8.9-46.5,37.3c0,17.8,8.6,29,30.3,34.2l17.8,4.2c13.3,3.1,17.7,8.6,17.7,16.2c0,9.7-9.4,13.6-27.1,13.6c-26.4,0-37.3-13.8-43.6-32.9l-8.6-26.1c-11-33.9-28.5-46.5-63.2-46.5c-38.4,0-58.7,24.3-58.7,65.5c0,39.7,20.4,61.1,56.9,61.1C144.3,179.3,158.4,165.5,158.4,165.5L158.4,165.5zM46.7,153.2c-2.6,0.8-5.2,1.3-8.6,1.3c-6.3,0-10.7-2.9-10.7-10.4V1.8H0v148.8c0,19.6,13.6,27.7,29.5,27.7c5.2,0,10.2-0.8,16.4-2.3L46.7,153.2L46.7,153.2zM376.9,149.1c-6.8,4.7-12.5,7.1-20.4,7.1c-9.9,0-15.4-5.2-15.4-18V77h36V55.6H341.4V26.6l-27.7,3.4v25.6h-17.5v21.4h17.5v66.8c0,24,13.8,35.5,36.3,35.5c12.3,0,23.2-2.3,31.8-7.3L376.9,149.1L376.9,149.1zM400.7,158.4c0,10.7,8.4,19.3,19.1,19.3c11.2,0,19.6-8.6,19.6-19.3c0-11-8.4-19.3-19.6-19.3C409.1,139.1,400.7,147.5,400.7,158.4L400.7,158.4zM467.7,77v99.2h27.4V77h30.8V55.6h-30.8V44.6c0-16.4,7-21.7,18.5-21.7c8.1,0,13.6,1.8,19.8,5.2l4.4-23C530.6,1.8,522,0,511.6,0c-23,0-43.9,11-43.9,43.6v12h-17.5v21.4H467.7L467.7,77zM635.2,79.4c-3.1-19.6-15.9-26.6-32.6-26.6c-16.7,0-31.1,7.6-37.3,26.1l-3.4-23.2h-22.2v120.6h27.4v-68.1c0-23.2,12-32.1,24.8-32.1c13.3,0,18.8,8.9,18.8,23.2v77h27.1v-68.4c0-23,12.3-31.8,25.1-31.8c13.1,0,18.5,8.9,18.5,23.2v77h27.4V89.5c0-25.8-15.1-36.8-35.2-36.8C656.6,52.7,641.4,60.3,635.2,79.4L635.2,79.4z';

const LOGO_W = 708.767;
const LOGO_H = 179.332;

/**
 * Where the wordmark's glyphs actually sit, as a fraction of the viewBox.
 *
 * Measured from the flat-bottomed letters ("f" ends at 176.2, "m" at 176.3);
 * the round letters and the dot overshoot to ~179.4, which is deliberate
 * optical correction in the original artwork and must not be mistaken for the
 * baseline. Centring the bounding box instead leaves the wordmark visibly
 * sitting below neighbouring text.
 */
const LOGO_BASELINE_RATIO = 176.25 / LOGO_H;

/**
 * How far the round glyphs and the dot dip below the baseline, as a fraction
 * of the viewBox. Needed to know the wordmark's true visual bottom.
 */
const LOGO_OVERSHOOT_RATIO = (179.4 - 176.25) / LOGO_H;

/**
 * Last.fm's brand red. The wordmark is a trademark, so it defaults to this in
 * every theme rather than taking the theme accent - a teal or pink "last.fm" is
 * no longer their mark. `logo_color` can override it deliberately.
 */
export const LASTFM_RED = '#d51007';

/** Height of the wordmark above its baseline, at a given rendered height. */
export function logoAscent(height: number): number {
  return LOGO_BASELINE_RATIO * height;
}

/** Height of the wordmark below its baseline, at a given rendered height. */
export function logoDescent(height: number): number {
  return LOGO_OVERSHOOT_RATIO * height;
}

/** Rendered width of the wordmark for a given height. */
export function logoWidth(height: number): number {
  return (LOGO_W / LOGO_H) * height;
}

/**
 * The wordmark doubles as Last.fm attribution, so the "Scrobbled via Last.fm"
 * footer is no longer needed.
 *
 * `baseline` is the y the glyphs sit on, so the wordmark aligns with adjacent
 * text the way two pieces of text align with each other.
 *
 * The unpainted rect makes the whole box a hit target: without it, pointer
 * events only follow the glyph strokes, missing the counters and gaps - most
 * of the area a reader aims at. `pointer-events` rather than a transparent
 * fill, since alpha-0 fills aren't reliably hit-tested and would also need
 * keeping out of the hover fade.
 */
export function lastfmLogo(
  x: number,
  baseline: number,
  height: number,
  color: string,
  className?: string,
): string {
  const scale = height / LOGO_H;
  const top = baseline - LOGO_BASELINE_RATIO * height;
  const cls = className ? ` class="${className}"` : '';
  return (
    `<g${cls} transform="translate(${x},${Math.round(top * 100) / 100}) scale(${scale.toFixed(5)})" fill="${color}">` +
    `<rect x="0" y="0" width="${LOGO_W}" height="${LOGO_H}" fill="none" pointer-events="all"/>` +
    `<path d="${LOGO_PATH}"/>` +
    `</g>`
  );
}

/** Classic filled heart on a 24x24 grid. */
const HEART_PATH =
  'M12,21.3l-1.5-1.3C5.4,15.4,2,12.3,2,8.5C2,5.4,4.4,3,7.5,3c1.7,0,3.4,0.8,4.5,2.1C13.1,3.8,14.8,3,16.5,3C19.6,3,22,5.4,22,8.5c0,3.8-3.4,6.9-8.6,11.5L12,21.3z';

/**
 * How far the heart's ink sits inside its own box, as a fraction of the box.
 * The path above spans x=2..22 of 24, so the glyph never touches its edges;
 * anything aligning the heart to a text edge has to add this back. Lives next
 * to the path because the two only make sense together.
 */
export const HEART_INK_INSET_RATIO = 2 / 24;

/**
 * `size` is the rendered box width/height; the heart is centred on (cx, cy).
 */
export function heart(cx: number, cy: number, size: number, color: string, opacity = 1): string {
  const scale = size / 24;
  const x = cx - size / 2;
  const y = cy - size / 2;
  const op = opacity === 1 ? '' : ` opacity="${opacity}"`;
  return (
    `<g transform="translate(${round(x)},${round(y)}) scale(${scale.toFixed(4)})" fill="${color}"${op}>` +
    `<path d="${HEART_PATH}"/>` +
    `</g>`
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Vinyl-record tile shown when Last.fm has no cover for a track. Mirrors the
 * shape of Last.fm's own placeholder but drawn in theme colors so it sits in
 * the card instead of punching a bright grey hole in it.
 */
export function vinylPlaceholder(
  x: number,
  y: number,
  size: number,
  bg: string,
  ink: string,
  radius = 4,
): string {
  const cx = x + size / 2;
  const cy = y + size / 2;
  return (
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${round(size * 0.32)}" fill="${ink}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${round(size * 0.135)}" fill="none" stroke="${bg}" stroke-width="${round(size * 0.07)}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${round(size * 0.035)}" fill="${bg}"/>`
  );
}

/**
 * Headphones-wearing silhouette used when a user has no profile picture.
 * Drawn on a 24x24 grid and scaled, so it stays sharp at any avatar size.
 */
export function avatarPlaceholder(
  cx: number,
  cy: number,
  size: number,
  bg: string,
  ink: string,
): string {
  const scale = size / 24;
  const x = cx - size / 2;
  const y = cy - size / 2;
  return (
    `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(size / 2)}" fill="${bg}"/>` +
    `<g transform="translate(${round(x)},${round(y)}) scale(${scale.toFixed(4)})" fill="${ink}">` +
    `<path d="M12,4.2c-4,0-7.2,3-7.2,6.7v2.4h1.9v-2.4C6.7,8,9,5.9,12,5.9s5.3,2.1,5.3,5v2.4h1.9v-2.4C19.2,7.2,16,4.2,12,4.2z"/>` +
    `<rect x="3.1" y="10.6" width="3.4" height="5.2" rx="1.7"/>` +
    `<rect x="17.5" y="10.6" width="3.4" height="5.2" rx="1.7"/>` +
    `<circle cx="12" cy="12.4" r="3.6"/>` +
    `<path d="M12,16.6c-3.7,0-6.7,1.6-6.7,3.6v1.3h13.4v-1.3C18.7,18.2,15.7,16.6,12,16.6z"/>` +
    `</g>`
  );
}
