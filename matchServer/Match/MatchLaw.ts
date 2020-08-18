import { G_ARG, eMathPlayerState } from './../../shared/SharedDefine';
import { MatchCfg, LawRound } from './../../shared/MatchConfigData';
import { RpcModule } from './../../common/Rpc/RpcModule';
import { XLogger } from './../../common/Logger';
import { key } from './../../shared/KeyDefine';
import { eRpcFuncID } from './../../common/Rpc/RpcFuncID';
import { random, shuffle,remove, countBy } from 'lodash';
import  HashMap  from 'hashmap';
import { eMsgPort, eMsgType } from './../../shared/MessageIdentifer';
import { MatchPlayer } from './MatchPlayer';
import { ePlayerNetState } from './../../common/commonDefine';
import { IMatchLaw, IMatchLawDelegate } from './IMatchLaw';
import { Match } from './Match';
enum eLawState
{
    eMatching,
    ePlaying,
    eWaitRelive,
    eOvered,
    eWaitMax,
}

export class MatchLaw implements IMatchLaw
{
    protected mMatch : Match = null ;
    protected mLawIdx : number = 0 ;

    protected mDelegate : IMatchLawDelegate = null ;
    protected mAllPlayers : HashMap<number,MatchPlayer> = null ; // { uid : player }

    protected mFinishedPlayers : MatchPlayer[] = [] ;
    protected mPlayeringPlayers : MatchPlayer[] = [] ;

    protected mRoundCfg : LawRound = null ;
    protected mReliveTimer : NodeJS.Timeout = null ;
    protected mState : eLawState = eLawState.eMatching ;
    protected mRoundFinishDelayTimer : NodeJS.Timeout = null ;
    static TIME_WAIT_ROUND_FINISH : number = 8 ; // seconds ;
    init( match : Match ,lawIdx : number ) : void 
    {
        this.mMatch = match ;
        this.mLawIdx = lawIdx ;
    }

    get cfg () : MatchCfg
    {
        return this.mMatch.mCfg ;
    }

    get gamePort() : eMsgPort
    {
        return this.cfg.gameType ;
    }

    protected get matchID() : number
    {
        return this.mMatch.matchID ;
    }

    getIdx() : number 
    {
        return this.mLawIdx ;
    }

    startLaw( players : HashMap<number,MatchPlayer> ) : void 
    {
        this.mAllPlayers = players.clone();
        // set init score ;
        let socre = this.cfg.initScore ;
        this.mFinishedPlayers = this.mAllPlayers.values().concat([]) ;
        for ( let p of this.mFinishedPlayers )
        {
            p.score = socre ;
            p.state = eMathPlayerState.eState_Promoted ;
        }
        this.matchingPlayers();
    }

    onRefreshPlayerNetState( uid : number , sessionID : number ,netState : ePlayerNetState  ) : boolean 
    {
        let cp = this.mAllPlayers.get(uid) ;
        if ( cp == null )
        {
            return false ;
        }

        XLogger.debug( "player update state uid = " + uid + " netState = " + ePlayerNetState[netState] ) ;
        cp.sessionID = sessionID ;
        if ( netState != ePlayerNetState.eState_Online )
        {
            XLogger.debug( "player do not online , zero sessionID uid = " + uid ) ;
            cp.sessionID = 0 ;
        }

        if ( cp.stayDeskID != 0 )
        {
            XLogger.debug( "player stayin desk , infor state to deskID = " + cp.stayDeskID + " uid = " + cp.uid + " netState = " + ePlayerNetState[netState] ) ;
            let arg = {} ;
            arg[key.deskID] = cp.stayDeskID ;
            arg[key.uid] = cp.uid ;
            arg[key.sessionID] = cp.sessionID ;
            arg[key.state] = netState ;
            this.getRpc().invokeRpc(this.gamePort, cp.stayDeskID, eRpcFuncID.Func_DeskUpdatePlayerNetState, arg ) ;
        }
        return true ;
    }

