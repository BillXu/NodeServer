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
    protected mGamePort : eMsgPort = 0 ;
    protected mLawIdx : number = 0 ;
    protected mPlayers = new HashMap<number,MatchPlayer>() // { uid : player }
    protected mRoundIdx : number = 0 ;
    protected mDelegate : IMatchLawDelegate = null ;
    protected mFinishedPlayers : MatchPlayer[] = [] ;
    protected mPlayeringPlayers : MatchPlayer[] = [] ;
    init( match : Match , gamePort : eMsgPort , lawIdx : number ) : void 
    {
        this.mMatch = match ;
        this.mGamePort = gamePort ;
        this.mLawIdx = lawIdx ;
    }

    getIdx() : number 
    {
        return this.mLawIdx ;
    }

    startLaw( players : HashMap<number,MatchPlayer> ) : void 
    {
        this.mPlayers.copy(players) ;
        // set init score ;
        let socre = this.mMatch.mCfg.initScore ;
        let ps = players.values() ;
        for ( let p of ps )
        {
            p.score = socre ;
            p.state = eMathPlayerState.eState_Playing ;
        }

        this.mPlayeringPlayers = clone( players.values() );
        this.putPlayersToDesk( this.mPlayeringPlayers ) ;
    }

    onDeskFinished( deskID : number, result : { uid : number , score : number }[] ) : void 
    {
        for ( let p of result )
        {
            let v = remove(this.mPlayeringPlayers, ( pl : MatchPlayer )=> pl.uid == p.uid );
            if ( null == v || v.length == 0 )
            {
                XLogger.error( "not playing players , how to finish ? matchID = " + this.matchID + " uid = " + p.uid ) ;
                continue ;
            }

            let pp = v[0];
            this.mFinishedPlayers.push(pp) ;
            pp.scoreRecorder.push(pp.score) ;
            pp.score = p.score ;
            pp.state = eMathPlayerState.eState_WaitResult;
        }

        this.mFinishedPlayers.sort( ( a : MatchPlayer , b : MatchPlayer )=>{
            let ret = b.score - a.score
            if ( ret == 0 && b.scoreRecorder.length > 0 && a.scoreRecorder.length > 0 )
            {
                return b.scoreRecorder[b.scoreRecorder.length-1] - a.scoreRecorder[a.scoreRecorder.length-1] ;
            }
            return ret ;
        } ) ;  // decs sort ;

        // refresh rankIdx ;
        this.mFinishedPlayers.forEach(( p : MatchPlayer, idx : number )=>p.rankIdx = idx ) ;

        if ( this.isFinalRound() == false )
        {
            let upgradeCnt = this.getUpgradePlayerCnt();
            // update rankIdx and modify state and remove lose players
            let vRemoveLosed = remove(this.mFinishedPlayers,( lp : MatchPlayer )=>{ lp.rankIdx >= upgradeCnt } ) ;
            for ( let rl of vRemoveLosed )
            {
                if ( this.mDelegate )
                {
                    XLogger.debug( "play out of matchID = " + this.matchID + " uid = " + rl.uid + " rankIdx = " + rl.rankIdx ) ;
                    this.mDelegate.onPlayerFinish(rl, rl.rankIdx + 1 , this ) ;
                }
            }
        }

        if ( this.mPlayeringPlayers.length == 0 ) // all desk finish , go on next round 
        {
            this.onAllDeskFinished();
        }
    }

    onRefreshPlayerNetState( uid : number , sessionID : number ,netState : ePlayerNetState  ) : void 
    {

    }

    setDelegate( pdel : IMatchLawDelegate ) : void 
    {
        this.mDelegate = pdel ;
    }

    // self function 
    protected putPlayersToDesk( vPlayer : MatchPlayer[] )
    {
        // cacute desk need ; 
        let cntPerDesk = this.getPlayerCntPerDesk();
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
        arg[key.deskCnt] = deskCnt ;
        arg[key.diFen] = this.getDiFenForThisRound();
        arg[key.roundCnt] = this.getRoundForThisRound();
        let self = this ;
        rpc.invokeRpc(this.mGamePort, random(100,false), eRpcFuncID.Func_CreateMatchDesk, arg,(resut : Object )=>{
            // push player to desk ;
            let vDesks : number[] = resut[key.deskIDs] ;
            let vSFPlayers = shuffle(vPlayer) ;
            let idx = 0 ;
            let deskIdx = 0 ;
            while ( idx < vSFPlayers.length )
            {
                if ( deskIdx >= vDesks.length )
                {
                    XLogger.error( "desk is not enough matchID = " + self.mMatch.matchID + " playerCnt = " + vPlayer.length + " deskCnt = " + vDesks.length ) ;
                    break ;
                }

                let cnt = cntPerDesk ;
                let vPlayesTmp = [] ;
                let deskID = vDesks[deskIdx++] ;
                while ( cnt-- > 0 && idx < vSFPlayers.length )
                {
                    let p = vSFPlayers[idx++];
                    p.stayDeskID = deskID;
                    p.state = eMathPlayerState.eState_Playing ;
                    let js = {} ;
                    js[key.uid] = p.uid ;
                    js[key.sessionID] = p.sessionID ;
                    js[key.score] = p.score ;
                    vPlayesTmp.push(js) ;
                }

                if ( vPlayesTmp.length != cntPerDesk )
                {
                    XLogger.warn( "a desk is not full cnt = " + vPlayesTmp.length + " total cnt = " + vSFPlayers.length + " matchID = " + self.matchID ) ;
                }

                // put to desk ;
                let argt = {} ;
                argt[key.matchID] = self.matchID ;
                argt[key.deskID] = deskID ;
                argt[key.lawIdx] = self.getIdx();
                argt[key.players] = vPlayesTmp ;
                XLogger.debug( "rpc call put player to desk matchID = " + self.matchID + " deskID = " + deskID + " lawIdx = " + self.getIdx() + " players = " + JSON.stringify(vPlayesTmp) ) ;
                rpc.invokeRpc(self.mGamePort, deskID, eRpcFuncID.Func_PushPlayersToDesk, argt ) ;
            }

        } ) ;
        
    }

    protected onAllDeskFinished()
    {
        if ( this.isFinalRound() )
        {
            if ( this.isGuaFenMode() )
            {
                let gufenCnt = this.getGuaFenPlayerCnt();
                let vRemoveLosed = remove(this.mFinishedPlayers,( lp : MatchPlayer )=>{ lp.rankIdx >= gufenCnt; } ) ;
                for ( let rl of vRemoveLosed )
                {
                    XLogger.debug( "can not join guaFen ,play out of matchID = " + this.matchID + " uid = " + rl.uid + " rankIdx = " + rl.rankIdx ) ;
                    this.mDelegate.onPlayerFinish(rl, rl.rankIdx + 1 , this ) ;
                }
                XLogger.debug( "match guaFen mode finished matchID = " + this.matchID ) ;
                if ( this.mFinishedPlayers.length != gufenCnt )
                {
                    XLogger.warn("this.mFinishedPlayers.length != gufenCnt , matchID = " + this.matchID + " cfgID = " + this.mMatch.mCfgID ) ;
                }
                this.mDelegate.onGuaFenResultFinished(this.mFinishedPlayers, this ) ;
            }
            else
            {
                XLogger.debug(" match finish matchID = " + this.matchID ) ;
                if ( this.mFinishedPlayers.length != this.getPlayerCntPerDesk() )
                {
                    XLogger.warn("this.mFinishedPlayers.length != this.getPlayerCntPerDesk() , matchID = " + this.matchID + " cfgID = " + this.mMatch.mCfgID ) ;
                }

                for ( let v of this.mFinishedPlayers )
                { 
                    this.mDelegate.onPlayerFinish(v, v.rankIdx + 1, this ) ;
                }
            }

            XLogger.debug( "on law finished matchID = " + this.matchID + " idx = " + this.getIdx() ) ;
            this.mDelegate.onLawFinished( this ) ;
            this.clear();
        }
        else
        {
            // if not finish all , go on next round ;
            ++this.mRoundIdx ;
            if ( this.mPlayeringPlayers.length != 0 )
            {
                XLogger.warn( "playing players not equal zero ? how finish this law ? matchID = " + this.matchID ) ;
            }
            this.mPlayeringPlayers.length = 0 ;
            let tmp = this.mPlayeringPlayers ;
            this.mPlayeringPlayers = this.mFinishedPlayers;
            this.mFinishedPlayers = tmp;
            this.putPlayersToDesk(this.mPlayeringPlayers) ;
        }
    }

    protected clear()
    {
        this.mPlayers.clear();
        this.mRoundIdx = 0 ;
        this.mFinishedPlayers.length = 0 ;
        this.mPlayeringPlayers.length = 0 ;
    }

    protected getPlayerCntPerDesk() : number
    {
        return this.mMatch.mCfg.playerCntPerDesk || 4 ;
    }

    protected getDiFenForThisRound() : number 
    {
        return this.getLawConfigForThisRound().diFen || 1 ;
    }

    protected getRoundForThisRound() : number
    {
        return this.getLawConfigForThisRound().gameRoundCnt || 4 ;
    }

    protected getUpgradePlayerCnt() : number
    {
        let cfg = this.getLawConfigForThisRound() ;
        return cfg.upgradeCnt ;
    }

    protected getLawConfigForThisRound() : ILawRoundConfig
    {
        let vcfgs = this.mMatch.mCfg.laws ;
        if ( vcfgs == null || vcfgs.length == 0 )
        {
            XLogger.error( "match law can not be null cfgID = " + this.mMatch.mCfgID ) ;
            return null ;
        }

        let usround = null ;
        for ( let v of vcfgs )
        {
            if ( v.roundIdx == this.mRoundIdx )
            {
                usround = v ;
                break ;
            }
        }

        if ( usround == null )
        {
            XLogger.error( "can not find proper law config round idx = " + this.mRoundIdx + " cfgID = " + this.mMatch.mCfgID ) ;
        }
        return usround ;
    }

    protected isFinalRound()
    {
        let vcfgs = this.mMatch.mCfg.laws ;
        if ( vcfgs == null || vcfgs.length == 0 )
        {
            XLogger.error( "match law can not be null cfgID = " + this.mMatch.mCfgID ) ;
            return null ;
        }

        let usround = null ;
        for ( let v of vcfgs )
        {
            if ( v.roundIdx == this.mRoundIdx + 1 )
            {
                usround = v ;
                break ;
            }
        }

        return usround == null ;
    }

    protected get matchID() : number
    {
        return this.mMatch.matchID ;
    }

    protected getRpc() : RpcModule
    {
        return this.mMatch.mMatchMgr.getSvrApp().getRpc();
    }

    protected isGuaFenMode() : boolean
    {
        return this.getGuaFenPlayerCnt() > 0 ;
    }

    protected getGuaFenPlayerCnt() : number
    {
        return this.mMatch.mCfg.guaFenPlayerCnt || 0 ;
    }
}