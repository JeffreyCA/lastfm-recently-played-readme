import { List } from 'antd';
import { TrackInfo } from '../../models/TrackInfo';
import TrackListHeader from './TrackListHeader';
import TrackListItem from './TrackListItem';

interface Props {
    trackInfoList: TrackInfo[];
    username: string;
}

export default function TrackList(props: Props): JSX.Element {
    const { trackInfoList, username } = props;
    return (
        <List
            size="small"
            header={<TrackListHeader username={username} />}
            bordered
            dataSource={trackInfoList}
            renderItem={(trackInfo) => <TrackListItem trackInfo={trackInfo} />}
        />
    );
}
