import { S_CFG } from './../shared/SharedDefine';
import { Item } from './../shared/IMoney';
import { SVR_ARG } from './../common/ServerDefine';
import { merge, remove, random } from 'lodash';
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
import { eMailType, eItemType } from '../shared/SharedDefine';
import { eMailReasonFlag } from '../shared/playerData/PlayerMailData';
import { eNotifyPlatformCmd } from '../common/MgrPlatformCmd';
export class PlayerMgr extends IModule implements IPlayerMgr 
{
    static MODUEL_NAME : string = "PlayerMgr" ;
    protected mPlayers : HashMap<number,Player> = new HashMap<number,Player>(); 
    protected mReservedPlayers : HashMap<number,Player> = new HashMap<number,Player>(); 
    protected mReservedUIDs : number[] = [] ;
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

    onRpcCall( funcID : eRpcFuncID , arg : Object , sieral : number , outResult : Object ) : boolean
    {
        switch ( funcID )
        {
            case eRpcFuncID.Func_MatchReqRelive:
                {
                    // arg : { uid : 23 , fee : IItem[] , matchID : 23 , cfgID : 234 }
                    let uid = arg[key.uid] ;
                    let p = this.getPlayerByUID(uid, false ) ;
                    if ( !p )
                    {
                        outResult[key.ret] = 3 ;
                        break ;
                    }

                    let js = p.onRPCCall( funcID , arg) ;
                    if ( js[key.ret] == null )
                    {
                        XLogger.warn( "forget ret key in eRpcFuncID.Func_MatchReqRelive" ) ;
                    }
                    merge(outResult,js) ;
                }
                break;
            case eRpcFuncID.Func_ReturnBackMatchReliveFee:
                {
                    // arg : { uid : 2345, matchID : 323 , fee : IItem , cfgID : 234  }
                    let uid = arg[key.uid] ;
                    let p = this.getPlayerByUID(uid, true ) ;
                    if ( !p )
                    {
                        XLogger.warn( "player should online , why offline uid = " + uid + " Func_ReturnBackMatchReliveFee " ) ;
                        MailModule.sendOfflineEventMail(uid,eMailType.eMail_RpcCall,{ funcID : funcID, arg : arg } ) ; 
                        break ;
                    }
        
                    let js = p.onRPCCall( funcID , arg) ;
                    merge(outResult,js) ;
                }
                break;
            case eRpcFuncID.Http_BindInviteCode:
                {
                    // arg : { isFirst : 0 , uid : 23 , inviterUID : 234 }
                    let isFirst = arg["isFirst"] == 1 ;
                    let uid = arg[key.uid] ;
                    let inviterUID = arg[key.uid] ;
                    let nickName = arg[key.nickeName] ;
                    let self = this ;
                    outResult[key.rpcDelay] = 1 ;
                    this.checkBindInviterCode(uid, inviterUID, isFirst).then(ret=>{
                        arg[key.ret] = ret;
                        self.getSvrApp().getRpc().pushDelayResult(sieral, arg );
                        XLogger.debug( "check bind code result = " + ret + " uid = " + uid + " inviteID = " + inviterUID ) ;
                        if ( ret == 0 ) // do can bind ;
                        {
                            // give prize and increase id ; if first;
                            if ( isFirst && inviterUID != 0 )
                            {
                                MailModule.sendNormalMail(inviterUID, "", `您邀请的玩家【 ${nickName} ( uid : ${uid}) 】进入游戏了`, S_CFG.vInviteReward ,eMailReasonFlag.eInvitePlayer) ;
                                XLogger.debug( "invite player to give prize uid = " + uid + " inviterUID = " + inviterUID ) ;
                            }

                            // do set code ;
                            XLogger.debug( "tell set inviteID uid = " + uid + " inviteID = " + inviterUID ) ;
                            let argBeInvite = {} ;
                            argBeInvite[key.uid] = uid ;
                            argBeInvite["inviterUID"] = inviterUID;
                            self.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_BeInvited, argBeInvite );

                            // gvie prize 
                            MailModule.sendNormalMail(inviterUID, "", `请查收您的新人礼包，祝你游戏愉快！`, S_CFG.vBeInviteReward,eMailReasonFlag.eBeInvited ) ;
                            XLogger.debug( "invite player to give prize uid = " + uid + " inviterUID = " + inviterUID ) ;
                        
                            // do increate invite cnt ;
                            if ( inviterUID != 0 )
                            {
                                XLogger.debug( "tell increate inviteCnt" ) ;
                                let increateInviteCnt = {} ;
                                increateInviteCnt[key.uid] = inviterUID ;
                                increateInviteCnt["beInviterUID"] = uid;
                                self.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DATA, inviterUID, eRpcFuncID.Func_IncreateInvitorCnt, increateInviteCnt );
                            }
                        }
                    }) ;
                }
                break;
            default:
                let uid : number = arg[key.uid];
                if ( uid != null )
                {
                    let p = this.getPlayerByUID(uid, true ) ;
                    if ( p )
                    {
                        let js = p.onRPCCall(funcID, arg ) ;
                        merge(outResult,js) ;
                    }
                    else
                    {
                        MailModule.sendOfflineEventMail(uid,eMailType.eMail_RpcCall,{ funcID : eRpcFuncID.Func_SetPlayingMatch, arg : arg } ) ; 
                    }
                    break;
                }
                return false ;
        }
        return true ;
    }
    // self function
    checkBindInviterCode( uid : number , inviterUID : number , isFirst : boolean ) : Promise<any>
    {
        let self = this ;
        let checkInvitor = new Promise<any>(( relove , reject )=>{
            if ( 0 == inviterUID )
            {
                if ( isFirst )
                {
                    XLogger.debug( "clear bind code can not set isFirst = true uid = " + uid ) ;
                    reject(5);
                }
                else
                {
                    XLogger.debug( "means clear bind code " );
                    relove();
                }
                return ;
            }
            let p = self.getPlayerByUID(inviterUID, true ) ;
            if ( p )
            {
                relove();
                return ;
            }
            let argSql = { sql : "select uid from playerData where uid = " + inviterUID + " limit 1;" } ;
            self.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false), eRpcFuncID.Func_ExcuteSql, argSql,( result : Object )=>{
                if ( result[key.ret] != 0 || (result["result"] as Object[]).length <= 0  )
                {
                    XLogger.debug( "check inviter error uid = " + inviterUID ) ;
                    reject(3);
                    return ;
                }
                relove();
            } ) ;
        });

       let checkUID = new Promise<any>(( resolve , reject )=>{
            let pt = self.getPlayerByUID(uid, true ) ;
            if ( pt != null )
            {
                if (  pt.getBaseInfo().inviter != 0 && isFirst )
                {
                    XLogger.debug( "already have inviter for uid = " + uid ) ;
                    reject(2);
                    return ;
                }

                if ( pt.getBaseInfo().inviter == inviterUID )
                {
                    XLogger.debug( "duplicate bind code = " + inviterUID + " uid = " + uid );
                    reject(2);
                    return ;
                }
                resolve()
                return;
            }

            let argSql = { sql : "select inviterUID from playerData where uid = " + uid + " limit 1;" } ;
            self.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false), eRpcFuncID.Func_ExcuteSql, argSql,( result : Object )=>{
                if ( result[key.ret] != 0 || (result["result"] as Object[]).length <= 0  )
                {
                    XLogger.debug( "check target error uid = " + uid ) ;
                    reject(1);
                    return ;
                }

                if ( result["result"][0]["inviterUID"] != 0 && isFirst )
                {
                    XLogger.debug( "already have inviter for uid = " + uid ) ;
                    reject(2);
                    return ;
                }

                if ( result["result"][0]["inviterUID"] == inviterUID )
                {
                    XLogger.debug( "11 duplicate bind code = " + inviterUID + " uid = " + uid );
                    reject(2);
                    return ;
                }
                resolve();
            } ) ;
        } );

        return new Promise( relove=>{
            Promise.all([checkInvitor,checkUID]).then(()=>{
                setTimeout(() => {
                    relove(0);
                }, 70 );
            },
            failed=>{
                setTimeout(() => {
                    relove(failed);
                }, 70 );
            }) ;
        });
    }


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
            let loginType = 1 ;
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
                loginType = 2 ;
            }
            else
            {
                player = self.mReservedPlayers.get(uid) ;
                if ( player != null )
                {
                    XLogger.debug( "player reactive sessionID = " + sessionID ) ;
                    player.onReactive(sessionID, ip ) ;
                    self.mReservedPlayers.delete(uid) ;
                    remove(self.mReservedUIDs,v=>v==uid ) ;
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

            // inform platform 
            this.sendHttpRequest(eNotifyPlatformCmd.eLogin, { uid : uid, ip : ip } ) ;
            // save to log
            let sql = `insert into logLogin set uid = ${uid}, ip = '${ip}' ,loginType = ${loginType} ;`;
            rpc.invokeRpc(eMsgPort.ID_MSG_PORT_LOG_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, { sql : sql } ) ;
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

                if ( ePlayerNetState.eState_Online == state || ePlayerNetState.eState_WaitingReconnect == state )
                {
                    // save to log
                    let loginType = ePlayerNetState.eState_Online == state ? 3 : 4 ;
                    let ip = arg["ip"] || "empty" ;
                    let sql = `insert into logLogin set uid = ${uid}, ip = '${ip}' ,loginType = ${loginType} ;`;
                    rpc.invokeRpc(eMsgPort.ID_MSG_PORT_LOG_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, { sql : sql } ) ;

                    // inform platform 
                    this.sendHttpRequest( ePlayerNetState.eState_Online == state ? eNotifyPlatformCmd.eLogin : eNotifyPlatformCmd.eLogout, { uid : uid, ip : ip } ) ;
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
            let p = self.getPlayerByUID(uid, true ) ;
            if ( !p )
            {
                MailModule.sendOfflineEventMail(uid,eMailType.eMail_RpcCall,{ funcID : eRpcFuncID.Func_SetPlayingMatch, arg : arg } ) ; 
                return {} ;
            }

            let js = p.onRPCCall( eRpcFuncID.Func_SetPlayingMatch , arg) ;
            return js ;
        } ) ;

        rpc.registerRPC(eRpcFuncID.Func_ReqEnrollMatchFee,( sierNum : number, arg : Object )=>{
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

            let js = p.onRPCCall( eRpcFuncID.Func_ReqEnrollMatchFee , arg) ;
            if ( js[key.ret] == null )
            {
                XLogger.warn( "forget ret key in eRpcFuncID.Func_ReqPlayerPlayingMatch" ) ;
            }
            return js ;
        } ) ;

        rpc.registerRPC(eRpcFuncID.Func_ReturnBackEnrollMatchFee,( sierNum : number, arg : Object )=>{
            // arg : { uid : 2345, matchID : 323 , fee : IItem ,notice : "descript why this option" }
            let uid = arg[key.uid] ;
            XLogger.debug( "send a mail to player sign out matchID = " + arg[key.matchID] + " uid = " + uid ) ;
            MailModule.sendNormalMail(uid, "", arg[key.notice],[ arg[key.fee] ],eMailReasonFlag.eMatchFeeReturnBack  ) ;
            return {} ;
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
            let p = self.getPlayerByUID(uid, true ) ;
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
            // arg : { uid : 235 , lawIdx : 0 , rankIdx : 2 ,  reward : IItem[] , matchID : 2345, cfgID : 234 , matchName : "adkfja" }
            let uid = arg[key.uid] ;
            let p = self.getPlayerByUID(uid, true ) ;
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

        if ( this.mReservedPlayers.has(uid) )
        {
            XLogger.error( "why already reserve player uid = " + uid ) ;
            remove(this.mReservedUIDs,v=>v==uid ) ;
        }

        if ( SVR_ARG.isDebug )
        {
            let ridx = this.mReservedUIDs.findIndex( v=>v==uid) ;
            if ( ridx != -1 )
            {
                XLogger.error( "why reaseved  uid already have uid = " + uid );
                this.mReservedUIDs.splice(ridx,1) ;
            }
        }
        this.mReservedUIDs.push(uid);
        this.mReservedPlayers.set(uid, player) ;

        let keepCnt = 50000;
        if ( SVR_ARG.isDebug )
        {
            keepCnt = 3 ;
        }

        if ( this.mPlayers.count() + this.mReservedPlayers.count() > keepCnt )
        {
            let duid = this.mReservedUIDs.shift();
            if ( this.mReservedPlayers.has(duid) == false )
            {
                XLogger.debug( "why reserved player do not have duid = " + duid ) ;
            }
            this.mReservedPlayers.delete(duid) ;
            XLogger.debug( "delete old reserved player uid = " + duid ) ;
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