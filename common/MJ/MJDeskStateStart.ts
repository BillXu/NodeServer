import { eMsgType } from './../../shared/MessageIdentifer';
import { XLogger } from './../Logger';
import { eMJDeskState } from './../../shared/SharedDefine';
import { IMJDeskState } from './IMJDeskState';
import { MJDesk } from './MJDesk';
export class MJDeskStateWaitStart implements IMJDeskState
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
        this.mLeaveStateTime = setTimeout( this.finishDistribute.bind(this), MJDeskStateWaitStart.TIME_DISTRIBUTE * 1000 ) ;
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

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean 
    {
        return false ;
    }

    finishDistribute()
    {
        this.mLeaveStateTime = null ;
        this.mDesk.transferState( eMJDeskState.eState_WaitAct, { idx : this.mDesk.bankerIdx } ) ;
    }
}