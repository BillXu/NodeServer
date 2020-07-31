import { MJPlayerDataSH } from './../shared/mjshData/MJPlayerDataSH';
import { MJDeskStateWaitOtherActSH } from './MJDeskStateWaitOtherActSH';
import { MJDeskStateGameEnd } from './../common/MJ/MJDeskStateGameEnd';
import { MJDeskStateWaitActSH } from './MJDeskStateWaitActSH';
import { MJDeskStateWaitStart } from './../common/MJ/MJDeskStateWaitStart';
import { XLogger } from './../common/Logger';
import { eMJActType } from './../shared/mjData/MJDefine';
import { G_ARG, eMJPlayerState, eMJDeskState } from './../shared/SharedDefine';
import { key } from './../shared/KeyDefine';
import { MJDeskData } from './../shared/mjData/MJDeskData';
import { MJPlayerData } from './../shared/mjData/MJPlayerData';
import { IDeskDelegate } from './../common/MJ/IDesk';
import { DeskMgr } from './../common/MJ/DeskMgr';
import { MJDesk } from './../common/MJ/MJDesk';
import { eMsgPort, eMsgType } from '../shared/MessageIdentifer';
import { MJDeskDataSH } from '../shared/mjshData/MJDeskDataSH';
export class MJDeskSH extends MJDesk
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

    protected enableChi() : boolean
    {
        return true ;
    }

    canPlayerHu( idx : number , card : number , isZiMo : boolean ,haveGang : boolean , invokerIdx : number ) : boolean
    {
        return this.getPlayerByIdx(idx).canHuWithCard(card, isZiMo) ;
    }

    informSelfAct( idx : number , enterAct : eMJActType , haveGang : boolean )
    {
        let p = this.getPlayerByIdx(idx) ;
        if ( p != null && p.state == eMJPlayerState.eState_Online )
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
                    msg["buGang"] = p.getCanBuGangCards();
                    msg["anGang"] = p.getCanAnGangCards();
                    XLogger.debug( "when have hu , and ting = true , skip gang opt  uid = " + p.uid + " deskID = " + this.deskID ) ;
                }

            }
            this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_DEKS_MJ_INFORM_SELF_ACT , msg ) ;
        }
    }

    informOtherPlayerAct( playerIdxes : number[], card : number , invokeIdx : number , isBuGang : boolean, haveGang : boolean  )
    {
        let msg = {} ;
        msg[key.card] = card ;
        for ( let p of this.vPlayers )
        {
            if ( p == null || p.state != eMJPlayerState.eState_Online || -1 == playerIdxes.indexOf(p.nIdx) )
            {
                continue ;
            }

            let vActs = [] ;
            if ( false == isBuGang && p.canChi(card) )
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

        return true ;
    }

    onPlayerHuOtherCard( actIdxes : number[] , card : number , invokerIdx : number , invokerGangCnt  : boolean  )
    {
        // player do hu ;
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

        for ( let v of vmay )
        {
            if ( this.canPlayerHu(idx, v, true, false, idx ) )
            {
                ( p as MJPlayerDataSH ).onTing();
                this.sendDeskMsg( eMsgType.MSG_PLAYER_MJ_TING, msg ) ;
                return true ;
            } 
        }

        p.onMoCard(chuCard) ;
        msg[key.ret] = 1 ;
        this.sendMsgToPlayer(p.sessionID, eMsgType.MSG_PLAYER_MJ_TING, msg ) ;
        XLogger.warn( "ting pai but ting cards cannot really hu , uid = " + p.uid + " deskID = " + this.deskID ) ;
        return false ;
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

            p.onBuHua(vBuedHua, vGetCards ) ;
            //MSG_PLAYER_MJ_BU_HUA,
            // svr: { hua : [23,23] , cards : [22,56] }
            let msg = {} ;
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
        this.vStates.push ( new MJDeskStateWaitStart() );
        this.vStates.push( new MJDeskStateWaitActSH() ); 
        this.vStates.push( new MJDeskStateWaitOtherActSH() ) ;
        this.vStates.push( new MJDeskStateGameEnd() ) ; 
        this.state = eMJDeskState.eState_WaitStart; 
        this.vStates[this.state].onEnterState(null) ;
    }
}