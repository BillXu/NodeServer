import { G_ARG } from './../../shared/SharedDefine';
import { Player } from './../../dataServer/player/Player';
import { MJPlayerData } from './../../shared/mjData/MJPlayerData';
import { WaitOtherActStateData } from './MJDeskStateWaitOtherAct';
import { eMJActType } from './../../shared/mjData/MJDefine';
import { key } from './../../shared/KeyDefine';
import { XLogger } from './../Logger';
import { eMsgType } from './../../shared/MessageIdentifer';
import { MJDesk } from './MJDesk';
import { IMJDeskState } from './IMJDeskState';
import { eMJDeskState, eMJPlayerState } from '../../shared/SharedDefine';
export class WaitActStateData
{
    mActIdx : number = -1 ;
    mEnterAct : eMJActType = eMJActType.eMJAct_Mo ;
    mEnterActInvokerIdx : number = -1 ;
    mCard : number = 0 ;
    mGangCnt : number = 0 ;
    constructor( idx : number , card : number, act? : eMJActType )
    {
        this.mActIdx = idx ;
        this.mEnterAct = act || eMJActType.eMJAct_Mo ;
        this.mEnterActInvokerIdx = idx ;
        this.mCard = card ;
    }
}

export class MJDeskStateWaitAct implements IMJDeskState
{
    protected waitTimer : NodeJS.Timeout = null ;
    protected mDesk : MJDesk = null ;
    protected mData : WaitActStateData = null ;
    protected mWaitTimeSecons : number  = G_ARG.TIME_MJ_WAIT_ACT;
    init( desk : MJDesk ) : void 
    {
        this.mDesk = desk ;
    }

    getState() : eMJDeskState
    {
        return eMJDeskState.eState_WaitAct ;
    }

    onEnterState( jsData : WaitActStateData ) : void 
    {
        this.mData = jsData ;
        XLogger.debug( "enter waitActState ActIdx = " + this.mData.mActIdx + " enterAct = " + eMJActType[this.mData.mEnterAct] + " card = " + this.mData.mCard + " invokerIdx = " + this.mData.mEnterActInvokerIdx + " deskID = " + this.mDesk.deskID ) ;
        if ( this.mData.mEnterAct == eMJActType.eMJAct_BuGang_Done )
        {
            //this.mDesk.onPlayerDoActWitSelfCard( this.mData.mActIdx, eMJActType.eMJAct_BuGang_Done ,this.mData.mCard, this.mData.mGangCnt > 0 ,this.mData.mEnterActInvokerIdx ) ;
            this.mDesk.onPlayerBuGang( this.mDesk.getPlayerByIdx(this.mData.mActIdx), this.mData.mCard, false , this.mData.mEnterActInvokerIdx ) ;
            ++this.mData.mGangCnt;
        }
        else if ( this.mData.mEnterAct == eMJActType.eMJAct_MingGang )
        {
            ++this.mData.mGangCnt;
        }

        this.mDesk.informSelfAct(this.mData.mActIdx, this.mData.mEnterAct ,this.mData.mGangCnt > 0 ) ;
        

        this.mWaitTimeSecons = G_ARG.TIME_MJ_WAIT_ACT;
        if ( this.mDesk.getPlayerByIdx(this.mData.mActIdx).state == eMJPlayerState.eState_TuoGuan )
        {
            this.mWaitTimeSecons = G_ARG.TIME_MJ_WAIT_ACT_TUOGUAN ;
        }

        this.startWait();
    }

    onLevelState() : void
    {
        if ( null != this.waitTimer )
        {
            clearTimeout( this.waitTimer ) ;
            this.waitTimer = null ;
        }

        XLogger.debug( "leave waitActSate deskID = " + this.mDesk.deskID ) ;
    }

    visitInfo( outJsInfo : Object ) : void 
    {
        outJsInfo[key.idx] = this.mData.mActIdx ;
        outJsInfo[key.act] = this.mData.mEnterAct ;
    }

    // onLogicMsg( msgID : eMsgType , msg : Object, nSessionID : number ) : boolean 
    // {
    //     if ( msgID == eMsgType.MSG_PLAYER_MJ_ACT )
    //     {
    //         if ( this.mDesk.getPlayerByIdx(this.mData.mActIdx).sessionID != nSessionID )
    //         {
    //             msg[key.ret] = 1 ;
    //             XLogger.debug( "not your turn orgID = " + nSessionID + " deskID = " + this.mDesk.deskID ) ;
    //             this.mDesk.sendMsgToPlayer(nSessionID, msgID, msg) ;
    //             return true ;
    //         }

