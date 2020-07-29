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
    static TIME_WAIT_ACT : number = 10 ;
    protected mData : WaitActStateData = null ;

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
            this.mDesk.onPlayerDoActWitSelfCard( this.mData.mActIdx, eMJActType.eMJAct_BuGang_Done ,this.mData.mCard, this.mData.mGangCnt > 0 ,this.mData.mEnterActInvokerIdx ) ;
            ++this.mData.mGangCnt;
        }
        else if ( this.mData.mEnterAct == eMJActType.eMJAct_MingGang )
        {
            ++this.mData.mGangCnt;
        }
        this.mDesk.informSelfAct(this.mData.mActIdx, this.mData.mEnterAct ) ;
        if ( this.mDesk.getPlayerByIdx(this.mData.mActIdx).state == eMJPlayerState.eState_TuoGuan )
        {
            XLogger.debug( "player is tuoguan state actIdx = " + this.mData.mActIdx + " deskID = " + this.mDesk.deskID  ) ;
            let self = this ;
            setTimeout(() => {
                self.waitActTimeOut();
            }, 1500 );
        }
        else
        {
            this.startWait();
        }
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

    onLogicMsg( msgID : eMsgType , msg : Object, nSessionID : number ) : boolean 
    {
        if ( msgID == eMsgType.MSG_PLAYER_MJ_ACT )
        {
            if ( this.mDesk.getPlayerByIdx(this.mData.mActIdx).sessionID != nSessionID )
            {
                msg[key.ret] = 1 ;
                XLogger.debug( "not your turn orgID = " + nSessionID + " deskID = " + this.mDesk.deskID ) ;
                this.mDesk.sendMsgToPlayer(nSessionID, msgID, msg) ;
                return true ;
            }

            let act : eMJActType = msg[key.act] ;
            let card : number = msg[key.card] ;
            let isOk = this.mDesk.onPlayerDoActWitSelfCard( this.mData.mActIdx, act ,card , this.mData.mGangCnt > 0 ,this.mData.mEnterActInvokerIdx ) ;
            if ( isOk && this.mData.mEnterAct == eMJActType.eMJAct_Peng && act != eMJActType.eMJAct_Chu )
            {
                isOk = false ;
                XLogger.warn( "after peng , player can only chu , can not do other things ,uid = " + this.mDesk.getPlayerByIdx(this.mData.mActIdx).uid + " deskID = " + this.mDesk.deskID ) ;
            }

            if ( false == isOk )
            {
                msg[key.ret] = 2 ;
                XLogger.debug( "you can not do act orgID = " + nSessionID + " act = " + eMJActType[act] + " deskID = " + this.mDesk.deskID ) ;
                this.mDesk.sendMsgToPlayer(nSessionID, msgID, msg) ;
                return true ;
            }
            msg[key.ret] = 0 ;
            this.mDesk.sendMsgToPlayer( nSessionID, msgID, msg ) ;
            XLogger.debug( "in WaitActState palyer idx = " + this.mData.mActIdx + " do act = " + eMJActType[act] + " card = " + card + " deskID = " + this.mDesk.deskID ) ;
            switch ( act )
            {
                case eMJActType.eMJAct_Chu:
                    {
                        let vps = this.mDesk.getPlayersNeedTheCard( card, this.mData.mActIdx,this.mData.mGangCnt > 0 ,false ) ;
                        if ( vps == null || vps.length == 0 )
                        {
                            let nextIdx = this.mDesk.getNextActIdx( this.mData.mActIdx ) ;
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
                        return true ;
                    }
                    break;
                case eMJActType.eMJAct_AnGang:
                    {
                        ++this.mData.mGangCnt ;
                        this.startWait();
                    }
                    break;
                case eMJActType.eMJAct_BuGang_Declare:
                    {
                        let vps = this.mDesk.getPlayersNeedTheCard( card, this.mData.mActIdx, this.mData.mGangCnt > 0 , true ) ;
                        if ( vps == null || vps.length == 0 )
                        {
                            XLogger.debug( "direct buGang nor other need rob gang actIdx = " + this.mData.mActIdx + " deskID = " + this.mDesk.deskID ) ;
                            this.mDesk.onPlayerDoActWitSelfCard( this.mData.mActIdx, eMJActType.eMJAct_BuGang_Done ,card ,this.mData.mGangCnt > 0 ,this.mData.mEnterActInvokerIdx ) ;
                            ++this.mData.mGangCnt;
                            this.startWait();
                        }
                        else
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
                        return true ;
                    }
                    break ;
                case eMJActType.eMJAct_Hu:
                    {
                        XLogger.debug( "actIdx = " + this.mData.mActIdx + " do hu game end , deskID = " + this.mDesk.deskID  ) ;
                        this.mDesk.transferState( eMJDeskState.eState_End,true ) ;
                    }
                    break ;
                default:
                    {
                        XLogger.error( "act can not be processed in this state unknown act = " + act  ) ;
                    }
                    break ;
            }
            return true ;
        }
        return false ;
    }

    waitActTimeOut()
    {
        XLogger.debug("player auto chu pai , wait time out , idx = " + this.mData.mActIdx + " deskID = " + this.mDesk.deskID ) ;
        let msg = {} ;
        msg[key.act] = eMJActType.eMJAct_Chu ;
        msg[key.card] = this.mDesk.getPlayerAutoChuCard(this.mData.mActIdx);  
        this.onLogicMsg(eMsgType.MSG_PLAYER_MJ_ACT, msg, this.mDesk.getPlayerByIdx(this.mData.mActIdx).sessionID ) ;
    }

    onPlayerReuesetInfo( idx : number ) : void
    {
        if ( idx == this.mData.mActIdx )
        {
            XLogger.debug( "waiting act player idx = " + idx +  " inform self act deskID = " + this.mDesk.deskID ) ;
            this.mDesk.informSelfAct(this.mData.mActIdx, this.mData.mEnterAct ) ;
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

        this.waitTimer = setTimeout( this.waitActTimeOut.bind(this), MJDeskStateWaitAct.TIME_WAIT_ACT ) ;
    }
}