    setDelegate( pdel : IMatchLawDelegate ) : void 
    {
        this.mDelegate = pdel ;
    }

    visitPlayerMatchState( jsInfo : Object , sessionID : number ) : boolean
    {
        let ps = this.mAllPlayers.values();
        // check finished ;
        for ( let pf of ps )
        {
            if ( pf.sessionID != sessionID )
            {
                continue ;
            }

            pf.onVisitInfo(jsInfo ) ;
            return true ;
        }
        return false ;
    }

    onPlayerWantRelive( sessionID : number , uid : number  ) : boolean
    {
        let pss = this.mAllPlayers.get(uid);
        if ( pss == null ) // player not in this law ;
        {
            return false ;
        }

        if ( pss.sessionID != sessionID )
        {
            XLogger.debug( "uid error , not equal with sessionID uid = " + uid + " sessionID = " + pss.sessionID ) ;
            this.mMatch.sendMsgToClient(sessionID, eMsgType.MSG_PLAYER_REQ_MATCH_RELIVE, { ret : 3 } ) ;
            return true ;
        }

        if ( this.canPlayerRelive(sessionID) == false )
        {
            XLogger.debug( "cur state can not relive uid = " + uid + " matchID = " + this.matchID ) ;
            this.mMatch.sendMsgToClient(sessionID, eMsgType.MSG_PLAYER_REQ_MATCH_RELIVE, { ret : 2 } ) ;
            return true ;
        }

        let rpc = this.getRpc() ;
        let arg = {} ;
        // arg : { uid : 23 , fee : IItem[] , matchID : 23 , cfgID : 234 }
        arg[key.uid] = uid ;
        arg[key.fee] = this.mRoundCfg.reliveMoney ;
        arg[key.matchID] = this.matchID;
        arg[key.cfgID] = this.cfg.cfgID;
        let self = this ;
        XLogger.debug( "relive match , try to give fee uid = " + uid + " matchID = " + this.matchID ) ;
        rpc.invokeRpc( eMsgPort.ID_MSG_PORT_DATA , uid, eRpcFuncID.Func_MatchReqRelive, arg, ( jsResult : Object )=>{
            let ret = jsResult[key.ret] ;
            if ( ret == 0 )
            {
                if ( self.canPlayerRelive(sessionID) )
                {
                    XLogger.debug( "after fee do relive success uid = " + uid + " matchID = " + self.matchID  ) ;
                    self.doPlayerRelive(sessionID) ;
                    self.mMatch.sendMsgToClient(sessionID, eMsgType.MSG_PLAYER_REQ_MATCH_RELIVE, { ret : 0 } ) ;
                }
                else
                {
                    XLogger.debug( "after fee bu state can not  relive  give back fee uid = " + uid + " matchID = " + self.matchID  ) ;
                    self.mMatch.sendMsgToClient(sessionID, eMsgType.MSG_PLAYER_REQ_MATCH_RELIVE, { ret : 2 } ) ;
                    // give back relive fee ;
                    let argReback = {} ;
                    // arg : { uid : 2345, matchID : 323 , fee : IItem }
                    argReback[key.uid] = uid ;
                    argReback[key.matchID] = self.matchID;
                    argReback[key.fee] = self.mRoundCfg.reliveMoney;
                    arg[key.cfgID] = self.cfg.cfgID;
                    rpc.invokeRpc(eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_ReturnBackMatchReliveFee, argReback ) ;
                }
            }
            else
            {
                XLogger.debug( "fee not engoug  relive failed uid = " + uid + " matchID = " + self.matchID + " ret = " + ret ) ;
                self.mMatch.sendMsgToClient(sessionID, eMsgType.MSG_PLAYER_REQ_MATCH_RELIVE, { ret : ret } ) ;
            }
        } , null, uid ) ;
        return true ;
    }

