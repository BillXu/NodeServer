import { random } from 'lodash';
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
export abstract class MJDesk implements IDesk
{
    protected mDelegate : IDeskDelegate = null ;
    protected mDeskMgr : DeskMgr = null ;
    protected vStates : IMJDeskState[] = [] ;
    protected mMJCards : MJCards = null ;
    protected vPlayers : MJPlayerData[] = [] ;
    protected mDeskInfo : MJDeskData = null ;

    get deskID() : number
    {
        return this.mDeskInfo.deskID ;
    }

    get matchID() : number
    {
        return this.mDeskInfo.matchID ;
    }

    get lawIdx() : number
    {
        return this.mDeskInfo.lawIdx ;
    }

    get bankerIdx () : number
    {
        return this.mDeskInfo.bankerIdx ;
    }

    set bankerIdx( idx : number )
    {
        this.mDeskInfo.bankerIdx = idx ;
    }

    get state () : eMJDeskState
    {
        return this.mDeskInfo.state ;
    }

    set state( sate : eMJDeskState )
    {
        this.mDeskInfo.state = sate ;
    }

    //  idesk 
    init( deskID : number , diFen : number , roundCnt : number , delegate : IDeskDelegate , deskMgr : DeskMgr ) : void 
    {
        this.mDeskInfo = this.createDeskInfoData();
        this.mDeskInfo.deskID = deskID ;
        this.mDeskInfo.diFen = diFen ;
        this.mDeskInfo.roundCnt = roundCnt ;
        this.mDelegate = delegate ;
        this.mDeskMgr = deskMgr ;
        this.intallDeskState();
        this.createMJCards();
        this.mDeskInfo.bankerIdx = 0 ;
    }

    getPlayerByIdx( idx : number ) : MJPlayerData
    {
        for ( let v of this.vPlayers )
        {
            if ( v != null && v.nIdx == idx )
            {
                return v ;
            }
        }
        
        return null ;
    }

    getPlayerBySessionID( sessionID : number ) : MJPlayerData
    {
        for ( let v of this.vPlayers )
        {
            if ( v != null && v.sessionID == sessionID )
            {
                return v ;
            }
        }
        
        return null ;
    }

    addPlayer( player : MJPlayerData , idx? : number ) : boolean 
    {
        if ( this.vPlayers.length >= this.mDeskInfo.seatCnt )
        {
            console.error( "player seat is full , can not add more player" ) ;
            return false ;
        }

        if ( idx == null )
        {
            // find a index ;
            for ( let i = 0 ; i < this.mDeskInfo.seatCnt ; ++i )
            {
                if ( this.getPlayerByIdx(i) == null )
                {
                    idx = i ;
                    break ;
                }
            }
        }

        if ( idx == null )
        {
            console.error( "do not have pos for this player deskID = " + this.deskID + " uid = " + player.uid ) ;
            return false ;
        }

        if ( this.getPlayerByIdx(idx) )
        {
            console.error( "already have player in pos of idx = " + idx ) ;
            return false ;
        }

        player.nIdx = idx ;
        this.vPlayers.push(player) ;
    }

    isPlayerInDesk( nSessionID : number ) : boolean
    {
        for ( let p of this.vPlayers )
        {
            if ( p.sessionID == nSessionID )
            {
                return true ;
            }
        }
        return false ;
    }

    abstract createMJPlayerData() : MJPlayerData ;

    abstract createDeskInfoData() : MJDeskData ;
  
