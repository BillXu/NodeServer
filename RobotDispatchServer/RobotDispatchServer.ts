import { key } from './../shared/KeyDefine';
import { eMsgPort } from './../shared/MessageIdentifer';
import { XLogger } from './../common/Logger';
import { IServerApp } from './../common/IServerApp';
export class RobotDispatchSvr extends IServerApp
{
    init( jsCfg : Object )
    {
        super.init(jsCfg) ;

    }
    
    getLocalPortType() : eMsgPort 
    {
        return eMsgPort.ID_MSG_PORT_R ;
    }
}
