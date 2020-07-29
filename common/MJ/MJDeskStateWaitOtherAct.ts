import { WaitActStateData } from './MJDeskStateWaitAct';
import { remove } from 'lodash';
import { XLogger } from './../Logger';
import { key } from './../../shared/KeyDefine';
import { eMJActType } from './../../shared/mjData/MJDefine';
import { eMsgType } from './../../shared/MessageIdentifer';
import { MJDesk } from './MJDesk';
import { eMJDeskState, eMJPlayerState } from './../../shared/SharedDefine';
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
    protected waitTimer : NodeJS.Timeout = null ;
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
        this.mDesk.informOtherPlayerAct(v,this.mData.mCard, this.mData.mInvokerIdx, this.mData.mBuGangRetore != null ) ;

        // start wait ;
        if ( null != this.waitTimer )
        {
            clearTimeout( this.waitTimer ) ;
            this.waitTimer = null ;
        }

        this.waitTimer = setTimeout( this.waitActTimeOut.bind(this), MJDeskStateWaitOtherAct.TIME_WAIT_ACT ) ;

        // check tuoGuang
        for ( let i of v )
        {
            let p = this.mDesk.getPlayerByIdx(i);
            if ( p.state == eMJPlayerState.eState_TuoGuan )
            {
                XLogger.debug( "waiting player is tuoguan auto pass idx = " + i + " deskID = " + this.mDesk.deskID ) ;
                let self = this ;
                setTimeout(() => {
                    let msg = {} ;
                    msg[key.act] = eMJActType.eMJAct_Pass ;
                    msg[key.card] = self.mData.mCard;  
                    self.onLogicMsg(eMsgType.MSG_PLAYER_MJ_ACT, msg, p.sessionID ) ;
                }, 1500 );
    
            }
        }
    }

    onLevelState() : void 
    {
        if ( this.waitTimer != null )
        {
            clearTimeout(this.waitTimer) ;
            this.waitTimer = null ;
        }

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
        if ( msgID != eMsgType.MSG_PLAYER_MJ_ACT )
        {
            return false ;
        }

        let p = this.mDesk.getPlayerBySessionID(sessionID) ;
        
        if ( p == null || this.mData.mWaitIdxes.findIndex(( pw : {idx : number , maxAct : eMJActType } )=>pw.idx == p.nIdx ) == -1  )
        {
            msg[key.ret] = 1 ;
            XLogger.debug( "In waitOtherActState you are not in room , or not in waiting list not your turn orgID = " + sessionID + " is " + ( p == null ? " null " : " not in list " )  + " deskID " + this.mDesk.deskID ) ;
            this.mDesk.sendMsgToPlayer( sessionID, msgID, msg ) ;
            return true ;
        }

        let act : eMJActType = msg[key.act] ;
        let card : number = msg[key.card] ;
        let isOk = this.mDesk.canPlayerDoActWithOtherCard( p.nIdx, act ,card , this.mData.mInvokerIdx , this.mData.mGangCnt > 0 ,msg[key.eatWith] ) ;
        if ( isOk == false )
        {
            msg[key.ret] = 3 ;
            XLogger.debug( "you can do this act idx = " + p.nIdx + " act = " + act  + " deskID = " + this.mDesk.deskID) ;
            this.mDesk.sendMsgToPlayer( sessionID, msgID, msg ) ;
            return true ;
        }

        if ( act == eMJActType.eMJAct_Chi )
        {
            if ( msg[key.eatWith] == null )
            {
                XLogger.error( "eatAct but eatWith is null can not do this act failed idx = " + p.nIdx + " deskID = " + this.mDesk.deskID ) ;
                msg[key.ret] = 4 ;
                this.mDesk.sendMsgToPlayer( sessionID, msgID, msg ) ;
            }
            this.mChosedEatWith = msg[key.eatWith];
        }

        msg[key.ret] = 0 ;
        this.mDesk.sendMsgToPlayer( sessionID, msgID, msg ) ;

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
        if ( vd == null || vd.length == 1 )
        {
            XLogger.error( "why remove chosed act idx is null ?  idx = " + idx + " deskID = " + this.mDesk.deskID ) ;
            return ;
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
        for ( let idx of this.mChosedAct.idxes )
        {
            XLogger.debug( "do chosed act idx = " + idx + " act = " + eMJActType[this.mChosedAct.act] + " deskID = " + this.mDesk.deskID ) ;
            this.mDesk.onPlayerDoActWithOtherCard(idx, this.mChosedAct.act, this.mData.mCard, this.mData.mInvokerIdx,this.mData.mGangCnt , this.mChosedEatWith ) ;
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

    protected waitActTimeOut()
    {
        XLogger.debug("player auto pass " + " deskID = " + this.mDesk.deskID ) ;
        for ( let p of this.mData.mWaitIdxes )
        {
            XLogger.debug( "auto pass idx = " + p.idx + " deskID = " + this.mDesk.deskID ) ;
            let msg = {} ;
            msg[key.act] = eMJActType.eMJAct_Pass ;
            msg[key.card] = this.mData.mCard;  
            this.onLogicMsg(eMsgType.MSG_PLAYER_MJ_ACT, msg, this.mDesk.getPlayerByIdx(p.idx).sessionID ) ;
        }
    }

    onPlayerReuesetInfo( idx : number ) : void
    {
        let findIdx = this.mData.mWaitIdxes.findIndex(( pw : {idx : number , maxAct : eMJActType } )=>pw.idx == idx ) ;
        XLogger.debug( "IN WaitOtherAct player reqInfo of state , findIdx = " + findIdx ) ;
        if ( findIdx != -1 )
        {
            this.mDesk.informOtherPlayerAct([findIdx],this.mData.mCard, this.mData.mInvokerIdx, this.mData.mBuGangRetore != null ) ;
        }
    }
}