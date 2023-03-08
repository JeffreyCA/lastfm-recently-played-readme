import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { GetTrackInfoResponse, TrackItem } from '../../models/GetTrackInfoResponse';
import { LovedTrackStyle, LovedTrackOptions } from '../../models/LovedTrackOptions';
import { RecentTracksResponse } from '../../models/RecentTracksResponse';
import { TrackInfo } from '../../models/TrackInfo';
import PlaceholderImg from '../../public/placeholder.webp';
import { generateSvg } from '../../utils/SvgUtil';

const defaultCount = 5;
const minCount = 1;
const maxCount = 10;

const defaultWidth = 400;
const minWidth = 300;
const maxWidth = 1000;

const defaultLovedStyle = LovedTrackStyle.RightOfAlbumArt;

const BaseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.BASE_URL || 'http://localhost:3000';

async function getTrackInfo(artist: string, track: string): Promise<TrackItem | null> {
    try {
        const { data } = await axios.get<GetTrackInfoResponse>(
            'http://ws.audioscrobbler.com/2.0/?method=track.getInfo',
            {
                params: {
                    artist: artist,
                    track: track,
                    api_key: process.env.API_KEY,
                    format: 'json',
                },
            }
        );
        return data.track;
    } catch (e: unknown) {
        return null;
    }
}

/**
 * Get track artwork url.
 *
 * If TrackInfo has the appropriate artwork, return it.
 * Otherwise, it retrieves information from the track.getInfo endpoint and returns the album artwork if it has it.
 * Otherwise it returns null.
 *
 * @param trackInfo TrackInfo
 * @returns Track artwork url or null
 */
async function getImageUrl(trackInfo: TrackInfo): Promise<string | null> {
    const smallImgFromTrackInfo = trackInfo.image[0]['#text'];

    // smallImgFromTrackInfo is may be an empty string.
    if (smallImgFromTrackInfo) {
        return smallImgFromTrackInfo; // Use small image if available
    }

    // If small image is not available, try to get from info endpoint.
    const trackItem = await getTrackInfo(trackInfo.artist.name, trackInfo.name);
    if (trackItem) {
        if (!trackItem.album) {
            // If album is not available.
            return null;
        }
        const smallImgFromInfo = trackItem.album.image[0]['#text'];
        if (smallImgFromInfo) {
            return smallImgFromInfo;
        }
    }

    return null;
}

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const { user } = req.query;
    if (!user) {
        res.statusCode = 400;
        res.json({ error: `Missing 'user' parameter` });
        return;
    } else if (Array.isArray(user)) {
        res.statusCode = 400;
        res.json({ error: `Invalid 'user' parameter` });
        return;
    }

    // Parse 'width' query parameter
    const widthQuery: string | string[] | undefined = req.query['width'];
    let width = defaultWidth;

    if (typeof widthQuery === 'string') {
        width = parseInt(widthQuery);
    }
    if (!width || Array.isArray(width) || width < minWidth || width > maxWidth) {
        res.statusCode = 400;
        res.json({ error: `'width' parameter must be between ${minWidth} and ${maxWidth}` });
        return;
    }

    // Parse 'count' query parameter
    const countQuery: string | string[] | undefined = req.query['count'];
    let count = defaultCount;

    if (typeof countQuery === 'string') {
        count = parseInt(countQuery);
    }
    if (!count || Array.isArray(countQuery) || count < minCount || count > maxCount) {
        res.statusCode = 400;
        res.json({ error: `'count' parameter must be between ${minCount} and ${maxCount}` });
        return;
    }

    const lovedQuery: string | string[] | undefined = req.query['loved'];
    const showLoved = lovedQuery === 'true';

    const lovedStyleQuery: string | string[] | undefined = req.query['loved_style'];
    let lovedStyle: LovedTrackStyle = defaultLovedStyle;

    if (typeof lovedStyleQuery === 'string') {
        lovedStyle = parseInt(lovedStyleQuery);
    }

    if (!lovedStyle || Array.isArray(lovedStyle) || !Object.values(LovedTrackStyle).includes(lovedStyle)) {
        res.statusCode = 400;
        res.json({ error: `Invalid 'lovedStyle' parameter` });
        return;
    }

    const lovedTrackOptions: LovedTrackOptions = {
        show: showLoved,
        style: lovedStyle,
    };

    try {
        const { data } = await axios.get<RecentTracksResponse>(
            'http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks',
            {
                params: {
                    user: user,
                    extended: 1,
                    limit: count,
                    api_key: process.env.API_KEY,
                    format: 'json',
                },
            }
        );

        // Trim array as API may return more than 'count'
        data.recenttracks.track = data.recenttracks.track.slice(0, count);

        // Set base64-encoded cover art images by routing through /api/proxy endpoint
        // This is needed because GitHub's Content Security Policy prohibits external images (inline allowed)
        for (const track of data.recenttracks.track) {
            const smallImg = await getImageUrl(track);
            if (smallImg) {
                try {
                    console.log(`Fetching image from ${smallImg}`);
                    const { data } = await axios.get<string>(`${BaseUrl}/api/proxy`, {
                        params: {
                            img: smallImg,
                        },
                    });
                    track.inlineimage = data;
                } catch (e) {
                    console.error(e);
                    track.inlineimage = PlaceholderImg;
                }
            } else {
                track.inlineimage = PlaceholderImg;
            }
        }

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.setHeader('Content-Type', 'image/svg+xml');
        res.statusCode = 200;
        res.send(generateSvg(data, width, lovedTrackOptions));
    } catch (e: any) {
        const data = e?.response?.data;
        res.statusCode = 400;
        if (data) {
            res.json({ error: data.message });
        } else {
            res.json({ error: e.toString() });
        }
    }
};
