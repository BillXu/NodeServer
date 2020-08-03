import { eRpcFuncID } from './../../common/Rpc/RpcFuncID';
import { key } from './../../shared/KeyDefine';
import { XLogger } from './../../common/Logger';
import { MatchMgr } from './../MatchMgr';
import { IMatchConfig } from './IMatch';
import { Match } from "./Match";
import { eMatchState } from '../../shared/SharedDefine';
import { eMsgPort } from '../../shared/MessageIdentifer';

export class MatchRepeatTime extends Match
{
    protected mRepeatTimer : NodeJS.Timeout = null ;
    protected mOpenTimer : NodeJS.Timeout = null ;
    protected mStopTimer : NodeJS.Timeout = null ;
    protected mIsWillStop : boolean = false ;
    protected mNextStartTime : number = 0 ;
    
    init( cfg : IMatchConfig , matchID : number ,mgr : MatchMgr ) : void
    {
        super.init(cfg, matchID, mgr ) ;
        this.mState = eMatchState.eMatch_WaitOpenSignUp;
        let v = this.mCfg.repeatTimeMatchOpenDuration ; 
        if (  null != v && v.length == 2 && v[0] != v[1] )
        {
            let start = new Date() ;
            start.setHours(v[0]) ;
            let end = new Date();
            if ( v[1] > 24 )
            {
                end.setDate(end.getDate() + 1 ) ;
                end.setHours(v[1] - 24 ) ;
            }
            else
            {
                end.setHours( v[1] ) ;
            }

            if ( start.getTime() <= Date.now() && Date.now() < end.getTime() )
            {
                XLogger.debug( "now during match open time so open it matchID = " + this.matchID + " cfgID = " + this.mCfgID ) ;
                this.onStartOpen();
            }
            else
            {
                XLogger.debug( "now during match close time so close it matchID = " + this.matchID + " cfgID = " + this.mCfgID ) ;
                this.onStop();
                this.mState = eMatchState.eMatch_Stoped;
            }
        }
        else
        {
            // open 24 hours , all day ;
            this.onStartOpen(); 
        }
    }

    onVisitInfo( jsInfo : Object ) : void 
    {
        super.onVisitInfo(jsInfo) ;
        jsInfo[key.leftTime] = this.mNextStartTime - Date.now();
    }

    startEnterBattle()
    {   
        if ( this.mIsWillStop )
        {
            clearInterval(this.mRepeatTimer) ;
            this.mRepeatTimer = null ;
            this.mState = eMatchState.eMatch_Stoped ;
        }

        if ( this.mCfg.playerCntLimt[0] <= this.mSignedPlayers.count() ) 
        {
            this.doEneterMatchBattle();
            if ( this.mIsWillStop )
            {
                this.mState = eMatchState.eMatch_Stoped ;
            }
            else
            {
                this.mState = eMatchState.eMatch_SignUp ;
            }
        }
        else if ( this.mIsWillStop )
        {
            // canncel sign
            XLogger.debug( "do not have enough players , so we have to cannel 11 the match matchID = " + this.matchID ) ;
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
            this.mState = eMatchState.eMatch_Stoped;
        }
        else
        {
            let v = this.mSignedPlayers.keys() ;

            let rpc = this.mMatchMgr.getSvrApp().getRpc();
            let arg = {} ;
            arg[key.notice] = "尊敬的玩家您好，您报名的【" + this.mCfg.matchName + "】因人数不足而取消，已经帮你顺延本比赛下一期，如有不便，您也可以手动退赛。感谢您的参与和支持，谢谢！" ;
            for ( let uid of v )
            {
                // tell player the cannecl event ;
                arg[key.uid] = uid ;
                rpc.invokeRpc( eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_InformNotice, arg ) ;
            }
            this.mState = eMatchState.eMatch_SignUp ;
        }
    }

    // self function 
    onStartOpen()
    {
        this.mState = eMatchState.eMatch_SignUp ;
        this.mIsWillStop = false ;
        if ( null != this.mRepeatTimer )
        {
            clearInterval(this.mRepeatTimer) ;
            this.mRepeatTimer = null ;
        }
        this.mNextStartTime = Date.now() + this.mCfg.repeatTime * 60* 1000 ;
        let self = this ;
        this.mRepeatTimer = setInterval( ()=>{ 
            self.mNextStartTime = Date.now() + self.mCfg.repeatTime * 60* 1000 ; 
            self.startEnterBattle(); 
        },1000 * 60 * this.mCfg.repeatTime );
        
        if ( null != this.mOpenTimer )
        {
            clearTimeout(this.mOpenTimer) ;
            this.mOpenTimer = null ;
        }

        // set close timer ;
        let v = this.mCfg.repeatTimeMatchOpenDuration ; 
        if (  null != v && v.length == 2 && v[0] != v[1] )
        {
            let closeDate = new Date();
            if ( v[1] > 24 )
            {
                closeDate.setDate( closeDate.getDate() + 1 ) ;
                closeDate.setHours( v[1] - 24 ) ;
            }
            else
            {
                closeDate.setHours(v[1]) ;
            }
            
            XLogger.debug( "match will stop at time = " + closeDate.toLocaleString() + " matchID = " + this.matchID ) ;
            if ( null != this.mStopTimer )
            {
                clearTimeout(this.mStopTimer) ;
                this.mStopTimer = null ;
            }
            let self = this ;
            this.mStopTimer = setTimeout(() => {
                self.onStop() ; 
            }, closeDate.getTime() - Date.now() );
        }
        else
        {
            XLogger.debug( "match opening all day 24 hours , do not need stop  matchID = " + this.matchID + " cfgID = " + this.mCfgID ) ;
        }
    }

    onStop()
    {
        this.mIsWillStop = true ;
        if ( null != this.mStopTimer )
        {
            clearTimeout(this.mStopTimer) ;
            this.mStopTimer = null ;
        }

        // set open timer ;
        let v = this.mCfg.repeatTimeMatchOpenDuration ; 
        if (  null != v && v.length == 2 && v[0] != v[1] )
        {
            let openDate = new Date();
            if ( v[1] <= 24 )
            {
                openDate.setDate( openDate.getDate() + 1 ) ;
            }
            openDate.setHours(v[1]) ;
            
            XLogger.debug( "match will open at time = " + openDate.toLocaleString() + " matchID = " + this.matchID ) ;
            if ( null != this.mOpenTimer )
            {
                clearTimeout(this.mOpenTimer) ;
                this.mOpenTimer = null ;
            }

            let self = this ;
            this.mOpenTimer = setTimeout(() => {
                self.onStartOpen() ; 
            }, openDate.getTime() - Date.now() );
        }
        else
        {
            XLogger.debug( "match opening all day 24 hours do not need reopen matchID = " + this.matchID + " cfgID = " + this.mCfgID ) ;
        }
    }
    
}