import ReactDOMServer from 'react-dom/server';
import { flushToHTML } from 'styled-jsx/server';
import SvgWidget from '../components/SvgWidget';
import { LovedTrackOptions } from '../models/LovedTrackOptions';
import { RecentTracksResponse } from '../models/RecentTracksResponse';
import { UserInfoResponse } from '../models/UserInfoResponse';
import { FooterStyle, HeaderStyle, StyleOptions, UserVisibility } from '../models/StyleOptions';

const baseHeightsHeader: Record<HeaderStyle, number> = {
    [HeaderStyle.None]: 0,
    [HeaderStyle.Compact]: 24,
    [HeaderStyle.Normal]: 44,
    [HeaderStyle.CompactStats]: 55,
    [HeaderStyle.NormalStats]: 74,
    [HeaderStyle.CompactStatsOnly]: 38,
    [HeaderStyle.NormalStatsOnly]: 47,
};
const baseHeightsFooter: Record<FooterStyle, number> = {
    [FooterStyle.None]: 0,
    [FooterStyle.Wave]: 34,
    [FooterStyle.CompactStats]: 30,
    [FooterStyle.NormalStats]: 42,
    [FooterStyle.CompactBlank]: 26,
    [FooterStyle.NormalBlank]: 42,
};

const heightPerItem = 57;
const heightBuffer = 5;

export function generateSvg(
    recentTracksRes: RecentTracksResponse,
    width: number,
    lovedTrackOptions: LovedTrackOptions,
    styleOptions: StyleOptions,
    UserInfoResponse: UserInfoResponse
): string {
    let userInfo;
    if (UserInfoResponse !== undefined) userInfo = UserInfoResponse.user;
    const count = recentTracksRes.recenttracks.track.length;
    const height =
        baseHeightsHeader[styleOptions.headerStyle] +
        baseHeightsFooter[styleOptions.footerStyle] +
        count * heightPerItem +
        heightBuffer;
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
