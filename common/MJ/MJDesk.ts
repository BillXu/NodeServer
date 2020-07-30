import { MJPlayerData } from './../../shared/mjData/MJPlayerData';
import { ePlayerNetState } from './../commonDefine';
import { key } from './../../shared/KeyDefine';
import { MJDeskStateWaitOtherAct } from './MJDeskStateWaitOtherAct';
import { MJDeskStateWaitAct } from './MJDeskStateWaitAct';
import { MJDeskStateStart } from './MJDeskStateStart';
import { MJCards } from './MJCards';
import { eMJActType } from './../../shared/mjData/MJDefine';
import { XLogger } from './../Logger';
import { eMJDeskState, eMJPlayerState } from './../../shared/SharedDefine';
import { IMJDeskState } from './IMJDeskState';
import { DeskMgr } from './DeskMgr';
import { eRpcFuncID } from './../Rpc/RpcFuncID';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { IDesk, IDeskDelegate } from './IDesk';
import { MJDeskData } from './../../shared/mjData/MJDeskData';
import { MJDeskStateWaitStart } from './MJDeskStateWaitStart';
import { MJDeskStateGameEnd } from './MJDeskStateGameEnd';
export class MJDesk extends MJDeskData implements IDesk
{
    protected mDelegate : IDeskDelegate = null ;
    protected mDeskMgr : DeskMgr = null ;
    protected vStates : IMJDeskState[] = [] ;
    protected mMJCards : MJCards = null ;
    get stateInfo() : Object
    {
        let js = {} ;
        this.vStates[this.state].visitInfo(js) ;
        return js ;
    }

    get leftCardCnt() : number
    {
        return this.mMJCards.getLeftCnt();
    }

    //  idesk 
    init( deskID : number , diFen : number , roundCnt : number , delegate : IDeskDelegate , deskMgr : DeskMgr ) : void 
    {
        this.deskID = deskID ;
        this.diFen = diFen ;
        this.roundCnt = roundCnt ;
        this.mDelegate = delegate ;
        this.mDeskMgr = deskMgr ;
        this.intallDeskState();
        this.createMJCards();
        this.bankerIdx = 0 ;
    }

    setMatchInfo( matchID : number , lawIdx : number ) : void 
    {
        this.matchID = matchID ;
        this.lawIdx = lawIdx ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean 
    {
        let p = this.getPlayerBySessionID(orgID) ;
        if ( p == null )
        {
            XLogger.error( "player not in this room , can not process msg sessionID = " + orgID + " deskID = " + this.deskID ) ;
            msg[key.ret] = 200 ;
            msg["err"] = "you are not in this room deskID " + this.deskID;
            this.sendMsgToPlayer(orgID, msgID, msg ) ;
            return false ;
        }

        if ( eMsgType.MSG_PLAYER_MJ_REQ_DESK_INFO == msgID )
        {
            this.sendDeskInfoToPlayer(p.nIdx) ;
            this.vStates[this.state].onPlayerReuesetInfo(p.nIdx) ;
            return true ;
        }

        let s = this.vStates[this.state];
        if ( s )
        {
           return this.onLogicMsg(msgID, msg, orgID) ;
        }
        else
        {
            XLogger.warn("why current state is null ? state = " + this.state + " deskID = " + this.deskID ) ;
        }
        return false ;
    }

    onRpcCall( funcID : eRpcFuncID , arg : Object , sieralNum : number ) : Object 
    {
        if ( eRpcFuncID.Func_DeskUpdatePlayerNetState == funcID )
        {
            let uid = arg[key.uid] ;
            let sessionID = arg[key.sessionID] ;
            let netState = arg[key.state] ;
            
            for ( let p of this.vPlayers )
            {
                if ( p != null && p.uid == uid )
                {
                    p.sessionID = sessionID ;
                    if ( netState == ePlayerNetState.eState_Disconnected )
                    {
                        p.state = eMJPlayerState.eState_TuoGuan ;
                    }
                    else if ( netState == ePlayerNetState.eState_WaitingReconnect )
                    {
                        p.state = eMJPlayerState.eState_Offline ;
                    }
                    else
                    {
                        p.state = eMJPlayerState.eState_Online ;
                    }
                }
            }
            return {} ;
        }
        return {} ;
    }

    onPlayerEnter( uid : number , sessionID : number , score : number ) : boolean 
    {
        // check if already in room ?
        for ( let pp of this.vPlayers )
        {
            if ( pp != null && pp.uid == uid )
            {
                pp.sessionID = sessionID ;
                pp.score = score ;
                XLogger.warn( "why player already double enter desk uid = " + uid + " deskID = " + this.deskID ) ;
                this.sendDeskInfoToPlayer(pp.nIdx) ;
                return true ;
            }
        }

        let p = this.createMJPlayerData();
        p.init(uid, sessionID, score) ;
        if ( false == this.addPlayer(p) )
        {
            return false ;
        }
        this.sendDeskMsg(eMsgType.MSG_DEDK_MJ_PLAYER_ENTER, p.toJson(), p.nIdx ) ;
        this.sendDeskInfoToPlayer( p.nIdx) ;
        return true ;
    }

    // self function 
    canStartGame() : boolean
    {
        return this.vPlayers.length == this.seatCnt && this.curRoundIdx < this.roundCnt;
    }

    distributeCards()
    {
        this.mMJCards.shuffle();

        let msg = { } ;
        msg[key.bankerIdx] = this.bankerIdx ;
        for ( let p of this.vPlayers )
        {
            let vCards = [] ;
            let cnt = this.bankerIdx == p.nIdx ? 13 : 12 ;
            while ( cnt-- )
            {
                vCards.push(this.mMJCards.getCard() ) ;
            }

            p.onDistributedCard(vCards) ;

            msg[key.holdCards] = vCards ;

            XLogger.debug( "distributed cards , deskID = " + this.deskID + " uid = " + p.uid + " idx = " + p.nIdx + " msg : " + JSON.stringify(msg) ) ;
            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_DESK_MJ_DISTRIBUTE, msg ) ;
        }
    }

