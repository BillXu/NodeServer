import { eRpcFuncID } from './../../common/Rpc/RpcFuncID';
import { key } from './../../shared/KeyDefine';
import { XLogger } from './../../common/Logger';
import { MatchMgr } from './../MatchMgr';
import { IMatchConfig } from './IMatch';
import { Match } from "./Match";
import { eMatchState } from '../../shared/SharedDefine';
import { eMsgPort } from '../../shared/MessageIdentifer';

export class MatchFixTime extends Match
{
    init( cfg : IMatchConfig , matchID : number ,mgr : MatchMgr ) : void
    {
        super.init(cfg, matchID, mgr ) ;
        this.mState = eMatchState.eMatch_WaitOpenSignUp;
        if ( this.mCfg.startSignTime == null || this.mCfg.startSignTime.length < 5 )
        {
            this.onStartSignup() ; 
        }
        else 
        {
            let startSignDate = new Date(this.mCfg.startSignTime) ;
            let t = startSignDate.getTime() - Date.now() ;
            if ( t <= 0  )
            {
                XLogger.debug( "start signe time is eralier than now , so direct open signup state matchID = " + this.matchID + " signUpDate = " + this.mCfg.startSignTime + " cfgID = " + this.mCfg.id ) ;
                this.onStartSignup();
            }
            else
            {
                let self = this;
                setTimeout(() => {
                    XLogger.debug( "reach start signup time , startId matchID = " + self.matchID + " cfgID = " + self.mCfg.id ) ;
                    self.onStartSignup();
                }, t );
            }
        }

        // prepare start time 
        let tStartBattle  = 0 ;
        if ( this.mCfg.startSignTime == null || this.mCfg.startTime.length < 5 )
        {
            XLogger.error( "fixTime match startTime can not be null or ignore , cfgID = " + this.mCfg.id + " we let it start a day later " ) ;
            tStartBattle = 1000*60*60*24 ;
        }
        else
        {
            let startDate = new Date(this.mCfg.startSignTime) ;
            tStartBattle = startDate.getTime() - Date.now();
            if ( tStartBattle <= 0  )
            {
                XLogger.warn( "start time erlier than now , how to play , we late it 3 houre later matchID = " + this.matchID + " cfgID = " + this.mCfg.id + " time = " + this.mCfg.startTime );
                tStartBattle = 1000*60*60*24 ;
            }
        }

        let self = this ;
        setTimeout(() => {
            XLogger.debug( "reach time to start battle matchID = " + self.matchID + " cfgID = " + self.mCfg.id ) ;
            self.onStartEnterBattle();
        }, tStartBattle );
    }

    onStartSignup()
    {
        this.mState = eMatchState.eMatch_SignUp ;
    }

    onStartEnterBattle()
    {
        if ( this.mCfg.playerCntLimt[0] > this.mSignedPlayers.count() ) 
        {
            this.doEneterMatchBattle();
        }
        else
        {
            // canncel sign
            XLogger.debug( "do not have enough players , so we have to cannel the match matchID = " + this.matchID ) ;
            let v = this.mSignedPlayers.keys() ;

            let rpc = this.mMatchMgr.getSvrApp().getRpc();
            let arg = {} ;
            arg[key.notice] = "尊敬的玩家您好，您报名的【" + this.mCfg.matchName + "】因人数不足而取消，报名费已经退还。感谢您的参与和支持，敬请关注其他赛事，谢谢！" ;
            for ( let uid of v )
            {
                this.doCanncelSignedUp(uid) ;

                // tell player the cannecl event ;
                arg[key.uid] = uid ;
                rpc.invokeRpc( eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_InformNotice, arg ) ;
            }
            this.mState = eMatchState.eMatch_Closed;
            // delete this match ;
            this.mMatchMgr.deleteMatch( this.matchID ) ;
        }
    }
}