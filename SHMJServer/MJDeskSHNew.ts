import { MJDeskStateStart } from './../common/MJ/MJDeskStateStart';
import { IMJDeskState } from './../common/MJ/IMJDeskState';
import { FanxingCheckerSH } from './../shared/mjshData/FanxingCheckerSH';
import { MJPlayerDataSH } from './../shared/mjshData/MJPlayerDataSH';
import { MJDeskStateWaitOtherActSH } from './MJDeskStateWaitOtherActSH';
import { MJDeskStateGameEnd } from './../common/MJ/MJDeskStateGameEnd';
import { MJDeskStateWaitActSH } from './MJDeskStateWaitActSH';
import { MJDeskStateWaitStart } from './../common/MJ/MJDeskStateWaitStart';
import { XLogger } from './../common/Logger';
import { eMJActType } from './../shared/mjData/MJDefine';
import { G_ARG, eMJDeskState } from './../shared/SharedDefine';
import { key } from './../shared/KeyDefine';
import { MJDeskData } from './../shared/mjData/MJDeskData';
import { MJPlayerData } from './../shared/mjData/MJPlayerData';
import { IDeskDelegate } from './../common/MJ/IDesk';
import { DeskMgr } from './../common/MJ/DeskMgr';
import { MJDesk } from './../common/MJ/MJDesk';
import { eMsgPort, eMsgType } from '../shared/MessageIdentifer';
import { MJDeskDataSH } from '../shared/mjshData/MJDeskDataSH';
import { MJCards } from '../common/MJ/MJCards';
export class MJDeskSHNew extends MJDesk
{
    init( deskID : number , diFen : number , roundCnt : number , delegate : IDeskDelegate , deskMgr : DeskMgr ) : void 
    {
       super.init(deskID, diFen, roundCnt, delegate, deskMgr) ;
       this.mDeskInfo.gamePort = eMsgPort.ID_MSG_PORT_MJSH ;
       this.mDeskInfo.seatCnt = 4 ;
    }

    createMJPlayerData() : MJPlayerData 
    {
        return new MJPlayerDataSH() ;
    }

    createDeskInfoData() : MJDeskData 
    {
        return new MJDeskDataSH() ;
    }

    protected createMJCards()
    {
        if ( this.mMJCards == null )
        {
            this.mMJCards = new MJCards() ;
        }
    }

    protected enableChi() : boolean
    {
        return true ;
    }

    onPlayerEnterTuoGuanState( idx : number )
    {
        if ( ( this.getPlayerByIdx(idx) as MJPlayerDataSH).isTing  )
        {
            XLogger.debug( "player already ting , not enter tuoGuanState idx = " + idx + " deskID = " + this.deskID ) ;
            return ;
        }

        super.onPlayerEnterTuoGuanState(idx) ;
    }

