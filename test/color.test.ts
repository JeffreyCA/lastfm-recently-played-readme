import { describe, expect, it } from 'vitest';
import { contrastRatio, isLight, mix, parseRgba, relativeLuminance } from '../src/render/color';
import { THEMES } from '../src/render/themes';

/**
 * These are the numbers the derived palettes are built on, so they are worth
 * pinning: a mix that drifts changes every custom card at once, silently and
 * only in the rendering.
 */

describe('parseRgba', () => {
  it('reads the forms parseHexColor produces', () => {
    expect(parseRgba('#151b23')).toEqual({ r: 21, g: 27, b: 35, a: 1 });
    expect(parseRgba('#00000080')?.a).toBeCloseTo(0.502, 2);
  });

  it('rejects anything else, including the transparent theme background', () => {
    expect(parseRgba('none')).toBeNull();
    expect(parseRgba('#abc')).toBeNull();
    expect(parseRgba('red')).toBeNull();
  });
});

describe('mix', () => {
  it('returns the endpoints unchanged', () => {
    expect(mix('#ffffff', '#000000', 0)).toBe('#ffffff');
    expect(mix('#ffffff', '#000000', 1)).toBe('#000000');
  });

  it('interpolates in between', () => {
    expect(mix('#ffffff', '#000000', 0.5)).toBe('#808080');
  });

  it('clamps rather than extrapolating', () => {
    expect(mix('#ffffff', '#000000', -1)).toBe('#ffffff');
    expect(mix('#ffffff', '#000000', 2)).toBe('#000000');
  });

  it("keeps the source's alpha, so derived text cannot fade away", () => {
    expect(mix('#ffffff80', '#000000', 0.5)).toBe('#80808080');
  });

  it('passes the color through when either end is unparseable', () => {
    // `transparent` has no background to mix toward.
    expect(mix('#ffffff', 'none', 0.5)).toBe('#ffffff');
  });

  /**
   * The ratios are averages across presets whose supporting colors were picked
   * by eye, so mixing a theme's own title and background lands near - not on -
   * its hand-picked values. Measured worst case is 22/255, in `meta` for `nord`
   * and `border` for `light`, both themes that tint their greys.
   *
   * So this is a drift alarm, not a proof of equality: it fails if a ratio is
   * edited into something unrecognisable, and passes for any value close enough
   * that derived palettes still look like the presets. Derivation never applies
   * unless the caller overrides a color, so the presets themselves are never
   * subject to this error.
   */
  it('stays close to the built-in themes the ratios were measured from', () => {
    const channels = (hex: string): number[] => {
      const rgba = parseRgba(hex)!;
      return [rgba.r, rgba.g, rgba.b];
    };
    const expectClose = (actual: string, expected: string): void => {
      const a = channels(actual);
      for (const [i, value] of channels(expected).entries()) {
        expect(Math.abs(a[i]! - value)).toBeLessThanOrEqual(25);
      }
    };

    for (const theme of [THEMES.legacy, THEMES.dark, THEMES.light, THEMES.nord]) {
      const { bg, title } = theme;
      expectClose(mix(title, bg, 0.48), theme.meta);
      expectClose(mix(title, bg, 0.89), theme.border);
      expectClose(mix(title, bg, 0.92), theme.divider);
      expectClose(mix(title, bg, 0.92), theme.placeholder);
      expectClose(mix(title, bg, 0.77), theme.placeholderInk);
    }
  });
});

describe('contrast', () => {
  it('matches the WCAG extremes', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('scores the bug this exists to catch as unreadable', () => {
    // ?bg_color=ffffff under the dark theme: near-white text on white.
    expect(contrastRatio('#ffffff', THEMES.dark.title)!).toBeLessThan(1.5);
    // The same text on the background it was designed for.
    expect(contrastRatio(THEMES.dark.bg, THEMES.dark.title)!).toBeGreaterThan(4.5);
  });

  it('has no opinion when a color is unparseable', () => {
    expect(contrastRatio('none', '#ffffff')).toBeNull();
    expect(relativeLuminance('none')).toBeNull();
  });

  it('splits light from dark backgrounds', () => {
    expect(isLight('#ffffff')).toBe(true);
    expect(isLight(THEMES.light.bg)).toBe(true);
    expect(isLight(THEMES.dark.bg)).toBe(false);
    expect(isLight('none')).toBe(false);
  });
});
