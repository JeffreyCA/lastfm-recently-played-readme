import { List } from 'antd';
import { LovedTrackOptions } from '../../models/LovedTrackOptions';
import { TrackInfo } from '../../models/TrackInfo';
import TrackListHeader from './TrackListHeader';
import TrackListItem from './TrackListItem';

interface Props {
    /**
     * List of TrackInfo objects.
     */
    trackInfoList: TrackInfo[];
    /**
     * Username.
     */
    username: string;
    /**
     * Options for showing loved tracks.
     */
    lovedTrackOptions: LovedTrackOptions;
}

/**
 * Track list component.
 */
export default function TrackList(props: Props): JSX.Element {
    const { trackInfoList, username, lovedTrackOptions } = props;
    const anyLovesInList = trackInfoList.some((trackInfo) => trackInfo.loved === '1');

    return (
        <List
            size="small"
            header={<TrackListHeader username={username} />}
            bordered
            dataSource={trackInfoList}
            renderItem={(trackInfo) => (
                <TrackListItem
                    trackInfo={trackInfo}
                    lovedTrackOptions={lovedTrackOptions}
                    anyLovesInList={anyLovesInList}
                />
            )}
        />
    );
}
