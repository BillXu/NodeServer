import { MJPlayerData } from './../../shared/mjData/MJPlayerData';
import  HashMap  from 'hashmap';
import { WaitActStateData } from './MJDeskStateWaitAct';
import { remove } from 'lodash';
import { XLogger } from './../Logger';
import { key } from './../../shared/KeyDefine';
import { eMJActType } from './../../shared/mjData/MJDefine';
import { eMsgType } from './../../shared/MessageIdentifer';
import { MJDesk } from './MJDesk';
import { eMJDeskState, eMJPlayerState, G_ARG } from './../../shared/SharedDefine';
import { IMJDeskState } from './IMJDeskState';
export class WaitOtherActStateData
{
    mWaitIdxes : {idx : number , maxAct : eMJActType }[] = null ;
    mInvokerIdx : number = 0 ;
    mCard : number = 0 ;
    mGangCnt : number = 0 ;
    mBuGangRetore : WaitActStateData = null ;
}

export class MJDeskStateWaitOtherAct implements IMJDeskState
{
    static TIME_WAIT_ACT : number = 10 ;
    protected waitTimers : HashMap<number,NodeJS.Timeout> = new HashMap<number,NodeJS.Timeout>() ;
    protected mDesk : MJDesk = null ;

    protected mData : WaitOtherActStateData = null;

    protected mChosedAct : { act : eMJActType , idxes : number[] } = null ;
    protected mChosedEatWith : number[] = null;
    init( desk : MJDesk ) : void 
    {
        this.mDesk = desk ;
    }

    getState() : eMJDeskState 
    {
        return eMJDeskState.eState_WaitOtherAct ;
    }

    onEnterState( jsData : WaitOtherActStateData ) : void 
    {
        // { waitIdxes : { idx : 0 , maxAct : eMJAct }[] , invokerIdx : number, act : eMJActType ,buGangResore? : Object }
        this.mChosedEatWith = null ;
        this.mChosedAct = null ;
        this.mData = jsData ;
 
        let v = [] ;
        for ( let p of this.mData.mWaitIdxes )
        {
            v.push(p.idx) ;
        }

        XLogger.debug( "enter waitOtherActState deskID = " + this.mDesk.deskID ) ;
        this.mDesk.informOtherPlayerAct(v,this.mData.mCard, this.mData.mInvokerIdx, this.mData.mBuGangRetore != null, this.mData.mGangCnt > 0  ) ;

        // start wait ;
        for ( let p of this.mData.mWaitIdxes )
        {
            let pp = this.mDesk.getPlayerByIdx(p.idx) ;
            let time = pp.state == eMJPlayerState.eState_TuoGuan ? G_ARG.TIME_MJ_WAIT_ACT_TUOGUAN : G_ARG.TIME_MJ_WAIT_ACT ;
            this.startWaitPlayer(p.idx, time ) ;
        }
    }

    protected startWaitPlayer( idx : number , time : number )
    {
        let t = this.waitTimers.get(idx) ;
        if ( null != t )
        {
            clearTimeout(t) ;
            this.waitTimers.delete(idx) ;
        }

        let self = this ;
        t = setTimeout(() => {
            self.mDesk.onPlayerEnterTuoGuanState(idx) ;
            self.waitActTimeOut(idx) ;
            let tt = self.waitTimers.get(idx) ;
            if ( null != tt )
            {
                clearTimeout(tt) ;
                this.waitTimers.delete(idx) ;
            }

        }, time * 1000 );

        this.waitTimers.set(idx, t ) ;
    }

    onPlayerLeaveTuoGuanState( idx : number )
    {
        let ret = this.mData.mWaitIdxes.findIndex( ( v : {idx : number , maxAct : eMJActType } )=>{ v.idx == idx } ) ;
        if ( -1 != ret )
        {
            let time = G_ARG.TIME_MJ_WAIT_ACT - G_ARG.TIME_MJ_WAIT_ACT_TUOGUAN ;
            this.startWaitPlayer(idx, time) ;
        }
    }

