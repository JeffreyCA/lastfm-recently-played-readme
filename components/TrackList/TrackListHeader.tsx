import { Image, Space, Typography } from 'antd';
import LastFmIcon from '../../public/lastfm.svg';

const { Text } = Typography;

interface Props {
    /**
     * Username.
     */
    username: string;
}

/**
 * Track list header component.
 */
export default function TrackListHeader(props: Props): JSX.Element {
    return (
        <div style={{ display: 'flex' }}>
            <Space>
                <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://www.last.fm/user/${props.username}`}
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: -1 }}>
                    <Image preview={false} className="lastfm-icon" src={LastFmIcon} width={60}></Image>
                </a>
                <Text className="lastfm-title">Recently Played</Text>
            </Space>
        </div>
    );
}
