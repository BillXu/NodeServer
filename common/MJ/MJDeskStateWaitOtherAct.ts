import { remove } from 'lodash';
import { XLogger } from './../Logger';
import { key } from './../../shared/KeyDefine';
import { eMJActType } from './../../shared/mjData/MJDefine';
import { eMsgType } from './../../shared/MessageIdentifer';
import { MJDesk } from './MJDesk';
import { eMJDeskState } from './../../shared/SharedDefine';
import { IMJDeskState } from './IMJDeskState';
export class MJDeskStateWaitOtherAct implements IMJDeskState
{
    static TIME_WAIT_ACT : number = 10 ;
    protected waitTimer : NodeJS.Timeout = null ;
    protected mDesk : MJDesk = null ;

    protected mWaitIdxes : {idx : number , maxAct : eMJActType }[] = null ;
    protected mInvokerIdx : number = 0 ;
    protected mCard : number = 0 ;
    protected mBuGangRetore : Object = null ;
    protected mGangCnt : number = 0 ;

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

    onEnterState( jsArg : Object ) : void 
    {
        // { waitIdxes : { idx : 0 , maxAct : eMJAct }[] , invokerIdx : number, act : eMJActType ,buGangResore? : Object }
        this.mChosedEatWith = null ;
        this.mChosedAct = null ;
        this.mWaitIdxes = jsArg["waitIdxes"];
        this.mInvokerIdx = jsArg[key.invokerIdx] ;
        this.mGangCnt = jsArg[key.gangCnt] ;
        this.mCard = jsArg[key.card] ;
        this.mBuGangRetore = null ;
        if ( jsArg[key.act] == eMJActType.eMJAct_BuGang_Declare )
        {
            this.mBuGangRetore = jsArg["buGangResore"] ;
        }

        let v = [] ;
        for ( let p of this.mWaitIdxes )
        {
            v.push(p.idx) ;
        }

        XLogger.debug( "do wait player act deskID = " + this.mDesk.deskID + " detail = " + JSON.stringify(jsArg) ) ;
        this.mDesk.informOtherPlayerAct(v,this.mCard, this.mInvokerIdx, jsArg[key.act] ) ;

        // start wait ;
        if ( null != this.waitTimer )
        {
            clearTimeout( this.waitTimer ) ;
            this.waitTimer = null ;
        }

        this.waitTimer = setTimeout( this.waitActTimeOut.bind(this), MJDeskStateWaitOtherAct.TIME_WAIT_ACT ) ;
    }

    onLevelState() : void 
    {
        if ( this.waitTimer != null )
        {
            clearTimeout(this.waitTimer) ;
            this.waitTimer = null ;
        }
    }

