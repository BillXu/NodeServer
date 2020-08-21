import { XLogger } from './../common/Logger';
import { eRpcFuncID } from './../common/Rpc/RpcFuncID';
import { eMsgPort, eMsgType } from './../shared/MessageIdentifer';
import { IServerApp } from './../common/IServerApp';
import { createServer, IncomingMessage, ServerResponse } from 'http';
export class PlatformGate extends IServerApp
{
    protected mQuerySvrInfoRep : ServerResponse = null ;
    init( jsCfg : Object )
    {
        super.init(jsCfg) ;     
        createServer(this.onHttpRequest.bind(this)).listen(jsCfg["port"]||80 ) ;
    }

    getLocalPortType() : eMsgPort 
    {
        return eMsgPort.ID_MSG_PORT_PLATFORM ;
    }

    onHttpRequest(req: IncomingMessage, res: ServerResponse )
    {
        let rawData = "";
        req.on("data",(chunk)=>{
            rawData += chunk;
            console.log( "recived chunck = " + chunk ) ;
        });

        let self = this ;
        req.on("end",()=>{
            console.log("请求数据是：",rawData);
            XLogger.debug( "请求数据是：" + rawData + " ip: " + req.url ) ;
            let jsret = null ;
            try
            {
                jsret = JSON.parse(rawData) ;
            }
            catch (error)  
            {
                res.write( "{ ret : 300 , error : \"format error \" }" ) ;
                res.end();
            }

            if ( jsret == null )
            {
                return ;
            }
            let cmd = jsret["cmd"] ;
            let arg = jsret["arg"] ;
            let targetID = jsret["targetID"] ;
            let port = jsret["port"] ;
            if ( cmd <= eRpcFuncID.HttpBegin || cmd >= eRpcFuncID.HttpEnd )
            {
                res.write( " { ret : 200 } ") ;
                return ;
            }
            self.onReqCmd( cmd,targetID, port,arg ,res) ;
        });
    }

    onReqCmd( cmd : eRpcFuncID , targetID : number, port : eMsgPort  ,arg : Object , res: ServerResponse )
    {
        if ( port == null )
        {
            XLogger.error( "port can not be null " ) ;
            res.end( "{ ret : 400 }" ) ;
            return ;
        }

        XLogger.debug( "recieved http cmd = " + eRpcFuncID[cmd] + " port = " + eMsgPort[port] + " detail = " + JSON.stringify(arg) ) ;
        if ( eRpcFuncID.Http_ReqCenterSvrInfo == cmd )
        {
            if ( this.mQuerySvrInfoRep != null )
            {
                res.write( JSON.stringify({ ret : 1 , error : "already have a a request , please try later "} )) ; 
                res.end() ;
                XLogger.debug( "already have a a request , please try later  Http_ReqCenterSvrInfo " ) ;
                return ;
            }
            this.mNet.sendMsg( eMsgType.MSG_REQ_SVR_GROUP_INFO, {} ) ;
            return ;
        }

        // must invoker res.end();
        this.getRpc().invokeRpc(port, targetID, cmd, arg, ( result : Object )=>{ 
            let str = JSON.stringify(result||{}) ;
            res.write( JSON.stringify(str)) ; 
            res.end() ; 
            XLogger.debug( `respone cmd = ${ eRpcFuncID[cmd] } , detail = ${str} ` ) ;
        } );
    }

    onMsg( msgID : eMsgType , msg : Object ) : void 
    {
        if ( eMsgType.MSG_REQ_SVR_GROUP_INFO == msgID )
        {
            let str = JSON.stringify(msg||{}) ;
            this.mQuerySvrInfoRep.write( str ) ; 
            this.mQuerySvrInfoRep.end() ; 
            this.mQuerySvrInfoRep = null ;
            XLogger.debug( "respone query svrInfo : " + str ) ;
            return ;
        }
        super.onMsg(msgID, msg) ;
    }
}
