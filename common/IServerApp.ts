import { eNotifyPlatformCmd } from './MgrPlatformCmd';
import { SVR_ARG } from './ServerDefine';
import { eRpcFuncID } from './Rpc/RpcFuncID';
import { IModule } from './IModule';
import  HashMap  from 'hashmap';
import { XLogger } from './Logger';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { Network, INetworkDelegate } from './Net/Network';
import { RpcModule } from './Rpc/RpcModule';
import { IServer } from './Application';
import request, { RequestCallback } from 'request';

export interface IFuncMsgCallBack
{
    // return true means , processed this message , and will remove this callback ;
    (msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort , opts : { canOtherProcess : boolean }  ) : boolean ;
}

export abstract class IServerApp implements INetworkDelegate , IServer
{
    protected mNet : Network = null ;
    protected mCurSvrIdx : number = 0 ;
    protected mCurSvrPortMaxCnt : number = 0 ;
    protected mCallBacks : HashMap<number,Array<IFuncMsgCallBack> > = new HashMap<number,Array<IFuncMsgCallBack> >();
    protected mModules : Array<IModule> = new Array<IModule>();
    init( jsCfg : Object )
    {
        this.mNet = new Network();
        this.mNet.setDelegate(this) ;
        this.mNet.connect( jsCfg["centerIP"] ) ;
        this.mCallBacks.clear();
        XLogger.info( "connecting to center ip = " + jsCfg["centerIP"] ) ;
        this.registerModule( new RpcModule() ) ;
    }

    getRpc() : RpcModule
    {
        return this.getModule(RpcModule.MODULE_NAME) as RpcModule ;
    }

    onRpcCall( funcID : eRpcFuncID , arg : Object , sieral : number , outResult : Object ) : boolean
    {
        for ( let v of this.mModules )
        {
            if ( v.onRpcCall(funcID, arg, sieral, outResult) )
            {
                return true ;
            }
        }
        return false ;
    }

    // network delegate ;
    onVerifyResult( isOk : boolean ) : void
    {
        XLogger.info( "server verify : " + isOk ? "ok" : "failed" ) ;
    }

    onConnectResult( isOK : boolean ) : void 
    {
        XLogger.info( "server onConnectResult : " + (isOK ? "ok" : "failed") ) ;
        if ( isOK )
        {
            let js = {} ;
            js["port"] = this.getLocalPortType();
            js["suggestIdx"] = this.getCurSvrIdx();
            this.mNet.sendMsg( eMsgType.MSG_REGISTER_SERVER_PORT_TO_CENTER, js ) ;
        }
    }

    onDisconnected() : void 
    {
        XLogger.info( "server disconnect" ) ;
        for ( let v of this.mModules )
        {
            v.onDisconnected();
        }
    }

    onMsg( msgID : eMsgType , msg : Object ) : void 
    {

        if ( msgID == eMsgType.MSG_TRANSER_DATA )
        {
            try {
                XLogger.debug( "recieved msg msgID = " + eMsgType[msg["msg"][Network.MSG_ID]] + " msg : " + JSON.stringify(msg["msg"]||{}) ) ;
                this.onLogicMsg(msg["msg"][Network.MSG_ID], msg["msg"], msg["orgID"], msg["orgPort"],msg["dstID"] ) ;
            } catch (err) {
                XLogger.error( "message : " + err.message ) ;
                XLogger.error( "exception : " + err.stack ) ;
            }
        }
        else if ( msgID == eMsgType.MSG_SERVER_DISCONNECT )
        {
            XLogger.info( "other server disconnect port = " + eMsgPort[msg["port"]] + " idx = " + msg["idx"] + " maxCnt = " + msg["maxCnt"] ) ;
            this.onOtherServerDisconnect(msg["port"], msg["idx"], msg["maxCnt"] ) ;
        }
        else if ( msgID == eMsgType.MSG_REGISTER_SERVER_PORT_TO_CENTER )
        {
            let idx = msg["idx"] ;
            if ( idx == -1 )
            {
                XLogger.warn( "svr port type is full " ) ;
                process.exit(1) ;
            }
    
            let cnt = msg["maxCnt"] ;
            XLogger.info("connected to Center svr idx = " + idx  + " maxCnt = " + cnt ) ; 
            this.mCurSvrIdx = idx ;
            this.mCurSvrPortMaxCnt = cnt ;
            this.onRegistedToCenter( idx , cnt ) ;
        }
    }

    onReconectedResult( isOk : boolean ) : void 
    {
        XLogger.info( "server reconnect : " + isOk ? "ok" : "failed" ) ;
        if ( false == isOk )
        {
            let js = {} ;
            js["port"] = this.getLocalPortType();
            js["suggestIdx"] = this.getCurSvrIdx();
            this.mNet.sendMsg( eMsgType.MSG_REGISTER_SERVER_PORT_TO_CENTER, js ) ;
        }
        else
        {
            this.mCallBacks.clear();
        }
    }

