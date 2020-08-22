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
    mIsNeedRobot : boolean = false ;
    onPlayerSignedUp( uid : number , sessionID : number )
    {
        super.onPlayerSignedUp(uid, sessionID ) ;
        this.mEnrollPlayers.get(uid).state = eMathPlayerState.eState_Matching ;
        if ( null == this.mTimerForWaitRobot )
        {
            let self = this ;
            this.mTimerForWaitRobot = setTimeout(() => {
                self.onFirstPlayerWaitTimeOut();
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
            this.mState = eMatchState.eMatch_Enroll ;
            this.mIsNeedRobot = false ;
        }        
    }

    onPlayerCanncelEnroll( uid : number,isSystem : boolean )
    {
        // check still have real player ?
        let ps = this.mEnrollPlayers.values() ;
        for ( let p of ps )
        {
            if ( p.isRobot == false && uid != p.uid )
            {
                // still have real player ;
                XLogger.debug( "player cannnecl enroll still have other real player uid = " + p.uid + " enroll uid = " + uid ) ;
                return ;
            }
        }

        XLogger.debug( "player cannnecl enroll do not have real player , cannecl waitTimeout , enroll uid = " + uid ) ;
        // no real player ;
        if ( this.mTimerForWaitRobot != null )
        {
            clearTimeout(this.mTimerForWaitRobot);
            this.mTimerForWaitRobot = null ;
        }

        this.mIsNeedRobot = false ;
    }

    onRobotReached( uid : number, sessionID : number , lawIdx : number ) : boolean
    {
        if ( super.onRobotReached(uid, sessionID, lawIdx) )
        {
            XLogger.debug( "robot direct into law uid = " + uid + " lawIdx = " + lawIdx ) ;
            return true ;
        }

        if ( this.mIsNeedRobot == false )
        {
            XLogger.debug( "do not need robot , no real player " ) ;
            return false ;
        }

        if ( this.mEnrollPlayers.count() >= this.mCfg.getLowLimit() )
        {
            XLogger.debug( "quick match count is enough , do not robot uid = " + uid + " matchID = " + this.matchID ) ;
            return false ;
        }

        if ( this.mEnrollPlayers.has(uid) )
        {
            XLogger.error( "why player come the same math twice uid = " + uid + " matchID = " + this.matchID ) ;
        }
        
        let p = new MatchPlayer() ;
        p.sessionID = sessionID ;
        p.uid = uid;
        p.isRobot = true ;
        p.signUpTime = Date.now();
        p.state = eMathPlayerState.eState_SignUp;
        this.mEnrollPlayers.set(p.uid, p ) ;
        XLogger.debug( " a robot join matchID = " + this.matchID + " uid = " + uid + " enrollcnt = " + this.mEnrollPlayers.count() + " limit cnt = " + this.mCfg.getLowLimit() ) ;

        if ( this.mEnrollPlayers.count() >= this.mCfg.getLowLimit() )
        {
            if ( null != this.mTimerForWaitRobot )
            {
                clearTimeout(this.mTimerForWaitRobot) ;
                this.mTimerForWaitRobot = null ;
            }

            XLogger.debug( "count is ok start battle matchID = " + this.matchID  ) ;
            this.doEneterMatchBattle();
            this.mState = eMatchState.eMatch_Enroll ;
            this.mIsNeedRobot = false ;
        }
        
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

    protected onFirstPlayerWaitTimeOut()
    {
        let needCnt = this.mCfg.getLowLimit() - this.mEnrollPlayers.count();
        if ( needCnt <= 0 )
        {
            XLogger.debug( "wait time out , quick match do not need robot MatchID = " + this.matchID ) ;
            return ;
        }
        this.mIsNeedRobot = true ;
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