export interface LovedTrackOptions {
    show: boolean;
    style: LovedTrackStyle;
}

export enum LovedTrackStyle {
    RightOfAlbumArt = 1,
    RightOfAlbumArtAll = 2,
    RightOfTitle = 3,
    LeftOfTimestamp = 4,
}
