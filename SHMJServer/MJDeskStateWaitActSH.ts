import { G_ARG, eMJPlayerState } from './../shared/SharedDefine';
import { key } from './../shared/KeyDefine';
import { XLogger } from './../common/Logger';
import { MJDeskSHNew } from './MJDeskSHNew';
import { MJPlayerDataSH } from './../shared/mjshData/MJPlayerDataSH';
import { MJDeskStateWaitAct, WaitActStateData } from './../common/MJ/MJDeskStateWaitAct';
import { eMJDeskState } from '../shared/SharedDefine';
import { eMsgType } from '../shared/MessageIdentifer';
import { WaitOtherActStateData } from '../common/MJ/MJDeskStateWaitOtherAct';
export class MJDeskStateWaitActSH extends MJDeskStateWaitAct
{
    onLogicMsg( msgID : eMsgType , msg : Object, nSessionID : number ) : boolean
    {
        if ( msgID != eMsgType.MSG_PLAYER_MJ_TING )
        {
            return super.onLogicMsg(msgID, msg, nSessionID) ;
        }

        let player = this.mDesk.getPlayerBySessionID( nSessionID );
        if ( player == null || player.nIdx != this.mData.mActIdx )
        {
            XLogger.debug( "sh you are not current waiting act idx = " + this.mData.mActIdx + " your idx = " + ( player == null ? "null" : player.nIdx + " deskID = " + this.mDesk.deskID ) ) ;
            msg[key.ret] = 1 ;
            this.mDesk.sendMsgToPlayer(nSessionID, msgID, msg ) ;
            return true ;
        }

        let card = msg[key.card] ;
        if ( ( this.mDesk as MJDeskSHNew ).onPlayerTing( this.mData.mActIdx, card ) )
        {
            this.mData.mCard = card ;
            let vps = this.mDesk.getPlayersNeedTheCard( card, this.mData.mActIdx,this.mData.mGangCnt > 0 ,false ) ;
            if ( vps == null || vps.length == 0 )
            {
                if ( this.mDesk.isGameOver() )
                {
                    this.mDesk.transferState( eMJDeskState.eState_End,false ) ;
                    return true;
                }
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

        return true ;
    }

    waitActTimeOut()
    {
        let p = this.mDesk.getPlayerByIdx(this.mData.mActIdx) as MJPlayerDataSH;
        if ( p.isTing && this.mDesk.canPlayerHu(this.mData.mActIdx, p.getAutoChuCard(), true, this.mData.mGangCnt > 0 , this.mData.mEnterActInvokerIdx ))
        {
            XLogger.debug( "player ting pai ,so auto hu uid = " + p.uid + " deskID = " + this.mDesk.deskID ) ;
            super.onPlayerHu(p) ;
        }
        else if ( p.isTing && p.state != eMJPlayerState.eState_TuoGuan && p.getCanBuGangCards().length > 0 )
        {
            XLogger.debug( "player ting pai , so auto buGang uid = " + p.uid + " deskID = " + this.mDesk.deskID ) ;
            super.onPlayerBuGang(p, p.getCanBuGangCards()[0] ) ;
        }
        else
        {
            super.waitActTimeOut();
        }
    }

    startWait(WaitTimeSecons : number )
    {
        let buHuaTime = ( this.mDesk as MJDeskSHNew ).checkPlayerBuHua(this.mData.mActIdx) ;
        if ( 0 != buHuaTime )
        {
            WaitTimeSecons += buHuaTime ;
            ++this.mData.mGangCnt;  // hua as gang when hu in one round;
            //this.mDesk.informSelfAct(this.mData.mActIdx, this.mData.mEnterAct, this.mData.mGangCnt > 0 ) ;
            XLogger.debug( "player do bu hua , inform act idx = " + this.mData.mActIdx ) ;
        } 

        let p = this.mDesk.getPlayerByIdx( this.mData.mActIdx ) as MJPlayerDataSH;
        let vh = p.getHoldHuaCards();
        if ( vh != null && vh.length > 0 )
        {
            XLogger.debug( "no more card to bu hua , so game end" ) ;
            this.mDesk.transferState( eMJDeskState.eState_End, false ) ;
            return ;
        }

        if ( p.isTing ) // modify wait time 
        {
            WaitTimeSecons = G_ARG.TIME_MJ_WAIT_ACT_TUOGUAN + buHuaTime;
            //if ( p.state != eMJPlayerState.eState_TuoGuan && p.getCanBuGangCards().length > 0  && this.mDesk.canPlayerHu( p.nIdx,p.getAutoChuCard(),true,this.mData.mGangCnt > 0 ,p.nIdx ) == false )
            {
              //  WaitTimeSecons = G_ARG.TIME_MJ_WAIT_ACT + buHuaTime ;
            }
        }

        super.startWait(WaitTimeSecons);
    }
}