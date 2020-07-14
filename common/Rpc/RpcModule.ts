import { IServerApp } from './../IServerApp';
import { XLogger } from './../Logger';
import  HashMap  from 'hashmap';
import { IModule } from './../IModule';
import { eMsgPort, eMsgType } from './../../shared/MessageIdentifer';
import { eRpcFuncID } from './RpcFuncID';
export class RPCRequest
{
    sieralNum : number = 0 ;
    uniqueTag : any = 0 ;
    targetPort : eMsgPort = eMsgPort.ID_MSG_PORT_MAX ;
    targetID : number = 0 ;
    funcID : eRpcFuncID = eRpcFuncID.Func_Max ;
    arg : Object = null;
    jsUserData : any = null ;
    resultCallBack : IRPCResultFunc = null ;
    nextRetryTime : number = 0 ;
    retryedTimes : number = 1 ;
}

export class RpcDelayRespRequest
{
    sieralNum : number = 0 ;
    targetPort : eMsgPort = eMsgPort.ID_MSG_PORT_MAX ;
    targetID : number = 0 ;
}

export interface IRPCFunc
{
    ( reqSieralNum : number , reqArg : Object ) : Object ;  // return null , means delay respone 
}

export interface IRPCResultFunc
{
    ( result : Object , sieralNum? : number ,jsUserData? : any ) : void ; 
}

export class RpcModule extends IModule
{
    protected mSendingRequests : HashMap<number,RPCRequest> = new HashMap<number,RPCRequest>() ;
    protected mDelayRespRequest : HashMap<number,RpcDelayRespRequest> = null ;
    protected mRPCFuncs : HashMap<eRpcFuncID,IRPCFunc> = new HashMap<eRpcFuncID,IRPCFunc>();
    protected mMaxSierlNum : number = -1 ;
    protected mRetryTimer : NodeJS.Timeout = null ;

    static TIME_RETRY : number = 8000 ;
    static MODULE_NAME : string = "RpcModule";

    getModuleType() : string
    {
        return RpcModule.MODULE_NAME ;
    }

    registerRPC( rpcFuncID : eRpcFuncID , rpcFunc : IRPCFunc ) : boolean 
    {
        if ( this.mRPCFuncs.has(rpcFuncID) )
        {
            XLogger.debug( "already have rpc func id = " + rpcFuncID + " can not register twice"  ) ;
            return false ;
        }
        this.mRPCFuncs.set( rpcFuncID, rpcFunc ) ;
        return true ;
    }

    invokeRpc( targetPort : eMsgPort , targetID : number , funcID : eRpcFuncID, arg : Object , lpCallBack? : IRPCResultFunc , jsUserData? : any , uniqueTag? : any ) : number
    {
        if ( uniqueTag != null )
        {
            let reqs = this.mSendingRequests.values();
            for ( let v of reqs )
            {
                if ( v.uniqueTag === uniqueTag )
                {
                    XLogger.warn( "already send unique id reuquest can not send again = " + uniqueTag ) ;
                    return 0;
                }
            }
        }

        let req = new RPCRequest();
        req.arg = arg ;
        req.funcID = funcID ;
        req.jsUserData = jsUserData ;
        req.sieralNum = this.generateSieralNum() ;
        req.targetID = targetID ;
        req.targetPort = targetPort;
        req.uniqueTag = uniqueTag ;
        req.resultCallBack = lpCallBack ;
        req.nextRetryTime = Date.now() + RpcModule.TIME_RETRY ;
        req.retryedTimes = 1 ;
        this.mSendingRequests.set(req.sieralNum, req ) ;

        let jsMsg = {} ;
        jsMsg["sieralNum"] = req.sieralNum;
        jsMsg["funcID"] = req.funcID ;
        jsMsg["arg"] = req.arg ;
        this.sendMsg( eMsgType.MSG_RPC_REQUEST, jsMsg, targetPort, targetID, this.getSvrApp().getCurSvrIdx() ) ;

        XLogger.debug( "add a rpc request cur cnt = " + this.mSendingRequests.count() ) ;
        return req.sieralNum ;
    }

