import { SVR_ARG } from './ServerDefine';
import { eNotifyPlatformCmd } from './MgrPlatformCmd';
import { eRpcFuncID } from './Rpc/RpcFuncID';
import { IServerApp, IFuncMsgCallBack } from './IServerApp';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { RequestCallback } from 'request';
export abstract class IModule
{
    protected mSvrApp : IServerApp = null ;
    protected mMaxUniqueID : number = 0 ;
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
    abstract onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort, targetID : number ) : boolean ;

    onRegistedToCenter( svrIdx : number , svrMaxCnt : number ) : void {}
    onRpcCall( funcID : eRpcFuncID , arg : Object , sieral : number , outResult : Object ) : boolean
    {
        return false ;
    }

    sendMsg( msgID : number , msg : Object , dstPort : eMsgPort, dstID : number , orgID : number, lpfCallBack? : IFuncMsgCallBack  ) : void 
    {
        this.getSvrApp().sendMsg(msgID, msg, dstPort, dstID, orgID,lpfCallBack ) ;
    }

    sendHttpRequest( cmd : eNotifyPlatformCmd , arg : Object ,callBack? : RequestCallback , url : string = SVR_ARG.notifyUrl )
    {
        this.getSvrApp().sendHttpRequest(cmd, arg,callBack,url) ;
    }

    generateUniqueID() : number 
    {
        if ( this.mMaxUniqueID == 0 )
        {
            this.mMaxUniqueID = this.getSvrApp().getCurSvrIdx();
        }

        this.mMaxUniqueID += this.getSvrApp().getCurPortMaxCnt();
        return this.mMaxUniqueID ;
    }
}