import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { RecentTracksResponse } from '../../models/RecentTracksResponse';
import PlaceholderImg from '../../public/placeholder.webp';
import { generateSvg } from '../../utils/SvgUtil';

const defaultCount = 5;
const minCount = 1;
const maxCount = 10;

const defaultWidth = 400;
const minWidth = 300;
const maxWidth = 1000;

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

    try {
        const { data } = await axios.get<RecentTracksResponse>(
            'http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks',
            {
                params: {
                    user: user,
                    limit: count,
                    api_key: process.env.API_KEY,
                    format: 'json',
                },
            }
        );

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
        res.send(generateSvg(data, width));
    } catch (e) {
        const data = e?.response?.data;
        res.statusCode = 400;
        if (data) {
            res.json({ error: data.message });
        } else {
            res.json({ error: e.toString() });
        }
    }
};
