# Last.fm Recently Played README

Show your recent Last.fm scrobbles on your GitHub profile README. Powered by [Cloudflare](https://www.cloudflare.com/products/workers/).  
Check out [spotify-recently-played-readme](https://github.com/JeffreyCA/spotify-recently-played-readme) for a similar integration for Spotify.

<!-- Rendered as HTML so both badges can be given the same height: the shields
     badge is 28px tall and Cloudflare's button is 39px, which looks misaligned
     side by side. Both are SVG, so scaling stays sharp. -->
<a href="https://lastfm-recently-played.jeffreyca.workers.dev"><img alt="Try the interactive configurator" height="36" src="https://img.shields.io/badge/Try_the_interactive_configurator-D51007?style=for-the-badge&logo=lastdotfm&logoColor=white"></a>
<a href="https://deploy.workers.cloudflare.com/?url=https://github.com/JeffreyCA/lastfm-recently-played-readme"><img alt="Deploy to Cloudflare" height="36" src="https://deploy.workers.cloudflare.com/button"></a>

---

## Getting started

> [!NOTE]
> GitHub caches README images through its own proxy, so new scrobbles may appear within a few minutes rather than instantly.

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

## Customization

Add parameters to the URL, e.g. `?user=JeffreyCA01&theme=light&count=3`.

| Parameter | Description | Default | Values |
| --- | --- | --- | --- |
| `user` | Whose scrobbles to show | *required* | Last.fm username |
| `count` | How many tracks. A now-playing track counts as one | `5` | `1`-`10` |
| `theme` | Color scheme | `dark` | `dark`, `legacy`, `light`, `nord`, `catppuccin`, `transparent` |
| `bg_color` | Card background | theme's | hex digits, no `#` - e.g. `212121` |
| `text_color` | Track titles. Dividers, borders and placeholders follow it | theme's | hex digits, no `#` |
| `artist_color` | The artist line | theme's | hex digits, no `#` |
| `meta_color` | Timestamps, the footer and the stats labels | theme's | hex digits, no `#` |
| `accent_color` | The now-playing bars, "Scrobbling now", and title hover | theme's | hex digits, no `#` |
| `loved_color` | The loved-track heart | theme's | hex digits, no `#` |
| `logo_color` | The Last.fm wordmark | `d51007` | hex digits, no `#` |
| `width` | Card width in pixels | `400` | `260`-`1000` |
| `radius` | Corner rounding | `10` | `0`-`40` |
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

### Colors

Each color parameter layers on top of the chosen theme and is optional - anything you leave out keeps following the theme, so a URL only ever carries what you actually changed. All of them take 3, 4, 6 or 8 hex digits with no leading `#` (4 and 8 include alpha).

These are roles rather than single elements - `meta_color` covers the timestamps, the footer and the stats labels together - and everything else the card draws is derived from them: the row dividers, the artwork placeholders, the muted heart. Those are relationships rather than decisions, and mixing `text_color` with `bg_color` reproduces the built-in themes' own supporting colors closely.

`artist_color` and `meta_color` look like one control and are not. In the neutral themes the timestamp is the artist color faded a little further, but `nord` and `catppuccin` deliberately pair a colored artist line with a neutral grey timestamp. The configurator links the two by default and lets you break the link.

`loved_color` is separate from `accent_color` for the same kind of reason: `nord`'s accent is blue, and a blue heart reads as something else entirely. In the other themes the two are the same color.

`logo_color` is the exception to all of it: the wordmark is Last.fm's trademark, so it stays their red in every theme unless you deliberately change it.

If a background is picked that the theme's text can't be read against, the card takes its text colors from whichever built-in palette suits that background instead of rendering something illegible. So `?bg_color=ffffff` on the dark theme gives dark text, not white-on-white. Set `text_color` yourself to override that.

The [configurator](https://lastfm-recently-played.jeffreyca.workers.dev) has a picker for each one and shows the text contrast as you go.

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
git clone https://github.com/JeffreyCA/lastfm-recently-played-readme.git
cd lastfm-recently-played-readme
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

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/JeffreyCA/lastfm-recently-played-readme)

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
