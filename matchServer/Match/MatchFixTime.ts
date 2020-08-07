import { MatchCfg } from './../../shared/MatchConfigData';
import { eRpcFuncID } from './../../common/Rpc/RpcFuncID';
import { key } from './../../shared/KeyDefine';
import { XLogger } from './../../common/Logger';
import { MatchMgr } from './../MatchMgr';
import { Match } from "./Match";
import { eMatchState } from '../../shared/SharedDefine';
import { eMsgPort } from '../../shared/MessageIdentifer';

export class MatchFixTime extends Match
{
    protected mStartTimer : NodeJS.Timeout = null ;
    init( cfg : MatchCfg , matchID : number ,mgr : MatchMgr ) : void
    {
        super.init(cfg, matchID, mgr ) ;
        let startSignDate = new Date(this.mCfg.startTime) ;
        let t = startSignDate.getTime() - Date.now() ;
        if ( t <= 0  )
        {
            XLogger.error( "start time is eralier than now , so direct open state matchID = " + this.matchID + " startTime = " + this.mCfg.startTime + " cfgID = " + this.mCfg.cfgID ) ;
            return ;
        }
        else
        {
            let self = this;
            this.mStartTimer = setTimeout(() => {
                XLogger.debug( "reach start time , startId matchID = " + self.matchID + " cfgID = " + self.mCfg.cfgID ) ;
                self.onStartEnterBattle();
            }, t );
        }
    }

    clear()
    {
        if ( this.mStartTimer != null )
        {
            clearInterval(this.mStartTimer) ;
            this.mStartTimer = null ;
        }
    } 

    onStartEnterBattle()
    {
        if ( this.mEnrollPlayers.count() >= this.mCfg.getLowLimit() ) 
        {
            this.doEneterMatchBattle();
        }
        else
        {
            // canncel sign
            XLogger.debug( "do not have enough players , so we have to cannel the match matchID = " + this.matchID ) ;
            let v = this.mEnrollPlayers.keys() ;

            let rpc = this.mMatchMgr.getSvrApp().getRpc();
            let arg = {} ;
            arg[key.notice] = "尊敬的玩家您好，您报名的【" + this.mCfg.name + "】因人数不足而取消，报名费已经退还。感谢您的参与和支持，敬请关注其他赛事，谢谢！" ;
            for ( let uid of v )
            {
                this.doCanncelSignedUp(uid) ;

                // tell player the cannecl event ;
                arg[key.uid] = uid ;
                rpc.invokeRpc( eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_InformNotice, arg ) ;
            }
            this.mState = eMatchState.eMatch_Finished;
            // delete this match ;
            this.mMatchMgr.deleteMatch( this.matchID ) ;
        }
    }
}