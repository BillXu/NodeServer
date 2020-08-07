import { MatchCfg, LawRound } from './../../shared/MatchConfigData';
import { RpcModule } from './../../common/Rpc/RpcModule';
import { XLogger } from './../../common/Logger';
import { key } from './../../shared/KeyDefine';
import { eRpcFuncID } from './../../common/Rpc/RpcFuncID';
import { random, shuffle, clone, remove } from 'lodash';
import  HashMap  from 'hashmap';
import { eMsgPort } from './../../shared/MessageIdentifer';
import { MatchPlayer, eMathPlayerState } from './MatchPlayer';
import { ePlayerNetState } from './../../common/commonDefine';
import { IMatchLaw, IMatchLawDelegate } from './IMatchLaw';
import { Match } from './Match';
import { ILawRoundConfig } from './IMatch' ;

export class MatchLaw implements IMatchLaw
{
    protected mMatch : Match = null ;
    protected mLawIdx : number = 0 ;

    protected mDelegate : IMatchLawDelegate = null ;
    protected mAllPlayers : HashMap<number,MatchPlayer> = null ; // { uid : player }

    protected mPromotedPlayers : MatchPlayer[] = [] ;
    protected mPlayeringPlayers : MatchPlayer[] = [] ;
    protected mWaitRelivePlayers : MatchPlayer[] = [] ;
    protected mRoundCfg : LawRound = null ;
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

    getIdx() : number 
    {
        return this.mLawIdx ;
    }

    startLaw( players : HashMap<number,MatchPlayer> ) : void 
    {
        this.mAllPlayers = players.clone();
        // set init score ;
        let socre = this.cfg.initScore ;
        let ps = this.mPromotedPlayers ;
        for ( let p of ps )
        {
            p.score = socre ;
            p.state = eMathPlayerState.eState_Playing ;
        }

        this.putPlayersToDesk() ;
        this.mPlayeringPlayers = this.mAllPlayers.values().concat([]) ;
        this.mPromotedPlayers.length = 0 ;
    }

