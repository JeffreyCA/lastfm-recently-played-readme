import { Image, Typography } from 'antd';
import { DateTime } from 'luxon';
import { LovedTrackOptions, LovedTrackStyle } from '../../models/LovedTrackOptions';
import { TrackInfo } from '../../models/TrackInfo';
import HeartPng from '../../public/heart.png';
import NowPlayingGif from '../../public/now_playing.gif';

const { Text } = Typography;

interface Props {
    /**
     * Last.fm track info.
     */
    trackInfo: TrackInfo;
    /**
     * Options for showing loved tracks.
     */
    lovedTrackOptions: LovedTrackOptions;
}

const timestampStyleLoved = { display: 'flex', alignItems: 'center', marginLeft: '4px' };

/**
 * Timestamp component of a track item.
 */
export default function Timestamp(props: Props): JSX.Element {
    const { trackInfo, lovedTrackOptions } = props;
    const nowPlaying = trackInfo['@attr']?.nowplaying;
    const shouldShowLoved =
        trackInfo.loved === '1' &&
        lovedTrackOptions.show &&
        lovedTrackOptions.style === LovedTrackStyle.LeftOfTimestamp;

    // Set timestamp text
    let timestampText: string;
    let timestampTitle: string;
    if (nowPlaying) {
        // Track is currently playing
        timestampText = 'Scrobbling now';
        timestampTitle = timestampText;
    } else if (trackInfo.date?.['#text']) {
        // Track already scrobbled, so show relative timestamp
        timestampText =
            DateTime.fromFormat(trackInfo.date['#text'], 'dd LLL yyyy, HH:mm', {
                zone: 'utc',
            }).toRelative({
                style: 'short',
            }) ?? '';
        timestampTitle = trackInfo.date['#text'];
    } else {
        timestampText = '';
        timestampTitle = '';
    }

    let mainContent = (
        <>
            {nowPlaying && <Image preview={false} width={12} src={NowPlayingGif} />}
            <Text className="timestamp" type="secondary" title={timestampTitle}>
                {timestampText}
            </Text>
        </>
    );

    if (shouldShowLoved) {
        mainContent = (
            <div style={timestampStyleLoved}>
                <Image preview={false} width={12} height={12} src={HeartPng} />
                {mainContent}
            </div>
        );
    }

    return mainContent;
}
