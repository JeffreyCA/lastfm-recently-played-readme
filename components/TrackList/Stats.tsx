import { Typography } from 'antd';
import { UserInfo } from '../../models/UserInfo';
import { StyleOptions } from '../../models/StyleOptions';

const { Text } = Typography;

interface Props {
    /**
     * Size.
     */
    size: string;
    /**
     * User Info.
     */
    styleOptions: StyleOptions;
    /**
     * User Info.
     */
    userInfo: UserInfo;
    /**
     * Stats Location.
     */
    centerStats: boolean;
}

/**
 * Track list header component.
 */
export default function Stats(props: Props): JSX.Element {
    const classes = props.centerStats ? 'center-text' : '';
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: props.centerStats ? 'center' : 'space-between',
            }}>
            <div className={`lastfm-stats classes ${props.size.includes('compact') ? 'compact' : ''}`}>
                <div>
                    <Text className={classes} strong>
                        {parseInt(props.userInfo.playcount).toLocaleString()}
                    </Text>
                    <Text className={classes} strong>
                        Scrobbles
                    </Text>
                </div>
                <div>
                    <Text className={classes} strong>
                        {parseInt(props.userInfo.artist_count).toLocaleString()}
                    </Text>
                    <Text className={classes} strong>
                        Artists
                    </Text>
                </div>
                <div>
                    <Text className={classes} strong>
                        {parseInt(props.userInfo.track_count).toLocaleString()}
                    </Text>
                    <Text className={classes} strong>
                        Tracks
                    </Text>
                </div>
            </div>
        </div>
    );
}
