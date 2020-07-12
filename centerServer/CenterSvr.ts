import { XLogger } from './../common/Logger';
import { eMsgType } from './../shared/MessageIdentifer';
import { IServerNetworkDelegate, ServerNetwork } from "../common/Net/ServerNetwork";

class TestSever implements IServerNetworkDelegate
{
    pSvr = new ServerNetwork();
    init()
    {
        console.log( "server setup port = 3000" ) ;
        this.pSvr.setup(3000, this ) ;
    }

    secondsForWaitReconnect() : number 
    {
        return 10 ;
    }

    cacheMsgCntWhenWaitingReconnect() : number 
    {
        return 0 ;
    }

    isPeerNeedWaitReconnected( nSessionID : number ) : boolean 
    {
        return true ;
    }

    onPeerConnected( nSessionID : number, ip : string ) : void 
    {
        
        XLogger.debug( "a player connected ip =  " + ip + " session id = " + nSessionID ) ;
    }

    onPeerReconnected( nSessionID : number, ip : string, fromSessionID : number ) : void 
    {
        XLogger.debug( "a player reconnected ip =  " + ip + " session id = " + nSessionID + "from session id = " + fromSessionID ) ;
    }

    onPeerWaitingReconect( nSessionID : number ) : void 
    {
        XLogger.debug( "a player is waiting reconnect session id = " + nSessionID ) ;
    }

    onPeerDisconnected( nSessionID : number ) : void 
    {
        XLogger.debug( "a player disconnect sessionID = " + nSessionID ) ;
    }

    onPeerMsg( nSessionID : number , msgID : eMsgType , jsMsg : Object) : void 
    {
        XLogger.debug( "recieved a msg from player session id = " + nSessionID + "id " + msgID + "content : " + jsMsg ) ;
    }
}

let s = new TestSever();
s.init() ;
console.log( "svr exit" ) ;