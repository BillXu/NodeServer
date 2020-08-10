import { XLogger } from './../common/Logger';
import { key } from './../shared/KeyDefine';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { MJDeskSHNew } from './MJDeskSHNew';
import { IDesk } from './../common/MJ/IDesk';
import { DeskMgr } from './../common/MJ/DeskMgr';
export class MJDeskMgrSH extends DeskMgr
{
    createDesk() : IDesk 
    {
        return new MJDeskSHNew();
    }

    onRegisterToSvrApp(svrApp)
    {
        super.onRegisterToSvrApp(svrApp) ;
        // arg : { matchID : 234 , lawIdx : 2 , deskCnt : 4 , roundCnt : 2  ,diFen : 23 }
        let d = this.createDesk();
        d.init(200, 1, 300, this ,this ) ;
        d.setMatchInfo( 200, 0 ) ;
        this.mDesks.set(d.deskID, d ) ;

        let d2 = this.createDesk();
        d2.init(300, 1, 2, this ,this ) ;
        d2.setMatchInfo( 300, 0 ) ;
        this.mDesks.set(d2.deskID, d2 ) ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort, targetID : number ) : boolean
    {
        if ( msgID == eMsgType.MSG_PLAYER_MJ_ETNTER )
        {
            XLogger.debug("player enter test deskID = " + targetID + " uid = " + msg[key.uid] ) ;
            this.mDesks.get(targetID).onPlayerEnter( msg[key.uid], orgID, 100 ) ;
            return true ;
        }
        super.onLogicMsg(msgID, msg, orgID, orgPort, targetID) ;
    }
}