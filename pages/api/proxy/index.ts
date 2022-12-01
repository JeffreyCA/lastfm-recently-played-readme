import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

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

    const filename = img.split('/').pop();
    const cachePath = `./cache/${filename}.base64`;
    if (!fs.existsSync(path.dirname(cachePath))) {
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    }
    if (fs.existsSync(cachePath)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 's-maxage=31536000, immutable');
        res.send('data:image/png;base64,' + fs.readFileSync(cachePath));
        return;
    }

    try {
        const { data } = await axios.get<string>(img, {
            responseType: 'arraybuffer',
        });
        const base64 = Buffer.from(data, 'binary').toString('base64');

        // Cache image
        fs.writeFileSync(cachePath, base64);

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
