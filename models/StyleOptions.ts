export type HeaderSize = 'none' | 'compact' | 'normal';
export type FooterSize = 'none' | 'compact' | 'normal';

export interface StyleOptions {
    headerSize: HeaderSize;
    footerSize: FooterSize;
    borderRadius: number;
    bgColor: string;
    displayUsername: boolean;
    displayStats: boolean;
    statsInFooter: boolean;
}
