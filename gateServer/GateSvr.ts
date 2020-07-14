import { ePlayerNetState } from './../common/commonDefine';
import { eRpcFuncID } from './../common/Rpc/RpcFuncID';
import { IServerNetworkDelegate, ServerNetwork } from './../common/Net/ServerNetwork';
import { IServerApp } from './../common/IServerApp';
import { TestPwd } from './TestPwd';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { XLogger } from './../common/Logger';
import { Network, INetworkDelegate } from './../common/Net/Network';
import HashMap from "hashmap"
export class TestClientNet implements INetworkDelegate
{
    mNet : Network = null ;
    mSendmsgTimer : NodeJS.Timeout = null ;
    mT : HashMap<number,string> = new HashMap<number,string>() ;
    mc : TestPwd = new TestPwd(); ;
    init()
    {
        this.mc.printC();

        this.mNet = new Network();
        this.mNet.connect("ws://localhost:3000" ) ;
        this.mNet.setDelegate(this) ;

        this.mT.set(1, "hello" ) ;
        this.mT.set(3, "hello 2222" ) ;
        this.mT.forEach( ( value , key )=>{
            XLogger.debug( "value = " + value + "  key out = " + key + " type = " + typeof key )  ;
        } );

        let tp = this.mT.get(10) ;
        let hk = this.mT.has(10) ;
        if ( tp == null )
        {
            XLogger.debug( "key with 10 is null : " + hk  ) ;
        }
        //XLogger.debug( "value is = " + this.mT[1] + "  " + this.mT["1"] ) ;
    }

    onVerifyResult( isOk : boolean ) : void
    {
        XLogger.debug( "connect verify result :  " + ( isOk ? "ok" : "failed") ) ;
        if ( false == isOk )
        {
            {
                clearTimeout( this.mSendmsgTimer ) ;
            }
        }
    }

    onConnectResult( isOK : boolean ) : void 
    {
        XLogger.debug( "onConnectResult result :  " + ( isOK ? "ok" : "failed") ) ;
        if ( isOK )
        {
            let self = this ;
            let js = { a : "this is a test mesg" } ;
            this.mSendmsgTimer = setInterval( ()=>{ self.mNet.sendMsg(12,js)}, 5000 ) ;
        }
        else
        {
            clearTimeout( this.mSendmsgTimer ) ;
        }
    }

    onDisconnected() : void 
    {
        XLogger.debug( "disconencted " ) ;
    }

    onMsg( msgID : eMsgType , msg : Object ) : void 
    {
       XLogger.debug( "recieved msg : " + msg ) ; 
    }

    onReconectedResult( isOk : boolean ) : void 
    {
        XLogger.debug( "onReconectedResult result :  " + ( isOk ? "ok" : "failed") ) ;

        if ( isOk )
        {
            let self = this ;
            let js = { a : "onReconectedResult this is a test mesg" } ;
            this.mSendmsgTimer = setInterval( ()=>{ self.mNet.sendMsg(12,js)}, 5000 ) ;
        }
        else
        {
            clearTimeout( this.mSendmsgTimer ) ;
        }
    }
}


///-------use full
class GateSvr extends IServerApp implements IServerNetworkDelegate
{
    protected mNetForClients : ServerNetwork = null ;
    protected mPort : number = 0 ;
    protected mSessionIDmapUID = new HashMap<number,number>();
    // iserver
    init( jsCfg : Object )
    {
        super.init(jsCfg) ;
        this.mPort = jsCfg["port"] ;
    }

    onRegistedToCenter( svrIdx : number , svrMaxCnt : number )
    {
        super.onRegistedToCenter( svrIdx, svrMaxCnt ) ;
        if ( null == this.mNetForClients )
        {
            this.mNetForClients = new ServerNetwork() ;
            this.mNetForClients.setup(this.mPort, this , this.generateSessionID.bind(this) ) ;
        }
    }

    onMsg( msgID : eMsgType , msg : Object ) : void
    {
        if ( msgID == eMsgType.MSG_TRANSER_DATA )
        {
            let targetID = msg["dstID"] ; // means session ID ;
            let dstPort = msg["dstPort"] ;
            if ( dstPort == eMsgPort.ID_MSG_PORT_CLIENT )
            {
                if ( false == this.mNetForClients.sendMsg(targetID, msgID, msg ) )
                {
                    XLogger.debug( "session id = " + targetID + " player not in this gate , or disconnected msg =  " + JSON.stringify(msg)  ) ;
                    // inform data svr , this player disconnect ;
                    XLogger.warn( "player disconnected , why not tell data svr sessionID = " + targetID ) ;
                }
                return ;
            }
        }

        super.onMsg(msgID, msg ) ;
    }

    getLocalPortType() : eMsgPort
    {
        return eMsgPort.ID_MSG_PORT_GATE ;
    }

    // server network delegate
    secondsForWaitReconnect() : number 
    {
        return 60*5 ;
    }

    cacheMsgCntWhenWaitingReconnect() : number 
    {
        return 0 ;
    }

    isPeerNeedWaitReconnected( nSessionID : number ) : boolean 
    {
        return true ;
    }

    onPeerConnected( nSessionID : number, ip : string ) : void 
    {

    }

