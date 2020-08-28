import { AlbumInfo } from './AlbumInfo';
import { ArtistInfo } from './ArtistInfo';
import { DateInfo } from './DateInfo';
import { ImageInfo } from './ImageInfo';
import { TrackAttrInfo } from './TrackAttrInfo';

export interface TrackInfo {
    '@attr'?: TrackAttrInfo;
    name: string;
    artist: ArtistInfo;
    album: AlbumInfo;
    image: ImageInfo[];
    inlineimage: string;
    date?: DateInfo;
    url: string;
    mbid: string;
}
