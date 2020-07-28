import { XLogger } from './../Logger';
import { eMsgType } from './../../shared/MessageIdentifer';
import { MJDesk } from './MJDesk';
import { IMJDeskState } from './IMJDeskState';
import { eMJDeskState } from '../../shared/SharedDefine';
export class MJDeskStateWaitStart implements IMJDeskState
{
    protected checkTimer : NodeJS.Timeout = null ;
    protected mDesk : MJDesk = null ;
    init( desk : MJDesk ) : void 
    {
        this.mDesk = desk ;
    }

    getState() : eMJDeskState
    {
        return eMJDeskState.eState_WaitStart ;
    }

    onEnterState( jsArg : Object ) : void 
    {
        if ( null != this.checkTimer )
        {
            clearInterval( this.checkTimer ) ;
            XLogger.warn( "why still have check timer" ) ;
            this.checkTimer = null ;
        }
        this.checkTimer = setInterval( this.update.bind(this),500 ) ;
    }

    onLevelState() : void
    {
        if ( null != this.checkTimer )
        {
            clearInterval( this.checkTimer ) ;
            this.checkTimer = null ;
        }
    }

    visitInfo( outJsInfo : Object ) : void 
    {
        
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean 
    {
        return false ;
    }

    update()
    {
        if ( this.mDesk.canStartGame() )
        {
            this.mDesk.transferState( eMJDeskState.eState_Start ) ;
        }
    }
}