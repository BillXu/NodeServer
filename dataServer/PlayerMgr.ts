import { MailModule } from './MailModule';
import { key } from './../shared/KeyDefine';
import { DataSvr } from './DataSvr';
import { ePlayerNetState } from './../common/commonDefine';
import { XLogger } from './../common/Logger';
import HashMap  from 'hashmap';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IPlayerMgr } from './IPlayerMgr';
import { IModule } from '../common/IModule';
import { IServerApp } from '../common/IServerApp';
import { Player } from './player/Player';
import { eRpcFuncID } from '../common/Rpc/RpcFuncID';
import { eMailType } from '../shared/SharedDefine';
export class PlayerMgr extends IModule implements IPlayerMgr 
{
    static MODUEL_NAME : string = "PlayerMgr" ;
    protected mPlayers : HashMap<number,Player> = new HashMap<number,Player>(); 
    protected mReservedPlayers : HashMap<number,Player> = new HashMap<number,Player>(); 
    // module
    onRegisterToSvrApp( svrApp : IServerApp )
    {
        super.onRegisterToSvrApp(svrApp);
        this.installRPCTask();
    }

    getModuleType() : string
    {
        return PlayerMgr.MODUEL_NAME;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort , targetID : number ) : boolean 
    {
        if ( orgPort == eMsgPort.ID_MSG_PORT_CLIENT )
        {
            let player = this.mPlayers.get(targetID) ;
            if ( player == null )
            {
                msg[key.ret] = 200 ;
                msg["err"] = "can not find player with ID = " + targetID ;
                this.sendMsg(msgID, msg, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
                XLogger.warn( "player is not on this server , canot process msg . uid = " + targetID + "msgID = " + msg[key.msgID] + " msg = " + JSON.stringify(msg)  ) ;
                return false
            }

            if ( player.sessionID != orgID )
            {
                XLogger.error( "player session and uid not match , invalid targetID ? targetID = " + targetID + " sessionID = " + player.sessionID + " orgID = " + orgID + " msgID = " + eMsgType[msgID] ) ;
                return false ;
            }
            return player.onLogicMsg(msgID, msg) ;
        }
        return false ;
    }

    onOtherServerDisconnect( port : eMsgPort , idx : number , maxCnt : number )
    {
        super.onOtherServerDisconnect(port, idx, maxCnt) ;
        // // for player disconnect ;
        // if ( port == eMsgPort.ID_MSG_PORT_GATE )
        // {
        //     let ps = this.mPlayers.values() ;
        //     let vDis = [] ;
        //     for ( let p of ps )
        //     {
        //         if ( idx == p.sessionID % maxCnt )
        //         {
        //             p.onUpdateNetState( ePlayerNetState.eState_Disconnected )  ;
        //             vDis.push( p.uid ) ;
        //         }
        //     }

        //     XLogger.info( "gate svr disconnected , lose player cnt = " + vDis.length + " svr idx = " + idx + " maxCnt = " + maxCnt ) ;
        //     for ( let id of vDis )
        //     {
        //         this.onPlayerDisconnected( id );
        //     }
        // }
    }

    visitPlayerSimpleInfo(  uid : number , info : Object ) : boolean
    {
        let p = this.mPlayers.get(uid) || this.mReservedPlayers.get(uid);
        if ( p )
        {
            p.visitPlayerSimpleInfo(info) ;
            return true ;
        }
        return false ;
    }
    // self function
    installRPCTask()
    {
        let rpc = this.getSvrApp().getRpc();
        let self = this ;
        rpc.registerRPC(eRpcFuncID.Func_DoLogin, ( sierNum : number, arg : Object )=>{
            let js = {} ;
            let uid = arg["uid"] ;
            let sessionID = arg["sessionID"] ;
            let ip = arg["ip"] ;
            let player = self.mPlayers.get(uid) ;
            XLogger.debug("recived rpc, player do login sessionID = " + sessionID + "uid = " + uid ) ;
            if ( player != null )
            {
                if ( player.sessionID == sessionID )
                {
                    XLogger.debug( "Login twice , uid = " + player.uid + " sessionID = " + sessionID ) ;
                    return js;
                }
                XLogger.debug( "player other login uid = " + uid + " pre sessionID = " + player.sessionID + " new sessionID = " + sessionID + "invoke rpc, close pre session gate " ) ;
                
                let preSessionID = player.sessionID ;
                player.onOtherLogin( sessionID , ip ) ;

                // close pre gateClient ;
                let argOther = {} ;
                argOther["sessionID"] = preSessionID ;
                argOther["uid"] = player.uid ;
                rpc.invokeRpc(eMsgPort.ID_MSG_PORT_GATE, preSessionID, eRpcFuncID.Func_OtherLogin, argOther ) ;
            }
            else
            {
                player = self.mReservedPlayers.get(uid) ;
                if ( player != null )
                {
                    XLogger.debug( "player reactive sessionID = " + sessionID ) ;
                    player.onReactive(sessionID, ip ) ;
                    self.mReservedPlayers.delete(uid) ;
                }
                else
                {
                    player = new Player() ;
                    player.init(uid, sessionID, ip ,self ) ;
                    XLogger.debug( "new player sessionID = " + sessionID ) ;
                }
                self.mPlayers.set(uid, player) ;
            }
            ( self.getSvrApp() as DataSvr ).onPlayerLogin(uid) ;
            self.state();
            return js ;
        } ) ;

        rpc.registerRPC( eRpcFuncID.Func_InformPlayerNetState, ( sierNum : number, arg : Object )=>{
            // arg : { uid : 244 , state : ePlayerNetState, ip : string } // only online state have ip key ;
            let uid = arg["uid"] ;
            let state = arg["state"] ;
            let sessionID = arg[key.sessionID] ;
            let player = this.mPlayers.get(uid) ;
            XLogger.debug( "recieved rpc ,  update player netState uid = " + uid + " sessionID = " + (player == null ? "null " :  player.sessionID )+ " netState = " + ePlayerNetState[state] ) ;
            if ( null == player )
            {
                XLogger.warn( "player not find to refresh net state uid = " + uid ) ;
            }
            else
            {
                if ( ePlayerNetState.eState_Disconnected == state || ePlayerNetState.eState_WaitingReconnect == state )
                {
                    if ( player.sessionID == sessionID )
                    {
                        player.onUpdateNetState( state,arg["ip"] ) ;
                    }
                    else
                    {
                        XLogger.debug( "not the same connection , so invalid refresh netState uid = " + player.uid ) ;
                    }
                }
                else
                {
                    player.onUpdateNetState( state,arg["ip"] ) ;
                }
                
            }

            if ( null != player && ePlayerNetState.eState_Disconnected == state && player.sessionID == sessionID )
            {
                self.onPlayerDisconnected( uid ) ;
                //XLogger.debug( "player disconnect session id = " + player.sessionID ) ;
            }
            return {} ;
        } ) ;

        rpc.registerRPC(eRpcFuncID.Func_SendMail,( sierNum : number, arg : Object )=>{
            let uid = arg[key.uid] ;
            let content = arg[key.content] ;
            let title = arg[key.title] || "系统";
            MailModule.sendNormalMail(uid, title, content ) ;
            return {} ;
        } ) ;

        rpc.registerRPC(eRpcFuncID.Func_ReqPlayerPlayingMatch,( sierNum : number, arg : Object )=>{
            let uid = arg[key.uid] ;
            let sessionID = arg[key.sessionID] ;
            let p = self.getPlayerByUID(uid, false ) ;
            if ( !p )
            {
                return { ret : 1 } ;
            }

            if ( p.sessionID != sessionID )
            {
                return { ret : 2 };
            }

            let js = p.onRPCCall( eRpcFuncID.Func_ReqPlayerPlayingMatch , arg) ;
            js[key.ret] = 0 ;
            return js ;
        } ) ;

        rpc.registerRPC(eRpcFuncID.Func_SetPlayingMatch,( sierNum : number, arg : Object )=>{
            let uid = arg[key.uid] ;
            let p = self.getPlayerByUID(uid, false ) ;
            if ( !p )
            {
                MailModule.sendOfflineEventMail(uid,eMailType.eMail_RpcCall,{ funcID : eRpcFuncID.Func_SetPlayingMatch, arg : arg } ) ; 
                return {} ;
            }

            let js = p.onRPCCall( eRpcFuncID.Func_SetPlayingMatch , arg) ;
            return js ;
        } ) ;

        rpc.registerRPC(eRpcFuncID.Func_DeductionMoney,( sierNum : number, arg : Object )=>{
            let uid = arg[key.uid] ;
            let sessionID = arg[key.sessionID] ;
            let p = self.getPlayerByUID(uid, false ) ;
            if ( !p )
            {
                return { ret : 1 } ;
            }

            if ( p.sessionID != sessionID )
            {
                return { ret : 2 };
            }

            let js = p.onRPCCall( eRpcFuncID.Func_DeductionMoney , arg) ;
            if ( js[key.ret] == null )
            {
                XLogger.warn( "forget ret key in eRpcFuncID.Func_ReqPlayerPlayingMatch" ) ;
            }
            return js ;
        } ) ;

        rpc.registerRPC(eRpcFuncID.Func_addMoney,( sierNum : number, arg : Object )=>{
            let uid = arg[key.uid] ;
            let p = self.getPlayerByUID(uid, false ) ;
            if ( !p )
            {
                MailModule.sendOfflineEventMail(uid,eMailType.eMail_RpcCall,{ funcID : eRpcFuncID.Func_addMoney, arg : arg } ) ; 
                return {} ;
            }

            let js = p.onRPCCall( eRpcFuncID.Func_addMoney , arg) ;
            return js ;
        } ) ;

        rpc.registerRPC(eRpcFuncID.Func_CheckUID,( sierNum : number, arg : Object )=>{
            let uid = arg[key.uid] ;
            let sessionID = arg[key.sessionID] ;
            let p = self.getPlayerByUID(uid, false ) ;
            if ( !p )
            {
                return { ret : 1 } ;
            }

            if ( p.sessionID != sessionID )
            {
                return { ret : 2 } ;
            }

            return { ret : 0 } ;
        } ) ;

        rpc.registerRPC(eRpcFuncID.Func_ModifySignedMatch,( sierNum : number, arg : Object )=>{
            let uid = arg[key.uid] ;
            let p = self.getPlayerByUID(uid, false ) ;
            if ( !p )
            {
                MailModule.sendOfflineEventMail(uid,eMailType.eMail_RpcCall,{ funcID : eRpcFuncID.Func_ModifySignedMatch, arg : arg } ) ; 
                return {} ;
            }

            let js = p.onRPCCall( eRpcFuncID.Func_ModifySignedMatch , arg) ;
            return js ;
        } ) ;

        rpc.registerRPC(eRpcFuncID.Func_InformNotice,( sierNum : number, arg : Object )=>{
            let uid = arg[key.uid] ;
            let notice = arg[key.notice] ;
            let p = self.getPlayerByUID(uid, false ) ;
            if ( !p || p.netState != ePlayerNetState.eState_Online )
            {
                MailModule.sendNoticeMail(uid,notice ) ; 
                return {} ;
            }

            p.onRecivedNotice(notice,Date.now() ) ;
            return {} ;
        } ) ;

        rpc.registerRPC(eRpcFuncID.Func_MatchResult, ( sierNum : number, arg : Object )=>{
            let uid = arg[key.uid] ;
            let p = self.getPlayerByUID(uid, false ) ;
            if ( !p )
            {
                MailModule.sendOfflineEventMail(uid,eMailType.eMail_RpcCall,{ funcID : eRpcFuncID.Func_MatchResult, arg : arg } ) ; 
                return {} ;
            }

            let js = p.onRPCCall( eRpcFuncID.Func_MatchResult , arg) ;
            return js ;
        } ) ;
    } 

    getPlayerByUID( uid : number , isContainReserve : boolean ) : Player
    {
        let p = this.mPlayers.get(uid) ;
        if ( p )
        {
            return p ;
        }

        if ( !isContainReserve )
        {
            return null ;
        }

        p = this.mReservedPlayers.get(uid) ;
        return p ;
    }

    protected onPlayerDisconnected( uid : number )
    {
        XLogger.debug( "player disconnecct uid = " + uid ) ;
        let player = this.mPlayers.get(uid) ;
        if ( null == player )
        {
            XLogger.error( "delete player but player is null ? why uid = " + uid  ) ;
            return ;
        }
        this.mPlayers.delete(uid) ;

        if ( this.mPlayers.count() + this.mReservedPlayers.count() < 10000 )
        {
            if ( this.mReservedPlayers.has(uid) )
            {
                XLogger.error( "why already reserve player uid = " + uid ) ;
            }
            this.mReservedPlayers.set(uid, player) ;
        }

        this.state();
    }

    protected state()
    {
        XLogger.debug( "state: playerMgr activePlayerCnt = " + this.mPlayers.count() + " reseverdPlayerCnt = " + this.mReservedPlayers.count() ) ;
        let vs = this.mPlayers.values();
        for ( let v of vs )
        {
            v.state();
        }
        XLogger.debug("state end for playerMgr ") ;
    }
}