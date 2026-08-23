/**
 * One unescaped `&` in a track or artist name produces a malformed SVG, which
 * GitHub renders as a broken-image icon with no error message at all. Every
 * piece of Last.fm-derived text goes through `escapeXml` before it reaches the
 * SVG - no exceptions.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/** Control characters that are illegal in XML 1.0 even when escaped. */
const ILLEGAL_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

export function escapeXml(input: string): string {
  return input
    .replace(ILLEGAL_XML_CHARS, '')
    .replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/**
 * Escapes a string for use inside an SVG `<style>` block. Style content isn't
 * XML-escaped by the parser, so a stray `</style>` would break out. Only color
 * values are emitted here, but this keeps the invariant enforced, not assumed.
 */
export function escapeCss(input: string): string {
  return input.replace(/[<>"'\\]/g, '');
}