    informSelfAct( idx : number , enterAct : eMJActType , haveGang : boolean )
    {
        XLogger.debug( "inform player self act Idx = " + idx ) ;
        let p = this.getPlayerByIdx(idx) ;
        if ( p != null && p.isOnline )
        {
            let msg = {} ;
        
            if ( enterAct == eMJActType.eMJAct_Peng )
            {
                msg["isOnlyChu"] = 1 ;
            }
            else if ( eMJActType.eMJAct_Chi == enterAct )
            {
                msg["isOnlyChu"] = 1 ;
                msg["limitCards"] = ( p as MJPlayerDataSH).getLimitCards();
            } 
            else
            {
                let p = this.getPlayerByIdx(idx) as MJPlayerDataSH;
                msg["canHu"] = this.canPlayerHu(idx,p.getAutoChuCard(),true,haveGang,idx ) ? 1 : 0 ;
                if ( msg["canHu"] == 1 && p.isTing == false )
                {
                    msg["isOnlyChu"] = 0 ;
                }
                else
                {
                    let vbu = p.getCanBuGangCards();
                    let vAnGang = p.getCanAnGangCards();
                    if ( vbu != null &&  vbu.length > 0 )
                    {
                        msg["buGang"] = vbu;
                    }

                    if ( vAnGang != null && vAnGang.length > 0 )
                    {
                        msg["anGang"] = vAnGang;
                    }
                    
                    XLogger.debug( "when have hu , and ting = true , skip gang opt  uid = " + p.uid + " deskID = " + this.deskID ) ;
                }

            }
            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_DEKS_MJ_INFORM_SELF_ACT , msg ) ;
        }
    }

    informOtherPlayerAct( playerIdxes : number[], card : number , invokeIdx : number , isBuGang : boolean, haveGang : boolean  )
    {
        XLogger.debug("inform other act idxs = " + JSON.stringify( playerIdxes )) ;
        let msg = {} ;
        msg[key.card] = card ;
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
                if ( ( p as MJPlayerDataSH ).isTing )
                {
                    vActs.length = 0 ;
                }
                vActs.push( eMJActType.eMJAct_Hu ) ;
            }

            msg[key.act] = vActs;

            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_DEKS_MJ_INFORM_ACT_WITH_OTHER_CARD , msg ) ;
        }
    }

    onPlayerZiMoHu( player : MJPlayerData , card : number, gangCnt : number , orgInvokerIdx : number ) : boolean
    {
        if ( this.canPlayerHu(player.nIdx, card, true, gangCnt > 0 , orgInvokerIdx ) == false )
        {
            return false ;
        }
        player.onHuWithCard(card, true) ;
        let huResult = FanxingCheckerSH.getInstance().checkFanxing( player as MJPlayerDataSH, gangCnt > 0, false, this.mDeskInfo.diFen ) ;
        // caculte fenshu ;
        let sore = 0 ;
        for ( let p of this.vPlayers )
        {
            if ( p.nIdx == player.nIdx )
            {
                continue ;
            }
            p.modifyScore( -1 * huResult.score );
            sore += huResult.score ;
        }
        player.modifyScore(sore) ;

        // make msg info ;
        // // ret : { ret : 0 , huCard : number , invokerIdx : idx , maCard : 23 , maScore : 23  ,huInfo : [ idx : 23 , fanxing : number , bei : 2  ], players : [ { hold : number[], offset : 23 , final : 23 } , ... ] }
        let msg = {} ;
        msg[key.ret] = 0 ;
        msg[key.huCard] = card ;
        msg[key.invokerIdx] = player.nIdx;
        msg[key.huInfo] = [{ idx : player.nIdx , fanxing : huResult.fanxing , bei : huResult.beiShu }] ;
        msg[key.players] = this.makePlayersInfoForResult();
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_HU, msg ) ;
        return true ;
    }

    onPlayerHuOtherCard( actIdxes : number[] , card : number , invokerIdx : number , invokerGangCnt  : boolean , isBuGang : boolean )
    {
        super.onPlayerHuOtherCard(actIdxes, card, invokerIdx, invokerGangCnt, isBuGang ) ;
        let invoker = this.getPlayerByIdx(invokerIdx) ;
        let vHuInfo = [] ;
        for ( let huIdx of actIdxes )
        {
            let huPlayer = this.getPlayerByIdx(huIdx) ;
            huPlayer.onHuWithCard(card, false ) ;
            // player do hu ;
            let huResult = FanxingCheckerSH.getInstance().checkFanxing( huPlayer as MJPlayerDataSH, false, isBuGang, this.mDeskInfo.diFen ) ;
            // caculte fenshu ;
            huPlayer.modifyScore( huResult.score ) ;
            invoker.modifyScore( -1 * huResult.score ) ;
            vHuInfo.push( { idx : huIdx , fanxing : huResult.fanxing , bei : huResult.beiShu } ) ;
        }

        // make msg info ;
        // // ret : { ret : 0 , huCard : number , invokerIdx : idx , maCard : 23 , maScore : 23  ,huInfo : [ idx : 23 , fanxing : number , bei : 2  ], players : [ { hold : number[], offset : 23 , final : 23 } , ... ] }
        let msg = {} ;
        msg[key.ret] = 0 ;
        msg[key.huCard] = card ;
        msg[key.invokerIdx] = invokerIdx;
        msg[key.huInfo] = vHuInfo ;
        msg[key.players] = this.makePlayersInfoForResult();
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_HU, msg ) ;
        
        if ( isBuGang == false )
        {
            this.mDeskInfo.lastChuIdx = -1;
        }
    }

    onGameOver( isHuOver : boolean ) : boolean
    {
        if ( isHuOver == false )
        {
            XLogger.debug( "send liuJu hua, deskID = " + this.deskID + " matchID = " + this.matchID ) ;
            let msg = {} ;
            msg[key.ret] = 0 ;
            msg[key.huCard] = 0 ;
            msg[key.invokerIdx] = -1;
            msg[key.huInfo] = [] ;
            msg[key.players] = this.makePlayersInfoForResult();
            this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_HU, msg ) ;
        }
        return super.onGameOver(isHuOver) ;
    }

    protected makePlayersInfoForResult() : Object
    {
        // players : [ { hold : number[], offset : 23 , final : 23 } , ... ] 
        let vPlayers = [] ;
        for ( let p of this.vPlayers )
        {
            vPlayers.push( p.visitInfoForResult() ) ;
        }
        return vPlayers ;
    }

    onPlayerTing( idx : number , chuCard : number ) : boolean
    {
        let msg = {} ;
        msg[key.idx] = idx ;
        msg[key.card] = chuCard ;

        let p = this.getPlayerByIdx(idx) ;
        if ( p.onChu(chuCard) == false )
        {
            msg[key.ret] = 2 ;
            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_PLAYER_MJ_TING, msg ) ;
            XLogger.warn( "ting pai but chu error , uid = " + p.uid + " deskID = " + this.deskID ) ;
            return false ;
        }

        let vmay = ( p as MJPlayerDataSH ).getMayBeTingCards();
        if ( vmay == null || vmay.length == 0 )
        {
            p.onMoCard(chuCard) ;
            msg[key.ret] = 1 ;
            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_PLAYER_MJ_TING, msg ) ;
            XLogger.warn( "ting pai but ting cards is null error , uid = " + p.uid + " deskID = " + this.deskID ) ;
            return false ;
        } 

        ( p as MJPlayerDataSH ).onTing( chuCard );
        this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_TING, msg,p.nIdx ) ;
        XLogger.warn( "ting pai ok, uid = " + p.uid + " deskID = " + this.deskID ) ;
        
        msg[key.holdCards] = p.getHoldCards();
        this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_PLAYER_MJ_TING, msg ) ;

        this.mDeskInfo.lastChuIdx = p.nIdx;
        return true ;
    }

    checkPlayerBuHua( idx : number ) : number
    {
        let p = this.getPlayerByIdx(idx) as MJPlayerDataSH;
        let vHua = p.getHoldHuaCards();
        let buHuaTime = 0 ;
        while ( vHua != null && vHua.length > 0 && this.canLeftCardBeMo() )
        {
            let vGetCards = [] ;
            let vBuedHua = [] ;
            for ( let b of vHua )
            {
                if ( false == this.canLeftCardBeMo() )
                {
                    break ;
                }

                vBuedHua.push(b); 
                vGetCards.push(this.mMJCards.getCard() ) ;
            }

            XLogger.debug( "player do buHua , uid = " + p.uid + " huaCnt = " + vBuedHua.length );
            p.onBuHua(vBuedHua, vGetCards ) ;
            //MSG_PLAYER_MJ_BU_HUA,
            // svr: { hua : [23,23] , cards : [22,56] }
            let msg = {} ;
            msg[key.idx] = idx ;
            msg[key.vCard] = vGetCards;
            msg[key.vHua] = vBuedHua;
            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_PLAYER_MJ_BU_HUA, msg ) ;

            vGetCards.forEach((v :number, zidx : number )=>vGetCards[zidx]=0 ) ;
            msg[key.vCard] = vGetCards;
            this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_BU_HUA, msg,p.nIdx ) ;
            buHuaTime += G_ARG.TIME_MJ_BU_HUA ;
            vHua = p.getHoldHuaCards();
        }
        
        return buHuaTime ;
    }

    protected intallDeskState()
    {
        this.vStates.push( new MJDeskStateWaitStart() ) ;
        this.vStates.push ( new MJDeskStateStart() );
        this.vStates.push( new MJDeskStateWaitActSH() ); 
        this.vStates.push( new MJDeskStateWaitOtherActSH() ) ;
        this.vStates.push( new MJDeskStateGameEnd() ) ; 
        let self = this ;
        this.vStates.forEach( ( v : IMJDeskState )=>v.init(self) ) ;
        this.state = eMJDeskState.eState_WaitStart; 
        this.vStates[this.state].onEnterState(null) ;
    }


}