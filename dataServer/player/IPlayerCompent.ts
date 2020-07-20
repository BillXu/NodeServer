import { ePlayerNetState } from './../../common/commonDefine';
import { eMsgType } from './../../shared/MessageIdentifer';
import { Player } from "./Player";

export interface IPlayerCompent
{
    init( player : Player , ip : string ) : void ;
    getCompentName() : string ;
    onReactive( sessionID : number , ip : string ) : void ;
    onLogicMsg( msgID : eMsgType , msg : Object ) : boolean;
    onOtherLogin( nNewSessionID : number , ip : string ) : void;
    onUpdateNetState( state : ePlayerNetState , ip? : string ) : void ;
    onLoadBaseInfoFinished() : void ;
}