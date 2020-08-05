import { IOneMsgCallback } from './../common/Net/Network';
import { RobotClient } from './RobotClient';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
export abstract class IClientModule
{
    protected mClient : RobotClient = null;
    abstract getModuleName() : string ;
    abstract onLogicMsg( msgID : eMsgType , msg : Object ) : boolean ;
    init( pClient : RobotClient ) : void 
    {
        this.mClient = pClient ;
    }

    onConnectResult( isOK : boolean ) : void {}
    onReconectedResult( isOk : boolean ) : void{} 
    onDisconnected() : void {}
    
    getClient() : RobotClient
    {
        return this.mClient ;
    }

    sendMsg( msgID : eMsgType , msg : Object , dstPort : eMsgPort, dstID : number , lpCallBack? : IOneMsgCallback  )
    {
        this.mClient.sendMsg(msgID, msg, dstPort, dstID ) ;
    }
}