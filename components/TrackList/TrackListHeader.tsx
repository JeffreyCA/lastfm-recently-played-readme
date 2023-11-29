import { Image, Space, Typography } from 'antd';
import LastFmIcon from '../../public/lastfm.svg';
import { StyleOptions } from '../../models/StyleOptions';
import { UserInfo } from '../../models/UserInfo';
import Stats from './Stats';
import Profile from './Profile';

const { Text } = Typography;

interface Props {
    /**
     * Username.
     */
    username: string;
     /**
     * Style Options
     */
     styleOptions: StyleOptions;
    /**
     * User Info.
     */
    userInfo: UserInfo;
}

/**
 * Track list header component.
 */
export default function TrackListHeader(props: Props): JSX.Element {
    var iconWidth = props.styleOptions.headerSize === 'compact' ? 45 : 60;
    var stats, profile;
    if(!props.styleOptions.statsInFooter)
    {
        
    stats = props.styleOptions.displayStats ? 
    <Stats
        size={props.styleOptions.headerSize}
        userInfo={props.userInfo}
    /> 
    :false;
    profile = props.styleOptions.displayUsername ?
        <Profile 
            displayUsername={props.styleOptions.displayUsername}
            userInfo={props.userInfo} 
            size={props.styleOptions.headerSize}
        />
        :false;
    }
    return (
        <div>
            <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                <Space>
                    <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://www.last.fm/user/${props.username}`}
                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: -1 }}>
                        <Image preview={false} className="lastfm-icon" src={LastFmIcon} width={iconWidth}></Image>
                    </a>
                    <Text className={`lastfm-title${props.styleOptions.headerSize === 'compact' ? '-compact' : ''}`}>Recently Played</Text>
                    
                </Space>
                {(!stats || props.styleOptions.headerSize === 'compact') ? profile : false}
            </div>
            <div 
            style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}
            >
                <Space>
                {stats}
                
                </Space>
                {(stats && props.styleOptions.headerSize !== 'compact') ? profile : false}
            </div>

        </div>
    );
    
}
