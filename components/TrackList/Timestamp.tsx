import { Image, Typography } from 'antd';
import { DateTime } from 'luxon';
import { TrackInfo } from '../../models/TrackInfo';
import NowPlayingGif from '../../public/now_playing.gif';

const { Text } = Typography;

interface Props {
    /**
     * Last.fm track info.
     */
    trackInfo: TrackInfo;
}

/**
 * Timestamp component of a track item.
 */
export default function Timestamp(props: Props): JSX.Element {
    const { trackInfo } = props;
    const nowPlaying = trackInfo['@attr']?.nowplaying;

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

    return (
        <>
            {nowPlaying && <Image preview={false} width={12} src={NowPlayingGif} />}
            <Text className="timestamp" type="secondary" title={timestampTitle}>
                {timestampText}
            </Text>
        </>
    );
}
