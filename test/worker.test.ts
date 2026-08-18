import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

/**
 * Runs against workerd via @cloudflare/vitest-pool-workers. Only the paths
 * that need no network, so the suite never depends on the live Last.fm API.
 */
describe('worker', () => {
  it('answers failures with an SVG at HTTP 200, plus a short TTL and an ETag', async () => {
    // A 4xx would make GitHub show a generic broken-image icon with no
    // explanation, and would poison Camo's cache with the failure.
    const user = 'x'.repeat(101);
    const res = await exports.default.fetch(`https://example.com/svg?user=${user}`);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    // Cacheable, so Workers Cache can serve and collapse it, but briefly: a
    // failure should not outlive the thing that caused it.
    expect(res.headers.get('cache-control')).toMatch(/^public, max-age=10\b/);
    expect(res.headers.get('etag')).toBeTruthy();
    expect(await res.text()).toContain('Invalid Last.fm username');
  });
});
