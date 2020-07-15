import { XLogger } from './../common/Logger';
import { PlayerSimpleInfoCacher } from './PlayerSimpleInfoCacher';
import { eMsgType } from './../shared/MessageIdentifer';
import { IServerApp } from "../common/IServerApp";
import { eMsgPort } from "../shared/MessageIdentifer";
import { PlayerMgr } from './PlayerMgr';

export class DataSvr extends IServerApp
{
    // iserver
    init( jsCfg : Object )
    {
        super.init(jsCfg) ;
    }

    onRegistedToCenter( svrIdx : number , svrMaxCnt : number )
    {
        super.onRegistedToCenter(svrIdx, svrMaxCnt) ;
    }

    getLocalPortType() : eMsgPort
    {
        return eMsgPort.ID_MSG_PORT_DATA;
    }

    getPlayerMgr() : PlayerMgr
    {
        return this.getModule(PlayerMgr.MODUEL_NAME) as PlayerMgr ;
    }

    onPlayerLogin( uid : number )
    {
        (this.getModule(PlayerSimpleInfoCacher.MODULE_NAME) as PlayerSimpleInfoCacher).onPlayerLogin(uid) ;
        XLogger.debug( "player login uid = " + uid ) ;
    }
}