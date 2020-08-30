import { key } from './../shared/KeyDefine';
import { eRpcFuncID } from './../common/Rpc/RpcFuncID';
import { CheckInCfgLoader } from './player/CheckInCfgLoader';
import { PrizeWheel } from './PrizeWheel';
import { MailModule } from './MailModule';
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
        this.registerModule( new MailModule() ) ;
        this.registerModule( new PrizeWheel() ) ;
        CheckInCfgLoader.getInstance().loadConfig();
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

    onRpcCall( funcID : eRpcFuncID , arg : Object , sieral : number , outResult : Object ) : boolean
    {
        if ( funcID == eRpcFuncID.Http_ReloadCheckInCfg )
        {
            CheckInCfgLoader.getInstance().loadConfig(arg["url"]) ;
            outResult[key.ret] = 0 ;
            return true;
        }
        return super.onRpcCall(funcID, arg, sieral, outResult) ;
    }
}