import { XLogger } from './../../common/Logger';
import { eRpcFuncID } from './../../common/Rpc/RpcFuncID';
import { key } from './../../shared/KeyDefine';
import { IMatchLaw, IMatchLawDelegate } from './IMatchLaw';
import  HashMap  from 'hashmap';
import { MatchPlayer, eMathPlayerState } from './MatchPlayer';
import { merge } from 'lodash';
import { MatchMgr } from './../MatchMgr';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { eMatchType, eMatchState, eItemType } from './../../shared/SharedDefine';
import { IMatch, IMatchConfig } from './IMatch';
import { MatchData } from './../../shared/MatchData';
export class Match extends MatchData implements IMatch , IMatchLawDelegate
{
    protected mMatchMgr : MatchMgr = null ;
    protected mSignedPlayers = new HashMap<number,MatchPlayer>(); // { uid , player  }
    protected mLaws = new HashMap<number,IMatchLaw>(); // { idx , law }
    protected mCfg : IMatchConfig = null ;
    protected mMaxLawIdx : number = 0 ;
    init( cfg : IMatchConfig , matchID : number ,mgr : MatchMgr ) : void
    {
        this.mCfg = cfg;
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

                self.mSignedPlayers.delete(uid) ;

                let argAddMone = {} 
                merge(argAddMone,self.getSignUpFee() ); 
                argAddMone[key.uid] = uid ; argAddMone[key.comment] = "cannecl match give back money uid = " + self.matchID ;
                rpc.invokeRpc( eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_addMoney, argAddMone ,null,null, uid ) ;
                XLogger.debug( "player cannecl match give back money uid = " + uid + " matchID = " + self.matchID + " money = " + argAddMone["moneyType"] + " cnt = " + argAddMone["cnt"] ) ;
           
                let argModify = {} ;argModify[key.uid] = uid ; argModify[key.matchID] = self.matchID ; argModify[key.isAdd] = 0 ;
                rpc.invokeRpc(eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_ModifySignedMatch , argModify ) ;
            }, orgID ) ;
            return true ;
        }
        return false ;
    }

    onVisitInfo( jsInfo : Object ) : void 
    {
        merge(jsInfo,this.toJson() ) ;
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
    onPlayerFinish( player : MatchPlayer , rankIdx : number, isFinal : boolean , matchLaw : IMatchLaw ) : void 
    {

    }

    onLawFinished( matchLaw : IMatchLaw ) : void 
    {
        this.mLaws.delete( matchLaw.getIdx() ) ;
    }

    // self config ;
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

    onPlayerSignedUp( uid : number , sessionID : number )
    {
        let p = new MatchPlayer() ;
        p.sessionID = sessionID ;
        p.uid = uid;
        p.signUpTime = Date.now();
        p.state = eMathPlayerState.eState_SignUp;
        this.mSignedPlayers.set(p.uid, p ) ;
        let arg = {} ;arg[key.uid] = uid ; arg[key.matchID] = this.matchID ; arg[key.isAdd] = 1 ;
        this.mMatchMgr.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_ModifySignedMatch , arg ) ;

        if ( this.mType == eMatchType.eMatch_Quick && this.mSignedPlayers.count() >= this.getPlayerLowLimitCnt() )
        {
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
        }
    }

    createMatchLaw() : IMatchLaw
    {

    }
}