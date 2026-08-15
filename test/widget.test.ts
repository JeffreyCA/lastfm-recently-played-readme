import { describe, expect, it } from 'vitest';
import { isAllowedArtUrl } from '../src/art';
import { parseRecentTracks } from '../src/lastfm';
import { OptionsError, parseHexColour, parseOptions } from '../src/options';
import { relativeTime, renderCard, safeTrackUrl } from '../src/render/card';
import { THEME_NAMES } from '../src/render/themes';
import type { Track } from '../src/lastfm';
import type { LovedMode, WidgetOptions } from '../src/options';

/**
 * Pre-ship, so this covers only the failures that give no diagnostic: a
 * malformed SVG renders as a broken image on GitHub with nothing in any log,
 * and the untrusted inputs would be a security problem rather than a visual
 * one. Layout and styling are verified by looking at the card.
 */

const options: WidgetOptions = {
  user: 'testuser',
  count: 3,
  theme: 'dark',
  width: 400,
  art: true,
  header: true,
  radius: 8,
  time: true,
  logo: true,
  profile: 'header',
  username: true,
  avatar: true,
  stats: 'off',
  footer: 'off',
  bgColor: null,
  loved: 'off',
};

/** Deliberately hostile: names like these are what break the document. */
const tracks: Track[] = [
  {
    name: 'Fitter Happier & "Co." <b>',
    artist: 'A\u2019B & C',
    album: '',
    url: 'https://www.last.fm/music/Radiohead/_/Karma+Police',
    nowPlaying: true,
    playedAt: null,
    image: null,
    loved: true,
  },
  {
    name: '\u{1F3B5} a very long title that will certainly need truncating somewhere',
    artist: 'Someone',
    album: '',
    url: 'javascript:alert(1)',
    nowPlaying: false,
    playedAt: 1_700_000_000,
    image: null,
    loved: false,
  },
];

describe('renderCard', () => {
  it('produces well-formed, escaped SVG for every option combination', () => {
    const variants: Array<Partial<WidgetOptions>> = [
      {},
      { art: false },
      { header: false },
      { logo: false },
      { time: false },
      { stats: 'block', avatar: true },
      { stats: 'compact' },
      { stats: 'compact', footer: 'stats' },
      { footer: 'wave' },
      { profile: 'footer-left', avatar: true },
      { profile: 'footer-right', bgColor: '#101010' },
      { profile: 'off' },
      // `footer` is ignored while the profile occupies the footer.
      { profile: 'footer-right', footer: 'wave', avatar: true },
      { username: false },
      { username: false, avatar: true },
      { avatar: false },
      { width: 260, stats: 'compact', footer: 'wave' },
      { width: 800, count: 10 },
    ];
    const lovedModes: LovedMode[] = ['off', 'between', 'between-all', 'title', 'time'];

    for (const theme of THEME_NAMES) {
      for (const variant of variants) {
        for (const loved of lovedModes) {
          const svg = renderCard({
            options: { ...options, theme, loved, ...variant },
            tracks,
            art: [null, 'data:image/jpeg;base64,AAAA'],
            user: {
              name: 'testuser',
              url: '',
              image: null,
              playcount: 30_529,
              artistCount: 6_366,
              trackCount: 17_696,
            },
          });

          expect(svg.startsWith('<svg')).toBe(true);
          expect(svg.endsWith('</svg>')).toBe(true);
          // A single bare ampersand is enough to break the whole image.
          expect(svg).not.toMatch(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/);
          expect((svg.match(/<text/g) ?? []).length).toBe((svg.match(/<\/text>/g) ?? []).length);
          expect(svg).not.toContain('<b>');
          expect(svg).not.toContain('javascript:');
        }
      }
    }
  });
});

describe('untrusted input', () => {
  it('only links to Last.fm over https', () => {
    expect(safeTrackUrl('https://www.last.fm/music/Radiohead')).toBeTruthy();
    for (const bad of ['javascript:alert(1)', 'http://www.last.fm/x', 'https://evil.test/x', '']) {
      expect(safeTrackUrl(bad), bad).toBeNull();
    }
  });

  it('only fetches art from Last.fm CDNs, so this is not an open proxy', () => {
    expect(isAllowedArtUrl('https://lastfm-img.freetls.fastly.net/i/u/174s/a.jpg')).toBe(true);
    for (const bad of [
      'https://evil.example.com/a.png',
      'http://169.254.169.254/latest/meta-data/',
      'https://evil.freetls.fastly.net/a.png',
    ]) {
      expect(isAllowedArtUrl(bad), bad).toBe(false);
    }
  });

  it('rejects usernames that cannot exist on Last.fm', () => {
    for (const bad of ['', 'a', '1abc', 'has space', 'inject<svg>', '../etc']) {
      expect(() => parseOptions(new URLSearchParams(`user=${encodeURIComponent(bad)}`))).toThrow(
        OptionsError,
      );
    }
    expect(parseOptions(new URLSearchParams('user=rj&count=999')).count).toBe(10);
  });

  it('only accepts strict hex colours for the background', () => {
    for (const [input, expected] of [
      ['1a2b3c', '#1a2b3c'],
      ['ABC', '#aabbcc'],
      ['11223344', '#11223344'],
      // A leading hash is rejected: in a URL it would have to be %23, and
      // accepting it here would encourage `bg_color=#abc`, which silently
      // truncates at the fragment.
      ['#1a2b3c', null],
      ['red', null],
      ['12345', null],
      ['url(x)', null],
      ['" onload="alert(1)', null],
      ['', null],
    ] as const) {
      expect(parseHexColour(input), input).toBe(expected);
    }
  });
});

describe('parseRecentTracks', () => {
  it('handles the shapes Last.fm actually returns', () => {
    const one = { name: 'Xtal', artist: { '#text': 'Aphex Twin' }, date: { uts: '1700000000' } };

    // With a single result `track` is a bare object, not a one-element array.
    // This is the most common crash in clients for this API.
    expect(parseRecentTracks(JSON.stringify({ recenttracks: { track: one } }), 10)).toHaveLength(1);

    const messy = parseRecentTracks(
      JSON.stringify({ recenttracks: { track: [{}, { name: 'x' }] } }),
      10,
    );
    expect(messy[0]!.name).toBe('Unknown track');
    expect(parseRecentTracks(JSON.stringify({ recenttracks: {} }), 10)).toEqual([]);
  });
});

describe('relativeTime', () => {
  it('stays relative at every scale', () => {
    const at = (s: number) => relativeTime(1_000_000_000 - s, 1_000_000_000_000);
    expect(at(5)).toBe('just now');
    expect(at(3_600)).toBe('1h ago');
    expect(at(7 * 86_400)).toBe('1w ago');
    expect(at(31 * 86_400)).toBe('1mo ago');
    // Never an absolute date: rendered server-side, so the reader's timezone
    // and locale are unknown.
    expect(at(3000 * 86_400)).toMatch(/ ago$/);
  });
});
