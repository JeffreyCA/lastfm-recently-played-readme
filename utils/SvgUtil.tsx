import ReactDOMServer from 'react-dom/server';
import { flushToHTML } from 'styled-jsx/server';
import SvgWidget from '../components/SvgWidget';
import { LovedTrackOptions } from '../models/LovedTrackOptions';
import { RecentTracksResponse } from '../models/RecentTracksResponse';
import { FooterSize, HeaderSize, StyleOptions } from '../models/StyleOptions';
import { UserInfo } from '../models/UserInfo';
import { UserInfoResponse } from '../models/UserInfoResponse';

const baseHeights: Record<HeaderSize, number> = {
    none: 0,
    compact: 24,
    normal: 40,
};
const baseHeightsFooter: Record<FooterSize, number> = {
    none: 0,
    compact: 24,
    normal: 40,
};

const heightPerItem = 57;
const heightBuffer = 5;


export function generateSvg(
    recentTracksRes: RecentTracksResponse,
    width: number,
    lovedTrackOptions: LovedTrackOptions,
    styleOptions: StyleOptions,
    UserInfoResponse: UserInfoResponse,
): string {
    let userInfo;
    if(UserInfoResponse !== undefined) userInfo = UserInfoResponse.user;
    let statsHeight = 28;
    if(styleOptions.headerSize === 'compact' && !styleOptions.statsInFooter)
    {
        statsHeight = 19;
    }
    if(styleOptions.footerSize === 'compact' && styleOptions.statsInFooter)
    {
        statsHeight = 0;
    }
    let footerHeight = baseHeightsFooter[styleOptions.footerSize];
    if(!styleOptions.displayStats || styleOptions.statsInFooter || styleOptions.footerSize !== 'none' ) statsHeight = 0;
    const count = recentTracksRes.recenttracks.track.length;
    if (styleOptions.statsInFooter && styleOptions.footerSize==='none')
    {
        footerHeight = baseHeights['normal'];
    }
    if (!styleOptions.statsInFooter && styleOptions.footerSize!=='none')
    {
        footerHeight = 40;
        if(styleOptions.headerSize == 'compact')
        {
            footerHeight = 35;
        }
        footerHeight += styleOptions.displayStats ? 15 : 0;
    }
    const height = baseHeights[styleOptions.headerSize] + footerHeight + count * heightPerItem + heightBuffer + statsHeight;
    const svgBody = ReactDOMServer.renderToStaticMarkup(
        <SvgWidget
            width={width}
            height={height}
            recentTracksResponse={recentTracksRes}
            lovedTrackOptions={lovedTrackOptions}
            styleOptions={styleOptions}
            userInfo={userInfo}
        />
    );
    const svgStyles = flushToHTML();

    return `
    <svg
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
    ${svgStyles}
    ${svgBody}
    </svg>`;
}