    onPeerReconnected( nSessionID : number, ip : string, fromSessionID : number ) : void 
    {
        let playerID = this.getUidBySessionID(nSessionID) ;
        if ( -1 == playerID )
        {
            XLogger.debug( "player not login so need not inform reconnected session = " + nSessionID ) ;
            return ;
        }

        let arg = {} ;
        arg["uid"] = playerID;
        arg["state"] = ePlayerNetState.eState_Online ;
        arg["ip"] = ip;
        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DATA, playerID , eRpcFuncID.Func_InformPlayerNetState, arg ) ;
    }

    onPeerWaitingReconect( nSessionID : number ) : void 
    {
        let playerID = this.getUidBySessionID(nSessionID) ;
        if ( -1 == playerID )
        {
            XLogger.debug( "player not login so need not inform waiting reconnect session = " + nSessionID ) ;
            return ;
        }
        let arg = {} ;
        arg["uid"] = playerID;
        arg["state"] = ePlayerNetState.eState_WaitingReconnect ;
        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DATA, playerID , eRpcFuncID.Func_InformPlayerNetState, arg ) ;
    }

    onPeerDisconnected( nSessionID : number ) : void 
    {
        let playerID = this.getUidBySessionID(nSessionID) ;
        if ( -1 == playerID )
        {
            XLogger.debug( "player not login so need not inform disconnect session = " + nSessionID ) ;
            return ;
        }

        let arg = {} ;
        arg["uid"] = playerID;
        arg["state"] = ePlayerNetState.eState_Disconnected ;
        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DATA, playerID , eRpcFuncID.Func_InformPlayerNetState, arg ) ;
        
        this.mSessionIDmapUID.delete( nSessionID ) ;
    }

    onPeerMsg( nSessionID : number , msgID : eMsgType , jsMsg : Object) : void 
    {
        if ( msgID == eMsgType.MSG_PLAYER_REGISTER )
        {
            this.doPlayerRegister(nSessionID, jsMsg ) ;
        }
        else if ( eMsgType.MSG_PLAYER_LOGIN == msgID )
        {
            this.doPlayerLogin( nSessionID, jsMsg["account"], jsMsg["type"] ) ;
        }
        else if ( eMsgType.MSG_TRANSER_DATA == msgID )
        {
            let realMsg = jsMsg["msg"] ;
            let realMsgID = realMsg[Network.MSG_ID] ;
            if ( realMsgID == eMsgType.MSG_PLAYER_REGISTER )
            {
                this.doPlayerRegister(nSessionID,realMsg ) ;
            }
            else if ( eMsgType.MSG_PLAYER_LOGIN == realMsgID )
            {
                this.doPlayerLogin( nSessionID, jsMsg["account"], jsMsg["type"] ) ;
            }
            else
            {
                this.mNet.sendMsg(msgID,jsMsg );
            }
        }
        else
        {
            XLogger.warn( "unknown msg from client msgId = " + msgID + " session id = " + nSessionID ) ;
        }
    }

    // self function
    protected getUidBySessionID( nSessionID : number ) : number
    {
        let uid = this.mSessionIDmapUID.get( nSessionID ) ;
        if ( uid == null )
        {
            return -1 ;
        }
        return uid ;
    }

    protected generateSessionID( curMaxSessionID : number ) : number
    {
        if ( curMaxSessionID < this.getCurPortMaxCnt() )
        {
            curMaxSessionID = this.getCurPortMaxCnt() + this.getCurSvrIdx();
        }

        return curMaxSessionID + this.getCurPortMaxCnt();
    }

    protected doPlayerRegister( nSessionID : number , jsRegInfo : Object )
    {
        let arg = {} ;
        arg["account"] = jsRegInfo["account"] ;
        arg["nickeName"] = jsRegInfo["nickeName"] ;
        arg["headIconUrl"] = jsRegInfo["headIconUrl"] ;
        arg["type"] = jsRegInfo["type"] ;
        arg["sex"] = jsRegInfo["sex"] ;
        arg["ip"] = this.mNetForClients.getSessionIP( nSessionID ) ;
        let self = this ;
        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DB , Math.ceil( Math.random() * 1000 )  % 1000, eRpcFuncID.Func_Register, arg,( result : Object )=>{
            let ret = result["ret"] ;
            XLogger.debug( "session id = " + nSessionID + " registert " + ( ret == 0 ? "success" : "failed" )  ) ;
            jsRegInfo["ret"] = ret ;
            delete jsRegInfo["nickeName"] ; delete jsRegInfo["headIconUrl"] ;
            self.mNetForClients.sendMsg(nSessionID, eMsgType.MSG_PLAYER_REGISTER, jsRegInfo ) ;
            // if ( 0 == ret )
            // {
            //     self.mSessionIDmapUID.set( nSessionID, result["uid"] ) ;
            //     return ;
            // }
        } ) ;
    }

    protected doPlayerLogin( nSessionID : number , acc : string ,accType : number )
    {
        let arg = {} ;
        arg["account"] = acc ;
        arg["type"] = accType ;
        let self = this ;
        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DB , Math.ceil( Math.random() * 1000 )  % 1000, eRpcFuncID.Func_Login, arg,( result : Object )=>{
            let ret = result["ret"] ;
            XLogger.debug( "session id = " + nSessionID + " login " + ( ret == 0 ? "success" : "failed" )  ) ;
            if ( 0 != ret )
            {
                self.mNetForClients.sendMsg(nSessionID, eMsgType.MSG_PLAYER_REGISTER, { ret : ret } ) ;
                return ;
            }
            
            if ( 0 == ret )
            {
                self.mSessionIDmapUID.set( nSessionID, result["uid"] ) ;
                let argLogin = {} ;
                argLogin["sessionID"] = nSessionID ;
                argLogin["uid"] = result["uid"];
                argLogin["ip"] = self.mNetForClients.getSessionIP( nSessionID ) ;
                self.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DATA, result["uid"], eRpcFuncID.Func_DoLogin, argLogin );
                return ;
            }
        } ) ;
    }
}
