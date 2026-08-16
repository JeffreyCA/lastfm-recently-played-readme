# Last.fm Recently Played README — Vercel proxy

The card lives in a [Cloudflare Worker](https://github.com/JeffreyCA/lastfm-recently-played-readme/tree/main) now. This branch is the shim that keeps the original Vercel endpoint working: it maps the old query parameters onto the new ones, forwards the request, and passes the SVG back.

**Nothing to do if you already use this** — your URL keeps working. For new cards, point at the Worker directly:

```markdown
![My scrobbles](https://lastfm-recently-played.jeffreyca.workers.dev/svg?user=JeffreyCA01)
```

## Parameter mapping

| Old parameter | Becomes |
| --- | --- |
| `user`, `count` | unchanged |
| `width` | `width`, clamped to `260`–`800` |
| `border_radius` | `radius`, clamped to `0`–`24` |
| `bg_color` | `bg_color`, leading `#` stripped |
| `loved` + `loved_style` | `loved=off` / `between` / `between-all` / `title` / `time` |
| `header_style`, `header_size` | `header=0`/`1`, plus `stats=block` / `block-center` |
| `footer_style` | `footer=wave` / `stats` |
| `show_user` | `profile=header` / `footer-right` / `off` |
| `maxage` | cache lifetime, 60–3600, default 180 |

Bad values are clamped or ignored rather than answered with a 400, which in a README is just a broken image.

### Not carried over

- Cards use the Worker's default palette instead of `#212121`. Add `theme=legacy` for the old look.
- Header and footer sizes: `compact` and `normal` now render the same; the `_stats` variants only decide whether stats show.
- `footer_style=compact|normal` only ever made room for the footer profile, which `show_user` places.
- `show_user=always` showed the profile twice; it maps to the header.
- `header_style=*_stats_only` with `show_user=header|always` drops the profile, which that header style hides anyway.
- The internal `/api/proxy` image endpoint is gone.

## Development

```bash
npm install
npm run dev        # vercel dev, on :3000
npm run typecheck
npm test
```

`WORKER_ORIGIN` points it at a different Worker, e.g. a local `wrangler dev`:

```bash
WORKER_ORIGIN=http://localhost:8787 npm run dev
```

Keep TypeScript on 5.x — Vercel's builder uses the compiler API, which 7.x doesn't expose.

Deployment is limited to this branch: set **Production Branch** to `vercel`, and **Ignored Build Step** to `bash -c '[ "$VERCEL_GIT_COMMIT_REF" != "vercel" ]'`.

## Licence

[MIT](LICENSE)

Not affiliated with Last.fm; the Last.fm name and logo are their trademarks.