    onLevelState() : void 
    {
        let vt = this.waitTimers.values();
        for ( let v of vt )
        {
            clearTimeout(v) ;
        }
        this.waitTimers.clear();
        XLogger.debug( "leave waitOtherActState deskID = " + this.mDesk.deskID ) ;
    }

    visitInfo( outJsInfo : Object ) : void 
    {
        outJsInfo[key.card] = this.mData.mCard ;
        outJsInfo[key.invokerIdx] = this.mData.mInvokerIdx ;
        outJsInfo[key.act] = this.mData.mBuGangRetore == null ? eMJActType.eMJAct_Chu : eMJActType.eMJAct_BuGang_Declare ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, sessionID : number ) : boolean 
    {
        let act = eMJActType.eMJAct_Max ;
        switch ( msgID )
        {
            case eMsgType.MSG_PLAYER_MJ_PASS:
                {
                    act = eMJActType.eMJAct_Pass;
                }
                break ;
            case eMsgType.MSG_PLAYER_MJ_EAT:
                {
                    act = eMJActType.eMJAct_Chi;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_PENG:
                {
                    act = eMJActType.eMJAct_Peng;
                }
                break ;
            case eMsgType.MSG_PLAYER_MJ_MING_GANG:
                {
                    act = eMJActType.eMJAct_MingGang;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_HU:
                {
                    act = eMJActType.eMJAct_Hu;
                }
                break;
            default:
                {
                    XLogger.debug( "msg can not process in this state msgID = " + eMsgType[msgID] + " deskID = " + this.mDesk.deskID ) ;
                    return false ;
                }
                break ;

        }

        let p = this.mDesk.getPlayerBySessionID(sessionID) ;
        
        if ( p == null || this.mData.mWaitIdxes.findIndex(( pw : {idx : number , maxAct : eMJActType } )=>pw.idx == p.nIdx ) == -1  )
        {
            msg[key.ret] = 1 ;
            if ( p != null )
            {
                msg[key.idx] = p.nIdx ;
            }
            else
            {
                msg["err"] = "you are not in room";
            }
            XLogger.debug( "In waitOtherActState you are not in room , or not in waiting list not your turn orgID = " + sessionID + " is " + ( p == null ? " null " : " not in list " )  + " deskID " + this.mDesk.deskID ) ;
            this.mDesk.sendMsgToPlayer( sessionID, msgID, msg ) ;
            return true ;
        }

        if ( act == eMJActType.eMJAct_Chi )
        {
            if ( msg[key.eatWith] == null || msg[key.eatWith].length != 2 )
            {
                XLogger.error( "eatAct but eatWith is null can not do this act failed idx = " + p.nIdx + " deskID = " + this.mDesk.deskID ) ;
                msg[key.idx] = p.nIdx ;
                msg[key.ret] = 4 ;
                this.mDesk.sendMsgToPlayer( sessionID, msgID, msg ) ;
                return true ;
            }
            this.mChosedEatWith = msg[key.eatWith];
        }

        let card : number = this.mData.mCard;
        let isOk = this.mDesk.canPlayerDoActWithOtherCard( p.nIdx, act ,card , this.mData.mInvokerIdx , this.mData.mGangCnt > 0 ,this.mChosedEatWith ) ;
        if ( isOk == false )
        {
            msg[key.idx] = p.nIdx ;
            msg[key.ret] = 2 ;
            XLogger.debug( "you can do this act idx = " + p.nIdx + " act = " + act  + " deskID = " + this.mDesk.deskID) ;
            this.mDesk.sendMsgToPlayer( sessionID, msgID, msg ) ;
            return true ;
        }

        if ( eMJActType.eMJAct_Pass == act && this.mDesk.canPlayerDoActWithOtherCard( p.nIdx, eMJActType.eMJAct_Peng ,card , this.mData.mInvokerIdx , this.mData.mGangCnt > 0 ,this.mChosedEatWith ) )
        {
            p.addLouPeng(card);
        }

        if ( eMJActType.eMJAct_Hu != act && this.mDesk.canPlayerDoActWithOtherCard( p.nIdx, eMJActType.eMJAct_Hu ,card , this.mData.mInvokerIdx , this.mData.mGangCnt > 0 ,this.mChosedEatWith ) )
        {
            p.addLouHu(card) ;
        }

        // msg[key.ret] = 0 ;
        // this.mDesk.sendMsgToPlayer( sessionID, msgID, msg ) ;

        XLogger.debug( "In waitOtherActState player choseAct = " + eMJActType[act] + " idx = " + p.nIdx + " deskID = " + this.mDesk.deskID ) ;
        this.onPlayerChosedDoAct(p.nIdx, act ) ;
        if ( this.mData.mWaitIdxes.length != 0 ) // go on wait other ;
        {
            XLogger.debug( "still have player not chose act , go on wait deskID = " + this.mDesk.deskID ) ;
            return true ;
        }

        if ( this.mChosedAct == null || this.mChosedAct.act == eMJActType.eMJAct_Pass )
        {
            XLogger.debug("all player chose pass or forgot deskID = " + this.mDesk.deskID) ;
            if ( this.mData.mBuGangRetore == null )
            {
                let nextIdx = this.mDesk.getNextActIdx( this.mData.mInvokerIdx ) ;
                let mocard = this.mDesk.onPlayerMo( nextIdx ) ;
                if ( null == mocard || 0 == mocard )
                {   XLogger.debug( "in waitOtherActState no more card to MO , so game end deskID = " + this.mDesk.deskID ) ;
                    this.mDesk.transferState( eMJDeskState.eState_End ,false ) ;
                    return true ;
                }

                XLogger.debug( "all player check pass , so next player moPai nextIdx = " + nextIdx + " deskID = " + this.mDesk.deskID ) ;
                let wda = new WaitActStateData( nextIdx, mocard )  ; 
                this.mDesk.transferState( eMJDeskState.eState_WaitAct ,wda ) ;
            }
            else
            {
                XLogger.debug( "all palyer chose check pass , so go on finish BuGang idx = " + this.mData.mBuGangRetore.mActIdx + " deskID = " + this.mDesk.deskID ) ;
                this.mData.mBuGangRetore.mEnterAct = eMJActType.eMJAct_BuGang_Done ;
                this.mDesk.transferState( eMJDeskState.eState_WaitAct ,this.mData.mBuGangRetore ) ;
            }
        }
        else
        {
            XLogger.debug( "all player finished chose act and do their act deskID = " + this.mDesk.deskID ) ;
            this.doChosedAct();
        }

        return true ;
    }

    protected onPlayerChosedDoAct( idx : number , act : eMJActType )
    {
        let vd = remove(this.mData.mWaitIdxes,( pw : {idx : number , maxAct : eMJActType } )=>pw.idx == idx );
        if ( vd == null || vd.length == 0 )
        {
            XLogger.error( "why remove chosed act idx is null ?  idx = " + idx + " deskID = " + this.mDesk.deskID ) ;
            return ;
        }

        // clear wait timer ;
        let vt = this.waitTimers.get(idx) ;
        if ( vt == null )
        {
            XLogger.warn( "why waiting timer is null ? waiting otherActState idx = " + idx + " deskID = " + this.mDesk.deskID ) ;
        }
        else
        {
            clearTimeout(vt);
            this.waitTimers.delete(idx) ;
        }

        if ( this.mChosedAct == null )
        {
            XLogger.debug( "first chosed act = " + eMJActType[act] + " curIdx = " + idx + " deskID = " + this.mDesk.deskID ) ;
            this.mChosedAct = { act : act , idxes : null } ;
            this.mChosedAct.idxes = [] ;
            this.mChosedAct.idxes.push(idx) ;

            let self = this ;
            let v = remove(this.mData.mWaitIdxes,( pw : {idx : number , maxAct : eMJActType } )=>pw.maxAct < self.mChosedAct.act );
            if ( v != null && v.length > 0 )
            {
                XLogger.debug( "1 canncel wait max < act = " + eMJActType[act] + " idxes = " + v + " deskID = " + this.mDesk.deskID ) ;
            }
            return ;
        }

        if ( this.mChosedAct.act < act )
        {
            XLogger.debug( "cur chose act big than pre act = " + eMJActType[act] + " pre act = " + eMJActType[this.mChosedAct.act] + " curIdx = " + idx + " deskID = " + this.mDesk.deskID   ) ;
            this.mChosedAct.act = act ;
            this.mChosedAct.idxes.length = 0 ;
            this.mChosedAct.idxes.push(idx) ;

            let self = this ;
            let v = remove(this.mData.mWaitIdxes,( pw : {idx : number , maxAct : eMJActType } )=>pw.maxAct < self.mChosedAct.act );
            if ( v != null && v.length > 0 )
            {
                XLogger.debug( "2 canncel wait max < act = " + eMJActType[act] + " idxes = " + v + " deskID = " + this.mDesk.deskID ) ;
            }
        }
        else if ( this.mChosedAct.act == act )
        {
            this.mChosedAct.idxes.push(idx) ;
            XLogger.debug( "chose the same act push it idx = " + idx + " deskID = " + this.mDesk.deskID ) ;
        }
    }

    protected doChosedAct()
    {
        switch( this.mChosedAct.act )
        {
            case eMJActType.eMJAct_Chi:
                {
                    this.mDesk.onPlayerEat(this.mChosedAct.idxes[0], this.mData.mCard, this.mChosedEatWith,this.mData.mInvokerIdx ) ;
                }
                break;
            case eMJActType.eMJAct_Peng:
                {
                    this.mDesk.onPlayerPeng(this.mChosedAct.idxes[0], this.mData.mCard , this.mData.mInvokerIdx ) ;
                }
                break;
            case eMJActType.eMJAct_MingGang:
                {
                    this.mDesk.onPlayerMingGang(this.mChosedAct.idxes[0], this.mData.mCard , this.mData.mInvokerIdx ) ;
                }
                break;
            case eMJActType.eMJAct_Hu:
                {
                    this.mDesk.onPlayerHuOtherCard(this.mChosedAct.idxes, this.mData.mCard, this.mData.mInvokerIdx, this.mData.mGangCnt > 0, this.mData.mBuGangRetore != null ) ;
                    XLogger.debug( "player chose hu so go to gameEnd deskID = " + this.mDesk.deskID ) ;
                    this.mDesk.transferState( eMJDeskState.eState_End, true ) ;
                }
                break;
            default:
                XLogger.error("this act should not in here act = " + eMJActType[this.mChosedAct.act] + " deskID = " + this.mDesk.deskID )  ;
                return ;
        }

        if ( this.mChosedAct.act == eMJActType.eMJAct_Hu )
        {
            XLogger.debug( "player chose hu so go to gameEnd deskID = " + this.mDesk.deskID ) ;
            this.mDesk.transferState( eMJDeskState.eState_End, true ) ;
        }
        else
        {
            XLogger.debug( "player chosed some act ,go to waitActState  wait it act idx = " + this.mChosedAct.idxes[0] + " invokerIdx = " + this.mData.mInvokerIdx  ) ;
            let data = new WaitActStateData(this.mChosedAct.idxes[0],this.mData.mCard,this.mChosedAct.act );
            data.mEnterActInvokerIdx = this.mData.mInvokerIdx;
            this.mDesk.transferState( eMJDeskState.eState_WaitAct ,data ) ;
        }
    }

    protected waitActTimeOut( idx : number )
    {
        XLogger.debug("player auto pass " + " deskID = " + this.mDesk.deskID ) ;
        XLogger.debug( "auto pass idx = " + idx + " deskID = " + this.mDesk.deskID ) ;
        this.onLogicMsg(eMsgType.MSG_PLAYER_MJ_PASS, {}, this.mDesk.getPlayerByIdx(idx).sessionID ) ;
    }

    onPlayerReuesetInfo( idx : number ) : void
    {
        let findIdx = this.mData.mWaitIdxes.findIndex(( pw : {idx : number , maxAct : eMJActType } )=>pw.idx == idx ) ;
        XLogger.debug( "IN WaitOtherAct player reqInfo of state , findIdx = " + findIdx ) ;
        if ( findIdx != -1 )
        {
            this.mDesk.informOtherPlayerAct([idx],this.mData.mCard, this.mData.mInvokerIdx, this.mData.mBuGangRetore != null,this.mData.mGangCnt > 0 ) ;
        }
    }
}