    pushDelayResult( sieralNum : number , result : Object  )
    {
        let dr = this.mDelayRespRequest.get( sieralNum ) ;
        if ( null == dr )
        {
            XLogger.error( "why delay request object is null ? sieral = " + sieralNum + " result = " + ( null == result ? " null " : JSON.stringify( result ) ) ) ;
            return ;
        }

        let jsBack = {} ;
        jsBack["sieralNum"] = sieralNum ;
        jsBack["state"] = 0 ;
        jsBack["result"] = result;
        this.sendMsg(eMsgType.MSG_RPC_RESULT, jsBack, dr.targetPort, dr.targetID, this.getSvrApp().getCurSvrIdx() ) ;
    }

    canncelRpc( sieralNum : number )
    {
        if ( this.mSendingRequests.has( sieralNum ) )
        {
            this.mSendingRequests.delete( sieralNum ) ;
            return ;
        }

        XLogger.debug( "request sieralNum = " + sieralNum + " do not exsit"  ) ;
    }

    retry()
    {
        let reqs = this.mSendingRequests.values();
        let now = Date.now();
        let vWillDelete = [] ;
        for ( let v of reqs )
        {
            if ( v.nextRetryTime <= now )
            {
                if ( v.retryedTimes > 3 && reqs.length > 8000 )
                {
                    vWillDelete.push(v.sieralNum) ;
                    XLogger.error( " 8000 > sieral id = " + v.sieralNum + "funcID = " + v.funcID + " arg = " + ( v.arg == null ? "null" : JSON.stringify(v.arg ) ) ) ;
                    continue ;
                }

                if ( v.retryedTimes > 6 && reqs.length > 3000 )
                {
                    vWillDelete.push(v.sieralNum) ;
                    XLogger.error( " 3000 > sieral id = " + v.sieralNum + "funcID = " + v.funcID + " arg = " + ( v.arg == null ? "null" : JSON.stringify(v.arg ) ) ) ;
                    continue ;
                }

                if ( v.retryedTimes > 9 && reqs.length > 1000 )
                {
                    vWillDelete.push(v.sieralNum) ;
                    XLogger.error( " 3000 > sieral id = " + v.sieralNum + "funcID = " + v.funcID + " arg = " + ( v.arg == null ? "null" : JSON.stringify(v.arg ) ) ) ;
                    continue ;
                }

                if ( v.retryedTimes > 15 )
                {
                    vWillDelete.push(v.sieralNum) ;
                    XLogger.error( " 40 > sieral id = " + v.sieralNum + "funcID = " + v.funcID + " arg = " + ( v.arg == null ? "null" : JSON.stringify(v.arg ) ) ) ;
                    continue ;
                }

                ++v.retryedTimes;
                v.nextRetryTime = now + RpcModule.TIME_RETRY * v.retryedTimes ;
                // do retry ;
                let jsMsg = {} ;
                jsMsg["sieralNum"] = v.sieralNum;
                jsMsg["funcID"] = v.funcID ;
                jsMsg["arg"] = v.arg ;
                this.sendMsg( eMsgType.MSG_RPC_REQUEST, jsMsg, v.targetPort, v.targetID, this.getSvrApp().getCurSvrIdx() ) ;
                XLogger.debug( "retry request sieral num = " + v.sieralNum + " funcID = " + v.funcID + " req cnt = " + reqs.length ) ;
            }
        }

        for ( let d of vWillDelete )
        {
            this.mSendingRequests.delete(d) ;
        }
        XLogger.debug( "sending request for rpc cnt = " + this.mSendingRequests.count() ) ;
    }

    protected generateSieralNum() : number
    {
        if ( this.mMaxSierlNum == -1 )
        {
            this.mMaxSierlNum = this.getSvrApp().getCurSvrIdx();
            XLogger.error( "why not OnRegister to center callback not invoke ?" ) ;
        }
        let port = this.getSvrApp().getLocalPortType();
        let max = this.getSvrApp().getCurPortMaxCnt();
        this.mMaxSierlNum += max ;
        return port + 100 * this.mMaxSierlNum ;
    }