    // self method 
    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort, dstID : number )
    {
        let callBacks = this.mCallBacks.get( msgID ) ;
        if ( callBacks != null && callBacks.length > 0 )
        {
            let opts = { canOtherProcess : false } ;
            let vRemoveFunc = [] ;
            for ( let idx = 0 ; idx < callBacks.length ; ++idx )
            {
                if ( callBacks[idx](msgID,msg,orgID,orgPort,opts ) )
                {
                    if ( opts.canOtherProcess == false )
                    {
                        callBacks.splice( idx,1 ) ;
                        XLogger.debug( "msgID = " + msgID + " reserve callback cnt = " + callBacks.length ) ;
                        return ;
                    }
                    else
                    {
                        vRemoveFunc.push( callBacks[idx] ) ;
                    }                 
                }
            }

            for ( let v of vRemoveFunc )
            {
                callBacks.splice( callBacks.indexOf(v),1 );
            }
            XLogger.debug( "below msgID = " + msgID + " reserve callback cnt = " + callBacks.length ) ;
        }

        for ( let v of this.mModules )
        {
            if ( v.onLogicMsg(msgID, msg, orgID, orgPort,dstID ) )
            {
                return ;
            }
        }

        XLogger.warn( "unprocessed msg id = " + eMsgType[msgID] + " orgPort = " + eMsgPort[orgPort] + " msg = " + JSON.stringify(msg||{}) );
    }

    sendMsg( msgID : number , msg : Object , dstPort : eMsgPort, dstID : number , orgID : number, lpfCallBack? : IFuncMsgCallBack  )
    {
        if ( msg == null )
        {
            msg = {} ;
        }
        msg[Network.MSG_ID] = msgID;

        let jsTransfer = {} ;
        jsTransfer["dstPort"] = dstPort ;
        jsTransfer["dstID"] = dstID ;
        jsTransfer["orgID"] = orgID ;
        jsTransfer["orgPort"] = this.getLocalPortType() ;
        jsTransfer["msg"] = msg ;
        this.mNet.sendMsg(eMsgType.MSG_TRANSER_DATA,jsTransfer ) ;

        XLogger.debug( "send msgID = " + eMsgType[msgID] + " targetPort = " + eMsgPort[dstPort] + " msg = " + JSON.stringify(msg||{} ) ) ;
        if ( lpfCallBack != null )
        {
            let a = this.mCallBacks.get( msgID ) ;
            if ( a == null )
            {
                a = new Array<IFuncMsgCallBack>();
                this.mCallBacks.set( msgID, a ) ;
            }
            a.push( lpfCallBack ) ;
            if ( a.length > 400 )
            {
                XLogger.warn( "why a message cacher so many call back ? msgid = " + msgID ) ;
            }

            if ( a.length > 500 )
            {
                a.shift();
            }
        }
    }

    onOtherServerDisconnect( port : eMsgPort , idx : number, maxCnt : number )
    {
        for ( let v of this.mModules )
        {
            v.onOtherServerDisconnect(port, idx, maxCnt ) ;
        }
    }

    onRegistedToCenter( svrIdx : number , svrMaxCnt : number )
    {
        for ( let v of this.mModules )
        {
            v.onRegistedToCenter(svrIdx, svrMaxCnt) ;
        }
    }

    abstract getLocalPortType() : eMsgPort ;

    getCurSvrIdx() : number
    {
        return this.mCurSvrIdx ;
    }

    getCurPortMaxCnt()
    {
        return this.mCurSvrPortMaxCnt ;
    }

    registerModule( pModule : IModule ) : boolean 
    {
        let strType = pModule.getModuleType();
        for ( let v of this.mModules )
        {
            if ( v.getModuleType() == strType )
            {
                XLogger.warn( "should not register a moudle twice name = " + strType ) ;
                return false ;
            }
        }
        this.mModules.push( pModule ) ;
        pModule.onRegisterToSvrApp(this) ;
        return true ;
    }

    getModule( moudleType : string ) : IModule
    {
        for ( let v of this.mModules )
        {
            if ( moudleType == v.getModuleType() )
            {
                return v ;
            }
        }

        return null ;
    }

    sendHttpRequest( cmd : eNotifyPlatformCmd , arg : Object ,callBack? : RequestCallback , url : string = SVR_ARG.notifyUrl )
    {
        request.post(SVR_ARG.notifyUrl,{ json : { cmd : cmd , data : arg , timeout : 2000 }}, callBack) ;
    }
}