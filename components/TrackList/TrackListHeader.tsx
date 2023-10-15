import { Image, Space, Typography } from 'antd';
import LastFmIcon from '../../public/lastfm.svg';
import { HeaderSize } from '../../models/StyleOptions';

const { Text } = Typography;

interface Props {
    /**
     * Username.
     */
    username: string;
    /**
     * Size
     */
    size: HeaderSize;
}

/**
 * Track list header component.
 */
export default function TrackListHeader(props: Props): JSX.Element {
    switch (props.size) {
        case 'none':
            return <></>;
        case 'compact':
            return (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Space>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href={`https://www.last.fm/user/${props.username}`}
                            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: -1 }}>
                            <Image preview={false} className="lastfm-icon" src={LastFmIcon} width={45}></Image>
                        </a>
                        <Text className="lastfm-title-compact">Recently Played</Text>
                    </Space>
                </div>
            );
        case 'normal':
        default:
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
}
