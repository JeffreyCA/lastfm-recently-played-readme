import { Image, Typography } from 'antd';
import { HeaderSize } from '../../models/StyleOptions';
import { UserInfo } from '../../models/UserInfo';
const { Text } = Typography;

interface Props {
     /**
     * Display username.
     */
     displayUsername: boolean;
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
export default function Profile(props: Props): JSX.Element {
    var profileWidth = props.size === 'compact' ? 20 : 30;
    var profileImg = '';
    var name = '';
    if(props.userInfo !== undefined)
    {
        profileImg = props.userInfo.inlineimage;
        name = props.userInfo.name;
    }
        
    return (
        
        <div className='lastfm-profile'>
            <Text>{name}</Text>
            <Image style={{borderRadius:'50%'}} preview={false} className="lastfm-icon" src={profileImg} width={profileWidth}/>
        </div>
    );
    
}
