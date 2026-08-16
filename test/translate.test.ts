import { describe, expect, it } from 'vitest';
import { translate } from '../api/_translate';

/** Convenience: translate a query string and read the result as a plain object. */
function mapped(query: string): Record<string, string> {
  return Object.fromEntries(translate(new URLSearchParams(query)).params);
}

describe('translate', () => {
  it('leaves the Worker to supply its own defaults', () => {
    expect(mapped('user=JeffreyCA01')).toEqual({
      user: 'JeffreyCA01',
      header: '1',
      profile: 'off',
      stats: 'off',
      footer: 'off',
      loved: 'off',
    });
  });

  it('forwards a theme when asked, since the old endpoint had none', () => {
    expect(mapped('user=a')).not.toHaveProperty('theme');
    expect(mapped('user=a&theme=legacy').theme).toBe('legacy');
  });

  it('forwards sizes under their new names, leaving the bounds to the Worker', () => {
    expect(mapped('user=a&count=3&width=1000&border_radius=100&bg_color=%23181825')).toMatchObject({
      count: '3',
      width: '1000',
      radius: '100',
      bg_color: '181825',
    });
  });

  it('drops parameters the Worker does not know', () => {
    expect(mapped('user=a&nonsense=1&extended=1')).not.toHaveProperty('nonsense');
  });

  it('folds loved + loved_style into one parameter', () => {
    expect(mapped('user=a&loved_style=3').loved).toBe('off');
    expect(mapped('user=a&loved=true').loved).toBe('between');
    expect(mapped('user=a&loved=true&loved_style=2').loved).toBe('between-all');
    expect(mapped('user=a&loved=true&loved_style=3').loved).toBe('title');
    expect(mapped('user=a&loved=true&loved_style=4').loved).toBe('time');
    expect(mapped('user=a&loved=true&loved_style=9').loved).toBe('between');
  });

  it('keeps the header row unless it was hidden or replaced by stats', () => {
    expect(mapped('user=a&header_style=none')).toMatchObject({ header: '0', stats: 'off' });
    expect(mapped('user=a&header_style=compact')).toMatchObject({ header: '1', stats: 'off' });
    expect(mapped('user=a&header_style=normal_stats')).toMatchObject({
      header: '1',
      stats: 'block',
    });
    expect(mapped('user=a&header_style=compact_stats_only')).toMatchObject({
      header: '0',
      stats: 'block-center',
    });
  });

  it('honours header_size only when header_style is absent or invalid', () => {
    expect(mapped('user=a&header_size=none').header).toBe('0');
    expect(mapped('user=a&header_size=none&header_style=normal').header).toBe('1');
    expect(mapped('user=a&header_size=none&header_style=bogus').header).toBe('0');
  });

  it('drops a header profile that the header style hides anyway', () => {
    // Stats stay left-aligned, where the profile used to sit beside them.
    expect(mapped('user=a&header_style=normal_stats_only&show_user=header')).toMatchObject({
      header: '0',
      profile: 'off',
      stats: 'block',
    });
    expect(mapped('user=a&header_style=none&show_user=always').profile).toBe('off');
  });

  it('places the profile, collapsing "always" onto the header', () => {
    expect(mapped('user=a&show_user=never').profile).toBe('off');
    expect(mapped('user=a&show_user=header').profile).toBe('header');
    expect(mapped('user=a&show_user=footer&footer_style=normal').profile).toBe('footer-right');
    expect(mapped('user=a&show_user=always').profile).toBe('header');
  });

  it('needs a profile-bearing footer for a footer profile, as the old card did', () => {
    expect(mapped('user=a&show_user=footer').profile).toBe('off');
    // The wave replaced the profile row rather than sharing it with it.
    expect(mapped('user=a&show_user=footer&footer_style=wave')).toMatchObject({
      profile: 'off',
      footer: 'wave',
    });
  });

  it('maps footer styles, ignoring the ones that only held a profile', () => {
    expect(mapped('user=a&footer_style=wave').footer).toBe('wave');
    expect(mapped('user=a&footer_style=normal_stats').footer).toBe('stats');
    expect(mapped('user=a&footer_style=compact_stats').footer).toBe('stats');
    expect(mapped('user=a&footer_style=normal').footer).toBe('off');
  });

  it('moves footer stats under the header when the profile takes the footer', () => {
    expect(mapped('user=a&footer_style=normal_stats&show_user=footer')).toMatchObject({
      profile: 'footer-right',
      stats: 'block',
      footer: 'off',
    });
  });

  it('clamps maxage instead of rejecting it', () => {
    const maxAge = (query: string): number => translate(new URLSearchParams(query)).maxAgeSeconds;
    expect(maxAge('user=a')).toBe(180);
    expect(maxAge('user=a&maxage=600')).toBe(600);
    expect(maxAge('user=a&maxage=1')).toBe(60);
    expect(maxAge('user=a&maxage=99999')).toBe(3600);
    expect(maxAge('user=a&maxage=abc')).toBe(180);
  });
});
