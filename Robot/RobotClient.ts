import { MJDeskModuleSH } from './deskModule/MJDeskModuleSH';
import { PlayerBaseData } from './../shared/playerData/PlayerBaseData';
import { LoginModule } from './LoginModule';
import { LocalEventEmitter } from './../common/LocalEventEmitter';
import { IOneMsgCallback } from './../common/Net/Network';
import { XLogger } from './../common/Logger';
import HashMap  from 'hashmap';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IClientNetworkDelegate, ClientNetwork } from './ClientNetwork';
import { IClientModule } from './IClientModule';
import { BaseDataModule } from './BaseDataModule';
import { MatchModule } from './MatchModule';
export class RobotClient extends LocalEventEmitter implements IClientNetworkDelegate
{
    protected mModules : HashMap<string,IClientModule> = new HashMap<string,IClientModule>();
    protected mNet : ClientNetwork = null ;
    // self function ; 
    init( account : string  , svrIP : string )
    {
        this.mNet = new ClientNetwork() ;
        this.mNet.init( svrIP, this ) ;
        this.installModule();
        (this.getModule( LoginModule.MODULE_NAME ) as LoginModule ).setAccount(account) ;
    }

    protected installModule()
    {
        this.registerModule(new LoginModule() ) ;
        this.registerModule( new BaseDataModule() ) ;
        this.registerModule( new MatchModule() ) ;
        this.registerModule( new MJDeskModuleSH() ) ;
    }

    protected registerModule( pModule : IClientModule )
    {
        let m = this.mModules.get( pModule.getModuleName() ) ;
        if ( m != null )
        {
            XLogger.warn( "already register module = " + pModule.getModuleName() ) ;
            return ;
        }
        this.mModules.set(pModule.getModuleName(), pModule ) ;
        pModule.init(this) ;
    }

    getBaseData() : PlayerBaseData
    {
        return ( this.getModule( BaseDataModule.MODULE_NAME ) as BaseDataModule ).mData ;
    }

    get uid () : number
    {
        return this.getBaseData().uid ;
    }

    sendMsg( msgID : eMsgType , msg : Object , dstPort : eMsgPort, dstID : number , lpCallBack? : IOneMsgCallback ) : boolean
    {
        XLogger.debug( "send msg :  " + eMsgType[msgID] + " detail = " + JSON.stringify(msg) ) ;
        return this.mNet.sendMsg(msgID, msg, dstPort, dstID, lpCallBack ) ;
    }

    getModule( moduleName : string ) : IClientModule
    {
        return this.mModules.get(moduleName) ;
    }

    // IClientNetworkDelegate
    onConnectResult( isOK : boolean ) : void 
    {
        let v = this.mModules.values() ;
        for ( let m of v )
        {
            m.onConnectResult(isOK) ;
        }
    }

    onDisconnected() : void 
    {
        let v = this.mModules.values() ;
        for ( let m of v )
        {
            m.onDisconnected();
        }
    }

    onReconectedResult( isOk : boolean ) : void 
    {
        let v = this.mModules.values() ;
        for ( let m of v )
        {
            m.onReconectedResult(isOk) ;
        }
    }

    onLogicMsg( msgID : eMsgType , msg : Object ) : boolean 
    {
        let v = this.mModules.values() ;
        for ( let m of v )
        {
            if ( m.onLogicMsg(msgID, msg) )
            {
                return true ;
            }
        }
        XLogger.warn( "msg not processed = " + eMsgType[msgID] ) ;
        return false ;
    }
}