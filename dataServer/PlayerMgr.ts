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
                XLogger.warn( "player is not on this server , canot process msg . uid = " + targetID + " msg = " + JSON.stringify(msg)  ) ;
                return false
            }

            return player.onLogicMsg(msgID, msg) ;
        }
        return false ;
    }

    onOtherServerDisconnect( port : eMsgPort , idx : number , maxCnt : number )
    {
        super.onOtherServerDisconnect(port, idx, maxCnt) ;
        // for player disconnect ;
        if ( port == eMsgPort.ID_MSG_PORT_GATE )
        {
            let ps = this.mPlayers.values() ;
            let vDis = [] ;
            for ( let p of ps )
            {
                if ( idx == p.sessionID % maxCnt )
                {
                    p.onUpdateNetState( ePlayerNetState.eState_Disconnected )  ;
                    vDis.push( p.uid ) ;
                }
            }

            XLogger.info( "gate svr disconnected , lose player cnt = " + vDis.length + " svr idx = " + idx + " maxCnt = " + maxCnt ) ;
            for ( let id of vDis )
            {
                this.onPlayerDisconnected( id );
            }
        }
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
            if ( player != null )
            {
                if ( player.sessionID == sessionID )
                {
                    XLogger.debug( "do not login twice one connection uid = " + player.uid + " sessionID = " + sessionID ) ;
                    return js;
                }
                XLogger.debug( "on player other login uid " + uid + " ip = " + ip + " sessionID = " + sessionID ) ;
                
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
                XLogger.debug( "player login uid = " + uid + "ip = " + ip + " sessionID = " + sessionID + " cnt = " + self.mPlayers.count() ) ;
                player = self.mReservedPlayers.get(uid) ;
                if ( player != null )
                {
                    XLogger.debug( "player reactive uid = " + uid ) ;
                    player.onReactive(sessionID, ip ) ;
                    self.mReservedPlayers.delete(uid) ;
                }
                else
                {
                    player = new Player() ;
                    player.init(uid, sessionID, ip ,self ) ;
                }
                ( self.getSvrApp() as DataSvr ).onPlayerLogin(uid) ;
                self.mPlayers.set(uid, player) ;
            }

            return js ;
        } ) ;

        rpc.registerRPC( eRpcFuncID.Func_InformPlayerNetState, ( sierNum : number, arg : Object )=>{
            // arg : { uid : 244 , state : ePlayerNetState, ip : string } // only online state have ip key ;
            let uid = arg["uid"] ;
            let state = arg["state"] ;
            let player = this.mPlayers.get(uid) ;
            if ( null == player )
            {
                XLogger.warn( "player not in this svr how refresh net state uid = " + uid ) ;
            }
            else
            {
                player.onUpdateNetState( state,arg["ip"] ) ;
            }

            if ( null != player && ePlayerNetState.eState_Disconnected == state )
            {
                self.onPlayerDisconnected( uid ) ;
            }
            return {} ;
        } ) ;
    } 

    protected onPlayerDisconnected( uid : number )
    {
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
    }
}