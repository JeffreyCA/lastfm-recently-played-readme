# Last.fm Recently Played README

Show your recent Last.fm scrobbles on your GitHub profile README. Powered by [Vercel](https://vercel.com).

> Check out [spotify-recently-played-readme](https://github.com/JeffreyCA/spotify-recently-played-readme) for a similar integration for Spotify.

## Getting Started

Just add the following into your README and set the query parameter `user` to your Last.fm username.

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01)

To add link to your last.fm profile, wrap the image in a link tag:

```md
[![My Last.fm](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01)](https://www.last.fm/user/JeffreyCA01)
```

[![My Last.fm](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01)](https://www.last.fm/user/JeffreyCA01)

## Customization

### Parameters

You can customize your list.fm status by adding query parameters after the url. Here is a list of available parameters.

| Parameter       | Description                                                              | Type    | Default | Valid Values                                                                             |
| --------------- | -------------------------------------------------------------------------| ------- | ------- | ---------------------------------------------------------------------------------------- |
| `count`         | Number of recent tracks to display                                       | number  | 5      | 1 - 10                                                                                    |
| `width`         | Width of the card in pixels                                              | number  | 400    | 300 - 1000                                                                                |
| `loved`         | Show a heart indicator for loved tracks                                  | boolean | false  | true, false                                                                               |
| `show_user`     | Show your username and profile picture in the specified location.        | string  | never  | never, always, header, footer                                                             |
| `header_style`  | Adjust the size of the header or hide it                                 | string  | normal | none, compact, normal, compact_stats, normal_stats, compact_stats_only, normal_stats_only |
| `footer_style`  | Adjust the size of the footer or hide it                                 | string  | none   | none, wave, compact, normal, compact_stats, normal_stats                                  |
| `border_radius` | Adjust the radius of the card                                            | number  | 10     | 0 - 100                                                                                   |
| `loved_style`   | Customize the indicator placement for loved tracks                       | number  | 1      | 1, 2, 3, 4                                                                                |
| `bg_color`      | Customize the background color of the card. Supports alpha transparency. | string  | 212121 | RGB/A hexadecimal                                                                         |
| `maxage`        | `Cache-Control` header's `s-maxage` value in seconds. Controls how long Vercel's CDN caches the response. | number | 120 | 60 - 3600                                                    |

### Examples

#### Customizing Track Count

Change the amount of recent tracks that are displayed.

> Default: `5`

> Min Value: `1`

> Max Value: `10`

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&count=1)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&count=1)

#### Customizing card width

Change the width of the card, in pixels.

> Default: `400`

> Min Value: `300`

> Max Value: `1000`

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=600)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=600)

#### Show loved tracks

Show a heart indicator for loved tracks.

> Default: `false`

> Possible Values: `true` | `false`

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&loved=true)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&loved=true)

#### Show user profile

Determines if and where the user's profile information is shown. If you want to show exclusively the user's profile in a given section, use the `normal` or `compact` header and footer styles.

> Default: `never`

> Possible Values: `never` | `always` | `header` | `footer`

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&show_user=header)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&show_user=header)
|                                                 `header`                                                  |                                                 `footer & footer_style=normal`                                                  |
| :-----------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------: | 
| ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=350&count=2&show_user=header) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=350&count=2&footer_style=normal&show_user=footer) |

#### Header Styles

Changes the size and content of the header. You can use header and footer styles to show the user's stats (i.e. scrobbles, artist count, and track count). Using a `_stats_only` style will center the stats if the user's profile is not visible within the header. Use the `compact` or `normal` style in combination with `show_user` to exclusively show the user profile in the footer.

> Default: `normal`

> Alias: `header_size`

> Possible Values: `none` | `normal` | `compact` | `normal_stats` | `compact_stats` | `normal_stats_only` | `compact_stats_only`

|                                                 `none`                                                  |                                                 `normal_stats`                                                  |                                                 `compact_stats_only`                                                  |
| :-----------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------: |
| ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&header_style=none) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&header_style=normal_stats) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&header_style=compact_stats_only) |

#### Footer Styles

Changes the size and content of the footer. You can use header and footer styles to show the user's stats (i.e. scrobbles, artist count, and track count). Using a `_stats` style will center the stats if the user's profile is not visible within the footer. Use the `compact` or `normal` style in combination with `show_user` to exclusively show the user profile in the footer.

> Default: `none`

> Possible Values: `none` | `wave` | `normal` | `compact` | `normal_stats` | `compact_stats` | 

|                                                 `wave`                                                  |                                                 `normal`                                                  |                                                 `normal_stats`                                                  |
| :-----------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------: |
| ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&footer_style=wave) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&footer_style=normal) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&footer_style=normal_stats) |

#### Loved Style

Customize the indicator placement for loved tracks.

> Default: `1`

> Possible Values: `1` | `2` | `3` | `4`

|                                                    Style 1                                                     |                                                    Style 2                                                     |                                                    Style 3                                                     |                                                    Style 4                                                     |
| :------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------: |
| ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&loved=true&loved_style=1) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&loved=true&loved_style=2) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&loved=true&loved_style=3) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&loved=true&loved_style=4) |

#### Change Background Color

Change the background color of the main card with a hexadecimal RGB/A code. Supports alpha transparency.

> Default: `212121`

> Possible Values: `any valid RGB/A hex-code`

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&bg_color=000000)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&bg_color=000000)

## Deploying own Vercel project

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/git?s=https%3A%2F%2Fgithub.com%2FJeffreyCA%2Flastfm-recently-played-readme&env=API_KEY,VERCEL_URL)

Deploy your own Vercel project using the link above. Next, you'll need to set the `API_KEY` environment variable to your Last.fm API key. You'll also need to set the `VERCEL_URL` system environment variable in the Vercel project settings.

## Running locally

1. Clone Git repo
    ```sh
    $ git clone https://github.com/JeffreyCA/lastfm-recently-played-readme.git
    ```
2. Install Node dependencies
    ```sh
    $ npm install
    ```
3. Create `.env` file containing the following:
    ```sh
    API_KEY=<Last.fm API key>
    ```
4. Run development server
    ```sh
    $ npm run dev
    ```

The app will be running at [http://localhost:3000](http://localhost:3000).

## License

[MIT](LICENSE)
