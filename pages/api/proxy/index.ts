import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

const acceptedPrefix = 'https://lastfm.freetls.fastly.net/i/';

/**
 * "Proxy" endpoint that takes a Last.fm cover art URL and returns its base64 representation. Cover art images are
 * inlined into the final SVG because GitHub's Content Security Policy prohibits external images.
 */
export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const { img } = req.query;

    // To be safe, only accept URLs from Lastfm base URL
    if (!img || Array.isArray(img) || !img.startsWith(acceptedPrefix)) {
        res.statusCode = 400;
        res.json({ error: 'Invalid img parameter' });
        return;
    }

    try {
        const { data } = await axios.get<string>(img, {
            responseType: 'arraybuffer',
        });
        const base64 = Buffer.from(data, 'binary').toString('base64');

        // Set cache for a week
        res.setHeader('Cache-Control', 'max-age=86400, immutable');
        res.send(`data:image/png;base64,${base64}`);
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