    onRefreshPlayerNetState( uid : number , sessionID : number ,netState : ePlayerNetState  ) : boolean 
    {
        let vPlayers = this.mPromotedPlayers.concat(this.mWaitRelivePlayers,this.mPlayeringPlayers ) ;
        for ( let cp of vPlayers )
        {
            if ( cp.uid == uid )
            {
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
        }
        return false ;
    }

    setDelegate( pdel : IMatchLawDelegate ) : void 
    {
        this.mDelegate = pdel ;
    }

    visitPlayerMatchState( jsInfo : Object , sessionID : number ) : boolean
    {
        // check finished ;
        for ( let pf of this.mPromotedPlayers )
        {
            if ( pf.sessionID != sessionID )
            {
                continue ;
            }

            jsInfo[key.rankIdx] = pf.rankIdx ;
            return true ;
        }

        // check playing 
        for ( let pp of this.mPlayeringPlayers )
        {
            if ( pp.sessionID != sessionID )
            {
                continue ;
            }

            jsInfo[key.deskID] = pp.stayDeskID ;
            jsInfo[key.port] = this.mGamePort ;
            return true ;
        }
        
        return false ;
    }

    onPlayerWantRelive( sessionID : number ) : boolean
    {

    }

    onRobotReached( uid : number , sessionID : number )
    {

    }

    // self function 
    matchingPlayers()
    {
        if ( this.mPromotedPlayers.length = 0 )
        {
            this.mPromotedPlayers = this.mAllPlayers.values().concat([]) ;
        }

        let notFullCnt = this.mPromotedPlayers.length % this.cfg.cntPerDesk ;
        if ( notFullCnt == 0  )
        {
            XLogger.debug( "match player cnt prope direct matched ok matchID = " + this.matchID + " playerCnt = " + this.mPromotedPlayers.length ) ;
            this.mPromotedPlayers = shuffle(this.mPromotedPlayers) ;
            this.onMatchedOk();
            return ;
        }

        // kickout robot first ;
        let vKickOut = [] ;
        let idx = this.mPromotedPlayers.findIndex(( p : MatchPlayer )=> p.isRobot ) ;
        while ( idx != -1 && notFullCnt-- > 0 )
        {
            let vkp = this.mPromotedPlayers.splice(idx,1) ;
            vKickOut.push(vkp[0]) ;
            idx = this.mPromotedPlayers.findIndex(( p : MatchPlayer )=> p.isRobot ) ;
        }

        if ( notFullCnt == 0 )
        {
            for ( let k of vKickOut )
            {
                this.onPlayerLoseOut(k) ;
            }
            XLogger.debug( "robot kick out ok  matchID = " + this.matchID + " kick robot cnt = " + vKickOut.length ) ;
            this.mPromotedPlayers = shuffle(this.mPromotedPlayers) ;
            this.onMatchedOk();
            return ;
        }

        // not enough robot kick out 
        let vp = this.mPromotedPlayers ;
        vKickOut.forEach((ko )=>vp.push(ko)) ; // push kicked out back ;
        let needRobotCnt = this.cfg.cntPerDesk - notFullCnt ;
        XLogger.warn( "not enough robot kick out , need more robot to join matchID = " + this.matchID + " need robot cnt = " + needRobotCnt ) ;
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

        this.mPlayeringPlayers = this.mPromotedPlayers.concat([]) ;
        this.mPromotedPlayers.length = 0 ;
        this.putPlayersToDesk(this.mPlayeringPlayers);
        
        for ( let p of this.mWaitRelivePlayers )
        {
            this.mAllPlayers.delete(p.uid) ;
        }
        this.mWaitRelivePlayers.length = 0 ;

        // reset rankIdx ;
        for ( let p of this.mPlayeringPlayers )
        {
            p.lastRankIdx = p.rankIdx ;
            p.rankIdx = -1 ;
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
            vDeskP.push(pp) ;
        }

        // process promoted
        if ( this.mRoundCfg.isByDesk )
        {
            vDeskP.sort( ( a : MatchPlayer, b : MatchPlayer )=>{
                if ( a.score != b.score )
                {
                    return b.score - a.score ;
                }
                return a.signUpTime - b.signUpTime ;
            } );

            for ( let idx = 0 ; idx < vDeskP.length ; ++idx )
            {
                if ( idx < this.mRoundCfg.promoteCnt )
                {
                    vDeskP[idx].state = eMathPlayerState.eState_Promoted;
                    this.mPromotedPlayers.push( vDeskP[idx] ) ;
                }
                else
                {
                    vDeskP[idx].rankIdx = this.mPromotedPlayers.length + idx - this.mRoundCfg.promoteCnt;
                    this.onPlayerLoseOut( vDeskP[idx] );
                }
            }

            // update promated player idx ;
            this.mPromotedPlayers.sort( ( a : MatchPlayer, b : MatchPlayer )=>{
                if ( a.score != b.score )
                {
                    return b.score - a.score ;
                }
                return a.signUpTime - b.signUpTime ;
            } );

            for ( let ridx = 0 ; ridx < this.mPromotedPlayers.length ; ++ ridx )
            {
                let p = this.mPromotedPlayers[ridx] ;
                if ( p.rankIdx != ridx )
                {
                    p.rankIdx = ridx ;
                    this.sendResultToPlayer(p, false ) ;
                }
            }
        }
        else
        {
            for ( let idx = 0 ; idx < vDeskP.length ; ++idx )
            {
                vDeskP[idx].state = eMathPlayerState.eState_Promoted;
                this.mPromotedPlayers.push( vDeskP[idx] ) ;
            }

            this.mPromotedPlayers.sort( ( a : MatchPlayer, b : MatchPlayer )=>{
                if ( a.score != b.score )
                {
                    return b.score - a.score ;
                }
                return a.signUpTime - b.signUpTime ;
            } );

            // update ranker idx and inform client and process lose out ;
            let vR : MatchPlayer[]= [] ;
            for ( let ridx = 0 ; ridx < this.mPromotedPlayers.length ; ++ ridx )
            {
                let p = this.mPromotedPlayers[ridx] ;
                if ( p.rankIdx != ridx )
                {
                    p.rankIdx = ridx ;
                    if ( p.rankIdx >= this.mRoundCfg.promoteCnt )
                    {
                        vR.push(p) ;
                        this.onPlayerLoseOut(p) ;
                    }
                    else
                    {
                        this.sendResultToPlayer(p, false ) ;
                    }
                }
            }

            remove(this.mPromotedPlayers,(ppm )=>{
                let idx = vR.findIndex( (v)=>v.uid == ppm.uid ) ;
                return idx != -1 ;
            } ) ;
        }

        // check if all desk finished ;
        if ( this.mPlayeringPlayers.length == 0 )
        {
            XLogger.debug( "all desk finished matchID = " + this.matchID ) ;
            this.onAllDeskFinished();
        }
        else
        {
            XLogger.debug( "desk finished of matchID = " + this.matchID + " deskID = " + deskID + " left playercnt = " + this.mPlayeringPlayers.length ) ;
        }
    }

    protected onPlayerLoseOut( player : MatchPlayer ) : void
    {
        if ( null == player )
        {
            XLogger.warn( "player is null , how to lose out , matchID = " + this.matchID ) ;
            return ;
        }

        player.state = eMathPlayerState.eState_Lose;
        // send msg info client , if can relive , must not give prize ;
        this.sendResultToPlayer(player, true ) ;

        if ( this.mRoundCfg.canRelive == false || player.isRobot )
        {
            if ( player.isRobot )
            {
                XLogger.debug( "robot do not relive , just delete player uid = " + player.uid ) ;
            }
            else
            {
                XLogger.debug( "this round can't relive , just delete player uid = " + player.uid ) ;
            }
            
            this.deleteMatchPlayer( player.uid ) ;
        }
        else
        {
            XLogger.debug( "push player to wait relive vector uid = " + player.uid + " matchID = " + this.matchID ) ;
            this.mWaitRelivePlayers.push(player) ;
        }
    }

    protected deleteMatchPlayer( uid : number )
    {
        this.mAllPlayers.delete( uid ) ;

        let pl = this.mWaitRelivePlayers.findIndex(( pw )=>pw.uid == uid ) ;
        if ( pl == -1 )
        {
            XLogger.warn( "why already delete player from wait reliveVector uid = " + uid + " matchID = " + this.matchID + " roundIdx = " + this.mRoundCfg.idx ) ;
            return ;
        }
        this.mWaitRelivePlayers.splice(pl,1) ;
    }

    waitRelive()
    {

    }

    onWaitReliveFinish()
    {

    }

    onMatchOvered()
    {

    }

    protected sendResultToPlayer( player : MatchPlayer , isLoseOut : boolean )
    {
         // send msg info client , if can relive , must not give prize ;
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
                    p.state = eMathPlayerState.eState_Playing ;
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
        // if final round give all promted prize and finish match ;
        // if can relife , give some time relive ;
        // if can not relive direct matching a bit late if need ?;
    }

    protected clear()
    {
        this.mAllPlayers.clear();
        this.mPromotedPlayers.length = 0 ;
        this.mPlayeringPlayers.length = 0 ;
        this.mRoundCfg = null ;
    }

    protected get matchID() : number
    {
        return this.mMatch.matchID ;
    }

    protected getRpc() : RpcModule
    {
        return this.mMatch.mMatchMgr.getSvrApp().getRpc();
    }
}