import { Image, Space } from 'antd';
import { StyleOptions } from '../../models/StyleOptions';
import { UserInfo } from '../../models/UserInfo';
import Stats from './Stats';
import Profile from './Profile';
import WaveWebp from '../../public/wave42.webp';

interface Props {
    /**
     * Username.
     */
    username: string;
     /**
     * Style Options
     */
     styleOptions: StyleOptions;
    /**
     * User Info.
     */
    userInfo: UserInfo;
}

/**
 * Track list header component.
 */
export default function TrackListFooter(props: Props): JSX.Element {
    var stats = props.styleOptions.displayStats ? 
        <Stats
            size={props.styleOptions.footerSize}
            userInfo={props.userInfo}
        /> 
        :false;
    var profile = props.styleOptions.displayUsername ? 
        <Profile 
            displayUsername={props.styleOptions.displayUsername}
            userInfo={props.userInfo} 
            size={props.styleOptions.footerSize}
        />
        :false;
    var wave;
    if (!props.styleOptions.statsInFooter || !(props.styleOptions.displayStats || props.styleOptions.displayUsername))
    {
        wave = <div 
        className='asdasd'
        style={{
            margin:'0 !important',
            padding:'0 !important',
            height: '40px',
        }}>
            <Image style={{objectFit: 'cover', opacity: '100%'}} height={'42px'} preview={false} src={WaveWebp}/>
        </div>

    }else{
        wave = <div 
        className='lastfm-footer'
        style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}
        >
            <Space>
            {stats}
            </Space>
            {profile}
        </div>
    }
    return (
        <>
            {wave}
        </>
    );
    
}
