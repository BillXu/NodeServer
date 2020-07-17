import { XLogger } from './../common/Logger';
import { PlayerSimpleInfoCacher } from './PlayerSimpleInfoCacher';
import { IServerApp } from "../common/IServerApp";
import { eMsgPort } from "../shared/MessageIdentifer";
import { PlayerMgr } from './PlayerMgr';

export class DataSvr extends IServerApp
{
    // iserver
    init( jsCfg : Object )
    {
        super.init(jsCfg) ;
        this.registerModule( new PlayerMgr() ) ;
        this.registerModule( new PlayerSimpleInfoCacher() ) ;
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
        XLogger.debug( "onPlayerLogin uid = " + uid ) ;
        (this.getModule(PlayerSimpleInfoCacher.MODULE_NAME) as PlayerSimpleInfoCacher).onPlayerLogin(uid) ;
    }
}