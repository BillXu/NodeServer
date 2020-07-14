import { IServerApp, IFuncMsgCallBack } from './IServerApp';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
export abstract class IModule
{
    protected mSvrApp : IServerApp = null ;

    onRegisterToSvrApp( svrApp : IServerApp ) : void 
    {
        this.mSvrApp = svrApp ;
    }

    abstract getModuleType() : string ;

    getSvrApp() : IServerApp 
    {
        return this.mSvrApp ;
    }

    onDisconnected() : void {}
    onOtherServerDisconnect( port : eMsgPort , idx : number, maxCnt : number ) : void {}
    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort ) : boolean 
    {
        return false ;
    }

    onRegistedToCenter( svrIdx : number , svrMaxCnt : number ) : void {}

    sendMsg( msgID : number , msg : Object , dstPort : eMsgPort, dstID : number , orgID : number, lpfCallBack? : IFuncMsgCallBack  ) : void 
    {
        this.getSvrApp().sendMsg(msgID, msg, dstPort, dstID, orgID,lpfCallBack ) ;
    }
}