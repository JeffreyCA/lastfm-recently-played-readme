# Last.fm Recently Played README — Vercel proxy

The card itself now lives in a [Cloudflare Worker](https://github.com/JeffreyCA/lastfm-recently-played-readme/tree/main). This branch is what's left on Vercel: a shim that keeps the original endpoint working.

Every URL that anyone has ever pasted into a README points at `lastfm-recently-played.vercel.app/api`, so that route can't disappear. It no longer renders anything — it maps the old query parameters onto the new ones, forwards the request to the Worker, and passes the SVG straight back.

**Nothing to do if you already use this.** Your existing URL keeps working. New cards are better off pointing at the Worker directly:

```markdown
![My scrobbles](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01)
```

`/` redirects to the configurator, where you can pick options and copy a snippet.

## Parameter mapping

| Old parameter | Becomes |
| --- | --- |
| `user` | `user`, unchanged |
| `count` | `count` |
| `width` | `width`, clamped by the Worker to `260`–`800` |
| `border_radius` | `radius`, clamped by the Worker to `0`–`24` |
| `bg_color` | `bg_color`, with a leading `#` stripped |
| `loved` + `loved_style` | `loved=off` / `between` / `between-all` / `title` / `time` |
| `header_style`, `header_size` | `header=0`/`1`, plus `stats=block` / `block-center` |
| `footer_style` | `footer=wave` / `stats`, or nothing for the profile-only styles |
| `show_user` | `profile=header` / `footer-right` / `off` |
| `maxage` | This response's cache lifetime, which is what it always controlled. 60–3600, default 180 |

The card follows the Worker's default palette, so existing embeds pick up the newer look rather than the old charcoal. Passing `theme` — `dark`, `legacy`, `light`, `nord`, `catppuccin`, `transparent` — chooses explicitly; `legacy` is the `#212121` this endpoint used to render.

Where the old endpoint answered a bad value with HTTP 400 and a JSON body — which renders in a README as a broken image with no explanation — this one clamps or ignores it, and leaves real failures to the Worker, which draws them as a card.

### Not carried over

- Colours: the card now renders in the Worker's default palette instead of the old `#212121`. Add `theme=legacy` to keep the original look.
- Header and footer sizes: `compact` and `normal` render identically now, and the `_stats` variants only decide whether stats are shown.
- `footer_style=compact|normal` did nothing on their own except make room for the footer profile, which `show_user` already places.
- `show_user=always` showed the profile twice; it now maps to the header.
- `header_style=*_stats_only` combined with `show_user=header|always` drops the profile, because the Worker draws it as part of the header row that setting hides.
- The internal `/api/proxy` image endpoint is gone. It existed to inline album art and was never meant to be called directly.

## How it works

`api/index.ts` is the whole thing: one Vercel Function using the [`fetch` Web Standard export](https://vercel.com/docs/functions/functions-api-reference#fetch-web-standard), with no dependencies and no build step. `api/_translate.ts` holds the parameter mapping — files in `/api` starting with `_` aren't turned into functions, so it stays a plain module.

Two constraints come from GitHub rendering the card through its Camo image proxy, and they account for most of the code:

- **Never answer with a 4xx.** Camo shows it as a broken image and caches the failure. If the Worker can't be reached, this returns a small fallback card at HTTP 200 with a 10 second TTL.
- **Finish inside Camo's ~10s socket timeout.** The upstream request is capped below that, so a slow Worker degrades to the fallback rather than to a broken image.

Conditional requests are forwarded, so a `304` from the Worker stays a `304` here.

Responses carry `max-age` as well as `s-maxage`. Vercel's proxy consumes the CDN directives and strips them, so a response setting only `s-maxage` reaches GitHub's image proxy as `max-age=0, must-revalidate` — meaning every view of every README revalidates against the function. `max-age` is what stops that, and `maxage` still sets it.

## Running locally

```bash
npm install
npm run dev        # vercel dev, on :3000
npm run typecheck
npm test
```

TypeScript is held at 5.x on purpose. Vercel's Node builder drives the TypeScript compiler API to build files in `/api`, and it uses whichever copy the project has installed — 7.x is the native port and does not expose the same API, so the build fails with `Cannot read properties of undefined (reading 'readFile')`.

`WORKER_ORIGIN` overrides the Worker it forwards to, which is how you point it at a local `wrangler dev`:

```bash
WORKER_ORIGIN=http://localhost:8787 npm run dev
```

## Licence

[MIT](LICENSE)

Not affiliated with Last.fm; the Last.fm name and logo are their trademarks.
