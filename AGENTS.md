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

## Conventions

American spellings throughout - code, comments, docs and UI. The URL parameters
are `bg_color`, `text_color` and so on, and prose that says "color" beside them
reads as a different thing.

## What the rendering context forces

GitHub renders the card inside an `<img>`, proxied by Camo. Almost every design decision follows from that:

- **The SVG must be self-contained.** No external fonts, images, CSS or JS - none of it loads. Album art is fetched server-side and inlined as a base64 data URI.
- **Links and `:hover` are inert there.** They work when the URL is opened directly, so keep them, but never make anything depend on them.
- **Errors return HTTP 200 with a valid SVG.** A 4xx renders as a broken-image icon with no explanation and poisons Camo's cache with the failure.
- **Everything must finish inside Camo's ~10s socket timeout.** All upstream work shares one `Deadline` (`src/util/deadline.ts`). Don't add independent timeouts - they sum.

## Option model

`profile` (`header` / `footer-left` / `footer-right` / `off`) says **where** your identity goes; `username` and `avatar` say **what's in it**. Folding placement into content is what once made the `avatar` toggle look header-only. The footer holds exactly **one** thing - when `profile` is in the footer, `footer` is ignored rather than stacked underneath.

## Configurator

`public/` is plain HTML, CSS and JS with no build step, and the page's whole job is to assemble a URL string.

- **Only values that differ from the theme reach the URL.** The color fields are filled in with whatever the card is using, so they can be copied out, and a field equal to its theme value is treated as unset. Resetting writes the theme's value back.
- **Color swatches are bound to `change`, not `input`.** A native picker fires continuously while dragging and every preview is a request to the Worker.
- `THEME_COLORS` mirrors each theme's settable colors from `render/themes.ts`. Update both together, or an untouched picker shows a color the card isn't using.
- The form is a fixed 500px and the preview takes the remaining width, because the card can be up to 1000px wide and the form cannot usefully use more. Card height changes with track count, but the preview is in its own column, so it never reflows the form.
- **The snippet sits above the preview, at the top of the right column, and the whole column is sticky.** It is the one thing the page exists to produce, so it stays in view while the options are worked through; below the form it was off the bottom of the screen at the moment it mattered. The image URL has no visible box of its own - `Copy URL` reads it from state, because a second code box repeats most of a string already on screen.

## Gotchas

- **Every string from Last.fm goes through `escapeXml`.** One bare `&` breaks the entire image, silently, with nothing in any log. This is the most common way to ship a broken card.
- **Caller-supplied colors are validated, not escaped.** Every color parameter is interpolated into an SVG attribute, so `parseHexColor` allowlists a strict hex shape and returns null otherwise. Any new color parameter must go through it - this is a security boundary, not a formatting preference.
- **Most of `Theme` is derived, not chosen.** `bg_color`, `text_color`, `artist_color`, `meta_color`, `accent_color` and `loved_color` are the only settable palette colors; the dividers, borders and placeholders are mixes between the text color and the background (`render/color.ts`), using ratios measured from the presets. They are named as **roles, not elements** - `meta` is the timestamps, the footer and the stats labels together. `resolveTheme` returns the preset object itself when nothing is overridden, and a test asserts that by identity, so existing cards cannot drift.
- **`logo_color` is not part of `Theme`.** The wordmark is a trademark, so it defaults to Last.fm's red in every palette and lives as an option rather than a theme field.
- **`artist` and `meta` are two controls on purpose.** Deriving one from the other is within 6/255 on the neutral themes and out by 21 and 41 on `nord` and `catppuccin`, which pair a hued artist line with a neutral grey timestamp - the derivation turns that grey blue or purple. They were merged into one `muted_color` and it had to be undone; the configurator links them by default instead, which is a convenience in that page only. The URL always carries both colors in full, so the Worker has no notion of linking and a hand-edited URL cannot reach a state the form cannot show.
- **`loved` is separate from `accent` only because of `nord`.** Its accent is blue and a blue heart reads as something else; the other five presets set the two to the same color. Don't "simplify" it away.
- **A background can make a theme unreadable.** `?bg_color=ffffff` on `dark` once painted near-white text onto white. `resolveTheme` now borrows the inks from whichever built-in palette suits the background when contrast fails. Changing the derivation ratios changes every custom card at once and only in the rendering, so the tests pin them.
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

Deliberately minimal and it should stay that way while the design is still moving. It covers what fails *silently*: well-formed and escaped SVG, untrusted input (track URLs, art hosts, usernames), the upstream response shapes, the HTTP contract, and the color maths - a wrong mix ratio or a dropped contrast check produces a card that renders perfectly and just looks wrong.

**Don't add pixel-position assertions.** They were tried; every layout change broke them and the test was wrong every time. Verify visual work by rendering against `npm run dev` and looking at it.

The color tests are the exception that proves the rule: they assert ratios and contrast, never positions. Their tolerances are set from measured error against the presets (worst case 22/255, in `meta` for `nord` and `border` for `light`) rather than picked to make the suite pass - a tolerance tightened past the real spread will fail on a theme nobody touched.

Static assets aren't served through `SELF.fetch` in vitest-pool-workers - the runtime handles them before the Worker - so the configurator is only verifiable against a real dev server.
