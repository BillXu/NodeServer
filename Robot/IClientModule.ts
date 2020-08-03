import { eMsgType } from './../shared/MessageIdentifer';
export abstract class IClientModule
{
    abstract getModuleName() : string ;
    abstract onLogicMsg( msgID : eMsgType , msg : Object ) : boolean ;
    init() : void 
    {

    }
}