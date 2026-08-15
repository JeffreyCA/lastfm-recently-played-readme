# lastfm-recently-played

Cloudflare Worker that renders a Last.fm "recently played" card as an SVG for GitHub profile READMEs, plus a static configurator that builds the embed snippet.

## Commands

```bash
npm run dev          # wrangler dev on :8787
npm run typecheck
npm test
npm run deploy
npx wrangler secret put LASTFM_API_KEY   # production key; never in wrangler.jsonc
```

Pushing to `main` runs typecheck + tests in GitHub Actions; Cloudflare Workers Builds deploys.

## What the rendering context forces

GitHub renders the card inside an `<img>`, proxied by Camo. Almost every design decision follows from that:

- **The SVG must be self-contained.** No external fonts, images, CSS or JS - none of it loads. Album art is fetched server-side and inlined as a base64 data URI.
- **Links and `:hover` are inert there.** They work when the URL is opened directly, so keep them, but never make anything depend on them.
- **Errors return HTTP 200 with a valid SVG.** A 4xx renders as a broken-image icon with no explanation and poisons Camo's cache with the failure.
- **Everything must finish inside Camo's ~10s socket timeout.** All upstream work shares one `Deadline` (`src/util/deadline.ts`). Don't add independent timeouts - they sum.

## Option model

`profile` (`header` / `footer-left` / `footer-right` / `off`) says **where** your identity goes; `username` and `avatar` say **what's in it**. Folding placement into content is what once made the `avatar` toggle look header-only. The footer holds exactly **one** thing - when `profile` is in the footer, `footer` is ignored rather than stacked underneath.

## Gotchas

- **Every string from Last.fm goes through `escapeXml`.** One bare `&` breaks the entire image, silently, with nothing in any log. This is the most common way to ship a broken card.
- **Caller-supplied colours are validated, not escaped.** `bg_color` is interpolated into an SVG attribute, so `parseHexColour` allowlists a strict hex shape and returns null otherwise.
- **`isAllowedArtUrl` is a security boundary.** Without it the endpoint is an open proxy. The real CDN host is `lastfm-img.freetls.fastly.net` - note the `-img`; guessing it wrong fails silently and every cover falls back to a placeholder. Art fetches use `redirect: 'manual'`, since the allowlist only validates the URL we start with; a 3xx then fails the `res.ok` check.
- **Workers only implement `redirect: 'follow'` and `'manual'`.** `'error'` throws a `TypeError` on the edge, and local `wrangler dev` does *not* reproduce it - this shipped once and broke every cover in production while looking perfect locally. Verify subrequest behaviour against a real deploy or `wrangler dev --remote`, not just local.
- **`user.getRecentTracks` returns `track` as a bare object, not an array, for a single result.**
- **The Cache API is a no-op on `*.workers.dev`.** It is zone-level, and workers.dev is not a zone, so `caches.default` silently does nothing there; the per-isolate memo in `cache.ts` is what actually collapses requests until a custom domain is attached. Note this is the *legacy* Cache API - Workers Cache (`[cache] enabled` in wrangler config) is zoneless and does run on workers.dev, but it only helps responses that are cacheable, which is why the card sends `max-age` rather than `no-cache`.
  Sources: [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) ("Workers deployed to custom domains have access to functional `cache` operations"), [How the Cache works](https://developers.cloudflare.com/workers/reference/how-the-cache-works/). Two limits worth remembering before designing around it: cache contents **do not replicate outside the originating data centre**, and `cache.put` is not compatible with tiered caching or `stale-while-revalidate`.
- **miniflare persists the cache across dev restarts** in `.wrangler/state/v3/cache`. Delete it when testing cache behaviour, or you'll spend an hour debugging a stale negative entry.
- **`.dev.vars` holds a real API key.** Gitignored - never print or commit it.

## Layout code

`src/render/card.ts` derives positions from measured font metrics (`CAP_RATIO`, `DESC_RATIO`) rather than tuned numbers, because tuned numbers drift apart the moment a font size changes.

- `SECTION_PAD` is the **only** general vertical spacing constant; `FOOTER_WAVE_PAD` is the single deliberate exception, because the wave's ink sits well inside its band. Adding a third one is exactly how the spacing became inconsistent before.
- Section renderers return `{ svg, height }`. Height belongs next to the markup that produces it - a separate `*_H` constant is a second source of truth and will silently disagree.
- `ART_SIZE` is derived from the type sizes so artwork stays aligned with the text beside it.
- Snap block boundaries to whole pixels; fractional `y` makes the 1px rules render soft.
- Text is centred on its cap-to-baseline extent, not its ink - descenders read as overhang.
- `icons.ts` is fixed artwork; `decor.ts` is generated graphics sized to the space it's given. `measure.ts` holds advance widths for the stack in `font.ts`, so those two move together.

## Testing

Deliberately minimal (8 tests) and it should stay that way while the design is still moving. It covers what fails *silently*: well-formed and escaped SVG, untrusted input (track URLs, art hosts, usernames), the upstream response shapes, and the HTTP contract.

**Don't add pixel-position assertions.** They were tried; every layout change broke them and the test was wrong every time. Verify visual work by rendering against `npm run dev` and looking at it.

Static assets aren't served through `SELF.fetch` in vitest-pool-workers - the runtime handles them before the Worker - so the configurator is only verifiable against a real dev server.
