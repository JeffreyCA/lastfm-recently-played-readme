# Last.fm Recently Played README
Show your recent Last.fm scrobbles on your GitHub profile README. Powered by [Vercel](https://vercel.com).

> Check out [spotify-recently-played-readme](https://github.com/JeffreyCA/spotify-recently-played-readme) for a similar integration for Spotify.

## Getting Started
Just add the following into your README and set the query parameter `user` to your Last.fm username.

```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01)

### Link to Last.fm profile
```md
[![My Last.fm](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01)](https://www.last.fm/user/JeffreyCA01)
```

[![My Last.fm](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01)](https://www.last.fm/user/JeffreyCA01)

### Custom track count
To a custom number of tracks, pass the query parameter `count` and set it to the number of tracks to display.

> Default: `5`  
> Min: `1`  
> Max: `10`

Example:
```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&count=1)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&count=1)

### Custom card width
To set a custom card width, pass the query parameter `width` and set it to the desired width in px.

> Default: `400`  
> Min: `300`  
> Max: `1000`

Example:
```md
![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=600)
```

![My scrobbles](https://lastfm-recently-played.vercel.app/api?user=JeffreyCA01&width=600)

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
