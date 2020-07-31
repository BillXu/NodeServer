import { eMJActType } from './../shared/mjData/MJDefine';
import { key } from './../shared/KeyDefine';
import { XLogger } from './../common/Logger';
import { eMJPlayerState, G_ARG } from './../shared/SharedDefine';
import { MJPlayerDataSH } from './../shared/mjshData/MJPlayerDataSH';
import { MJDeskStateWaitOtherAct, WaitOtherActStateData } from './../common/MJ/MJDeskStateWaitOtherAct';
import { eMsgType } from '../shared/MessageIdentifer';
export class MJDeskStateWaitOtherActSH extends MJDeskStateWaitOtherAct
{
    setWaitingPlayerTimeout()
    {
        super.setWaitingPlayerTimeout();

        for ( let p of this.mData.mWaitIdxes )
        {
            let pp = this.mDesk.getPlayerByIdx(p.idx) as MJPlayerDataSH; 
            if ( pp.isTing == false )
            {
                continue ;
            }

            let tt = this.waitTimers.get(p.idx) ;
            clearTimeout(tt);
            this.waitTimers.delete(p.idx) ;

            let time =  G_ARG.TIME_MJ_WAIT_ACT_TUOGUAN ;
            if ( pp.state != eMJPlayerState.eState_TuoGuan && pp.canMingGang(this.mData.mCard) && this.mDesk.canPlayerHu(pp.nIdx, this.mData.mCard, false, this.mData.mGangCnt > 0 , this.mData.mInvokerIdx) == false )
            {
                time = G_ARG.TIME_MJ_WAIT_ACT;
            }

            let self = this ;
            let idx = p.idx ;
            let t = setTimeout(() => {
                self.waitActTimeOut(idx) ;
            }, time * 1000 );

            this.waitTimers.set(idx, t ) ;
        }
    }

    waitActTimeOut( idx : number )
    {
        let pp = this.mDesk.getPlayerByIdx(idx) as MJPlayerDataSH; 
        if ( pp.isTing && this.mDesk.canPlayerHu(pp.nIdx, this.mData.mCard, false, this.mData.mGangCnt > 0 , this.mData.mInvokerIdx) )
        {
            XLogger.debug("SH hu player direct hu " + " deskID = " + this.mDesk.deskID ) ;
            XLogger.debug( "SH auto direct hu idx = " + idx + " deskID = " + this.mDesk.deskID ) ;
            this.onLogicMsg(eMsgType.MSG_PLAYER_MJ_HU, {}, this.mDesk.getPlayerByIdx(idx).sessionID ) ;
        }
        else
        {
            super.waitActTimeOut(idx) ;
        }
    }

}