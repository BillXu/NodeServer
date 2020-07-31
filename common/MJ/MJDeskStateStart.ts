import { WaitActStateData } from './MJDeskStateWaitAct';
import { eMsgType } from './../../shared/MessageIdentifer';
import { XLogger } from './../Logger';
import { eMJDeskState } from './../../shared/SharedDefine';
import { IMJDeskState } from './IMJDeskState';
import { MJDesk } from './MJDesk';
export class MJDeskStateStart implements IMJDeskState
{
    protected mLeaveStateTime : NodeJS.Timeout = null ;
    protected mDesk : MJDesk = null ;
    static TIME_DISTRIBUTE : number = 2 ;
    init( desk : MJDesk ) : void 
    {
        this.mDesk = desk ;
    }

    getState() : eMJDeskState
    {
        return eMJDeskState.eState_Start ;
    }

    onEnterState( jsArg : Object ) : void 
    {
        if ( null != this.mLeaveStateTime )
        {
            clearTimeout( this.mLeaveStateTime ) ;
            XLogger.warn( "why still have mLeaveStateTime timer" ) ;
            this.mLeaveStateTime = null ;
        }
        this.mLeaveStateTime = setTimeout( this.finishDistribute.bind(this), MJDeskStateStart.TIME_DISTRIBUTE * 1000 ) ;
        XLogger.debug( "enter state of start game , distribute deskID = " + this.mDesk.deskID ) ;
        this.mDesk.onGameStart();
        this.mDesk.distributeCards();
    }

    onLevelState() : void
    {
        if ( null != this.mLeaveStateTime )
        {
            clearTimeout( this.mLeaveStateTime ) ;
            XLogger.warn( "onLevelState why still have mLeaveStateTime timer" ) ;
            this.mLeaveStateTime = null ;
        }
    }

    visitInfo( outJsInfo : Object ) : void 
    {

    }

    onPlayerReuesetInfo( idx : number ) : void{}

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean 
    {
        return false ;
    }

    finishDistribute()
    {
        this.mLeaveStateTime = null ;
        XLogger.debug( "finished distribute time out, go to wait act deskID = " + this.mDesk.deskID + " bankerIdx = " + this.mDesk.bankerIdx ) ;
        let data = new WaitActStateData(this.mDesk.bankerIdx, this.mDesk.getPlayerAutoChuCard(this.mDesk.bankerIdx) ) ;
        this.mDesk.transferState( eMJDeskState.eState_WaitAct, data ) ;
    }
}