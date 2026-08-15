/**
 * XML escaping is the single most important correctness concern in this project.
 * Track and artist names routinely contain &, <, >, quotes and control characters.
 * One unescaped ampersand produces a malformed SVG, which GitHub renders as a
 * broken-image icon with no error message at all.
 *
 * Every piece of Last.fm-derived text must pass through `escapeXml` before it is
 * interpolated into the SVG. There are no exceptions.
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
 * Escapes a string for safe use inside an SVG <style> block.
 * Style content is CDATA-ish and is not XML-escaped by the parser, so a stray
 * `</style>` would break out. We only ever emit colour values here, but this
 * keeps the invariant enforced rather than assumed.
 */
export function escapeCss(input: string): string {
  return input.replace(/[<>"'\\]/g, '');
}
