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

| Parameter | Description | Type | Default | Valid Values |
| --- | --- | --- | --- | --- |
| `count` | Number of recent tracks to display | number | 5 | 1 - 10 |
| `width` | Width of the card in pixels | number | 400 | 300-1000 |
| `loved` | Show a heart indicator for loved tracks | boolean | false | true, false |
| `stats` | Show your scrobbles, arist count, and track count | boolean | false | true, false |
| `show_user` | Show your username and profile picture | boolean | false | true, false |
| `footer_stats` | Move your stats and user information to the footer | boolean | false | true, false |
| `header_size` | Adjust the size of the header or hide it | string | normal | none, compact, normal |
| `footer_size` | Adjust the size of the footer or hide it | string | none | none, compact, normal |
| `border_radius` | Adjust the radius of the card | number | 10 | 0 - 100 |
| `loved_style` | Customize the indicator placement for loved tracks | number | 1 | 1, 2, 3, 4 |
| `bg_color` | Customize the background color of the card. Supports alpha transparency. | string | 212121 | RGB/A hexadecimal |

### Examples


#### Customizing Track Count

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&count=1)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&count=1)

#### Customizing card width

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=600)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=600)

#### Show loved tracks

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&loved=true)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&loved=true)

#### Show user stats

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&stats=true)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&stats=true)

#### Show user profile

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&show_user=true)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&show_user=true)

#### Show stats in footer

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&stats=true&show_user=true&footer_stats=true)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&stats=true&show_user=true&footer_stats=true)

#### Header Sizes

| `none` | `compact` | `normal` |
| :----:    |    :----:   |  :----: |
| ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&header_size=none) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&header_size=compact) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&header_size=normal) |

#### Footer Sizes

| `none` | `compact` | `normal` |
| :----:    |    :----:   |  :----: |
| ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&footer_size=none) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&footer_size=compact) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&footer_size=normal) |

#### Loved Style

| Style 1 | Style 2 | Style 3 | Style 4 |
| :----:    |    :----:   |  :----: | :----: |
| ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&loved=true&loved_style=1) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&loved=true&loved_style=2) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&loved=true&loved_style=3) | ![](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=300&count=2&loved=true&loved_style=4) |

#### Change Background Color

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