    //         let act : eMJActType = msg[key.act] ;
    //         let card : number = msg[key.card] ;
    //         let isOk = this.mDesk.onPlayerDoActWitSelfCard( this.mData.mActIdx, act ,card , this.mData.mGangCnt > 0 ,this.mData.mEnterActInvokerIdx ) ;
    //         if ( isOk && this.mData.mEnterAct == eMJActType.eMJAct_Peng && act != eMJActType.eMJAct_Chu )
    //         {
    //             isOk = false ;
    //             XLogger.warn( "after peng , player can only chu , can not do other things ,uid = " + this.mDesk.getPlayerByIdx(this.mData.mActIdx).uid + " deskID = " + this.mDesk.deskID ) ;
    //         }

    //         if ( false == isOk )
    //         {
    //             msg[key.ret] = 2 ;
    //             XLogger.debug( "you can not do act orgID = " + nSessionID + " act = " + eMJActType[act] + " deskID = " + this.mDesk.deskID ) ;
    //             this.mDesk.sendMsgToPlayer(nSessionID, msgID, msg) ;
    //             return true ;
    //         }
    //         msg[key.ret] = 0 ;
    //         this.mDesk.sendMsgToPlayer( nSessionID, msgID, msg ) ;
    //         XLogger.debug( "in WaitActState palyer idx = " + this.mData.mActIdx + " do act = " + eMJActType[act] + " card = " + card + " deskID = " + this.mDesk.deskID ) ;
    //         switch ( act )
    //         {
    //             case eMJActType.eMJAct_Chu:
    //                 {
    //                     let vps = this.mDesk.getPlayersNeedTheCard( card, this.mData.mActIdx,this.mData.mGangCnt > 0 ,false ) ;
    //                     if ( vps == null || vps.length == 0 )
    //                     {
    //                         let nextIdx = this.mDesk.getNextActIdx( this.mData.mActIdx ) ;
    //                         let mocard = this.mDesk.onPlayerMo( nextIdx ) ;
    //                         if ( mocard == null || mocard == 0 )
    //                         {
    //                             XLogger.debug( "no more card to Mo go game end for waitActState deskID = " + this.mDesk.deskID ) ;
    //                             this.mDesk.transferState( eMJDeskState.eState_End,false ) ;
    //                             return ;
    //                         }
    //                         else
    //                         {
    //                             XLogger.debug( "No one need the card playerChu , next player enter waitActState deskID = " + this.mDesk.deskID + " nextIdx = " + nextIdx ) ;
    //                             let data = new WaitActStateData( nextIdx, mocard )  ;
    //                             this.onEnterState( data ) ;
    //                         }

    //                     }
    //                     else
    //                     {
    //                         XLogger.debug( "other need player chued card = " + card + " deskID = " + this.mDesk.deskID + " others = " + JSON.stringify(vps) ) ;
    //                         let otherData = new WaitOtherActStateData();
    //                         otherData.mBuGangRetore = null ;
    //                         otherData.mCard = card ;
    //                         otherData.mGangCnt = this.mData.mGangCnt ;
    //                         otherData.mInvokerIdx = this.mData.mActIdx ;
    //                         otherData.mWaitIdxes = vps;
    //                         this.mDesk.transferState( eMJDeskState.eState_WaitOtherAct, otherData ) ;
    //                     }
    //                     return true ;
    //                 }
    //                 break;
    //             case eMJActType.eMJAct_AnGang:
    //                 {
    //                     ++this.mData.mGangCnt ;
    //                     this.startWait();
    //                 }
    //                 break;
    //             case eMJActType.eMJAct_BuGang_Declare:
    //                 {
    //                     let vps = this.mDesk.getPlayersNeedTheCard( card, this.mData.mActIdx, this.mData.mGangCnt > 0 , true ) ;
    //                     if ( vps == null || vps.length == 0 )
    //                     {
    //                         XLogger.debug( "direct buGang nor other need rob gang actIdx = " + this.mData.mActIdx + " deskID = " + this.mDesk.deskID ) ;
    //                         this.mDesk.onPlayerDoActWitSelfCard( this.mData.mActIdx, eMJActType.eMJAct_BuGang_Done ,card ,this.mData.mGangCnt > 0 ,this.mData.mEnterActInvokerIdx ) ;
    //                         ++this.mData.mGangCnt;
    //                         this.startWait();
    //                     }
    //                     else
    //                     {
    //                         XLogger.debug( "somebody want rob gang actIdx = " + this.mData.mActIdx + " deskID = " + this.mDesk.deskID + " wantIdxes = " + JSON.stringify(vps) ) ;
    //                         let otherData = new WaitOtherActStateData();
    //                         otherData.mBuGangRetore = this.mData ;
    //                         otherData.mCard = card ;
    //                         otherData.mGangCnt = this.mData.mGangCnt ;
    //                         otherData.mInvokerIdx = this.mData.mActIdx ;
    //                         otherData.mWaitIdxes = vps;
    //                         this.mDesk.transferState( eMJDeskState.eState_WaitOtherAct, otherData ) ;
    //                     }
    //                     return true ;
    //                 }
    //                 break ;
    //             case eMJActType.eMJAct_Hu:
    //                 {
    //                     XLogger.debug( "actIdx = " + this.mData.mActIdx + " do hu game end , deskID = " + this.mDesk.deskID  ) ;
    //                     this.mDesk.transferState( eMJDeskState.eState_End,true ) ;
    //                 }
    //                 break ;
    //             default:
    //                 {
    //                     XLogger.error( "act can not be processed in this state unknown act = " + act  ) ;
    //                 }
    //                 break ;
    //         }
    //         return true ;
    //     }
    //     return false ;
    // }

