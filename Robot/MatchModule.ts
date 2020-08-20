import { key } from './../shared/KeyDefine';
import { XLogger } from './../common/Logger';
import { BaseDataModule } from './BaseDataModule';
import { RobotClient } from './RobotClient';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IClientModule } from "./IClientModule";

export class MatchModule extends IClientModule
{
    static MODULE_NAME = "MatchModule" ;

    getModuleName() : string 
    {
        return MatchModule.MODULE_NAME ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object ) : boolean 
    {
        if ( eMsgType.MSG_PLAYER_REQ_MATCH_STATE == msgID )
        {
            if ( msg[key.ret] != 0 )
            {
                XLogger.debug( "recieved state back , player do not have playing match , uid = " + this.getClient().uid + " ret = " + msg[key.ret] ) ;
                this.getClient().getBaseData().playingMatchIDs.length = 0 ;
                return true;
            }

            let rankIdx = msg[key.rankIdx] || -1 ;
            if ( rankIdx != -1 )
            {
                XLogger.debug( "recievd match state back , player wait other finish rankidx = " + rankIdx + " uid = " + this.getClient().uid ) ;
                return true ;
            }

            let deskID = msg[key.deskID] ;
            let port = msg[key.port] ;
            if ( deskID == null ||  null == port )
            {
                XLogger.error( "recievd mathc state but argument is null , uid = " + this.getClient().uid + " matchID = " + this.getClient().getBaseData().playingMatchIDs ) ;
                this.getClient().getBaseData().playingMatchIDs.length = 0 ;
                return true ;
            }

            let reqmsg = {} ;
            this.sendMsg( eMsgType.MSG_PLAYER_MJ_REQ_DESK_INFO , reqmsg, port, deskID ) ;
            XLogger.debug( "player still player , so req deskInfo to join desk scene deskID = " + deskID + " uid = " + this.getClient().uid ) ;
            return true ;
        }
        else if ( eMsgType.MSG_PLAYER_MATCH_RESULT == msgID )
        {
            XLogger.debug( "recived match result id = " + msg[key.matchID] + " uid = " + this.getClient().uid + " detail = " + JSON.stringify(msg) ) ;
            let data = this.getClient().getBaseData();
            if ( -1 != data.playingMatchIDs.indexOf(msg[key.matchID]) )
            {
                data.playingMatchIDs.splice(data.playingMatchIDs.indexOf(msg[key.matchID]),1 ) ;
            }
            else
            {
                XLogger.warn( "finish mathch is not playing one now , uid = " + data.uid + " matchID = " + data.playingMatchIDs + " finishID = " + msg[key.matchID] ) ;
            }
            return  true ;
        }
        else if ( eMsgType.MSG_R_ORDER_JOIN == msgID )
        {
            XLogger.debug( "recived order to join matchID = " + msg[key.matchID] + " uid = " + this.getClient().uid + " lawIdx = " + msg[key.lawIdx] ) ;
            msg[key.uid] = this.getClient().uid;
            this.sendMsg(eMsgType.MSG_R_JOIN_MATCH, msg, eMsgPort.ID_MSG_PORT_MATCH, msg[key.matchID] ) ;
        }
        else if ( eMsgType.MSG_R_JOIN_MATCH == msgID )
        {
            let ret = msg[key.ret] ;
            if ( ret != 0 )
            {
                this.sendMsg(eMsgType.MSG_R_ORDER_JOIN, msg, eMsgPort.ID_MSG_PORT_R, 0 ) ;
            }

            XLogger.debug( "player joint match result = " + ret + " uid = " + this.getClient().uid ) ;
        }
        else if ( eMsgType.MSG_INFORM_PLAYER_ENTER_MATCH_DESK == msgID )
        {
            // svr : { deskID : 234 , port : eMsgPort , token : 2345 } 
            this.sendMsg(msgID, { token : msg[key.token] }, msg[key.port], msg[key.deskID] ) ;
        }
        return false ;
    }

    init( pClient : RobotClient )
    {
        super.init(pClient) ;
        pClient.onWithTarget( BaseDataModule.EVENT_RECIVED_BASE_DATA , this.onRecivdBaseData, this ) ;
    }

    onRecivdBaseData()
    {
        let data = this.getClient().getBaseData();
        XLogger.debug( "playing matchID = " + data.playingMatchIDs + " uid = " + data.uid ) ;
        XLogger.debug( "signed matchIDs = " + data.signedMatches + " uid = " + data.uid  ) ;
    }

    signInMatch( matchID : number )
    {
        let msg = {} ;
        msg[key.uid] = this.getClient().uid ;
        let uid = this.getClient().uid ;
        this.sendMsg( eMsgType.MSG_PLAYER_MATCH_SIGN_UP, msg, eMsgPort.ID_MSG_PORT_MATCH, matchID,( result : Object )=>{ 
            let ret = result[key.ret] ;
            if ( ret == 0 )
            {
                XLogger.debug( "sign in match ok uid = " + uid + " detail = " + JSON.stringify(result) ) ;
            }
            else
            {
                XLogger.debug( "sign in match failed uid = " + uid + "detail " + JSON.stringify(result) ) ;
            }
            return true ; 
        } ) ;
    }

    signOutMatch( matchID : number )
    {
        let msg = {} ;
        msg[key.uid] = this.getClient().uid ;
        let uid = this.getClient().uid ;
        this.sendMsg( eMsgType.MSG_PLAYER_MATCH_SIGN_OUT, msg, eMsgPort.ID_MSG_PORT_MATCH, matchID ,( result : Object )=>{ 
            let ret = result[key.ret] ;
            if ( ret == 0 )
            {
                XLogger.debug( "sign in match ok uid = " + uid + " detail = " + JSON.stringify(result) ) ;
            }
            else
            {
                XLogger.debug( "sign in match failed uid = " + uid + "detail " + JSON.stringify(result) ) ;
            }
            return true ; 
        } ) ;
    }

    reqPlayingMatchState()
    {
        let data = this.getClient().getBaseData();
        if ( data.playingMatchIDs.length == 0 )
        {
            XLogger.debug( "player do not have playering match so do not req match State . uid = " + this.getClient().uid ) ;
            return ;
        }
        let msg = {} ;
        this.sendMsg( eMsgType.MSG_PLAYER_REQ_MATCH_STATE, msg, eMsgPort.ID_MSG_PORT_MATCH, data.playingMatchIDs[0] ) ;
    }
}