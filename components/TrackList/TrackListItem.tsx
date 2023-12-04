import { Avatar, Image, List, Typography } from 'antd';
import { TrackInfo } from '../../models/TrackInfo';
import Timestamp from './Timestamp';
import HeartPng from '../../public/heart.png';
import HeartGrayPng from '../../public/heart_gray.png';
import { LovedTrackOptions, LovedTrackStyle } from '../../models/LovedTrackOptions';

const { Text } = Typography;

interface Props {
    /**
     * Track info.
     */
    trackInfo: TrackInfo;
    /**
     * Whether there are any tracks in the list that are 'loved'.
     * Used in case 'showLoves' is true but none of the tracks is loved (padding removed in this case).
     */
    anyLovesInList: boolean;
    /**
     * Options for showing loved tracks.
     */
    lovedTrackOptions: LovedTrackOptions;
}

const avatarStyleLoved = { display: 'flex', alignItems: 'center', gap: '6px', marginRight: '-6px' };
const avatarStyle = { display: 'flex', alignItems: 'center' };

const titleStyleLoved = { display: 'flex', alignItems: 'center', gap: '4px' };

/**
 * Track list item component.
 */
export default function TrackListItem(props: Props): JSX.Element {
    const { trackInfo, anyLovesInList, lovedTrackOptions } = props;
    const artistName = trackInfo.artist.name;
    const trackName = trackInfo.name;
    const trackUrl = trackInfo.url;
    const coverUrl = trackInfo.inlineimage;
    const isTrackLoved = trackInfo.loved === '1';

    const shouldShowLovedBesideArt =
        lovedTrackOptions.show &&
        (lovedTrackOptions.style === LovedTrackStyle.RightOfAlbumArt ||
            lovedTrackOptions.style === LovedTrackStyle.RightOfAlbumArtAll);
    const shouldShowLovedBesideTitle =
        lovedTrackOptions.show && lovedTrackOptions.style === LovedTrackStyle.RightOfTitle;

    return (
        <List.Item
            className="track-item"
            extra={<Timestamp trackInfo={trackInfo} lovedTrackOptions={lovedTrackOptions} />}
        >
            <List.Item.Meta
                avatar={
                    <div style={anyLovesInList && shouldShowLovedBesideArt ? avatarStyleLoved : avatarStyle}>
                        <Avatar shape="square" src={coverUrl} />
                        {anyLovesInList && shouldShowLovedBesideArt && (
                            <Image
                                preview={false}
                                width={12}
                                height={12}
                                src={shouldShowLovedBesideArt && isTrackLoved ? HeartPng : HeartGrayPng}
                                style={{
                                    visibility:
                                        isTrackLoved || lovedTrackOptions.style === LovedTrackStyle.RightOfAlbumArtAll
                                            ? 'visible'
                                            : 'hidden',
                                }}
                            />
                        )}
                    </div>
                }
                title={
                    <div style={anyLovesInList && shouldShowLovedBesideTitle ? titleStyleLoved : {}}>
                        <a
                            className="ellipsis-overflow a-lastfm"
                            target="_blank"
                            rel="noopener noreferrer"
                            href={trackUrl}
                            title={trackName}
                        >
                            {trackName}
                        </a>
                        {shouldShowLovedBesideTitle && isTrackLoved && (
                            <Image
                                preview={false}
                                width={12}
                                height={12}
                                src={HeartPng}
                                wrapperClassName="inline-heart"
                            />
                        )}
                    </div>
                }
                description={
                    <Text className="ellipsis-overflow" type="secondary" title={artistName}>
                        {artistName}
                    </Text>
                }
            />
        </List.Item>
    );
}