    setMatchInfo( matchID : number , lawIdx : number , cfgID : number  ) : void 
    {
        this.mDeskInfo.matchID = matchID ;
        this.mDeskInfo.lawIdx = lawIdx ;
        this.mDeskInfo.cfgID = cfgID ;

    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean 
    {
        if ( eMsgType.MSG_PLAYER_ENTER_MATCH_DESK == msgID )
        {
            if ( this.onPlayerEnter( msg[key.token], orgID ) == false )
            {
                XLogger.debug( "invalid token can not enter sessionID = " + orgID ) ;
                msg[key.ret] = 1 ;
                this.sendMsgToPlayer(orgID, msgID, msg ) ;
                return true ;
            }
            msg[key.ret] = 0 ;
            this.sendMsgToPlayer(orgID, msgID, msg ) ;
            return true ;
        }

        let p = this.getPlayerBySessionID(orgID) ;
        if ( p == null )
        {
            XLogger.warn( "player not in this room , can not process msg sessionID = " + orgID + " deskID = " + this.deskID ) ;
            msg[key.ret] = 200 ;
            msg["err"] = "you are not in this room deskID " + this.deskID;
            this.sendMsgToPlayer(orgID, msgID, msg ) ;
            this.vPlayers.forEach( v=>XLogger.debug( "idx = " + v.nIdx + " sessionID = " + v.sessionID + " uid = " + v.uid ) ) ;
            return false ;
        }

        if ( eMsgType.MSG_PLAYER_MJ_REQ_DESK_INFO == msgID )
        {
            this.sendDeskInfoToPlayer(p.nIdx) ;
            //this.vStates[this.state].onPlayerReuesetInfo(p.nIdx) ;
            return true ;
        }

        if ( eMsgType.MSG_TEST_MJ_WANT_CARD == msgID )
        {
            this.mMJCards.pushCardToFront(msg[key.card]) ;
            return true;
        }

        if ( eMsgType.MSG_TEST_MJ_SWAP_CARD == msgID )
        {
            let r = this.mMJCards.swapCard(msg["dstCard"], msg["orgCard"] ) ;
            msg[key.ret] = r ? 0 : 1 ;
            this.sendMsgToPlayer( orgID, msgID, msg) ;
            return true ;
        }

        let s = this.vStates[this.state];
        if ( eMsgType.MSG_PLAYER_MJ_TUO_GUAN == msgID )
        {
            if ( s == null )
            {
                return false ;
            }

            let isSet = msg["isSet"] == 1 ;
            if ( isSet )
            {
                XLogger.warn( "player want enter tuoguan act uid = " + p.uid + " deskID = " + this.deskID ) ;
                this.onPlayerEnterTuoGuanState(p.nIdx) ;
            }
            else
            {
                this.onPlayerLeaveTuoGuanState(p.nIdx) ;
                s.onPlayerLeaveTuoGuanState(p.nIdx) ;
            }
            return true;
        }
        if ( s )
        {
           return s.onLogicMsg(msgID, msg, orgID) ;
        }
        else
        {
            XLogger.error("why current state is null ? state = " + this.state + " deskID = " + this.deskID ) ;
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
                    p.isOnline = netState == ePlayerNetState.eState_Online ;
                    XLogger.debug( "player netState changed uid = " + p.uid + " state = " + ePlayerNetState[netState] + " deskID = " + this.deskID ) ;
                    break ;
                }
            }
            return {} ;
        }
        return {} ;
    }

    onPutPlayerToDesk( uid : number, token : number , score : number ) : boolean
    {
        // check if already in room ?
        for ( let pp of this.vPlayers )
        {
            if ( pp != null && pp.uid == uid )
            {
                pp.token = token ;
                pp.score = score ;
                pp.state = eMJPlayerState.eState_Normal;
                XLogger.warn( "why player already double put desk uid = " + uid + " deskID = " + this.deskID ) ;
                //this.sendDeskInfoToPlayer(pp.nIdx) ;
                return true ;
            }
        }

        let p = this.createMJPlayerData();
        p.init(uid, token, score) ;
        if ( false == this.addPlayer(p) )
        {
            return false ;
        }
        XLogger.debug( "do put palyer into deskID = " + this.deskID + " uid = " + uid ) ;
        return true ;
    }

    onPlayerEnter( token : number , sessionID : number ) : boolean 
    {
        // check if already in room ?
        for ( let pp of this.vPlayers )
        {
            if ( pp != null && pp.token == token )
            {
                pp.sessionID = sessionID ;
                pp.state = eMJPlayerState.eState_Normal;
                pp.isOnline = true ;

                // tell data svr ;
                let rpc = this.mDeskMgr.getSvrApp().getRpc();
                let arg = {} ;
                arg[key.uid] = pp.uid;
                arg[key.deskID] = this.deskID;
                arg[key.port] = this.mDeskMgr.getSvrApp().getLocalPortType();
                arg[key.isSet] = 1 ;
                rpc.invokeRpc(eMsgPort.ID_MSG_PORT_DATA, pp.uid, eRpcFuncID.Func_UpdateCurDeskID, arg,( resut : Object )=>{
                    if ( resut[key.ret] != 0 )
                    {
                        XLogger.debug( "player alredy in other roomID , why enter new , client error " ) ;
                    }
                }) ;

                // tell player ;
                this.sendDeskInfoToPlayer(pp.nIdx) ;
                XLogger.debug( " player enter desk uid = " + pp.uid + " deskID = " + this.deskID ) ;
                return true ;
            }
        }
        XLogger.debug( " can not find your token = " + token + " enter room failed , sessionID = " + sessionID ) ;
        XLogger.debug( "aready have token players , deskID = " + this.deskID ) ;
        this.vPlayers.forEach( v=>XLogger.debug( "uid = " + v.uid + " token = " + v.token ) ) ;
        return false ;
    }

    // self function 
    canStartGame() : boolean
    {
        return this.vPlayers.length == this.mDeskInfo.seatCnt && this.mDeskInfo.curRoundIdx < this.mDeskInfo.roundCnt;
    }

    distributeCards()
    {
        XLogger.debug( "distribute bankerIdx = " + this.bankerIdx + " deskID = " + this.deskID ) ;
        this.mMJCards.shuffle();
        let msg = { } ;
        for ( let p of this.vPlayers )
        {
            let vCards = [] ;
            let cnt = 13 ;
            while ( cnt-- )
            {
                vCards.push(this.mMJCards.getCard() ) ;
            }

            p.onDistributedCard(vCards) ;
            msg[key.holdCards] = vCards ;

            XLogger.debug( "distributed cards , deskID = " + this.deskID + " uid = " + p.uid + " idx = " + p.nIdx + "length = " + vCards.length + " msg : " + JSON.stringify(msg) ) ;
            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_DESK_MJ_DISTRIBUTE, msg ) ;
        }
    }

    informOtherPlayerAct( playerIdxes : number[], card : number , invokeIdx : number , isBuGang : boolean, haveGang : boolean  )
    {
        XLogger.debug("inform other act idxs = " + JSON.stringify( playerIdxes )) ;
        let msg = {} ;
        msg[key.card] = card ;
        //msg[key.invokerIdx] = invokeIdx ;
        //msg[key.isBuGang] = isBuGang ? 1 : 0 ;
        for ( let p of this.vPlayers )
        {
            if ( p == null || p.isOnline == false || -1 == playerIdxes.indexOf(p.nIdx) )
            {
                continue ;
            }

            let vActs = [] ;
            if ( false == isBuGang && ( ( invokeIdx + 1 ) % this.mDeskInfo.seatCnt ) == p.nIdx &&  p.canChi(card) )
            {
                vActs.push(eMJActType.eMJAct_Chi) ;
            }

            if ( false == isBuGang && p.canMingGang(card) )
            {
                vActs.push( eMJActType.eMJAct_MingGang );
            }

            if ( false == isBuGang && p.canPeng(card) )
            {
                vActs.push( eMJActType.eMJAct_Peng ) ;
            }

            if ( this.canPlayerHu(p.nIdx, card, false, haveGang, invokeIdx) )
            {
                vActs.push( eMJActType.eMJAct_Hu ) ;
            }

            msg[key.act] = vActs;

            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_DEKS_MJ_INFORM_ACT_WITH_OTHER_CARD , msg ) ;
        }
    }

    informSelfAct( idx : number , enterAct : eMJActType , haveGang : boolean )
    {
        XLogger.debug( "inform player self act Idx = " + idx ) ;
        let p = this.getPlayerByIdx(idx) ;
        if ( p != null && p.isOnline )
        {
            let msg = {} ;
        
            if ( enterAct == eMJActType.eMJAct_Peng || eMJActType.eMJAct_Chi == enterAct )
            {
                msg["isOnlyChu"] = 1 ;
            }
            else
            {
                let p = this.getPlayerByIdx(idx) ;
                msg["canHu"] = this.canPlayerHu(idx,p.getAutoChuCard(),true,haveGang,idx ) ? 1 : 0 ;
                msg["buGang"] = p.getCanBuGangCards();
                msg["anGang"] = p.getCanAnGangCards();
                msg["isOnlyChu"] = 0 ;
            }
            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_DEKS_MJ_INFORM_SELF_ACT , msg ) ;
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
                    return this.canPlayerHu(idx, card, false, haveGang, invokerIdx) ;
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

            if ( this.enableChi() && ( this.getNextActIdx(invokerIdx) == p.nIdx ) && p.canChi(card)  )
            {
                v.push( { idx : p.nIdx , maxAct : eMJActType.eMJAct_Chi } ) ;
            }
        }

        if ( v.length > 0 )
        {
            XLogger.debug( "some need the card = " + card + " detail = " + JSON.stringify(v) ) ;
        } 
        return v ;
    }

    getNextActIdx( curIdx : number ) : number
    {
        for ( let idx = curIdx + 1 ; idx < this.mDeskInfo.seatCnt * 2 ; ++idx )
        {
            let r = idx % this.mDeskInfo.seatCnt ;
            if ( this.getPlayerByIdx( r ) != null )
            {
                return r ;
            }
        }
        XLogger.error( "why get next player is null ? empty desk ? deskID = " + this.deskID ) ;
        return null ;
    }

    onGameStart()
    {
        for ( let p of this.vPlayers )
        {
            p.onGameStart();
        }

        this.mDeskInfo.lastChuIdx = -1 ;
        this.mDeskInfo.vDice.length = 0 ;
        this.mDeskInfo.vDice.push( random(5) + 1 , random(5) + 1 ) ;
        let msg = {} ;
        msg[key.curRoundIdx] = this.mDeskInfo.curRoundIdx ;
        msg[key.bankerIdx] = this.bankerIdx ;
        msg[key.vDice] = this.mDeskInfo.vDice;
        this.sendDeskMsg(eMsgType.MSG_DESK_MJ_START, msg ) ;
    }

    onGameOver( isHuOver : boolean ) : boolean
    {
        // send msg first ;
        //let vp = [] ;
        for ( let p of this.vPlayers )
        {
            //vp.push( { idx : p.nIdx , offset : p.offset, final : p.score } ) ;
            p.onGameOver() ;
        }
        let msg = {} ;
        msg["isHuOver"] = isHuOver ? 1 : 0 ;
        msg["isDeskFinished"] = ( this.mDeskInfo.curRoundIdx == this.mDeskInfo.roundCnt - 1 ) ? 1 : 0 ;
        //msg[key.result] = vp ;
        this.sendDeskMsg(eMsgType.MSG_DESK_MJ_GAME_OVER, msg ) ;
        this.mDeskInfo.bankerIdx = this.getNextActIdx(this.bankerIdx) ;

        ++this.mDeskInfo.curRoundIdx ;
        if ( this.mDeskInfo.curRoundIdx == this.mDeskInfo.roundCnt )
        {
            let rpc = this.mDeskMgr.getSvrApp().getRpc();
            let arg = {} ;
            arg[key.deskID] = this.deskID;
            arg[key.port] = this.mDeskMgr.getSvrApp().getLocalPortType();
            arg[key.isSet ] = 0 ;
            let vr = [] ;
            for ( let p of this.vPlayers )
            {
                vr.push( { uid : p.uid , score : p.score } ) ;
                // clear current deskID ;
                arg[key.uid] = p.uid;
                rpc.invokeRpc(eMsgPort.ID_MSG_PORT_DATA, p.uid, eRpcFuncID.Func_UpdateCurDeskID, arg) ;
            }
            XLogger.debug( "desk finished deskID = " + this.deskID ) ;
            this.vStates[this.state].onLevelState();
            this.vPlayers.length = 0 ;
            this.mDelegate.onDeskFinished(vr, this ) ;
            return false ;
        }

        return true ;
    }

    protected intallDeskState()
    {
        this.vStates.push( new MJDeskStateWaitStart() ) ;
        this.vStates.push ( new MJDeskStateStart() );
        this.vStates.push( new MJDeskStateWaitAct() );
        this.vStates.push( new MJDeskStateWaitOtherAct() ) ;
        this.vStates.push( new MJDeskStateGameEnd() ) ;
        let self = this ;
        this.vStates.forEach( ( v : IMJDeskState )=>v.init(self) ) ;
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
            if ( p == null || p.isOnline == false )
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
        return this.mMJCards.getLeftCnt() > 0 ;
    }

    protected sendDeskInfoToPlayer( idx : number )
    {
        XLogger.debug( "send desk info to idx = " + idx ) ;
        this.mDeskInfo.leftCardCnt = this.mMJCards.getLeftCnt();
        if ( this.vStates[this.state] )
        {
            this.vStates[this.state].visitInfo(this.mDeskInfo.stateInfo) ;
        }
        let p = this.getPlayerByIdx(idx) ;
        let js = this.mDeskInfo.toJson();
        this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_PLAYER_MJ_REQ_DESK_INFO, js ) ;

        let jsPlayers = [] ;
        for ( let pp of this.vPlayers )
        {
            jsPlayers.push( pp.visitInfoForDeskInfo(idx) ) ;
        }
        let msgp = {};
        msgp[key.players] = jsPlayers ;
        this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_PLAYER_MJ_DESK_PLAYERS_INFO, msgp ) ;

        this.vStates[this.state].onPlayerReuesetInfo(idx) ;
    }

    canPlayerHu( idx : number , card : number , isZiMo : boolean ,haveGang : boolean , invokerIdx : number ) : boolean
    {
        return this.getPlayerByIdx(idx).canHuWithCard(card, isZiMo) ;
    }

    protected enableChi() : boolean
    {
        return false ;
    }

    onPlayerEnterTuoGuanState( idx : number )
    {
        let p = this.getPlayerByIdx(idx) ;
        if ( p.state == eMJPlayerState.eState_TuoGuan )
        {
            XLogger.debug( "player already tuo guan skip msg uid = " + p.uid + " deskID = " + this.deskID ) ;
            return ;
        }
        p.state = eMJPlayerState.eState_TuoGuan ;
        this.sendDeskMsg(eMsgType.MSG_PLAYER_MJ_TUO_GUAN, { isSet : 1 , idx : idx  } ) ;
        XLogger.debug( "player enter TuoguanState uid = " + p.uid + " deskID = " + this.deskID ) ;
    }

    onPlayerLeaveTuoGuanState( idx : number )
    {
        let p = this.getPlayerByIdx(idx) ;
        p.state = eMJPlayerState.eState_Normal ;
        this.sendDeskMsg(eMsgType.MSG_PLAYER_MJ_TUO_GUAN, { isSet : 0 , idx : idx  } ) ;
        XLogger.debug( "player leave TuoguanState uid = " + p.uid + " deskID = " + this.deskID ) ;
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
            if ( p.isOnline )
            {
                this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_DESK_MJ_MO, msg) ;
            }
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
        this.mDeskInfo.lastChuIdx = player.nIdx;
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_CHU , msg ); 
        return true ;
    }

    onPlayerZiMoHu( player : MJPlayerData , card : number, gangCnt : number , orgInvokerIdx : number ) : boolean
    {
        // let msg = {} ;
        // msg[key.card] = card ;
        // msg[key.idx] = player.nIdx ;
        // if ( player.canHuWithCard(card, true ) == false )
        // {
        //     msg[key.ret] = 2 ;
        //     this.sendMsgToPlayer(player.sessionID, eMsgType.MSG_PLAYER_MJ_HU , msg ) ; 
        //     return false ;
        // }
        // this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_HU , msg ); 
        return true ;
    }

    onPlayerHuOtherCard( actIdxes : number[] , card : number , invokerIdx : number , invokerGangCnt  : boolean, isBuGang : boolean  )
    {
        // player do hu ;
        if ( isBuGang )
        {
            this.getPlayerByIdx(invokerIdx).beRobedGang() ;
        }
        else
        {
            this.getPlayerByIdx(invokerIdx).beEatPengGang(card) ;
        }
        this.mDeskInfo.lastChuIdx = -1;
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
        this.mDeskInfo.lastChuIdx = -1;

        let msg = {} ;
        msg[key.card] = card ;
        msg[key.idx] = actIdx ;
        msg[key.eatWith] = eatWith;
        msg[key.invokerIdx] = invokerIdx ;
        this.getPlayerByIdx(actIdx).onChi(card, eatWith, invokerIdx) ;
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_EAT , msg ); 
        this.getPlayerByIdx(invokerIdx).beEatPengGang(card) ;
    }

    onPlayerPeng( actIdx : number , card : number , invokerIdx : number ) : void
    {
        this.mDeskInfo.lastChuIdx = -1;

        let msg = {} ;
        msg[key.card] = card ;
        msg[key.idx] = actIdx ;
        msg[key.invokerIdx] = invokerIdx;
        this.getPlayerByIdx(actIdx).onPeng(card, invokerIdx) ;
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_PENG , msg ); 
        this.getPlayerByIdx(invokerIdx).beEatPengGang(card) ;
    }

    onPlayerMingGang( actIdx : number , card : number , invokerIdx : number ) : void
    {
        this.mDeskInfo.lastChuIdx = -1;

        let msg = {} ;
        msg[key.card] = card ;
        msg[key.idx] = actIdx ;
        msg[key.invokerIdx] = invokerIdx;
        this.getPlayerByIdx(actIdx).onMingGang(card, invokerIdx) ;
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_MING_GANG , msg ); 
        this.onPlayerMo(actIdx) ;
        this.getPlayerByIdx(invokerIdx).beEatPengGang(card) ;
    }



}