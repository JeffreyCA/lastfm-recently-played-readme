# Reference assets

Source images the widget's vector icons were traced from. **Nothing here is served at runtime** -
`src/render/icons.ts` contains inline SVG paths instead, because an SVG rendered inside an `<img>`
cannot load external files, and paths are smaller, sharper, and recolourable per theme.

| File | Traced into |
| --- | --- |
| `lastfm.svg` | `LOGO_PATH` - the header wordmark, rounded to 1dp (~30% smaller) and merged into a single path |
| `heart.png`, `heart_gray.png` | `HEART_PATH` - loved-track markers, coloured from `theme.loved` / `theme.lovedOff` |
| `track-placeholder.webp` | `vinylPlaceholder()` - shown when Last.fm has no cover art |
| `avatar-placeholder.webp` | `avatarPlaceholder()` - shown when a profile has no picture |

The Last.fm wordmark is a Last.fm trademark, included here for attribution in the widget header.
