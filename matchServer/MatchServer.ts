import { MatchMgr } from './MatchMgr';
import { eMsgPort } from './../shared/MessageIdentifer';
import { IServerApp } from "../common/IServerApp";

export class MatchServer extends IServerApp
{
    init( jsCfg : Object )
    {
        super.init(jsCfg) ;
        this.registerModule( new MatchMgr() );
    }

    getLocalPortType() : eMsgPort 
    {
        return eMsgPort.ID_MSG_PORT_MATCH ;
    }
}