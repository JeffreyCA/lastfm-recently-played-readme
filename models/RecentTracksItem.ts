import { TrackInfo } from './TrackInfo';
import { RecentTracksAttrInfo } from './RecentTracksAttrInfo';

export interface RecentTracksItem {
    '@attr': RecentTracksAttrInfo;
    track: TrackInfo[];
}
