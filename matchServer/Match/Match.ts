import { ePlayerNetState } from './../../common/commonDefine';
import { IMoney } from './../../shared/IMoney';
import { XLogger } from './../../common/Logger';
import { eRpcFuncID } from './../../common/Rpc/RpcFuncID';
import { key } from './../../shared/KeyDefine';
import { IMatchLaw, IMatchLawDelegate } from './IMatchLaw';
import  HashMap  from 'hashmap';
import { MatchPlayer, eMathPlayerState } from './MatchPlayer';
import { merge, random, clone, cloneWith, cloneDeep } from 'lodash';
import { MatchMgr } from './../MatchMgr';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { eMatchType, eMatchState, eItemType } from './../../shared/SharedDefine';
import { IMatch, IMatchConfig } from './IMatch';
import { MatchData } from './../../shared/MatchData';
export class Match extends MatchData implements IMatch , IMatchLawDelegate
{
    mMatchMgr : MatchMgr = null ;
    protected mSignedPlayers = new HashMap<number,MatchPlayer>(); // { uid , player  }
    protected mLaws = new HashMap<number,IMatchLaw>(); // { idx , law }
    mCfg : IMatchConfig = null ;
    protected mMaxLawIdx : number = 0 ;
    init( cfg : IMatchConfig , matchID : number ,mgr : MatchMgr ) : void
    {
        this.mCfg = cfg;
        this.mCfgID = cfg.id ;
        this.matchID = matchID ;
        this.mState = eMatchState.eMatch_SignUp ;
        this.mType = cfg.matchType ;
        this.mMatchMgr = mgr ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean 
    {
        if ( eMsgType.MSG_PLAYER_MATCH_SIGN_UP == msgID )
        {
            let uid = msg[key.uid] ;
            if ( eMatchState.eMatch_SignUp != this.mState )
            {
                XLogger.debug( "math not wait signup state  uid = " + uid + " matchID = " + this.matchID + " state = " + this.mState ) ;
                this.sendMsgToClient(orgID, msgID, { ret : 7 , matchID : this.getMatchID(), type : this.mType  } ) ;
                return true ;
            }

            if ( this.mSignedPlayers.count() >= this.getPlayerTopLimitCnt() )
            {
                XLogger.debug( "match player cnt is full uid = " + uid + " matchID = " + this.matchID ) ;
                this.sendMsgToClient(orgID, msgID, { ret : 6 , matchID : this.getMatchID(), type : this.mType  } ) ;
                return true ;
            }

            if ( this.mSignedPlayers.has(uid) )
            {
                XLogger.debug( "already signed up in this match uid = " + uid + " matchID = " + this.matchID ) ;
                this.sendMsgToClient(orgID, msgID, { ret : 4, matchID : this.getMatchID() , type : this.mType } ) ;
                return true;
            }

            let rpc = this.mMatchMgr.getSvrApp().getRpc();
            let arg = {} ;arg[key.uid] = uid ; arg[key.sessionID] = orgID ;
            let self = this ;
            rpc.invokeRpc(eMsgPort.ID_MSG_PORT_DATA, uid,eRpcFuncID.Func_ReqPlayerPlayingMatch , arg ,( result : Object )=>{
                let ret = result[key.ret] ;
                if ( 1 == ret || 2 == ret )
                {
                    XLogger.debug( "can not find player with uid = " + uid + " matchID = " + self.matchID + " ret = " + ret ) ;
                    self.sendMsgToClient(orgID, msgID, { ret : 5 , matchID : self.getMatchID()  , type : self.mType } ) ;
                    return ;
                }

                let matchID = result[key.matchID] || 0 ;
                if ( self.matchID == matchID )
                {
                    XLogger.debug( "already in this match uid = " + uid + " matchID = " + self.matchID ) ;
                    self.sendMsgToClient(orgID, msgID, { ret : 4, matchID : self.getMatchID()  , type : self.mType } ) ;
                    return ;
                }

                if ( matchID != 0 )
                {
                    XLogger.debug( "already playing other match player uid = " + uid + " matchID = " + self.matchID + " other matchID = " + matchID ) ;
                    self.sendMsgToClient(orgID, msgID, { ret : 3 , matchID : self.getMatchID()  , type : self.mType } ) ;
                    return ;
                }

                // deduction fee ;
                let argFee = {} ;
                argFee[key.uid] = uid ;
                argFee[key.sessionID] = orgID ;
                let feeinfo = self.getSignUpFee();
                argFee[key.moneyType] = feeinfo.moneyType ;
                argFee[key.cnt] = feeinfo.cnt ;
                argFee[key.comment] = "signUpFee matchID = " + self.matchID ;
                rpc.invokeRpc( eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_DeductionMoney, argFee,( result : Object )=>{
                    let ret = result[key.ret] ;
                    self.sendMsgToClient(orgID, msgID, { ret : ret , matchID : self.getMatchID() , type : self.mType } ) ;
                    if ( ret != 0 )
                    {
                        XLogger.debug( "deduction money error can not sign up uid = " + uid + " ret = " + ret + " matchID = " + self.getMatchID() ) ;
                        return ;
                    }

                    XLogger.debug( "sign up success , uid = " + uid + " matchID = " + self.matchID ) ;
                    self.onPlayerSignedUp( uid,orgID );
                }) ;

            } ,null,orgID ) ;
            return true ;
        }
        else if ( eMsgType.MSG_PLAYER_MATCH_SIGN_OUT == msgID )
        {
            let uid = msg[key.uid] ;

            if ( eMatchState.eMatch_SignUp != this.mState )
            {
                XLogger.debug( "1 math not wait signup state  uid = " + uid + " matchID = " + this.matchID + " state = " + this.mState ) ;
                this.sendMsgToClient(orgID, msgID, { ret : 4 } ) ;
                return true ;
            }

            if ( this.mSignedPlayers.has(uid) == false )
            {
                XLogger.debug( "you are not in signup list  match uid = " + uid + " matchID = " + this.matchID ) ;
                this.sendMsgToClient(orgID, msgID, { ret : 3 } ) ;
                return true ;
            }

            let rpc = this.mMatchMgr.getSvrApp().getRpc();
            let arg = {} ;arg[key.uid] = uid ; arg[key.sessionID] = orgID ;
            let self = this ;
            rpc.invokeRpc(eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_CheckUID, arg,( result : Object )=>{
                let ret = result[key.ret] ;
                if ( ret != 0 )
                {
                    XLogger.warn( "can't find player this uid = " + uid + " sessionID = " + orgID + " matchID = " + self.matchID ) ;
                    self.sendMsgToClient(orgID, msgID, { ret : ret  } ) ;
                    return ;
                }

                let p = self.mSignedPlayers.get(uid) ;
                if ( !p )
                {
                    XLogger.error( "why sign up player is null ? match started ? uid = " + uid + " matchID = " + self.matchID ) ;
                    self.sendMsgToClient(orgID, msgID, { ret : 3  } ) ;
                    return ;
                }
                XLogger.debug( "player do canncel match sigup matchID = " + self.matchID + " uid = " + uid ) ;
                self.doCanncelSignedUp(uid) ;
                self.sendMsgToClient(orgID, msgID, { ret : 0 , matchID : self.matchID } ) ;
            }, orgID ) ;
            return true ;
        }
        return false ;
    }

    onVisitInfo( jsInfo : Object ) : void 
    {
        merge(jsInfo,this.toJson() ) ;
    }

    onDeskFinished( lawIdx : number ,  deskID : number, result : { uid : number , score : number }[] ) : void 
    {
        let law = this.mLaws.get(lawIdx) ;
        if ( law == null )
        {
            XLogger.warn( "inform desk finish , but law is null ? matchID = " + this.matchID + " lawIdx = " + lawIdx ) ;
            return ;
        }
        XLogger.debug( "recieved desk Result deskID = " + deskID + " matchID = " + this.matchID + " lawIdx = " + lawIdx + " detail = " + JSON.stringify(result) ) ;
        law.onDeskFinished(deskID, result ) ;
    }

    onRefreshPlayerNetState( uid : number , sessionID : number ,netState : ePlayerNetState ) : boolean 
    {
        let lws = this.mLaws.values() ;
        for ( let l of lws )
        {
            if ( l.onRefreshPlayerNetState(uid, sessionID, netState) )
            {
                XLogger.debug( "match recived player net state matchiID = " + this.matchID + " uid = " + uid + " sessionID = " + sessionID + " state = " + netState ) ;
                return true ;
            }
        }

        XLogger.debug( "player state change not processed uid = " + uid + " matchID = " + this.matchID ) ;
        return false ;
    }

    getType() : eMatchType 
    {
        return this.mType ;
    } 

    getMatchID() : number 
    {
        return this.matchID ;
    }

    isClosed() : boolean 
    {
        return this.mState == eMatchState.eMatch_Closed ;
    }

    // imatchLaw delegate
    onPlayerFinish( player : MatchPlayer , rankIdx : number , matchLaw : IMatchLaw ) : void 
    {
        let rewards = this.mCfg.reward;
        let isGuaFen = rewards.length == 1 ;

        let vMoney : IMoney[] = null ;
        if ( isGuaFen == false ) // gua fen prize will not distribute here ;
        {
            for ( let r of rewards )
            {
                if ( r.startIdx <= rankIdx && rankIdx <= r.endEndIdx )
                {
                    vMoney = r.money ;
                    break;
                }
            }
        }

        // give prize ;
        // relase playingMatch var in data ;
        // tell data svr ;
        let arg = {} ;
        arg[key.uid] = player.uid ;
        arg[key.rankIdx] = rankIdx ;
        arg[key.reward] = vMoney ;
        arg[key.matchID] = this.matchID ;
        arg[key.matchName] = this.mCfg.matchName ;
        this.mMatchMgr.getSvrApp().getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DATA, player.uid, eRpcFuncID.Func_MatchResult, arg ) ;

        // tell player ;
        let msg = {} ;
        msg[key.matchID] = this.matchID ;
        msg[key.rankIdx] = rankIdx ;
        msg[key.moneyType ] = vMoney ;
        this.sendMsgToClient(player.sessionID, eMsgType.MSG_PLAYER_MATCH_RESULT, msg ) ;
        return ;
    }

