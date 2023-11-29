import { DateInfo } from './DateInfo';
import { ImageInfo } from './ImageInfo';

export interface UserInfo {
    name: string;
    age: string;
    subscriber?: string;
    realname?: string;
    bootstrap: string;
    playcount: string;
    artist_count: string;
    playlists: string;
    track_count: string;
    album_count: string;
    image?: ImageInfo[];
    registered?: DateInfo;
    country?: string;
    gender?: string;
    url: string;
    type: string;
    inlineimage: string;
}