import ReactDOMServer from 'react-dom/server';
import { flushToHTML } from 'styled-jsx/server';
import SvgWidget from '../components/SvgWidget';
import { LovedTrackOptions } from '../models/LovedTrackOptions';
import { RecentTracksResponse } from '../models/RecentTracksResponse';
import { HeaderSize, StyleOptions } from '../models/StyleOptions';

const baseHeights: Record<HeaderSize, number> = {
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
    styleOptions: StyleOptions
): string {
    const count = recentTracksRes.recenttracks.track.length;
    const height = baseHeights[styleOptions.headerSize] + count * heightPerItem + heightBuffer;
    const svgBody = ReactDOMServer.renderToStaticMarkup(
        <SvgWidget
            width={width}
            height={height}
            recentTracksResponse={recentTracksRes}
            lovedTrackOptions={lovedTrackOptions}
            styleOptions={styleOptions}
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
