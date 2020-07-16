import { key } from './../shared/KeyDefine';
import { ePlayerNetState } from './../common/commonDefine';
import { eRpcFuncID } from './../common/Rpc/RpcFuncID';
import { IServerNetworkDelegate, ServerNetwork } from './../common/Net/ServerNetwork';
import { IServerApp } from './../common/IServerApp';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { XLogger } from './../common/Logger';
import { Network } from './../common/Net/Network';
import HashMap from "hashmap"

export class GateSvr extends IServerApp implements IServerNetworkDelegate
{
    protected mNetForClients : ServerNetwork = null ;
    protected mPort : number = 0 ;
    protected mSessionIDmapUID = new HashMap<number,number>();
    // iserver
    init( jsCfg : Object )
    {
        super.init(jsCfg) ;
        this.mPort = jsCfg["port"] ;

        let self = this ;
        this.getRpc().registerRPC(eRpcFuncID.Func_OtherLogin, ( reqSieralNum : number , reqArg : Object )=>{
            let sessionID = reqArg["sessionID"] ;
            let uid = reqArg["uid"] ;
            let mapUID = self.mSessionIDmapUID.get(sessionID) ;
            if ( mapUID == null )
            {
                XLogger.error( "we don't have session id , why other login uid = " + uid + " session id = " + sessionID ) ;
                return {} ;
            } 

            if ( uid != mapUID )
            {
                XLogger.error( "uid not the same , how to other login ? uid = " + uid + " map uid = " + mapUID ) ;
                return {} ;
            }

            XLogger.debug( "other login do close session = " + sessionID ) ;
            self.mSessionIDmapUID.delete(uid) ;
            self.mNetForClients.closeSession(sessionID) ;
            return {} ;
        })
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
        let isNeed = this.mSessionIDmapUID.has(nSessionID) ; 
        XLogger.debug( "sessionID =  " + nSessionID + ( isNeed ? " need wait reconnect" : " do not need wait reconnect" ) ) ;
        return isNeed ;
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
        arg[key.account] = jsRegInfo[key.account] ;
        arg[key.nickeName] = jsRegInfo[key.nickeName] ;
        arg[key.headIcon] = jsRegInfo[key.headIcon] ;
        arg[key.type] = jsRegInfo[key.type] ;
        arg[key.sex] = jsRegInfo[key.sex] ;
        arg[key.ip] = this.mNetForClients.getSessionIP( nSessionID ) ;
        let self = this ;
        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DB , Math.ceil( Math.random() * 1000 )  % 1000, eRpcFuncID.Func_Register, arg,( result : Object )=>{
            let ret = result[key.ret] ;
            XLogger.debug( "session id = " + nSessionID + " registert " + ( ret == 0 ? "success" : "failed" )  ) ;
            jsRegInfo["ret"] = ret ;
            delete jsRegInfo[key.nickeName] ; delete jsRegInfo[key.headIcon] ;
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
            let sate = result[key.state] ;
            XLogger.debug( "session id = " + nSessionID + " login " + ( ret == 0 && sate == 0 ? "success" : "failed" + "ret = " + ret )  ) ;
            if ( 0 != ret )
            {
                self.mNetForClients.sendMsg(nSessionID, eMsgType.MSG_PLAYER_LOGIN, { ret : ret , state : sate } ) ;
                return ;
            }
            
            if ( 0 == ret )
            {
                let lastUID = self.mSessionIDmapUID.get( nSessionID ); 
                if ( lastUID != null )
                {
                    if ( lastUID == result["uid"] )
                    {
                        XLogger.warn( "session id already bind uid , why login twice ? uid = " + result["uid"] + "sessionID" ) ;
                        return ;
                    }
                    else
                    {
                        XLogger.debug( "same connection , change other account , then disconnect pre account last uid = " + lastUID + " curUID = " + result["uid"] ) ;
                        let darg = {} ;
                        darg["uid"] = lastUID;
                        darg["state"] = ePlayerNetState.eState_Disconnected ;
                        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DATA, lastUID , eRpcFuncID.Func_InformPlayerNetState, darg ) ;
                    }
                }

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

