import { Avatar, List, Typography } from 'antd';
import { TrackInfo } from '../../models/TrackInfo';
import Timestamp from './Timestamp';

const { Text } = Typography;

interface Props {
    /**
     * Track info.
     */
    trackInfo: TrackInfo;
}

/**
 * Track list item component.
 */
export default function TrackListItem(props: Props): JSX.Element {
    const { trackInfo } = props;
    const artistName = trackInfo.artist['#text'];
    const trackName = trackInfo.name;
    const trackUrl = trackInfo.url;
    const coverUrl = trackInfo.inlineimage;

    return (
        <List.Item className="track-item" extra={<Timestamp trackInfo={trackInfo} />}>
            <List.Item.Meta
                avatar={<Avatar shape="square" src={coverUrl} />}
                title={
                    <a
                        className="ellipsis-overflow a-lastfm"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={trackUrl}
                        title={trackName}>
                        {trackName}
                    </a>
                }
                description={
                    <Text className="ellipsis-overflow" type="secondary" title={artistName}>
                        {artistName}
                    </Text>
                }
            />
        </List.Item>
    );
}