    // iModule 
    onRegisterToSvrApp(svrApp : IServerApp )
    {
        super.onRegisterToSvrApp(svrApp) ;
        this.mRetryTimer = setInterval( this.retry.bind(this),5000 ) ;
    }

    onDisconnected() : void 
    {
        this.mSendingRequests.clear();
        this.mDelayRespRequest.clear();
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort ) : boolean 
    {
        if ( eMsgType.MSG_RPC_REQUEST == msgID )
        {
            // sieralNum : 23455 , funcID : eRpcFuncID, arg : {}
            let funcID = msg["funcID"] ;
            let sieralNum = msg["sieralNum"] ;
            let func = this.mRPCFuncs.get( funcID ) ;
            if ( func == null )
            {
                XLogger.error( "svr do not have funcID = " + funcID + "request from port = " + orgPort + " id = " + orgID ) ;
                let jsBack = {} ;
                jsBack["sieralNum"] = sieralNum ;
                jsBack["state"] = 2 ;
                jsBack["errMsg"] = "do not have func id = " + funcID;
                this.sendMsg(eMsgType.MSG_RPC_RESULT, jsBack, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
                return true;
            }

            if ( this.mDelayRespRequest.has( sieralNum ) )
            {
                XLogger.warn( "already put in delay respone sieral = " + sieralNum ) ;
                return true ;
            }

            let result = func(sieralNum,msg["arg"] ) ;
            if ( null == result )
            {
                let jsBack = {} ;
                jsBack["sieralNum"] = sieralNum ;
                jsBack["state"] = 1 ;
                this.sendMsg(eMsgType.MSG_RPC_RESULT, jsBack, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;

                let dr = new RpcDelayRespRequest();
                dr.sieralNum = sieralNum ;
                dr.targetID = orgID ;
                dr.targetPort = orgPort ;
                this.mDelayRespRequest.set(sieralNum , dr ) ;
            }
            else
            {
                let jsBack = {} ;
                jsBack["sieralNum"] = sieralNum ;
                jsBack["state"] = 0 ;
                jsBack["result"] = result;
                this.sendMsg(eMsgType.MSG_RPC_RESULT, jsBack, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
            }
            return true ;
        }
        else if ( eMsgType.MSG_RPC_RESULT == msgID )
        {
            let sieralNum = msg["sieralNum"] ;
            let state = msg["state"] ;
            let req = this.mSendingRequests.get( sieralNum ) ;
            if ( req == null )
            {
                XLogger.warn( "request not exit , so can not process result sieral = " + sieralNum + "state = " + state ) ;
                if ( 0 == state && msg["result"] != null )
                {
                    XLogger.warn( "request not exit , so can not process result sieral = " + sieralNum + "result = " + JSON.stringify(msg["result"] ) ) ;
                }
                return true;
            }

            // state : 0 , success , 1 delay respone , 2 error ;
            switch ( state )
            {
                case 0: 
                {
                    if ( req.resultCallBack != null )
                    {
                        req.resultCallBack(msg["result"],sieralNum,req.jsUserData );
                    }
                    this.mSendingRequests.delete( sieralNum ) ;
                }
                break ;
                case 1: 
                {
                    req.nextRetryTime = Date.now() + RpcModule.TIME_RETRY * 2 ;
                }
                break ;
                case 2: 
                {
                    XLogger.error( "rpc request sierl = " + sieralNum + " funcid = " + req.funcID + " error : " + msg["errMsg"] ) ;
                    this.mSendingRequests.delete( sieralNum ) ;
                }
                break ;
            }
            return true ;
        }
        return false ;
    }

    onRegistedToCenter( svrIdx : number , svrMaxCnt : number )
    {
        super.onRegistedToCenter(svrIdx, svrMaxCnt) ;

        if ( this.mMaxSierlNum == -1 )
        {
            this.mMaxSierlNum = svrIdx ;
        }
        else
        {
            this.mMaxSierlNum -= this.mMaxSierlNum % svrMaxCnt ;
            this.mMaxSierlNum += svrMaxCnt ;
            this.mMaxSierlNum += svrIdx ; 
        } 
    }
 }