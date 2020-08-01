import { eMJDeskState } from './../../shared/SharedDefine';
import { MJDesk } from './MJDesk';
import { eMsgType } from './../../shared/MessageIdentifer';
export interface IMJDeskState
{
    init( desk : MJDesk ) : void ;
    onEnterState( jsArg : any ) : void ;
    onLevelState() : void ;
    visitInfo( outJsInfo : Object ) : void ;
    onPlayerReuesetInfo( idx : number ) : void ;
    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean ;
    getState() : eMJDeskState ;
    onPlayerLeaveTuoGuanState( idx : number ) : void ;
}