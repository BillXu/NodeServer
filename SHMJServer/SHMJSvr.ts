import { MJDeskMgrSH } from './MJDeskMgrSH';
import { IServerApp } from "../common/IServerApp";
import { eMsgPort } from "../shared/MessageIdentifer";

export class SHMJSvr extends IServerApp
{
    // iserver
    init( jsCfg : Object )
    {
        super.init(jsCfg) ;
        this.registerModule( new MJDeskMgrSH() ) ;
    }

    getLocalPortType() : eMsgPort
    {
        return eMsgPort.ID_MSG_PORT_MJSH;
    }
}