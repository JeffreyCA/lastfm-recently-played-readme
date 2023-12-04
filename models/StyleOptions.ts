export enum HeaderStyle {
    None = 'none',
    Compact = 'compact',
    Normal = 'normal',
    CompactStats = 'compact_stats',
    NormalStats = 'normal_stats',
    CompactStatsOnly = 'compact_stats_only',
    NormalStatsOnly = 'normal_stats_only',
}

export enum FooterStyle {
    None = 'none',
    Wave = 'wave',
    CompactStats = 'compact_stats',
    NormalStats = 'normal_stats',
    Compact = 'compact',
    Normal = 'normal',
}

export enum UserVisibility {
    Never = 'never',
    Always = 'always',
    Header = 'header',
    Footer = 'footer',
}

export interface StyleOptions {
    headerStyle: HeaderStyle;
    footerStyle: FooterStyle;
    borderRadius: number;
    bgColor: string;
    userVisibility: UserVisibility;
}
