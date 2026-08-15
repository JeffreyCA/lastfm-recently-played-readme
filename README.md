# Last.fm Recently Played README

Show your recent Last.fm scrobbles on your GitHub profile README. Powered by [Cloudflare](https://www.cloudflare.com/products/workers/).  
Check out [spotify-recently-played-readme](https://github.com/JeffreyCA/spotify-recently-played-readme) for a similar integration for Spotify.

[![Try the interactive configurator](https://img.shields.io/badge/Try_the_interactive_configurator-D51007?style=for-the-badge&logo=lastdotfm&logoColor=white)](https://lastfm-recently-played.jeffreyca.workers.dev)

Pick your options, preview the card, and copy/paste the snippet into your README.

---

## Getting started

Just add the following into your README and set the query parameter `user` to your Last.fm username.

```markdown
![My scrobbles](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01)
```

![My scrobbles](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01)

Or make the whole card a link to your Last.fm profile:

```markdown
[![My scrobbles](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01)](https://www.last.fm/user/JeffreyCA01)
```

[![My scrobbles](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01)](https://www.last.fm/user/JeffreyCA01)

> [!NOTE]
> GitHub caches README images through its own proxy, so new scrobbles may appear within a few minutes rather than instantly.

## Customization

Add parameters to the URL, e.g. `?user=JeffreyCA01&theme=light&count=3`.

| Parameter | Description | Default | Values |
| --- | --- | --- | --- |
| `user` | Whose scrobbles to show | *required* | Last.fm username |
| `count` | How many tracks. A now-playing track counts as one | `5` | `1`-`10` |
| `theme` | Colour scheme | `dark` | `dark`, `legacy`, `light`, `nord`, `catppuccin`, `transparent` |
| `bg_color` | Background colour only. Text colours stay as the theme has them | theme's | hex digits, no `#` - e.g. `212121` |
| `width` | Card width in pixels | `400` | `260`-`800` |
| `radius` | Corner rounding | `10` | `0`-`24` |
| `art` | Album artwork | `1` | `1` / `0` |
| `header` | The "Recently Played" row | `1` | `1` / `0` |
| `logo` | Last.fm wordmark in the header | `1` | `1` / `0` |
| `profile` | Where your username and picture appear | `header` | `header`, `footer-left`, `footer-right`, `off` |
| `username` | Show your username in that spot | `1` | `1` / `0` |
| `avatar` | Show your profile picture in that spot | `1` | `1` / `0` |
| `time` | "6m ago" timestamps | `1` | `1` / `0` |
| `stats` | Scrobbles / artists / tracks totals | `off` | `off`, `block`, `block-center`, `compact` |
| `footer` | What sits below the tracks. Ignored when `profile` is in the footer | `off` | `off`, `stats`, `wave` |
| `loved` | Where to mark tracks you've hearted | `time` | `off`, `between`, `between-all`, `title`, `time` |

Booleans also accept `true`/`false`, `yes`/`no`, `on`/`off`. Numbers outside their range are clamped rather than rejected.

### Loved tracks

| `loved` | Where the indicator (heart icon) goes |
| --- | --- |
| `between` | Left of the track name, loved tracks only |
| `between-all` | Left of the track name, greyed out when not loved |
| `title` | Right after the track name |
| `time` | Just before the timestamp (default) |
| `off` | Hidden |

### Automatic light and dark

GitHub supports `<picture>` in READMEs, so the card can follow the reader's theme:

```html
<picture>
  <source media="(prefers-color-scheme: dark)"
          srcset="https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&theme=dark">
  <img src="https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&theme=light">
</picture>
```

## Examples

**Profile stats, in one line**

```markdown
![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&stats=compact&count=3)
```

![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&stats=compact&count=3)

**Stats as centred columns, with a wave**

```markdown
![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&stats=block-center&footer=wave&count=3)
```

![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&stats=block-center&footer=wave&count=3)

**Your profile in the footer instead of the header**

```markdown
![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&header=0&profile=footer-right&count=3)
```

![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&header=0&profile=footer-right&count=3)

**Hearts beside every track, light theme**

```markdown
![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&theme=light&loved=between-all&count=3)
```

![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&theme=light&loved=between-all&count=3)

**Nord, hearts after the track name, stats as columns**

```markdown
![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&theme=nord&loved=title&stats=block&count=3)
```

![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&theme=nord&loved=title&stats=block&count=3)

**Catppuccin with a custom background**

```markdown
![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&theme=catppuccin&bg_color=181825&count=3)
```

![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&theme=catppuccin&bg_color=181825&count=3)

**Text only - no artwork, no logo, no picture, square corners**

```markdown
![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&art=0&logo=0&avatar=0&radius=0&count=4)
```

![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&art=0&logo=0&avatar=0&radius=0&count=4)

**Narrow, for a sidebar or a table cell**

```markdown
![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&width=280&count=3&time=0)
```

![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&width=280&count=3&time=0)

**Ten tracks, wide, everything on**

```markdown
![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&count=10&width=560&stats=compact&footer=wave&loved=time)
```

![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&count=10&width=560&stats=compact&footer=wave&loved=time)

**Transparent, to sit on any background**

```markdown
![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&theme=transparent&count=3)
```

![](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01&theme=transparent&count=3)

---

## Running locally

Requires Node 22+.

```bash
git clone https://github.com/JeffreyCA/lastfm-priv.git
cd lastfm-priv
npm install
```

Get a Last.fm API key at [last.fm/api/account/create](https://www.last.fm/api/account/create).

```bash
cp .dev.vars.example .dev.vars   # then paste your key in
npm run dev
```

That serves the configurator at <http://localhost:8787> and the widget at `http://localhost:8787/svg?user=YOUR_USERNAME`.

```bash
npm run typecheck
npm test
```

## Deploying

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/JeffreyCA/lastfm-priv)

That clones the repo into your own account, provisions the Worker, and prompts for `LASTFM_API_KEY`. Every later push to `main` redeploys. It fits comfortably inside the free tier.

To deploy by hand instead:

```bash
npx wrangler secret put LASTFM_API_KEY
npm run deploy
```

If you attach a custom domain, a WAF rate-limit rule on `/svg` (say 60 requests/minute per IP) is worth adding, since the URL is public and anyone can point it at any username. WAF rules need a domain you control; they can't be applied to a `*.workers.dev` URL.

## How it works

The Worker asks Last.fm for your recent tracks, downloads the album art, and renders everything into a single self-contained SVG. Album art is embedded directly in the image, because an SVG displayed in an `<img>` can't load anything from outside itself.

Track data comes from `user.getRecentTracks`, which is public - that's why this needs nothing from you but a username. Responses are cached briefly to keep the shared API key well inside Last.fm's limits.

## Licence

[MIT](LICENSE)

Not affiliated with Last.fm; the Last.fm name and logo are their trademarks.
