# Last.fm Recently Played README
Show off your recent Last.fm scrobbles on your GitHub profile README! Powered by [Vercel](https://vercel.com).

## Getting Started
Just add the following into your README and set the query parameter `username` to your Last.fm username.

```md
![JeffreyCA's scrobbles](https://lastfm-recently-played-readme.vercel.app/api?user=JeffreyCA01)
```

### Custom track count
To a custom number of tracks, pass the query parameter `count` and set it to the number of tracks to display.

> Default: `5`
>
> Min: `1`
>
> Max: `10`

Example:
```md
![JeffreyCA's scrobbles](https://lastfm-recently-played-readme.vercel.app/api?user=JeffreyCA01&count=1)
```

### Custom card width
To set a custom card width, pass the query parameter `width` and set it to the desired width in px.

> Default: `400`
>
> Min: `300`
>
> Max: `1000`

Example:
```md
![JeffreyCA's scrobbles](https://lastfm-recently-played-readme.vercel.app/api?user=JeffreyCA01&width=1000)
```

## Deploying own Vercel project

## Running locally
1. Install Node dependencies
    ```sh
    $ npm install
    ```
2. Run development server
    ```sh
    $ npm run dev
    ```

The app will be running at [http://localhost:3000](http://localhost:3000).

## License
[MIT](LICENSE)
