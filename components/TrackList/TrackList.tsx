import { List } from 'antd';
import { LovedTrackOptions } from '../../models/LovedTrackOptions';
import { TrackInfo } from '../../models/TrackInfo';
import TrackListHeader from './TrackListHeader';
import TrackListItem from './TrackListItem';
import { StyleOptions } from '../../models/StyleOptions';
import { UserInfo } from '../../models/UserInfo';
import TrackListFooter from './TrackListFooter';

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
    /**
     * Options for styling.
     */
    styleOptions: StyleOptions;
    /**
     * User info.
     */
    userInfo: UserInfo;
}

/**
 * Track list component.
 */
export default function TrackList(props: Props): JSX.Element {
    const { trackInfoList, username, lovedTrackOptions, styleOptions, userInfo } = props;
    const anyLovesInList = trackInfoList.some((trackInfo) => trackInfo.loved === '1');

    return (
        <List
            size="small"
            header={
                styleOptions.headerSize !== 'none' && (
                    <TrackListHeader 
                        username={username}
                        styleOptions={styleOptions}
                        userInfo={userInfo} 
                    />
                )
            }
            footer={
                (styleOptions.statsInFooter || styleOptions.footerSize !== 'none') && (
                    <TrackListFooter 
                        username={username}
                        styleOptions={styleOptions}
                        userInfo={userInfo} 
                    />
                )
            }
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
