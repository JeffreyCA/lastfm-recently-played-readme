import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { LovedTrackStyle, LovedTrackOptions } from '../../models/LovedTrackOptions';
import { RecentTracksResponse } from '../../models/RecentTracksResponse';
import PlaceholderImg from '../../public/placeholder.webp';
import { generateSvg } from '../../utils/SvgUtil';
import { HeaderSize, StyleOptions } from '../../models/StyleOptions';

const defaultCount = 5;
const minCount = 1;
const maxCount = 10;

const defaultWidth = 400;
const minWidth = 300;
const maxWidth = 1000;

const defaultLovedStyle = LovedTrackStyle.RightOfAlbumArt;

const BaseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

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

    const availableHeaderSizes = ['none', 'compact', 'normal'];
    const headerSize: string | string[] | undefined = req.query['header_size'] || 'normal';
    if (Array.isArray(headerSize) || !availableHeaderSizes.includes(headerSize)) {
        res.statusCode = 400;
        res.json({ error: `Invalid 'header_size' parameter. Should be one of ${availableHeaderSizes}.` });
    }

    const borderRadius: string | string[] | undefined = req.query['border_radius'] || '10';
    if (Array.isArray(borderRadius) || parseFloat(borderRadius) < 0 || parseFloat(borderRadius) > 100) {
        res.statusCode = 400;
        res.json({ error: `Invalid 'border_radius' parameter. Should be a number between 0 and 100.` });
    }
    const styleOptions: StyleOptions = {
        headerSize: headerSize as HeaderSize,
        borderRadius: parseFloat(borderRadius as string),
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
            const smallImg = track.image[0]['#text'];
            try {
                const { data } = await axios.get<string>(`${BaseUrl}/api/proxy`, {
                    params: {
                        img: smallImg,
                    },
                });
                track.inlineimage = data;
            } catch {
                track.inlineimage = PlaceholderImg;
            }
        }

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.setHeader('Content-Type', 'image/svg+xml');
        res.statusCode = 200;
        res.send(generateSvg(data, width, lovedTrackOptions, styleOptions));
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
