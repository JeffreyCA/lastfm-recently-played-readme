import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../src/render/color';
import { resolveTheme, THEME_NAMES, THEMES } from '../src/render/themes';

describe('resolveTheme', () => {
  it('returns the preset itself when nothing is overridden', () => {
    // Identity, not equality: proves existing cards cannot shift by a rounding
    // error introduced somewhere in the derivation code.
    for (const name of THEME_NAMES) {
      expect(resolveTheme(name)).toBe(THEMES[name]);
      expect(resolveTheme(name, {})).toBe(THEMES[name]);
      expect(resolveTheme(name, { bg: null, title: null })).toBe(THEMES[name]);
    }
  });

  it('falls back to the default theme for an unknown name', () => {
    expect(resolveTheme('nonsense')).toBe(THEMES.dark);
    expect(resolveTheme(null)).toBe(THEMES.dark);
  });

  it('rescues a background that the theme cannot be read on', () => {
    // The bug this feature started from: white background, near-white text.
    const resolved = resolveTheme('dark', { bg: '#ffffff' });

    expect(resolved.bg).toBe('#ffffff');
    expect(contrastRatio(resolved.bg, resolved.title)!).toBeGreaterThan(4.5);
    // Borrowed from the palette built for light backgrounds rather than an
    // invented grey.
    expect(resolved.title).toBe(THEMES.light.title);
  });

  it('leaves the inks alone when the new background still reads well', () => {
    const resolved = resolveTheme('dark', { bg: '#101010' });
    expect(resolved.title).toBe(THEMES.dark.title);
  });

  it('derives the supporting colors from the text color', () => {
    const resolved = resolveTheme('legacy', { title: '#ff0000' });
    const channels = (hex: string): number[] =>
      [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

    expect(resolved.title).toBe('#ff0000');
    expect(resolved.meta).not.toBe(THEMES.legacy.meta);
    expect(resolved.divider).not.toBe(THEMES.legacy.divider);

    // Each derived color keeps the title's hue and sits between it and the
    // background, which is what "supporting" means here.
    const [bgR] = channels(THEMES.legacy.bg);
    for (const derived of [resolved.meta, resolved.border, resolved.divider]) {
      const [r, g, b] = channels(derived);
      expect(r!).toBeGreaterThan(g!);
      expect(r!).toBeGreaterThan(b!);
      expect(r!).toBeGreaterThan(bgR!);
      expect(r!).toBeLessThan(255);
    }

    // And they fade in order: meta is the most readable, divider the least.
    expect(channels(resolved.meta)[0]!).toBeGreaterThan(channels(resolved.divider)[0]!);
  });

  it('keeps the artist line and the timestamp independent', () => {
    // nord pairs a hued artist with a neutral grey timestamp, so one cannot be
    // derived from the other without turning that grey blue.
    const artistOnly = resolveTheme('nord', { artist: '#ff0000' });
    expect(artistOnly.artist).toBe('#ff0000');
    expect(artistOnly.meta).toBe(THEMES.nord.meta);

    const metaOnly = resolveTheme('nord', { meta: '#ff0000' });
    expect(metaOnly.meta).toBe('#ff0000');
    expect(metaOnly.artist).toBe(THEMES.nord.artist);
  });

  it('does not disturb the greys when only an accent changes', () => {
    const resolved = resolveTheme('nord', { accent: '#ff0000' });

    expect(resolved.accent).toBe('#ff0000');
    expect(resolved.titleHover).toBe('#ff0000');
    expect(resolved.meta).toBe(THEMES.nord.meta);
    expect(resolved.divider).toBe(THEMES.nord.divider);
    // nord tints its artist line deliberately; an accent change must not flatten it.
    expect(resolved.artist).toBe(THEMES.nord.artist);
  });

  it('keeps a custom heart and its muted form in one hue', () => {
    const resolved = resolveTheme('dark', { loved: '#00ff00' });

    expect(resolved.loved).toBe('#00ff00');
    expect(resolved.lovedOff).not.toBe(THEMES.dark.lovedOff);
    // Faded toward the background, so green rather than the theme's grey.
    expect(resolved.lovedOff.slice(3, 5)).not.toBe('00');
  });

  it('never derives against a background it cannot mix toward', () => {
    // `transparent` has bg: 'none'. Mixing toward it would collapse every
    // supporting color onto the title.
    const resolved = resolveTheme('transparent', { title: '#ff0000' });

    expect(resolved.bg).toBe('none');
    expect(resolved.title).toBe('#ff0000');
    expect(resolved.meta).toBe(THEMES.transparent.meta);
    expect(resolved.divider).toBe(THEMES.transparent.divider);
  });

  it('lets a background promote the transparent theme to an opaque card', () => {
    const resolved = resolveTheme('transparent', { bg: '#ffffff' });

    expect(resolved.bg).toBe('#ffffff');
    expect(contrastRatio(resolved.bg, resolved.title)!).toBeGreaterThan(4.5);
  });

  it('always produces colors that are safe in an SVG attribute', () => {
    const resolved = resolveTheme('dark', {
      bg: '#ffffff',
      title: '#123456',
      artist: '#abcdef',
      meta: '#fedcba',
      accent: '#00000080',
      loved: '#ff00ff',
    });

    for (const value of Object.values(resolved)) {
      expect(value).toMatch(/^(#[0-9a-f]{6}([0-9a-f]{2})?|none)$/);
    }
  });
});