    visitInfo( outJsInfo : Object ) : void 
    {
        outJsInfo[key.card] = this.mCard ;
        outJsInfo[key.invokerIdx] = this.mInvokerIdx ;
        outJsInfo[key.act] = this.mBuGangRetore == null ? eMJActType.eMJAct_Chu : eMJActType.eMJAct_BuGang_Declare ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, sessionID : number ) : boolean 
    {
        if ( msgID != eMsgType.MSG_PLAYER_MJ_ACT )
        {
            return false ;
        }

        let p = this.mDesk.getPlayerBySessionID(sessionID) ;
        
        if ( p == null || this.mWaitIdxes.findIndex(( pw : {idx : number , maxAct : eMJActType } )=>pw.idx == p.nIdx ) == -1  )
        {
            msg[key.ret] = 1 ;
            XLogger.debug( "you are not in room , or not in waiting list not your turn orgID = " + sessionID + " is " + ( p == null ? " null " : " not in list " )  ) ;
            this.mDesk.sendMsgToPlayer( sessionID, msgID, msg ) ;
            return true ;
        }

        let act : eMJActType = msg[key.act] ;
        let card : number = msg[key.card] ;
        let isOk = this.mDesk.canPlayerDoAct( p.nIdx, act ,card , this.mInvokerIdx , msg[key.eatWith] ) ;
        if ( isOk == false )
        {
            msg[key.ret] = 1 ;
            XLogger.debug( "you can do this act orgID = " + sessionID + " act = " + act ) ;
            this.mDesk.sendMsgToPlayer( sessionID, msgID, msg ) ;
            return true ;
        }

        if ( act == eMJActType.eMJAct_Chi )
        {
            this.mChosedEatWith = msg[key.eatWith];
        }

        this.onPlayerChosedDoAct(p.nIdx, act ) ;
        msg[key.ret] = 0 ;
        this.mDesk.sendMsgToPlayer( sessionID, msgID, msg ) ;
        if ( this.mWaitIdxes.length != 0 ) // go on wait other ;
        {
            return true ;
        }

        if ( this.mChosedAct == null || this.mChosedAct.act == eMJActType.eMJAct_Pass )
        {
            XLogger.debug("all player chose pass or forgot deskID = " + this.mDesk.deskID) ;
            if ( this.mBuGangRetore == null )
            {
                let nextIdx = this.mDesk.getNextActIdx( this.mInvokerIdx ) ;
                this.mDesk.onPlayerMo( nextIdx ) ;
                this.mDesk.transferState( eMJDeskState.eState_WaitAct ,{ idx : nextIdx } ) ;
            }
            else
            {
                let arg = {} ;
                arg[key.idx] = this.mInvokerIdx ;
                arg[key.act] = eMJActType.eMJAct_BuGang_Done;
                arg["buGangResore"] = this.mBuGangRetore ;
                arg[key.card] = this.mCard ;
                this.mDesk.transferState( eMJDeskState.eState_WaitAct ,arg ) ;
            }
        }
        else
        {
            this.doChosedAct();
        }

        return true ;
    }

    protected onPlayerChosedDoAct( idx : number , act : eMJActType )
    {
        remove(this.mWaitIdxes,( pw : {idx : number , maxAct : eMJActType } )=>pw.idx == idx );
        if ( this.mChosedAct.act == null )
        {
            this.mChosedAct.act = act ;
            this.mChosedAct.idxes = [] ;
            this.mChosedAct.idxes.push(idx) ;

            let self = this ;
            remove(this.mWaitIdxes,( pw : {idx : number , maxAct : eMJActType } )=>pw.maxAct < self.mChosedAct.act );
            return ;
        }

        if ( this.mChosedAct.act < act )
        {
            this.mChosedAct.act = act ;
            this.mChosedAct.idxes.length = 0 ;
            this.mChosedAct.idxes.push(idx) ;

            let self = this ;
            remove(this.mWaitIdxes,( pw : {idx : number , maxAct : eMJActType } )=>pw.maxAct < self.mChosedAct.act );
        }
        else if ( this.mChosedAct.act == act )
        {
            this.mChosedAct.idxes.push(idx) ;
        }
    }

    protected doChosedAct()
    {
        for ( let idx of this.mChosedAct.idxes )
        {
            XLogger.debug( "do chosed act idx = " + idx + " act = " + this.mChosedAct.act + " deskID = " + this.mDesk.deskID ) ;
            this.mDesk.onPlayerDoActWithOtherCard(idx, this.mChosedAct.act, this.mCard, this.mInvokerIdx,this.mGangCnt , this.mChosedEatWith ) ;
        }

        if ( this.mChosedAct.act == eMJActType.eMJAct_Hu )
        {
            this.mDesk.transferState( eMJDeskState.eState_End ) ;
        }
        else
        {
            let arg = {} ;
            arg[key.idx] = this.mChosedAct.idxes[0] ;
            arg[key.act] = this.mChosedAct.act;
            arg[key.card] = this.mCard ;
            arg[key.invokerIdx] = this.mInvokerIdx;
            this.mDesk.transferState( eMJDeskState.eState_WaitAct ,arg ) ;
        }
    }

    protected waitActTimeOut()
    {
        XLogger.debug("player auto pass " + " deskID = " + this.mDesk.deskID ) ;
        for ( let p of this.mWaitIdxes )
        {
            let msg = {} ;
            msg[key.act] = eMJActType.eMJAct_Pass ;
            msg[key.card] = this.mCard;  
            this.onLogicMsg(eMsgType.MSG_PLAYER_MJ_ACT, msg, this.mDesk.getPlayerByIdx(p.idx).sessionID ) ;
        }
    }

}