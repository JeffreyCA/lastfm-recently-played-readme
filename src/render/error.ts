import { LIMITS } from '../options';
import { escapeCss, escapeXml } from './escape';
import { FONT_STACK } from './font';
import { truncateToLayoutWidth } from './measure';
import { resolveTheme } from './themes';

export interface ErrorCardInput {
  message: string;
  hint?: string;
  theme?: string;
  width?: number;
  radius?: number;
}

/**
 * Errors must still be a valid SVG served with HTTP 200.
 *
 * Camo's feature list claims it forwards images "regardless of HTTP status
 * code", but GitHub's deployed proxy is not the same code as the public README,
 * and a non-200 risks rendering as a generic broken-image icon with no
 * explanation. Showing the user *why* their widget is blank is far more useful.
 */
export function renderErrorCard({
  message,
  hint,
  theme: themeName,
  width = 400,
  radius = LIMITS.radius.default,
}: ErrorCardInput): string {
  const theme = resolveTheme(themeName);
  const height = hint ? 76 : 58;
  const maxTextWidth = width - 32 - 26;

  const title = truncateToLayoutWidth(message, 13, maxTextWidth, 600);
  const sub = hint ? truncateToLayoutWidth(hint, 11, maxTextWidth) : '';

  const background =
    theme.bg === 'none'
      ? ''
      : `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${radius}" fill="${escapeCss(theme.bg)}" stroke="${escapeCss(theme.border)}"/>`;

  const icon =
    `<circle cx="28" cy="${hint ? 32 : 29}" r="8" fill="none" stroke="${theme.accent}" stroke-width="1.5"/>` +
    `<line x1="28" y1="${hint ? 28 : 25}" x2="28" y2="${hint ? 33 : 30}" stroke="${theme.accent}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<circle cx="28" cy="${hint ? 36 : 33}" r="1" fill="${theme.accent}"/>`;

  const titleY = hint ? 30 : 33;
  const body =
    `<text x="46" y="${titleY}" font-family="${FONT_STACK}" font-size="13" font-weight="600" fill="${theme.title}">${escapeXml(title)}</text>` +
    (hint
      ? `<text x="46" y="48" font-family="${FONT_STACK}" font-size="11" fill="${theme.meta}">${escapeXml(sub)}</text>`
      : '');

  const alt = hint ? `${message}. ${hint}` : message;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(alt)}">` +
    `<title>${escapeXml(alt)}</title>` +
    background +
    icon +
    body +
    `</svg>`
  );
}
