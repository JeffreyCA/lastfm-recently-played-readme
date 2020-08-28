/* eslint-disable prettier/prettier */
import css from 'styled-jsx/css';

export default css.global`
svg {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    color: white;
}
.lastfm-title {
    vertical-align: middle;
    font-size: 16px;
}
.lastfm-icon {
    margin-right: 10px;
}
.lastfm-icon > img {
    padding-bottom: 3px;
}
.lastfm-user {
    -webkit-transition: all .3s;
    transition: all .3s;
}
.lastfm-user:hover {
    color: #f5222d;
}
a.a-lastfm:hover {
    color: #f5222d !important;
}
.ellipsis-overflow {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.ant-list-bordered {
    border: initial;
}
.ant-list {
    font-size: 0.8rem;
}
.ant-list-item-meta-avatar {
    align-self: center;
}
.ant-list-item-meta-title {
    font-size: 0.8rem;
    margin-bottom: 0px !important;
}
.ant-list-item-meta-description {
    font-size: 0.8rem;
}
.track-item {
    padding: 8px 12px !important;
}
.timestamp {
    font-size: 0.7rem;
    margin-left: 5px;
}`;
