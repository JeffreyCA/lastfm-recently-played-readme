export interface Streamable {
    '#text': string;
    fulltrack: string;
}

export interface Artist {
    name: string;
    url: string;
}

export interface Image {
    '#text': string;
    size: string;
}

export interface Album {
    artist: string;
    title: string;
    url: string;
    image: Image[];
}

export interface Toptags {
    tag: unknown[];
}

export interface TrackItem {
    name: string;
    url: string;
    duration: string;
    streamable: Streamable;
    listeners: string;
    playcount: string;
    artist: Artist;
    album: Album;
    toptags: Toptags;
}

export interface GetTrackInfoResponse {
    track: TrackItem;
}
