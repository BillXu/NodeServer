import { eRpcFuncID } from './../../common/Rpc/RpcFuncID';
import { eMsgPort } from './../../shared/MessageIdentifer';
import { key } from './../../shared/KeyDefine';
import { G_ARG, eMathPlayerState } from './../../shared/SharedDefine';
import { MatchPlayer } from './MatchPlayer';
import { XLogger } from './../../common/Logger';
import { Match } from "./Match";
import { eMatchState } from "../../shared/SharedDefine";

export class MatchQuick extends Match
{
    mTimerForWaitRobot : NodeJS.Timeout = null;

    onPlayerSignedUp( uid : number , sessionID : number )
    {
        super.onPlayerSignedUp(uid, sessionID ) ;
        this.mEnrollPlayers.get(uid).state = eMathPlayerState.eState_Matching ;
        if ( null == this.mTimerForWaitRobot )
        {
            let self = this ;
            this.mTimerForWaitRobot = setTimeout(() => {
                self.onFirstPlayerMaxWait();
                self.mTimerForWaitRobot = null ;
            }, G_ARG.TIME_QUICK_MATCH_WAIT * 1000 );
        }
        XLogger.debug( "on player signed uid = " + uid + " cnt = " + this.mEnrollPlayers.count() + " limit = " + this.mCfg.getLowLimit() );
        if ( this.mEnrollPlayers.count() >= this.mCfg.getLowLimit() )
        {
            this.doEneterMatchBattle();
            if ( null != this.mTimerForWaitRobot )
            {
                clearTimeout(this.mTimerForWaitRobot) ;
                this.mTimerForWaitRobot = null ;
            }
        }
        this.mState = eMatchState.eMatch_Enroll ;
    }

    onRobotReached( uid : number, sessionID : number , lawIdx : number ) : boolean
    {
        if ( this.mEnrollPlayers.count() >= this.mCfg.getLowLimit() )
        {
            XLogger.debug( "quick match count is enough , do not robot uid = " + uid + " matchID = " + this.matchID ) ;
            return false ;
        }

        let p = new MatchPlayer() ;
        p.sessionID = sessionID ;
        p.uid = uid;
        p.isRobot = true ;
        p.signUpTime = Date.now();
        p.state = eMathPlayerState.eState_SignUp;
        this.mEnrollPlayers.set(p.uid, p ) ;
        XLogger.debug( " a robot join matchID = " + this.matchID + " uid = " + uid ) ;

        if ( this.mEnrollPlayers.count() >= this.mCfg.getLowLimit() )
        {
            if ( null != this.mTimerForWaitRobot )
            {
                clearTimeout(this.mTimerForWaitRobot) ;
                this.mTimerForWaitRobot = null ;
            }

            this.doEneterMatchBattle();
        }
        this.mState = eMatchState.eMatch_Enroll ;
        return true;
    }

    clear()
    {
        super.clear();
        if ( null != this.mTimerForWaitRobot )
        {
            clearTimeout(this.mTimerForWaitRobot)  ;
            this.mTimerForWaitRobot = null ;
        }
    }

    protected onFirstPlayerMaxWait()
    {
        let needCnt = this.mCfg.getLowLimit() - this.mEnrollPlayers.count();
        if ( needCnt <= 0 )
        {
            XLogger.debug( "wait time out , quick match do not need robot MatchID = " + this.matchID ) ;
            return ;
        }

        XLogger.debug( "matchID need robot Cnt = " + needCnt + " matchID = " + this.matchID ) ;
        let arg = {} ;
        // arg { matchID : 23 , lawIdx : 23 , cnt : 23 }
        arg[key.matchID] = this.matchID;
        arg[key.lawIdx] = 0;
        arg[key.cnt] = needCnt ;
        this.mMatchMgr.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_R, 0, eRpcFuncID.Func_ReqRobot, arg , ( result : Object )=>{
            if ( result["lackCnt"] > 0 )
            {
                XLogger.warn( "do not have enough robot for this quick match ? lackCnt = " + result["lackCnt"] + " matchID = " + this.matchID ) ;
            }
            else
            {
                XLogger.debug( "have enough robot for this quick match matchID = " + this.matchID ) ;
            }
        }) ;
    }

}