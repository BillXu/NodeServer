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
        return 1 ;
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
        console.log( "a player connected ip =  " + ip + " session id = " + nSessionID ) ;
    }

    onPeerReconnected( nSessionID : number, ip : string, fromSessionID : number ) : void 
    {
        console.log( "a player reconnected ip =  " + ip + " session id = " + nSessionID + "from session id = " + fromSessionID ) ;
    }

    onPeerWaitingReconect( nSessionID : number ) : void 
    {
        console.log( "a player is waiting reconnect session id = " + nSessionID ) ;
    }

    onPeerDisconnected( nSessionID : number ) : void 
    {
        console.log( "a player disconnect sessionID = " + nSessionID ) ;
    }

    onPeerMsg( nSessionID : number , msgID : eMsgType , jsMsg : Object) : void 
    {
        console.log( "recieved a msg from player session id = " + nSessionID + "id " + msgID + "content : " + jsMsg ) ;
    }
}

let s = new TestSever();
s.init() ;
console.log( "svr exit" ) ;