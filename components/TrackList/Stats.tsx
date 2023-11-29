import { Typography } from 'antd';
import { HeaderSize } from '../../models/StyleOptions';
import { UserInfo } from '../../models/UserInfo';

const { Text } = Typography;

interface Props {
    /**
     * Size.
     */
    size: HeaderSize;
    /**
     * User Info.
     */
    userInfo: UserInfo;
}

/**
 * Track list header component.
 */
export default function Stats(props: Props): JSX.Element {
    return (
        <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
            <div className={`lastfm-stats ${props.size}`}>
                <div>                    
                    <Text strong>{parseInt(props.userInfo.playcount).toLocaleString()}</Text>
                    <Text strong>Scrobbles</Text>
                </div>
                <div>
                    <Text strong >{parseInt(props.userInfo.artist_count).toLocaleString()}</Text>
                    <Text strong>Arists</Text>
                </div>
                <div>                    
                    <Text strong >{parseInt(props.userInfo.track_count).toLocaleString()}</Text>
                    <Text strong>Tracks</Text>
                </div>
            </div>
            
        </div>
    );
    
}
