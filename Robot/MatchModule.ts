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
                this.getClient().getBaseData().playingMatchID = 0 ;
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
                XLogger.error( "recievd mathc state but argument is null , uid = " + this.getClient().uid + " matchID = " + this.getClient().getBaseData().playingMatchID ) ;
                this.getClient().getBaseData().playingMatchID = 0 ;
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
            if ( msg[key.matchID] == data.playingMatchID )
            {
                data.playingMatchID = 0 ;
            }
            else
            {
                XLogger.warn( "finish mathch is not playing one now , uid = " + data.uid + " matchID = " + data.playingMatchID + " finishID = " + msg[key.matchID] ) ;
            }
            return  true ;
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
        XLogger.debug( "playing matchID = " + data.playingMatchID + " uid = " + data.uid ) ;
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
        if ( data.playingMatchID == 0 )
        {
            XLogger.debug( "player do not have playering match so do not req match State . uid = " + this.getClient().uid ) ;
            return ;
        }
        let msg = {} ;
        this.sendMsg( eMsgType.MSG_PLAYER_REQ_MATCH_STATE, msg, eMsgPort.ID_MSG_PORT_MATCH, data.playingMatchID ) ;
    }
}