import { eMJActType } from './../../shared/mjData/MJDefine';
import { key } from './../../shared/KeyDefine';
import { XLogger } from './../Logger';
import { eMsgType } from './../../shared/MessageIdentifer';
import { MJDesk } from './MJDesk';
import { IMJDeskState } from './IMJDeskState';
import { eMJDeskState } from '../../shared/SharedDefine';
export class MJDeskStateWaitAct implements IMJDeskState
{
    protected waitTimer : NodeJS.Timeout = null ;
    protected mDesk : MJDesk = null ;
    static TIME_WAIT_ACT : number = 10 ;

    protected mActIdx : number = -1 ;
    protected mGangCnt : number = 0 ;

    protected mEnterAct : eMJActType = null ;
    protected mEnterActInvokerIdx : number = -1 ;

    init( desk : MJDesk ) : void 
    {
        this.mDesk = desk ;
    }

    getState() : eMJDeskState
    {
        return eMJDeskState.eState_WaitAct ;
    }

    onEnterState( jsArg : Object ) : void 
    {
        this.mActIdx = jsArg[key.idx] ;
        this.mEnterAct = eMJActType.eMJAct_Mo ;
        this.mEnterActInvokerIdx = this.mActIdx ;
        this.mGangCnt = 0 ;
        if ( jsArg[key.act] != null )
        {
            this.mEnterAct = jsArg[key.act] ;
        }

        if ( jsArg[key.invokerIdx] != null )
        {
            this.mEnterActInvokerIdx = jsArg[key.invokerIdx] ;
        }

        if ( this.mEnterAct == eMJActType.eMJAct_BuGang_Done )
        {
            let restore = jsArg["buGangResore"] ;
            this.mEnterAct = restore["enterAct"] ;
            this.mEnterActInvokerIdx = restore["mEnterActInvokerIdx"];
            this.mGangCnt = restore["gangCnt"] ;
            this.mDesk.onPlayerDoActWitSelfCard( this.mActIdx, eMJActType.eMJAct_BuGang_Done ,jsArg[key.card] , this.mEnterActInvokerIdx ) ;
            ++this.mGangCnt;
        }
        else if ( this.mEnterAct == eMJActType.eMJAct_MingGang )
        {
            ++this.mGangCnt;
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
    }

    visitInfo( outJsInfo : Object ) : void 
    {
        outJsInfo[key.idx] = this.mActIdx ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, nSessionID : number ) : boolean 
    {
        if ( msgID == eMsgType.MSG_PLAYER_MJ_ACT )
        {
            if ( this.mDesk.getPlayerByIdx(this.mActIdx).sessionID != nSessionID )
            {
                msg[key.ret] = 1 ;
                XLogger.debug( "not your turn orgID = " + nSessionID ) ;
                this.mDesk.sendMsgToPlayer(nSessionID, msgID, msg) ;
                return true ;
            }

            let act : eMJActType = msg[key.act] ;
            let card : number = msg[key.card] ;
            let isOk = this.mDesk.onPlayerDoActWitSelfCard( this.mActIdx, act ,card , this.mEnterActInvokerIdx ) ;
            if ( false == isOk )
            {
                msg[key.ret] = 2 ;
                XLogger.debug( "you can not do act orgID = " + nSessionID + " act = " + act ) ;
                this.mDesk.sendMsgToPlayer(nSessionID, msgID, msg) ;
                return true ;
            }
            msg[key.ret] = 0 ;
            this.mDesk.sendMsgToPlayer( nSessionID, msgID, msg ) ;

            switch ( act )
            {
                case eMJActType.eMJAct_Chu:
                    {
                        let vps = this.mDesk.getPlayersNeedTheCard( card, this.mActIdx,false ) ;
                        if ( vps == null || vps.length == 0 )
                        {
                            let nextIdx = this.mDesk.getNextActIdx( this.mActIdx ) ;
                            this.mDesk.onPlayerMo( nextIdx ) ;
                            this.onEnterState( { idx : nextIdx } ) ;
                        }
                        else
                        {
                            let arg = {} ;
                            arg[key.act] = act ;
                            arg[key.invokerIdx] = this.mActIdx ;
                            arg[key.gangCnt] = this.mGangCnt;
                            arg[key.waitIdxes] = vps ; 
                            arg[key.card] = card ;
                            this.mDesk.transferState( eMJDeskState.eState_WaitOtherAct, arg ) ;
                        }
                        return true ;
                    }
                    break;
                case eMJActType.eMJAct_AnGang:
                    {
                        ++this.mGangCnt ;
                        this.startWait();
                    }
                    break;
                case eMJActType.eMJAct_BuGang_Declare:
                    {
                        let vps = this.mDesk.getPlayersNeedTheCard( card, this.mActIdx, true ) ;
                        if ( vps == null || vps.length == 0 )
                        {
                            this.mDesk.onPlayerDoActWitSelfCard( this.mActIdx, eMJActType.eMJAct_BuGang_Done ,card , this.mEnterActInvokerIdx ) ;
                            ++this.mGangCnt;
                            this.startWait();
                        }
                        else
                        {
                            let arg = {} ;
                            arg[key.act] = act ;
                            arg[key.invokerIdx] = this.mActIdx ;
                            arg[key.waitIdxes] = vps ; 
                            arg[key.gangCnt] = this.mGangCnt;
                            arg[key.card] = card ;
                            let restore = {} ;
                            restore["enterAct"] = this.mEnterAct;
                            restore["mEnterActInvokerIdx"] = this.mEnterActInvokerIdx;
                            restore["gangCnt"] = this.mGangCnt;
                            arg["buGangResore"] = restore ;
                            this.mDesk.transferState( eMJDeskState.eState_WaitOtherAct, arg ) ;
                        }
                        return true ;
                    }
                    break ;
                case eMJActType.eMJAct_Hu:
                    {
                        this.mDesk.transferState( eMJDeskState.eState_End ) ;
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
        XLogger.debug("player auto chu pai , wait time out , idx = " + this.mActIdx + " deskID = " + this.mDesk.deskID ) ;
        let msg = {} ;
        msg[key.act] = eMJActType.eMJAct_Chu ;
        msg[key.card] = this.mDesk.getPlayerAutoChuCard();  
        this.onLogicMsg(eMsgType.MSG_PLAYER_MJ_ACT, msg, this.mDesk.getPlayerByIdx(this.mActIdx).sessionID ) ;
    }

    // function 
    startWait()
    {
        if ( null != this.waitTimer )
        {
            clearTimeout( this.waitTimer ) ;
            this.waitTimer = null ;
        }

        this.waitTimer = setTimeout( this.waitActTimeOut.bind(this), MJDeskStateWaitAct.TIME_WAIT_ACT ) ;
    }
}