    onLogicMsg( msgID : eMsgType , msg : Object, nSessionID : number ) : boolean
    {
        if ( msgID < eMsgType.MSG_MJ_ACT_BEGIN || msgID > eMsgType.MSG_MJ_ACT_END )
        {
            return false ;
        }

        let player = this.mDesk.getPlayerBySessionID( nSessionID );
        if ( player == null || player.nIdx != this.mData.mActIdx )
        {
            XLogger.debug( "you are not current waiting act idx = " + this.mData.mActIdx + " your idx = " + ( player == null ? "null" : player.nIdx + " deskID = " + this.mDesk.deskID ) ) ;
            msg[key.ret] = 1 ;
            this.mDesk.sendMsgToPlayer(nSessionID, msgID, msg ) ;
            return true ;
        }
        XLogger.debug( "rcieved playerAct msg = " + eMsgType[msgID] + " actIdx = " + this.mData.mActIdx + " msgContent = " + JSON.stringify(msg) ) ;
        switch ( msgID )
        {
            case eMsgType.MSG_PLAYER_MJ_CHU:
                {
                    this.onPlayerChu(player,msg[key.card]) ;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_BU_GANG:
                {
                    this.onPlayerBuGang(player,msg[key.card]) ;
                }
                break ;
            case eMsgType.MSG_PLAYER_MJ_ANGANG:
                {
                    this.onPlayerAnGang(player,msg[key.card]) ;
                }
                break ;
            case eMsgType.MSG_PLAYER_MJ_HU:
                {
                    this.onPlayerHu(player) ;
                }
                break ;
            case eMsgType.MSG_PLAYER_MJ_PASS:
                {
                    msg[key.ret] = 0 ;
                    this.mDesk.sendMsgToPlayer(nSessionID, msgID, msg ) ;
                }
                break ;
            default:
                XLogger.debug( "your msg can not process in this state msgID = " + eMsgType[msgID] ) ;
                msg[key.ret] = 1 ;
                this.mDesk.sendMsgToPlayer(nSessionID, msgID, msg ) ;
                return false ;
        }
        return true ;
    }

    waitActTimeOut()
    {
        XLogger.debug("player auto chu pai , wait time out , idx = " + this.mData.mActIdx + " deskID = " + this.mDesk.deskID ) ;
        let p = this.mDesk.getPlayerByIdx(this.mData.mActIdx) ;
        this.onPlayerChu( p, p.getAutoChuCard() );
    }

    onPlayerReuesetInfo( idx : number ) : void
    {
        if ( idx == this.mData.mActIdx )
        {
            XLogger.debug( "waiting act player idx = " + idx +  " inform self act deskID = " + this.mDesk.deskID ) ;
            this.mDesk.informSelfAct(this.mData.mActIdx, this.mData.mEnterAct , this.mData.mGangCnt > 0 ) ;
        }
    }

    // function 
    startWait()
    {
        XLogger.debug( "start wait actIdx = " + this.mData.mActIdx + " deskID = " + this.mDesk.deskID ) ;
        if ( null != this.waitTimer )
        {
            clearTimeout( this.waitTimer ) ;
            this.waitTimer = null ;
        }

        let self = this ;
        this.waitTimer = setTimeout( ()=>{ self.mDesk.onPlayerEnterTuoGuanState(self.mData.mActIdx); self.waitActTimeOut(); } , this.mWaitTimeSecons * 1000 ) ;
    }

    onPlayerLeaveTuoGuanState( idx : number )
    {
        this.mWaitTimeSecons = G_ARG.TIME_MJ_WAIT_ACT - G_ARG.TIME_MJ_WAIT_ACT_TUOGUAN ;
        this.startWait();
    }

    // act 
    onPlayerChu( pPlayer : MJPlayerData, card : number )
    {
        if ( false == this.mDesk.onPlayerChu( pPlayer, card ) )
        {
            return ;
        }
        this.mData.mCard = card ;
        let vps = this.mDesk.getPlayersNeedTheCard( card, this.mData.mActIdx,this.mData.mGangCnt > 0 ,false ) ;
        if ( vps == null || vps.length == 0 )
        {
            let nextIdx = this.mDesk.getNextActIdx( this.mData.mActIdx ) ;
            this.onPlayerMo(nextIdx) ;
        }
        else
        {
            XLogger.debug( "other need player chued card = " + card + " deskID = " + this.mDesk.deskID + " others = " + JSON.stringify(vps) ) ;
            let otherData = new WaitOtherActStateData();
            otherData.mBuGangRetore = null ;
            otherData.mCard = card ;
            otherData.mGangCnt = this.mData.mGangCnt ;
            otherData.mInvokerIdx = this.mData.mActIdx ;
            otherData.mWaitIdxes = vps;
            this.mDesk.transferState( eMJDeskState.eState_WaitOtherAct, otherData ) ;
        }
    }

    onPlayerMo( nextIdx : number )
    {
        let mocard = this.mDesk.onPlayerMo( nextIdx ) ;
        if ( mocard == null || mocard == 0 )
        {
            XLogger.debug( "no more card to Mo go game end for waitActState deskID = " + this.mDesk.deskID ) ;
            this.mDesk.transferState( eMJDeskState.eState_End,false ) ;
            return ;
        }
        else
        {
            XLogger.debug( "No one need the card playerChu , next player enter waitActState deskID = " + this.mDesk.deskID + " nextIdx = " + nextIdx ) ;
            let data = new WaitActStateData( nextIdx, mocard )  ;
            this.onEnterState( data ) ;
        }
    }

    onPlayerBuGang( pPlayer : MJPlayerData , card : number )
    {
        if ( this.mDesk.onPlayerBuGang( pPlayer, card, true , this.mData.mEnterActInvokerIdx ) == false )
        {
            return ;
        }
        this.mData.mCard = card ;

        let vps = this.mDesk.getPlayersNeedTheCard( card, this.mData.mActIdx, this.mData.mGangCnt > 0 , true ) ;
        if ( vps != null && vps.length > 0 )
        {
            XLogger.debug( "somebody want rob gang actIdx = " + this.mData.mActIdx + " deskID = " + this.mDesk.deskID + " wantIdxes = " + JSON.stringify(vps) ) ;
            let otherData = new WaitOtherActStateData();
            otherData.mBuGangRetore = this.mData ;
            otherData.mCard = card ;
            otherData.mGangCnt = this.mData.mGangCnt ;
            otherData.mInvokerIdx = this.mData.mActIdx ;
            otherData.mWaitIdxes = vps;
            this.mDesk.transferState( eMJDeskState.eState_WaitOtherAct, otherData ) ;
        }
        else
        {
            XLogger.debug( "direct buGang nor other need rob gang actIdx = " + this.mData.mActIdx + " deskID = " + this.mDesk.deskID ) ;
            //this.mDesk.onPlayerDoActWitSelfCard( this.mData.mActIdx, eMJActType.eMJAct_BuGang_Done ,card ,this.mData.mGangCnt > 0 ,this.mData.mEnterActInvokerIdx ) ;
            this.mDesk.onPlayerBuGang(pPlayer, card, false , this.mData.mEnterActInvokerIdx ) ;
            ++this.mData.mGangCnt;
            this.startWait();
        }
    }

    onPlayerAnGang( pPlayer : MJPlayerData, card : number  )
    {
        if ( false == this.mDesk.onPlayerAnGang( pPlayer, card, this.mData.mEnterActInvokerIdx ) )
        {
            return ;
        }

        this.mData.mCard = card ;
        this.startWait();
    }

    onPlayerHu( pPlayer : MJPlayerData  )
    {
        if ( false == this.mDesk.onPlayerZiMoHu( pPlayer, this.mData.mCard, this.mData.mGangCnt, this.mData.mEnterActInvokerIdx) )
        {
            return ;
        }
        XLogger.debug( "actIdx = " + this.mData.mActIdx + " do hu game end , deskID = " + this.mDesk.deskID  ) ;
        this.mDesk.transferState( eMJDeskState.eState_End,true ) ;
    }
}