import { Image, Space, Typography } from 'antd';
import LastFmIcon from '../../public/lastfm.svg';
import { HeaderStyle, StyleOptions, UserVisibility } from '../../models/StyleOptions';
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
    const compact = props.styleOptions.headerStyle.includes('compact');
    const iconWidth = compact ? 45 : 60;
    const showProfile =
        props.styleOptions.userVisibility == UserVisibility.Always ||
        props.styleOptions.userVisibility == UserVisibility.Header;
    const statsOnly =
        props.styleOptions.headerStyle == HeaderStyle.NormalStatsOnly ||
        props.styleOptions.headerStyle == HeaderStyle.CompactStatsOnly;
    const showStats = props.styleOptions.headerStyle.includes('stats');

    const centerStats = statsOnly && !showProfile;
    var stats, profile, title;

    stats = showStats ? (
        <Stats
            size={props.styleOptions.headerStyle}
            userInfo={props.userInfo}
            styleOptions={props.styleOptions}
            centerStats={centerStats}
        />
    ) : (
        false
    );
    var inlineProfile = (!stats || compact) && !statsOnly;
    // Show profile if 'show_user' query is true.
    profile = showProfile ? (
        <Profile
            userVisibility={props.styleOptions.userVisibility}
            userInfo={props.userInfo}
            size={props.styleOptions.headerStyle}
        />
    ) : (
        false
    );

    // Hide title section if not 'HeaderStyle.StatsOnly'.
    title = !statsOnly ? (
        <Space>
            <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://www.last.fm/user/${props.username}`}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: -1 }}
            >
                <Image preview={false} className="lastfm-icon" src={LastFmIcon} width={iconWidth}></Image>
            </a>
            <Text className={`lastfm-title${compact ? '-compact' : ''}`}>Recently Played</Text>
        </Space>
    ) : (
        false
    );

    return (
        <div>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                {title}
                {inlineProfile ? profile : false}
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: centerStats ? 'center' : 'space-between',
                }}
            >
                <Space>{stats}</Space>
                {!inlineProfile ? profile : false}
            </div>
        </div>
    );
}