    protected doPlayerRelive( sessionID : number )
    {
        let pidx = this.mFinishedPlayers.findIndex( ( p : MatchPlayer)=> p.sessionID == sessionID  ) ;
        this.mFinishedPlayers[pidx].state = eMathPlayerState.eState_Relived;
        this.mFinishedPlayers[pidx].score = this.cfg.initScore;
        let uid = this.mFinishedPlayers[pidx].uid;
        // relase playingMatch var in data ;
        let arg = { } ; arg[key.uid] = uid ; arg[key.matchID] = this.matchID ; arg[key.isStart] = 1 ;
        this.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_SetPlayingMatch , arg ) ;

        // check wait end ;
        let ploseIdx = this.mFinishedPlayers.findIndex( ( p : MatchPlayer)=> p.state == eMathPlayerState.eState_Lose  ) ;
        if ( ploseIdx == -1 )
        {
            XLogger.debug( "all player relived , so finish wait relive matchID = " + this.matchID ) ;
            if ( this.mReliveTimer != null )
            {
                clearTimeout(this.mReliveTimer) ;
                this.mReliveTimer = null ;
            }
            this.onWaitReliveFinish();
        }
    }

    protected canPlayerRelive( sessionID : number ) : boolean 
    {
        if ( this.mRoundCfg.canRelive == false )
        {
            XLogger.warn( "this round can not relive , cfgID = " + this.cfg.cfgID + " sessionID = " + sessionID + " roundIdx = " + this.mRoundCfg.idx ) ;
            return false;
        }

        if ( eLawState.eWaitRelive != this.mState && eLawState.ePlaying != this.mState )
        {
            XLogger.debug( "current state can not relive state = " + eLawState[this.mState] ) ;
            return false ;
        }

        let pidx = this.mFinishedPlayers.findIndex( ( p : MatchPlayer)=> p.sessionID == sessionID  ) ;
        if ( pidx == -1 )
        {
            XLogger.debug( "you are not in finish queue , so can't relive matchID = " + this.matchID + " sessionID = " + sessionID ) ;
            return false ;
        }

        if ( this.mFinishedPlayers[pidx].state != eMathPlayerState.eState_Lose )
        {
            XLogger.debug( "you are not in lose state , can not relive matchiID = " + this.matchID + " your state = " + eMathPlayerState[this.mFinishedPlayers[pidx].state] + " uid = " + this.mFinishedPlayers[pidx].uid ) ;
            return false ;
        }
        return true ;
    }

    onRobotReached( uid : number , sessionID : number ) : boolean
    {
        if ( this.mState != eLawState.eMatching )
        {
            XLogger.debug( "this state do not need robot uid = " + uid + " state = " + eLawState[this.mState] ) ;
            return false ;
        }

        let p = new MatchPlayer();
        p.isRobot = true ;
        p.lastRankIdx = -1 ;
        p.rankIdx = this.mFinishedPlayers.length ;
        p.roundIdx = null == this.mRoundCfg ? 0 :  this.mRoundCfg.idx ;
        p.score = this.cfg.initScore ;
        p.sessionID = sessionID ;
        p.signUpTime = 0 ;
        p.state = eMathPlayerState.eState_Relived ;
        p.stayDeskID = 0 ;
        p.uid = uid ;
        this.mFinishedPlayers.push(p) ;

        // set playing matchingID ;
        let arg = { } ; arg[key.uid] = uid ; arg[key.matchID] = this.matchID ; arg[key.isStart] = 1 ;
        this.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_SetPlayingMatch , arg ) ;

        XLogger.debug( "robot join match law , uid = " + uid + " matchID = " + this.matchID ) ;
        if ( (this.mFinishedPlayers.length % this.cfg.cntPerDesk) == 0 )
        {
            XLogger.debug( "matching ok , for the coming of robot uid = " + uid ) ;
            this.onMatchedOk();
        }
        return true ;
    }

    // self function 
    matchingPlayers()
    {
        this.mState = eLawState.eMatching;
        if ( this.mFinishedPlayers.length == 0 )
        {
            this.mFinishedPlayers = this.mAllPlayers.values().concat([]) ;
            XLogger.error( "start law should set finished players , matchID = " + this.matchID ) ;
        }

        // remve losed player , that will not join next round ;
        remove(this.mFinishedPlayers,( p )=> p.state != eMathPlayerState.eState_Promoted && eMathPlayerState.eState_Relived != p.state ) ;

        let notFullCnt = this.mFinishedPlayers.length % this.cfg.cntPerDesk ;
        if ( notFullCnt == 0  )
        {
            XLogger.debug( "match player cnt prope direct matched ok matchID = " + this.matchID + " playerCnt = " + this.mFinishedPlayers.length ) ;
            this.onMatchedOk();
            return ;
        }

        // kickout robot first ;
        if ( this.mFinishedPlayers.length > this.cfg.cntPerDesk )
        {
            let cntr = countBy(this.mFinishedPlayers,( p : MatchPlayer )=>p.isRobot ? 1 : 0 ) ;
            if ( cntr["1"] >= notFullCnt ) // kick will be ok 
            {
                let idx = this.mFinishedPlayers.findIndex(( p : MatchPlayer )=> p.isRobot ) ;
                XLogger.debug( "kick robot to keep desk cnt ok not full = " + notFullCnt + " matchID = " + this.matchID + " robot cnt = " + cntr["1"] ) ;
                while ( idx != -1 && notFullCnt-- > 0 )
                {
                    let pd = this.mFinishedPlayers.splice(idx,1) ;
                    this.onPlayerMatchResult(pd[0],true ) ;
                    idx = this.mFinishedPlayers.findIndex(( p : MatchPlayer )=> p.isRobot ) ;
                }
                
                this.onMatchedOk();
                return ;
            }
        }

        // not enough robot kick out 
        let needRobotCnt = this.cfg.cntPerDesk - notFullCnt ;
        XLogger.warn( "not enough robot kick out , need more robot to join matchID = " + this.matchID + " need robot cnt = " + needRobotCnt ) ;
        let arg = {} ;
        // arg { matchID : 23 , lawIdx : 23 , cnt : 23 }
        arg[key.matchID] = this.matchID;
        arg[key.lawIdx] = this.getIdx();
        arg[key.cnt] = needRobotCnt ;
        this.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_R, 0, eRpcFuncID.Func_ReqRobot, arg , ( result : Object )=>{
            if ( result["lackCnt"] > 0 )
            {
                XLogger.warn( "do not have enough robot for this match ? lackCnt = " + result["lackCnt"] + " matchID = " + this.matchID + " lawIdx = " + this.mLawIdx ) ;
            }
            else
            {
                XLogger.debug( "have enough robot for this match matchID = " + this.matchID + " lawIdx = " + this.mLawIdx ) ;
            }
        }) ;
    }

    onMatchedOk()
    {
        if ( this.mRoundCfg == null )
        {
            this.mRoundCfg = this.cfg.getLawRound(0) ;
        }
        else
        {
            this.mRoundCfg = this.cfg.getLawRound(this.mRoundCfg.idx + 1 ) ;
        }

        if ( this.mRoundCfg == null )
        {
            XLogger.error( "already finished , why come to here matchID = " + this.matchID + " cfgID = " + this.cfg.cfgID ) ;
            return ;
        }

        this.mState = eLawState.ePlaying;

        this.mPlayeringPlayers = shuffle( this.mFinishedPlayers );
        this.mFinishedPlayers.length = 0 ;
        this.putPlayersToDesk(this.mPlayeringPlayers);

        // reset rankIdx ;
        for ( let p of this.mPlayeringPlayers )
        {
            p.lastRankIdx = p.rankIdx ;
            p.rankIdx = -1 ;
            p.roundIdx = this.mRoundCfg.idx ;
            p.state = eMathPlayerState.eState_Playing ;
        }
    }

    onDeskFinished( deskID : number, result : { uid : number , score : number }[] ) : void 
    {
        let vDeskP : MatchPlayer[] = [] ;
        for ( let p of result )
        {
            let v = remove(this.mPlayeringPlayers, ( pl : MatchPlayer )=> pl.uid == p.uid );
            if ( null == v || v.length == 0 )
            {
                XLogger.error( "not playing players , how to finish ? matchID = " + this.matchID + " uid = " + p.uid ) ;
                continue ;
            }

            let pp = v[0];
            pp.score = p.score ;
            pp.stayDeskID = 0 ;
            pp.state = eMathPlayerState.eState_WaitOtherFinish;
            vDeskP.push(pp) ;
            this.mFinishedPlayers.push(pp) ;
        }

        if ( vDeskP.length == 0 )
        {
            XLogger.error( " player not in the law how to finish this law ? matchID = " + this.matchID + " lawIdx = " + this.getIdx() ) ;
            return ;
        }

        // process promoted
        if ( this.mRoundCfg.isByDesk )
        {
            this.processDeskRankPromote( vDeskP );
        }
        else
        {
            this.processAllRankPromote(vDeskP ) ;
        }

        // check if all desk finished ;
        if ( this.mPlayeringPlayers.length == 0 )
        {
            XLogger.debug( "all desk finished delay  matchID = " + this.matchID ) ;
            if ( this.mRoundFinishDelayTimer != null )
            {
                clearTimeout(this.mRoundFinishDelayTimer) ;
                this.mRoundFinishDelayTimer = null ;
            }

            let self = this ;
            this.mRoundFinishDelayTimer = setTimeout(() => {
                self.mRoundFinishDelayTimer = null ;
                XLogger.debug( "all desk do finished matchID = " + self.matchID ) ;
                self.onAllDeskFinished();
            }, MatchLaw.TIME_WAIT_ROUND_FINISH * 1000 );
            
        }
        else
        {
            XLogger.debug( "desk finished of matchID = " + this.matchID + " deskID = " + deskID + " left playercnt = " + this.mPlayeringPlayers.length ) ;
        }
    }

    protected processDeskRankPromote( vDeskFinished : MatchPlayer[] )
    {
        // process promoted
        vDeskFinished.sort( ( a : MatchPlayer, b : MatchPlayer )=>{
            if ( a.score != b.score )
            {
                return b.score - a.score ;
            }
            return a.signUpTime - b.signUpTime ;
        } );

        for ( let idx = 0 ; idx < vDeskFinished.length ; ++idx )
        {
            if ( idx >= this.mRoundCfg.promoteCnt )
            {
                vDeskFinished[idx].state = eMathPlayerState.eState_Lose;
                XLogger.debug( "player lose uid = " + vDeskFinished[idx].uid  + " matchID = " + this.matchID ) ;
            }
            else
            {
                vDeskFinished[idx].state = eMathPlayerState.eState_Promoted;
                XLogger.debug( "player promoted uid = " + vDeskFinished[idx].uid  + " matchID = " + this.matchID ) ;
            }
        }

        // sort idx ;
        this.mFinishedPlayers.sort( ( a : MatchPlayer, b : MatchPlayer )=>{
            if ( a.state != b.state )
            {
                return a.state - b.state ;
            }

            if ( a.score != b.score )
            {
                return b.score - a.score ;
            }
            return a.signUpTime - b.signUpTime ;
        } );

        let isLastRoundLastDesk = this.mPlayeringPlayers.length == 0 && this.cfg.isLastRound(this.mRoundCfg.idx);
        for ( let ridx = 0 ; ridx < this.mFinishedPlayers.length ; ++ridx )
        {
            let p = this.mFinishedPlayers[ridx] ;
            if ( p.rankIdx != ridx )
            {
                p.rankIdx = ridx ;
                if ( p.state == eMathPlayerState.eState_WaitOtherFinish || p.state == eMathPlayerState.eState_Relived || eMathPlayerState.eState_Promoted == p.state )
                {
                    if ( isLastRoundLastDesk == false )
                    {
                        this.informRankIdxUpddated(p) ;
                    }
                }
            }
        }

        // inform players losed ;
        for ( let lp of vDeskFinished )
        {
            if ( lp.state == eMathPlayerState.eState_Lose )
            {
                lp.rankIdx += this.mPlayeringPlayers.length / this.cfg.cntPerDesk  * this.mRoundCfg.promoteCnt ;
                lp.rankIdx = Math.floor(lp.rankIdx) ;
                this.onPlayerMatchResult( lp, true );
            }
        }
    }

    protected processAllRankPromote( vDeskFinished : MatchPlayer[] )
    {
        // process promoted
        this.mFinishedPlayers.sort( ( a : MatchPlayer, b : MatchPlayer )=>{
            if ( a.score != b.score )
            {
                return b.score - a.score ;
            }
            return a.signUpTime - b.signUpTime ;
        } );
        
        // update ranker idx and inform client and process lose out ;
        let isLastRoundLastDesk = this.mPlayeringPlayers.length == 0 && this.cfg.isLastRound(this.mRoundCfg.idx);
        for ( let ridx = 0 ; ridx < this.mFinishedPlayers.length ; ++ ridx )
        {
            let p = this.mFinishedPlayers[ridx] ;
            if ( p.rankIdx != ridx )
            {
                p.rankIdx = ridx ;
                if ( p.rankIdx >= this.mRoundCfg.promoteCnt && p.state == eMathPlayerState.eState_WaitOtherFinish )
                {
                    p.state = eMathPlayerState.eState_Lose;
                    XLogger.debug( `we known player lose uid = ${p.uid } + matchID = ${this.matchID} + rankIdx = ${p.rankIdx} ` ) ;
                    this.onPlayerMatchResult(p, true ) ;
                    continue ;
                }
                else if ( ( p.rankIdx + this.mPlayeringPlayers.length ) < this.mRoundCfg.promoteCnt )
                {
                    p.state = eMathPlayerState.eState_Promoted;
                    XLogger.debug( `we known player promoted uid = ${p.uid} + matchID = ${this.matchID} + rankIdx = ${p.rankIdx}` ) ;
                }

                if ( false == isLastRoundLastDesk )
                {
                    this.informRankIdxUpddated(p) ;
                }
            }

            if ( this.mPlayeringPlayers.length == 0 && eMathPlayerState.eState_WaitOtherFinish == p.state ) // last desk ;
            {
                p.state = ridx < this.mRoundCfg.promoteCnt ? eMathPlayerState.eState_Promoted : eMathPlayerState.eState_Lose ;
                if ( eMathPlayerState.eState_Lose == p.state )
                {
                    this.onPlayerMatchResult(p, true ) ;
                }
                else
                {
                    if ( false == isLastRoundLastDesk )
                    {
                        this.informRankIdxUpddated(p) ;
                    }
                }
            }
        }
    }

    protected onPlayerMatchResult( player : MatchPlayer , isLose : boolean )
    {
         // relase playingMatch var in data ;
        let arg = { } ; arg[key.uid] = player.uid ; arg[key.matchID] = this.matchID ; arg[key.isStart] = 0 ;
        this.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DATA, player.uid, eRpcFuncID.Func_SetPlayingMatch , arg ) ;
         
         // give prize ; // tell data svr ;
         let rewards = this.cfg.getRewardItemByIdx(player.rankIdx) ;
         if ( rewards != null )
         {
             if ( this.mRoundCfg.canRelive )
             {
                 XLogger.error( "this round can relive , can not get reward when lose cfgID = " + this.cfg.cfgID + " roundIdx = " + this.mRoundCfg.idx ) ;
             }
             else
             {
                // arg : { uid : 235 , rankIdx : 2 ,  reward : IItem[] , isBoLeMode : 0 , matchID : 2345, cfgID : 234 , matchName : "adfffs" }
                let argR = {} ;
                argR[key.uid] = player.uid ;
                argR[key.rankIdx] = player.rankIdx ;
                argR[key.reward] = rewards.rewards; 
                argR[key.matchID] = this.matchID ;
                argR[key.cfgID] = this.cfg.cfgID ;
                argR[key.matchName] = this.cfg.name ;
                argR[key.isBoLeMode] = this.cfg.isBoLeMode ? 1 : 0 ;
                this.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DATA, player.uid, eRpcFuncID.Func_MatchReward, argR ) ;
             }

         }

         XLogger.debug( `player match result uid = ${player.uid} rankIdx = ${player.rankIdx } state = ${ eMathPlayerState[player.state] }  matchID = ${this.matchID}  reward = ${JSON.stringify(rewards||{})} ` ) ;
         // send msg info client , if can relive , must not give prize ;
         let msg = {} ;
         msg[key.matchID] = this.matchID ;
         msg[key.rankIdx] = player.rankIdx  ;
         msg[key.moneyType ] = rewards != null ? rewards.getMoneyJs() : null ;
         msg[key.state] = player.state;
         msg[key.curRoundIdx] = this.mRoundCfg.idx;
         msg[key.canRelive] = this.mRoundCfg.canRelive ? 1 : 0 ;
         this.mMatch.sendMsgToClient(player.sessionID, eMsgType.MSG_PLAYER_MATCH_RESULT, msg ) ;
    }

    protected informRankIdxUpddated( player : MatchPlayer )
    {
        XLogger.debug( `player rankIdx changed uid = ${ player.uid } rankIdx = ${ player.rankIdx} state = ${ eMathPlayerState[player.state]} ` );
        // inform rank idx changed ;
        let msg = {} ;
        msg[key.matchID] = this.matchID ;
        msg[key.rankIdx] = player.rankIdx  ;
        msg[key.state] = player.state;
        msg[key.curRoundIdx] = this.mRoundCfg.idx;
        msg[key.canRelive] = 0;
        this.mMatch.sendMsgToClient(player.sessionID, eMsgType.MSG_PLAYER_MATCH_RESULT, msg ) ;
    }

    waitRelive()
    {
        this.mState = eLawState.eWaitRelive;

        if ( this.mReliveTimer != null )
        {
            clearTimeout(this.mReliveTimer) ;
            this.mReliveTimer = null ;
        }
        let self = this;
        this.mReliveTimer = setTimeout(() => {
            self.mReliveTimer = null ;
            XLogger.debug( "wait relive finished matchID = " + this.matchID ) ;
            self.onWaitReliveFinish();
        }, G_ARG.TIME_MATCH_WAIT_RELIVE );
    }

    onWaitReliveFinish()
    {
        this.matchingPlayers();
    }

    onMatchOvered()
    {
        this.mState = eLawState.eOvered ;
        XLogger.debug( "match do finished , matchID = " + this.matchID + " idx = " + this.mLawIdx ) ;
        for ( let player of this.mFinishedPlayers )
        {
            player.state = eMathPlayerState.eState_Finished;
            this.onPlayerMatchResult(player, false ) ;
        }  
        // save to db ;
        this.mDelegate.onLawFinished(this) ;
    }

    protected putPlayersToDesk( vPlayer : MatchPlayer[] )
    {
        // cacute desk need ; 
        let cntPerDesk = this.cfg.cntPerDesk ;
        if ( vPlayer.length % cntPerDesk != 0 )
        {
            XLogger.error( "put in to desk but player cnt is not porper for desk , cnt = " + vPlayer.length + " cntPerDesk = " + cntPerDesk ) ;
            return ;
        }

        let deskCnt = ( vPlayer.length / cntPerDesk ) ;
        deskCnt = Math.floor(deskCnt) ;
        // rpc call create desk ;
        let rpc = this.getRpc();
        let arg = {} ;
        arg[key.matchID] = this.matchID ;
        arg[key.lawIdx] = this.getIdx();
        arg[key.deskCnt] = deskCnt ;
        arg[key.diFen] = this.mRoundCfg.diFen;
        arg[key.roundCnt] = this.mRoundCfg.gameRoundCnt;
        arg[key.matchRoundIdx] = this.mRoundCfg.idx;
        arg[key.matchRoundCnt] = this.cfg.getLawRoundCnt();
        let self = this ;
        rpc.invokeRpc(this.gamePort, random(100,false), eRpcFuncID.Func_CreateMatchDesk, arg,(resut : Object )=>{
            // push player to desk ;
            let vDesks : number[] = resut[key.deskIDs] ;
            let idx = 0 ;
            let deskIdx = 0 ;
            while ( idx < vPlayer.length )
            {
                if ( deskIdx >= vDesks.length )
                {
                    XLogger.error( "desk is not enough matchID = " + self.mMatch.matchID + " playerCnt = " + vPlayer.length + " deskCnt = " + vDesks.length ) ;
                    break ;
                }

                let cnt = cntPerDesk ;
                let vPlayesTmp = [] ;
                let deskID = vDesks[deskIdx++] ;
                while ( cnt-- > 0 && idx < vPlayer.length )
                {
                    let p = vPlayer[idx++];
                    p.stayDeskID = deskID;
                    let js = {} ;
                    js[key.uid] = p.uid ;
                    js[key.sessionID] = p.sessionID ;
                    js[key.score] = p.score ;
                    js[key.isRobot ] = p.isRobot ? 1 : 0 ;
                    vPlayesTmp.push(js) ;
                }

                if ( vPlayesTmp.length != cntPerDesk )
                {
                    XLogger.warn( "a desk is not full cnt = " + vPlayesTmp.length + " total cnt = " + vPlayer.length + " matchID = " + self.matchID ) ;
                }

                // put to desk ;
                let argt = {} ;
                argt[key.deskID] = deskID ;
                argt[key.players] = vPlayesTmp ;
                XLogger.debug( "rpc call put player to desk matchID = " + self.matchID + " deskID = " + deskID + " lawIdx = " + self.getIdx() + " players = " + JSON.stringify(vPlayesTmp) ) ;
                rpc.invokeRpc(self.gamePort, deskID, eRpcFuncID.Func_PushPlayersToDesk, argt ) ;
            }

        } ) ;
        
    }

    protected onAllDeskFinished()
    {
        XLogger.debug( "match desk finished ,matchID = " + this.matchID + " roundIdx = " + this.mRoundCfg.idx ) ;
        // if final round give all promted prize and finish match ;
        if ( this.cfg.isLastRound(this.mRoundCfg.idx) )
        {
            XLogger.debug( "this is final round , match finish matchID = " + this.matchID + " finalPlayer cnt = " + this.mFinishedPlayers.length ) ;
            this.onMatchOvered();
            return ;
        }

        // if can relife , give some time to relive ;
        if ( this.mRoundCfg.canRelive )
        {
            let idxLose = this.mFinishedPlayers.findIndex( (p)=>p.state == eMathPlayerState.eState_Lose ) ;
            if ( idxLose != -1 )
            {
                XLogger.debug( "this round can relive , so wait player relive matchID = " + this.matchID ) ;
                this.waitRelive();
                return ;
            }
        }

        XLogger.debug( "start to next round direct matching players matchID = " + this.matchID ) ;
        // if can not relive direct matching a bit late if need ?;
        this.matchingPlayers();
    }

    clear()
    {
        this.mAllPlayers.clear();
        this.mFinishedPlayers.length = 0 ;
        this.mPlayeringPlayers.length = 0 ;
        this.mRoundCfg = null ;
        if ( this.mReliveTimer != null )
        {
            clearTimeout(this.mReliveTimer) ;
            this.mReliveTimer = null ;
        }
    }

    protected getRpc() : RpcModule
    {
        return this.mMatch.mMatchMgr.getSvrApp().getRpc();
    }
}