    informOtherPlayerAct( playerIdxes : number[], card : number , invokeIdx : number , isBuGang : boolean )
    {
        let msg = {} ;
        msg[key.card] = card ;
        msg[key.invokerIdx] = invokeIdx ;
        msg[key.isBuGang] = isBuGang ? 1 : 0 ;
        for ( let p of this.vPlayers )
        {
            if ( p == null || p.state != eMJPlayerState.eState_Online || -1 == playerIdxes.indexOf(p.nIdx) )
            {
                continue ;
            }

            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_DEKS_MJ_INFORM_ACT_WITH_OTHER_CARD , msg ) ;
        }
    }

    informSelfAct( idx : number , enterAct : eMJActType )
    {
        let p = this.getPlayerByIdx(idx) ;
        if ( p != null && p.state == eMJPlayerState.eState_Online )
        {
            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_DEKS_MJ_INFORM_SELF_ACT , { isOnlyChu : ( enterAct == eMJActType.eMJAct_Peng ? 1 : 0 ) } ) ;
        }
    }

    canPlayerDoActWithOtherCard( idx : number ,act : eMJActType , card : number , invokerIdx : number , haveGang : boolean, eatWith? : number[]  ) : boolean 
    {
        let p = this.getPlayerByIdx(idx) ;
        switch ( act )
        {
            case eMJActType.eMJAct_Pass:
                {
                    return true ;
                }
                break ;
            case eMJActType.eMJAct_Chi:
                {
                    if ( this.enableChi() == false )
                    {
                        return false ;
                    }

                    if ( idx != this.getNextActIdx( invokerIdx ) )
                    {
                        return false ;
                    }

                    return p.canChi(card, eatWith) ;
                }
                break;
            case eMJActType.eMJAct_Peng:
                {
                    return p.canPeng(card) ;
                }
                break ;
            case eMJActType.eMJAct_MingGang:
                {
                    if ( this.canLeftCardBeMo() == false )
                    {
                        return false ;
                    }

                    return p.canMingGang(card) ;
                }
                break;
            case eMJActType.eMJAct_Hu:
                {
                    return this.canPlayerHu(idx, card, false, haveGang, invokerIdx)
                }
                break;
            default:
                {
                    XLogger.warn( "you should do act with other card act = " + act + " deskID = " + this.deskID + " uid = " + p.uid )  ;
                    return false ;
                }
        }
        return true ;
    }

    getPlayerAutoChuCard( idx : number ) : number
    {
        return this.getPlayerByIdx(idx).getAutoChuCard();
    }

    getPlayersNeedTheCard( card : number , invokerIdx : number , haveGang : boolean , isBuGang : boolean ) : { idx : number , maxAct : eMJActType } []
    {
        let v = [] ;
        for ( let p of this.vPlayers )
        {
            if ( p == null || p.nIdx == invokerIdx )
            {
                continue ;
            }

            if ( this.canPlayerHu( p.nIdx, card, false, haveGang, invokerIdx) )
            {
                v.push( { idx : p.nIdx , maxAct : eMJActType.eMJAct_Hu } ) ;
                continue ;
            }

            if ( isBuGang )
            {
                continue ;
            }

            if ( p.canPeng(card) )  // no need check mingGang . can not be apprear at same time ;
            {
                v.push( { idx : p.nIdx , maxAct : eMJActType.eMJAct_Peng } ) ;
                continue ;
            }

            if ( this.enableChi() && p.canChi(card) )
            {
                v.push( { idx : p.nIdx , maxAct : eMJActType.eMJAct_Chi } ) ;
            }
        }
        return v ;
    }

    getNextActIdx( curIdx : number ) : number
    {
        return ( curIdx + 1 ) % this.seatCnt ;
    }

    onGameOver( isHuOver : boolean )
    {
        // send msg first ;
        let vp = [] ;
        for ( let p of this.vPlayers )
        {
            vp.push( { idx : p.nIdx , offset : p.offset, final : p.score } ) ;
            p.onGameOver() ;
        }
        let msg = {} ;
        msg["isHuOver"] = isHuOver ? 1 : 0 ;
        msg[key.result] = vp ;
        this.sendDeskMsg(eMsgType.MSG_DESK_MJ_GAME_OVER, msg ) ;
        this.bankerIdx = this.getNextActIdx(this.bankerIdx) ;

        ++this.curRoundIdx ;
        if ( this.curRoundIdx == this.roundCnt )
        {
            let vr = [] ;
            for ( let p of this.vPlayers )
            {
                vr.push( { uid : p.uid , score : p.score } ) ;
            }
            XLogger.debug( "desk finished deskID = " + this.deskID ) ;
            this.vStates[this.state].onLevelState();
            this.vPlayers.length = 0 ;
            this.mDelegate.onDeskFinished(vr, this ) ;
        }
    }

    protected intallDeskState()
    {
        this.vStates.push( new MJDeskStateWaitStart() ) ;
        this.vStates.push ( new MJDeskStateStart() );
        this.vStates.push( new MJDeskStateWaitAct() );
        this.vStates.push( new MJDeskStateWaitOtherAct() ) ;
        this.vStates.push( new MJDeskStateGameEnd() ) ;
        this.state = eMJDeskState.eState_WaitStart;
        this.vStates[this.state].onEnterState(null) ;
    }

    protected createMJCards()
    {
        if ( this.mMJCards == null )
        {
            this.mMJCards = new MJCards( false ) ;
        }
    }
    
    transferState( state : eMJDeskState , info? : any )
    {
        if ( this.state == state )
        {
            XLogger.warn( "duplicate enter same state = " + state + " deskID = " + this.deskID ) ;
        }

        if ( this.vStates[this.state] != null )
        {
            this.vStates[this.state].onLevelState();
        }
        this.state = state ;
        this.vStates[this.state].onEnterState(info) ;
    }

    sendMsgToPlayer( nSessionID : number , msgID : eMsgType , msg : Object )
    {
        this.mDeskMgr.sendMsg(msgID, msg, eMsgPort.ID_MSG_PORT_CLIENT, nSessionID, this.deskID ) ;
    }

    sendDeskMsg( msgID : eMsgType , msg : Object , ignorePlayerIdx? : number )
    {
        for ( let p of this.vPlayers )
        {
            if ( p == null || p.state != eMJPlayerState.eState_Online )
            {
                continue ;
            }

            if ( ignorePlayerIdx != null && p.nIdx == ignorePlayerIdx )
            {
                continue ;
            }
            this.sendMsgToPlayer(p.sessionID, msgID,  msg ) ;
        }
    }

    protected canLeftCardBeMo() : boolean
    {
        return this.leftCardCnt > 0 ;
    }

    protected sendDeskInfoToPlayer( idx : number )
    {
        let p = this.getPlayerByIdx(idx) ;
        let js = this.toJson();
        let jsPlayers  = js[key.players] ;
        delete js[key.players] ;
        this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_PLAYER_MJ_REQ_DESK_INFO, js ) ;

        let msgp = {};
        msgp[key.players] = jsPlayers ;
        this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_PLAYER_MJ_DESK_PLAYERS_INFO, js ) ;
    }

    protected canPlayerHu( idx : number , card : number , isZiMo : boolean ,haveGang : boolean , invokerIdx : number ) : boolean
    {
        return this.getPlayerByIdx(idx).canHuWithCard(card, isZiMo) ;
    }

    protected enableChi() : boolean
    {
        return false ;
    }

    // act 
    onPlayerMo( actIdx : number )
    {
        let card = this.mMJCards.getCard() ;
        if ( card != null && card != 0 )
        {
            let p = this.getPlayerByIdx(actIdx) ;
            p.onMoCard(card) ;

            let msg = {} ;
            msg[key.idx] = actIdx ;
            msg[key.card] = 0 ;
            this.sendDeskMsg(eMsgType.MSG_DESK_MJ_MO, msg, actIdx ) ;

            msg[key.card] = card ;
            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_DESK_MJ_MO, msg) ;
        }
        return card ;
    }

    onPlayerChu( player : MJPlayerData , card : number ) : boolean
    {
        let msg = {} ;
        msg[key.card] = card ;
        msg[key.idx] = player.nIdx ;
        if ( player.onChu(card) == false )
        {
            msg[key.ret] = 2 ;
            this.sendMsgToPlayer(player.sessionID, eMsgType.MSG_PLAYER_MJ_CHU , msg ) ; 
            return false ;
        }
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_CHU , msg ); 
        return true ;
    }

    onPlayerZiMoHu( player : MJPlayerData , card : number, gangCnt : number , orgInvokerIdx : number ) : boolean
    {
        let msg = {} ;
        msg[key.card] = card ;
        msg[key.idx] = player.nIdx ;
        if ( player.canHuWithCard(card, true ) == false )
        {
            msg[key.ret] = 2 ;
            this.sendMsgToPlayer(player.sessionID, eMsgType.MSG_PLAYER_MJ_HU , msg ) ; 
            return false ;
        }
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_HU , msg ); 
        return true ;
    }

    onPlayerAnGang( player : MJPlayerData , card : number , orgInvokerIdx : number ) : boolean
    {
        let msg = {} ;
        msg[key.card] = card ;
        msg[key.idx] = player.nIdx ;
        if ( this.canLeftCardBeMo() == false || player.canAnGangWithCard(card) == false )
        {
            msg[key.ret] = 2 ;
            this.sendMsgToPlayer(player.sessionID, eMsgType.MSG_PLAYER_MJ_ANGANG , msg ) ; 
            return false ;
        }
        player.onAnGang(card) ;
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_ANGANG , msg ); 
        this.onPlayerMo(player.nIdx) ;
        return true ;
    }

    onPlayerBuGang( player : MJPlayerData , card : number , isDeclare : boolean, orgInvokerIdx : number ) : boolean
    {
        let msg = {} ;
        msg[key.card] = card ;
        msg[key.idx] = player.nIdx ;
        msg[key.isDeclare] = isDeclare ? 1 : 0 ;
        if ( isDeclare )
        {
            if ( this.canLeftCardBeMo() == false || player.onBuGangDeclare(card) == false )
            {
                msg[key.ret] = 2 ;
                this.sendMsgToPlayer(player.sessionID, eMsgType.MSG_PLAYER_MJ_BU_GANG , msg ) ; 
                return false ;
            }
            this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_BU_GANG , msg ) ;  
            return true;
        }

        player.onBuGangDone(card) ;
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_BU_GANG , msg ) ; 
        this.onPlayerMo(player.nIdx) ;
        return true ;
    }

    onPlayerEat( actIdx : number , card : number , eatWith : number[], invokerIdx : number ) : void
    {
        let msg = {} ;
        msg[key.card] = card ;
        msg[key.idx] = actIdx ;
        this.getPlayerByIdx(actIdx).onChi(card, eatWith, invokerIdx) ;
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_EAT , msg ); 
    }

    onPlayerPeng( actIdx : number , card : number , invokerIdx : number ) : void
    {
        let msg = {} ;
        msg[key.card] = card ;
        msg[key.idx] = actIdx ;
        this.getPlayerByIdx(actIdx).onPeng(card, invokerIdx) ;
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_PENG , msg ); 
    }

    onPlayerMingGang( actIdx : number , card : number , invokerIdx : number ) : void
    {
        let msg = {} ;
        msg[key.card] = card ;
        msg[key.idx] = actIdx ;
        this.getPlayerByIdx(actIdx).onMingGang(card, invokerIdx) ;
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_PENG , msg ); 
        this.onPlayerMo(actIdx) ;
    }

    onPlayerHuOtherCard( actIdxes : number[] , card : number , invokerIdx : number , invokerGangCnt  : boolean  )
    {
        // player do hu ;
    }

}