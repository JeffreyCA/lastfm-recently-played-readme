/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { LovedTrackOptions } from '../models/LovedTrackOptions';
import { RecentTracksResponse } from '../models/RecentTracksResponse';
import { StyleOptions } from '../models/StyleOptions';
import AntStyles from '../styles/antd';
import SvgStyles from '../styles/svg';
import TrackList from './TrackList/TrackList';

interface SvgWidgetProps {
    /**
     * Width in pixels.
     */
    width: number;
    /**
     * Height in pixels.
     */
    height: number;
    /**
     * Recent tracks response from Last.fm API.
     */
    recentTracksResponse: RecentTracksResponse;
    /**
     * Options for showing loved tracks.
     */
    lovedTrackOptions: LovedTrackOptions;
    /**
     * Options for styling the SVG.
     */
    styleOptions: StyleOptions;
    /**
     * User Info.
     */
    userInfo: UserInfo;
}

/**
 * The main SVG widget.
 */
export default function SvgWidget(props: SvgWidgetProps): JSX.Element {
    const trackInfoList = props.recentTracksResponse.recenttracks.track;
    const username = props.recentTracksResponse.recenttracks['@attr'].user;
    const { width, height, lovedTrackOptions, styleOptions, userInfo } = props;

    return (
        <>
            <style jsx global>
                {AntStyles}
            </style>
            <style jsx global>
                {SvgStyles}
            </style>
            <g>
                <rect
                    data-testid="card-bg"
                    x="0"
                    y="0"
                    rx={styleOptions.borderRadius}
                    height="100%"
                    stroke="none"
                    width={width}
                    fill={styleOptions.bgColor}
                    strokeOpacity="1"
                />
                <foreignObject x="0" y="0" width={width} height={height} style={{}}>
                    <div
                        xmlns="http://www.w3.org/1999/xhtml"
                        className={`svg-widget ${styleOptions.headerStyle}`}
                        style={{ color: 'white' }}
                    >
                        <TrackList
                            trackInfoList={trackInfoList}
                            username={username}
                            lovedTrackOptions={lovedTrackOptions}
                            styleOptions={styleOptions}
                            userInfo={userInfo}
                        />
                    </div>
                </foreignObject>
            </g>
        </>
    );
}
