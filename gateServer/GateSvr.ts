import { merge, random } from 'lodash';
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
            self.mSessionIDmapUID.delete(sessionID) ;
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
            XLogger.debug( "setup network accept for clients port = " + this.mPort ) ;
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
                    XLogger.debug( "sessionID = " + targetID + " player not in this gate or disconnected  org msgID = " + eMsgType[msg["msg"][key.msgID]] + " msg = " + JSON.stringify(msg)  ) ;
                    // inform data svr , this player disconnect ;
                    XLogger.warn( "player disconnected , why not tell data svr sessionID = " + targetID ) ;
                }
                return ;
            }
        }
        //XLogger.warn( "unprocess msg from center msgID = " + eMsgType[msgID] + " msg = " + JSON.stringify(msg) ) ;
        super.onMsg(msgID, msg ) ;
    }

    getLocalPortType() : eMsgPort
    {
        return eMsgPort.ID_MSG_PORT_GATE ;
    }

    // server network delegate
    secondsForWaitReconnect() : number 
    {
        return 30 ;
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
        if ( -1 != this.getUidBySessionID(fromSessionID) )
        {
            XLogger.error( "why reconnect from a valid peer sessionid = " + fromSessionID ) ;
        }

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
        arg[key.sessionID] = nSessionID ;
        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DATA, playerID , eRpcFuncID.Func_InformPlayerNetState, arg ) ;
        XLogger.debug("invoke rpc update NetState reconnected ok uid = " + playerID + " sessionID = " + nSessionID + " from sessionID = " + fromSessionID ) ;
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
        arg[key.sessionID] = nSessionID ;
        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DATA, playerID , eRpcFuncID.Func_InformPlayerNetState, arg ) ;
        XLogger.debug( "invoker rpc , tell data svr ,  player enter waiting reconnect sessionID = " + nSessionID  + " uid = " + playerID ) ;
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
        arg[key.sessionID] = nSessionID ;
        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DATA, playerID , eRpcFuncID.Func_InformPlayerNetState, arg ) ;
        
        this.mSessionIDmapUID.delete( nSessionID ) ;
        XLogger.debug( "invoker rpc , tell data svr ,  player disconnect sessionID = " + nSessionID + " uid = " + playerID ) ;
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
                this.doPlayerLogin( nSessionID, realMsg["account"], realMsg["type"] ) ;
            } 
            else if ( eMsgType.MSG_PLAYER_LOGOUT == realMsgID )
            {
                // just as disconnect 
                XLogger.debug("player logout , regart as disconnect . sessionID = " + nSessionID ) ;
                let playerID = this.getUidBySessionID(nSessionID) ;
                
                
                let msgTransfer = {} ;
                msgTransfer[key.msgID] = eMsgType.MSG_TRANSER_DATA ;
                msgTransfer["dstPort"] = eMsgPort.ID_MSG_PORT_CLIENT ;
                msgTransfer["dstID"] = nSessionID ;
                msgTransfer["orgPort"] = eMsgPort.ID_MSG_PORT_GATE ;
                msgTransfer["orgID"] = this.mNet.getSessionID();
                realMsg[key.ret] = 0 ;
                if ( -1 == playerID )
                {
                    key.msgID
                    XLogger.debug( "player logout but target is null sessionID  = " + nSessionID ) ;
                    realMsg[key.ret] = 0 ;
                    msgTransfer["msg"] = realMsg;
                    this.mNetForClients.sendMsg(nSessionID, eMsgType.MSG_TRANSER_DATA, msgTransfer ) ;
                    return ;
                }
                msgTransfer["msg"] = realMsg;
                this.mNetForClients.sendMsg(nSessionID, eMsgType.MSG_TRANSER_DATA, msgTransfer ) ;
                this.onPeerDisconnected(nSessionID);
            }
            else
            {
                jsMsg["orgID"] = nSessionID ;  // the msg from client , orgID always sessionID
                jsMsg["orgPort"] = eMsgPort.ID_MSG_PORT_CLIENT ;
                this.mNet.sendMsg(msgID,jsMsg );
            }
        }
        else if ( eMsgType.MSG_PLAYER_LOGOUT == msgID )
        {
            // just as disconnect 
            XLogger.debug("player logout , regart as disconnect . sessionID = " + nSessionID ) ;
            let playerID = this.getUidBySessionID(nSessionID) ;
            if ( -1 == playerID )
            {
                XLogger.debug( "player logout but target is null sessionID  = " + nSessionID ) ;
                return ;
            }

            this.onPeerDisconnected(nSessionID);
        }
        else
        {
            XLogger.warn( "unknown msg from client msgId = " + eMsgType[msgID] + " sessionID = " + nSessionID ) ;
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
        if ( jsRegInfo[key.account] == null )
        {
            XLogger.warn( "account is null cannot register sessionID = " + nSessionID ) ;
            let msgTransfer = {} ;
            msgTransfer[key.msgID] = eMsgType.MSG_TRANSER_DATA ;
            msgTransfer["dstPort"] = eMsgPort.ID_MSG_PORT_CLIENT ;
            msgTransfer["dstID"] = nSessionID ;
            msgTransfer["orgPort"] = eMsgPort.ID_MSG_PORT_GATE ;
            msgTransfer["orgID"] = this.mNet.getSessionID();
            msgTransfer["msg"] = jsRegInfo;
            this.mNetForClients.sendMsg(nSessionID, eMsgType.MSG_TRANSER_DATA, msgTransfer ) ;
            return ;
        }
        
        let arg = {} ;
        arg[key.account] = jsRegInfo[key.account] ;
        arg[key.nickeName] = jsRegInfo[key.nickeName] ;
        arg[key.headIconUrl] = jsRegInfo[key.headIconUrl] ;
        arg[key.type] = jsRegInfo[key.type] ;
        arg[key.sex] = jsRegInfo[key.sex] ;
        arg[key.ip] = this.mNetForClients.getSessionIP( nSessionID ) ;
        let self = this ;
        XLogger.debug("invoke rpc register account = " + arg[key.account] + " sessionID = " + nSessionID ) ;
        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DB , Math.ceil( Math.random() * 1000 )  % 1000, eRpcFuncID.Func_Register, arg,( result : Object )=>{
            let ret = result[key.ret] ;
            XLogger.debug( "sessionID = " + nSessionID + " register " + ( ret == 0 ? "success" : "failed" )  ) ;
            jsRegInfo["ret"] = ret ;
            delete jsRegInfo[key.nickeName] ; delete jsRegInfo[key.headIconUrl] ;


            let msgTransfer = {} ;
            msgTransfer[key.msgID] = eMsgType.MSG_TRANSER_DATA ;
            msgTransfer["dstPort"] = eMsgPort.ID_MSG_PORT_CLIENT ;
            msgTransfer["dstID"] = nSessionID ;
            msgTransfer["orgPort"] = eMsgPort.ID_MSG_PORT_GATE ;
            msgTransfer["orgID"] = this.mNet.getSessionID();
            msgTransfer["msg"] = jsRegInfo;
            self.mNetForClients.sendMsg(nSessionID, eMsgType.MSG_TRANSER_DATA, msgTransfer ) ;
            
            if ( 0 == ret && jsRegInfo["isRobot"] == null )
            {
                let sql = `insert into logRegister set uid = ${result[key.uid]} , ip = '${arg[key.ip]}' , type = ${arg[key.type]} ; ` ;
                self.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_LOG_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, { sql : sql } ) ;
            }
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
        arg[key.account] = acc ;
        arg[key.type] = accType ;
        let self = this ;
        XLogger.debug("invoke rpc login account = " + arg[key.account] + " sessionID = " + nSessionID ) ;
        this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DB , Math.ceil( Math.random() * 1000 )  % 1000, eRpcFuncID.Func_Login, arg,( result : Object )=>{
            let ret = result["ret"] ;
            let sate = result[key.state] ;
            XLogger.debug( "sessionID = " + nSessionID + " login " + ( ret == 0 && sate == 0 ? "success" : "failed" + "ret = " + ret )  ) ;
            if ( 0 != ret )
            {
                let msgTransfer = {} ;
                msgTransfer[key.msgID] = eMsgType.MSG_TRANSER_DATA ;
                msgTransfer["dstPort"] = eMsgPort.ID_MSG_PORT_CLIENT ;
                msgTransfer["dstID"] = nSessionID ;
                msgTransfer["orgPort"] = eMsgPort.ID_MSG_PORT_GATE ;
                msgTransfer["orgID"] = this.mNet.getSessionID();
                msgTransfer["msg"] = { ret : ret , state : sate ,msgID : eMsgType.MSG_PLAYER_LOGIN };
                self.mNetForClients.sendMsg(nSessionID, eMsgType.MSG_TRANSER_DATA, msgTransfer ) ;
                return ;
            }
            
            if ( 0 == ret )
            {
                let lastUID = self.mSessionIDmapUID.get( nSessionID ); 
                if ( lastUID != null )
                {
                    if ( lastUID == result["uid"] )
                    {
                        XLogger.warn( "sessionID already bind uid , why login twice ? uid = " + lastUID + " sessionID = " + nSessionID ) ;
                        return ;
                    }
                    else
                    {
                        XLogger.debug( "invoke rpc , disconnect pre account , pre uid = " + lastUID + " curUID = " + result["uid"] ) ;
                        let darg = {} ;
                        darg["uid"] = lastUID;
                        darg["state"] = ePlayerNetState.eState_Disconnected ;
                        darg[key.sessionID] = nSessionID ;
                        self.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DATA, lastUID , eRpcFuncID.Func_InformPlayerNetState, darg ) ;
                    }
                }

                self.mSessionIDmapUID.set( nSessionID, result["uid"] ) ;
                let argLogin = {} ;
                argLogin["sessionID"] = nSessionID ;
                argLogin["uid"] = result["uid"];
                argLogin["ip"] = self.mNetForClients.getSessionIP( nSessionID ) ;
                self.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DATA, result["uid"], eRpcFuncID.Func_DoLogin, argLogin );
                XLogger.debug("invoker rpc tell login ok uid = " + result[key.uid] + " sessionID = " + nSessionID ) ;
                return ;
            }
        } ) ;
    }

    // iserver app
    onRpcCall( funcID : eRpcFuncID, arg : Object, sieral : number , outResult : Object ) : boolean
    {
        switch ( funcID )
        {
            case eRpcFuncID.Http_BrocastNotice:
                {
                    // arg: { notice : "this is a string" , endTime : 234 , type : 0 }
                    let msgTransfer = {} ;
                    msgTransfer[key.msgID] = eMsgType.MSG_TRANSER_DATA ;
                    msgTransfer["dstPort"] = eMsgPort.ID_MSG_PORT_CLIENT ;
                    msgTransfer["dstID"] = 0 ;
                    msgTransfer["orgPort"] = eMsgPort.ID_MSG_PORT_GATE ;
                    msgTransfer["orgID"] = 0;
                    arg[key.msgID] = eMsgType.MSG_BROCAST_NOTICE;
                    msgTransfer["msg"] = arg;
                    this.mNetForClients.brocastMsg(eMsgType.MSG_TRANSER_DATA, msgTransfer) ;
                    outResult["ret"] = 0 ;
                }
                break;
            case eRpcFuncID.Http_Register:
                {
                    // arg : { account : "" , nickeName : "", headIconUrl : "", type : 0 , sex : 0 , ip : "" }
                    let argReg = {} ;
                    argReg[key.account] = arg[key.account] ;
                    argReg[key.nickeName] = arg[key.nickeName] ;
                    argReg[key.headIconUrl] = arg[key.headIconUrl] ;
                    argReg[key.type] = arg[key.type] ;
                    argReg[key.sex] = arg[key.sex] ;
                    argReg[key.ip] = arg[key.ip] ;
                    let self = this ;
                    XLogger.debug("http invoke rpc register detail = " + JSON.stringify(arg) ) ;
                    this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DB , Math.ceil( Math.random() * 1000 )  % 1000, eRpcFuncID.Func_Register, argReg,( result : Object )=>{
                        let ret = result[key.ret] ;
                        XLogger.debug( "http register result " + ( ret == 0 ? "success" : "failed" ) + " result : " + JSON.stringify(result||{}) ) ;            
                        result[key.account] = argReg[key.account] ;
                        self.getRpc().pushDelayResult(sieral, result) ;
                    } ) ;
                    outResult[key.rpcDelay] = 1 ;
                }
                break;
            default:
                return super.onRpcCall(funcID, arg, sieral, outResult) ;
        }
        return true ;
    }
}

