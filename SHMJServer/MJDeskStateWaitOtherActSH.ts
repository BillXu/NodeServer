import { G_ARG, eMJPlayerState } from './../shared/SharedDefine';
import { XLogger } from './../common/Logger';
import { MJPlayerDataSH } from './../shared/mjshData/MJPlayerDataSH';
import { MJDeskStateWaitOtherAct } from './../common/MJ/MJDeskStateWaitOtherAct';
import { eMsgType } from '../shared/MessageIdentifer';
export class MJDeskStateWaitOtherActSH extends MJDeskStateWaitOtherAct
{
    protected startWaitPlayer( idx : number , time : number )
    {
        let pp = this.mDesk.getPlayerByIdx(idx) as MJPlayerDataSH; 
        if ( pp.isTing )
        {
            time =  G_ARG.TIME_MJ_WAIT_ACT_TUOGUAN ;
            if ( pp.state != eMJPlayerState.eState_TuoGuan && this.mDesk.canPlayerHu(pp.nIdx, this.mData.mCard, false, this.mData.mGangCnt > 0 , this.mData.mInvokerIdx) == true )
            {
                time = G_ARG.TIME_MJ_WAIT_ACT;
            }
        }

        super.startWaitPlayer(idx, time) ;
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
        else if ( pp.isTing && pp.canMingGang(this.mData.mCard) )
        {
            XLogger.debug("SH hu player direct Ming gang " + " deskID = " + this.mDesk.deskID ) ;
            XLogger.debug( "SH auto direct Ming gang idx = " + idx + " deskID = " + this.mDesk.deskID ) ;
            this.onLogicMsg(eMsgType.MSG_PLAYER_MJ_MING_GANG, {}, this.mDesk.getPlayerByIdx(idx).sessionID ) ;
        }
        else
        {
            super.waitActTimeOut(idx) ;
        }
    }

}