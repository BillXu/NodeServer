import { XLogger } from './../Logger';
import { MJDesk } from './MJDesk';
import { eMsgType } from './../../shared/MessageIdentifer';
import { eMJDeskState } from './../../shared/SharedDefine';
import { IMJDeskState } from './IMJDeskState';
export class MJDeskStateGameEnd implements IMJDeskState
{
    protected mDesk : MJDesk = null ;
    protected mWaitTimer : NodeJS.Timeout = null ;
    static TIME_WAIT : number = 10 ;
    init( desk : MJDesk ) : void 
    {
        this.mDesk = desk ;
    }
    onPlayerLeaveTuoGuanState( idx : number ) : void{} ;
    onEnterState( isHuOver : boolean ) : void 
    {
        XLogger.debug( "GameEndState game over , huOover = " + isHuOver + " , deskID = " + this.mDesk.deskID ) ; 
        let isGoOn = this.mDesk.onGameOver( isHuOver ) ;
        if ( null != this.mWaitTimer )
        {
            clearTimeout(this.mWaitTimer) ;
            this.mWaitTimer = null ;
        }

        if ( isGoOn )
        {
            let self = this ;
            this.mWaitTimer = setTimeout(() => {
                self.mWaitTimer = null ;
                self.mDesk.transferState(eMJDeskState.eState_WaitStart) ;
            }, MJDeskStateGameEnd.TIME_WAIT * 1000 );
        }
    }

    onLevelState() : void 
    {
        if ( null != this.mWaitTimer )
        {
            clearTimeout(this.mWaitTimer) ;
            this.mWaitTimer = null ;
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

    getState() : eMJDeskState 
    {
        return eMJDeskState.eState_End ;
    }
}