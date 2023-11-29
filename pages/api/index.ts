import axios, { AxiosResponse } from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { LovedTrackStyle, LovedTrackOptions } from '../../models/LovedTrackOptions';
import { RecentTracksResponse } from '../../models/RecentTracksResponse';
import PlaceholderImg from '../../public/placeholder.webp';
import { generateSvg } from '../../utils/SvgUtil';
import { FooterSize, HeaderSize, StyleOptions } from '../../models/StyleOptions';
import { UserInfoResponse } from '../../models/UserInfoResponse';

const defaultCount = 5;
const minCount = 1;
const maxCount = 10;

const defaultWidth = 400;
const minWidth = 300;
const maxWidth = 1000;

const defaultLovedStyle = LovedTrackStyle.RightOfAlbumArt;

const defaultStatsVisibility = false;

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

    // Parse 'stats' query parameter.
    const statsQuery: string | string[] | undefined = req.query['stats'];
    let stats = defaultStatsVisibility;

    if (typeof statsQuery === 'string') {
        stats = statsQuery === 'true';
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

    const availableFooterSizes = ['none', 'compact', 'normal'];
    const footerSize: string | string[] | undefined = req.query['footer_size'] || 'none';
    if (Array.isArray(footerSize) || !availableFooterSizes.includes(footerSize)) {
        res.statusCode = 400;
        res.json({ error: `Invalid 'footer_size' parameter. Should be one of ${availableFooterSizes}.` });
    }

    const borderRadius: string | string[] | undefined = req.query['border_radius'] || '10';
    if (Array.isArray(borderRadius) || parseFloat(borderRadius) < 0 || parseFloat(borderRadius) > 100) {
        res.statusCode = 400;
        res.json({ error: `Invalid 'border_radius' parameter. Should be a number between 0 and 100.` });
    }

    const bgColor: string | string[] | undefined = req.query['bg_color'] || '212121';
    if (Array.isArray(bgColor) || bgColor.length < 0 || bgColor.length > 8 || bgColor.startsWith('#')) {
        res.statusCode = 400;
        res.json({ error: `Invalid 'bg_color' parameter. Should be a hexadecimal RGB or RGBA code with no leading \'#\' symbol.` });
    }

    const displayUsername: string | string[] | undefined = req.query['show_user'];
    const displayStats: string | string[] | undefined = req.query['stats'];
    const statsInFooter: string | string[] | undefined = req.query['footer_stats'] || 'false';

    const styleOptions: StyleOptions = {
        headerSize: headerSize as HeaderSize,
        footerSize: footerSize as FooterSize,
        borderRadius: parseFloat(borderRadius as string),
        bgColor: '#'+bgColor,
        displayUsername: displayUsername === 'true',
        displayStats: displayStats === 'true',
        statsInFooter: statsInFooter === 'true',
    };

    try {
        var apiCalls : Promise<AxiosResponse<any,any>>[] = [
            axios.get<RecentTracksResponse>(
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
            ),
        ]

        // Only make the second API call if userInfo will actually be shown.
        if (displayStats || displayUsername || footerSize !== 'none') apiCalls.push(
            axios.get<UserInfoResponse>(
                'http://ws.audioscrobbler.com/2.0/?method=user.getinfo',
                {
                    params: {
                        user: user,
                        api_key: process.env.API_KEY,
                        format: 'json',
                    },
                }
            ),
        )
        const datas = await Promise.all(apiCalls);

        const trackData = datas[0].data;
        let userData;
        if(datas[1] !== undefined) userData = datas[1].data;
        
       
        // Trim array as API may return more than 'count'
        trackData.recenttracks.track = trackData.recenttracks.track.slice(0, count);

        // Set base64-encoded cover art images by routing through /api/proxy endpoint
        // This is needed because GitHub's Content Security Policy prohibits external images (inline allowed)
        let objs : any[] = [...trackData.recenttracks.track];
        if(userData !== undefined) objs.push(userData.user);
        for (const obj of objs) {
            const smallImg = obj.image[0]['#text'];
            try {
                const { data } = await axios.get<string>(`${BaseUrl}/api/proxy`, {
                    params: {
                        img: smallImg,
                    },
                });
                obj.inlineimage = data;
            } catch {
                obj.inlineimage = PlaceholderImg;
            }
        }
        
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.setHeader('Content-Type', 'image/svg+xml');
        res.statusCode = 200;
        res.send(generateSvg(trackData, width, lovedTrackOptions, styleOptions, userData));
    } catch (e: any) {
        const trackData = e?.response?.trackData;
        res.statusCode = 400;
        if (trackData) {
            res.json({ error: trackData.message });
        } else {
            res.json({ error: e.toString() });
        }
    }
};