    onGuaFenResultFinished( player : MatchPlayer[] , matchLaw : IMatchLaw )
    {
        if ( this.mCfg.reward.length != 1 )
        {
            XLogger.debug("why gua fen reword have more than one ? cfgID = " + this.mCfgID ) ; 
        }
        
        let moneyReword = this.mCfg.reward[0].money[0] ;
        let vgufen = this.guaFen( moneyReword.cnt * 100 , player.length ) ; // yuan to fen , keep interger .
        for ( let idx = 0 ; idx < player.length ; ++idx )
        {
            let p = player[idx] ;
            // give prize ;
            // relase playingMatch var in data ;
            // tell data svr ;
            let vMoney = clone(moneyReword) ;
            vMoney.cnt = vgufen[idx] / 100 ;
            let arg = {} ;
            arg[key.uid] = p.uid ;
            arg[key.rankIdx] = idx + 1 ;
            arg[key.reward] = vMoney;
            arg[key.matchID] = this.matchID ;
            arg[key.matchName] = this.mCfg.matchName ;
            this.mMatchMgr.getSvrApp().getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DATA, p.uid, eRpcFuncID.Func_MatchResult, arg ) ;

            // tell player ;
            let msg = {} ;
            msg[key.matchID] = this.matchID ;
            msg[key.rankIdx] = idx + 1 ;
            msg[key.moneyType ] = vMoney ;
            this.sendMsgToClient(p.sessionID, eMsgType.MSG_PLAYER_MATCH_RESULT, msg ) ;
        }
    }

    onLawFinished( matchLaw : IMatchLaw ) : void 
    {
        this.mLaws.delete( matchLaw.getIdx() ) ;
    }

    // self function ;
    protected guaFen( total : number , cnt : number  ) : number[]
    {
        let aver = ( total / cnt ) * 0.05;
        let base = Math.floor(aver) ;
        base = Math.max( base, 1 ) ;
        let vp = new Array<number>();
        for ( let idx = 0 ; idx < cnt ; ++idx )
        {
            vp.push(base) ;
        }

        total -= base * cnt ;
        let step = ( total / Math.max(100 ,cnt ) ) ;
        step = Math.floor(step) ;
        step = Math.max(step,1) ;
        while ( total != 0 )
        {
            let real = step ;
            if ( step >= total )
            {
                real = total ;
            }
            let idx = random(cnt-1,false);         
            vp[idx] += real ;
            total -= real ;
        }
        return vp ;
    }

    sendMsgToClient( nSessionID : number , msgID : eMsgType , msg : Object )
    {
        this.mMatchMgr.sendMsg(msgID, msg,eMsgPort.ID_MSG_PORT_CLIENT , nSessionID, this.matchID ) ;
    }

    getSignUpFee() : { moneyType : eItemType , cnt : number }
    {
        return this.mCfg.signUpFee ;
    }

    getPlayerTopLimitCnt() : number
    {
        if ( this.mCfg.playerCntLimt.length != 2 )
        {
            XLogger.error( "config error id = " + this.mCfg.id ) ;
            return this.mCfg.playerCntLimt[0] ;
        }
        return this.mCfg.playerCntLimt[1] ;
    }

    getPlayerLowLimitCnt()
    {
        return this.mCfg.playerCntLimt[0] ;
    }

    protected onPlayerSignedUp( uid : number , sessionID : number )
    {
        let p = new MatchPlayer() ;
        p.sessionID = sessionID ;
        p.uid = uid;
        p.signUpTime = Date.now();
        p.state = eMathPlayerState.eState_SignUp;
        this.mSignedPlayers.set(p.uid, p ) ;
        let arg = {} ;arg[key.uid] = uid ; arg[key.matchID] = this.matchID ; arg[key.isAdd] = 1 ;
        this.mMatchMgr.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_ModifySignedMatch , arg ) ;
    }

    protected doEneterMatchBattle()
    {
        // inform data , palyer enter playing 
        let vIDs = this.mSignedPlayers.keys();
        for ( let uid of vIDs )
        {
            let arg = { } ; arg[key.uid] = uid ; arg[key.matchID] = this.matchID ; arg[key.isStart] = 1 ;
            this.mMatchMgr.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_SetPlayingMatch , arg ) ;
        }

        // create law to start battle ;
        let law = this.createMatchLaw();
        law.init(this, this.mCfg.gamePort, ++this.mMaxLawIdx ) ;
        if ( this.mLaws.has(law.getIdx() ))   
        {
            XLogger.error("why duplicate law idx = " + law.getIdx() + " matchID = " + this.matchID + " configID = " + this.mCfg.id ) ;
            this.mMaxLawIdx += 10000;
            law.init(this, this.mCfg.gamePort, ++this.mMaxLawIdx ) ;
        }

        law.setDelegate(this) ;
        this.mLaws.set(law.getIdx(), law ) ;
        law.startLaw(this.mSignedPlayers) ;
        this.mSignedPlayers.clear();
        XLogger.info( "start a match law , go on aceept signed up  matchID = " + this.matchID + " law idx = " + law.getIdx() ) ;
        this.mState = eMatchState.eMatch_Playing ;
    }

    protected doCanncelSignedUp( uid : number )
    {
        let p = this.mSignedPlayers.get(uid) ;
        if ( !p )
        {
            XLogger.error( "why sign up player is null ? match started ? uid = " + uid + " matchID = " + this.matchID ) ;
            return ;
        }

        this.mSignedPlayers.delete(uid) ;

        let rpc = this.mMatchMgr.getSvrApp().getRpc();

        let argAddMone = {} 
        merge(argAddMone,this.getSignUpFee() ); 
        if ( argAddMone[key.cnt] != 0 )
        {
            argAddMone[key.uid] = uid ; argAddMone[key.comment] = "cannecl match give back money uid = " + this.matchID ;
            rpc.invokeRpc( eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_addMoney, argAddMone ,null,null, uid ) ;
            XLogger.debug( "cannecl match give back money uid = " + uid + " matchID = " + this.matchID + " money = " + argAddMone[key.moneyType] + " cnt = " + argAddMone[key.cnt] ) ;
        }
        else
        {
            XLogger.debug( "match is fee so , canncel need not give back money matchID = " + this.matchID + "cfgID = " + this.mCfg.id ) ;
        }
   
        let argModify = {} ;argModify[key.uid] = uid ; argModify[key.matchID] = this.matchID ; argModify[key.isAdd] = 0 ;
        rpc.invokeRpc(eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_ModifySignedMatch , argModify ) ;
    }

    createMatchLaw() : IMatchLaw
    {
        return null ;
    }
}