import { Image, Typography } from 'antd';
import { UserInfo } from '../../models/UserInfo';
import { UserVisibility } from '../../models/StyleOptions';
const { Text } = Typography;

interface Props {
    /**
     * Display username.
     */
    userVisibility: UserVisibility;
    /**
     * Size.
     */
    size: string;
    /**
     * User Info.
     */
    userInfo: UserInfo;
}

/**
 * Track list header component.
 */
export default function Profile(props: Props): JSX.Element {
    const profileWidth = props.size.includes('compact') ? 20 : 30;
    var profileImg = '';
    var name = '';
    if (props.userInfo !== undefined) {
        profileImg = props.userInfo.inlineimage;
        name = props.userInfo.name;
    }

    return (
        <div className="lastfm-profile">
            <Text>{name}</Text>
            <Image
                style={{ borderRadius: '50%' }}
                preview={false}
                className="lastfm-icon"
                src={profileImg}
                width={profileWidth}
            />
        </div>
    );
}
