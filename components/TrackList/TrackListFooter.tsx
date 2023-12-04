import { Image, Space } from 'antd';
import { FooterStyle, StyleOptions, UserVisibility } from '../../models/StyleOptions';
import { UserInfo } from '../../models/UserInfo';
import Stats from './Stats';
import Profile from './Profile';
import WaveWebp from '../../public/wave.webp';

interface Props {
    /**s
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
export default function TrackListFooter(props: Props): JSX.Element {
    const statsInFooter = props.styleOptions.footerStyle.includes('stats');
    const showProfile =
        props.styleOptions.userVisibility == UserVisibility.Always ||
        props.styleOptions.userVisibility == UserVisibility.Footer;
    const centerStats = !showProfile;
    const stats = statsInFooter ? (
        <Stats
            size={props.styleOptions.footerStyle}
            userInfo={props.userInfo}
            styleOptions={props.styleOptions}
            centerStats={centerStats}
        />
    ) : (
        false
    );
    const profile = showProfile ? (
        <Profile
            userVisibility={props.styleOptions.userVisibility}
            userInfo={props.userInfo}
            size={props.styleOptions.footerStyle}
        />
    ) : (
        false
    );

    // Display the footer decoration only if the user specifies it
    let result;
    if (props.styleOptions.footerStyle == FooterStyle.Wave) {
        result = (
            <div
                style={{
                    margin: '0 !important',
                    padding: '0 !important',
                    height: '40px',
                }}>
                <Image style={{ objectFit: 'cover', opacity: '100%' }} height={'42px'} preview={false} src={WaveWebp} />
            </div>
        );
    } else {
        result = (
            <div
                className="lastfm-footer"
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: centerStats ? 'center' : 'space-between',
                }}>
                <Space>{stats}</Space>
                {profile}
            </div>
        );
    }
    return <>{result}</>;
}
