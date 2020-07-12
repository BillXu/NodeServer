import { ServerGroup } from './ServerGroup';
import { XLogger } from './../common/Logger';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IServerNetworkDelegate, ServerNetwork } from "../common/Net/ServerNetwork";

class CenterSvr implements IServerNetworkDelegate
{
    mSvr = new ServerNetwork();
    mSvrGroups : { [key:number] : ServerGroup } = {} ;
    init()
    {
        console.log( "server setup port = 3000" ) ;
        this.mSvr.setup(3000, this ) ;
    }

    secondsForWaitReconnect() : number 
    {
        return 60 ;
    }

    cacheMsgCntWhenWaitingReconnect() : number 
    {
        return 100000 ;
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
        let vg = Object.keys(this.mSvrGroups) ;
        for ( let v of vg )
        {
            if ( this.mSvrGroups[v].onSvrWaittingReconnectState(nSessionID, false )  )
            {
                return ;
            }
        }
        return ;
    }

    onPeerWaitingReconect( nSessionID : number ) : void 
    {
        XLogger.debug( "a player is waiting reconnect session id = " + nSessionID ) ;
        let vg = Object.keys(this.mSvrGroups) ;
        for ( let v of vg )
        {
            if ( this.mSvrGroups[v].onSvrWaittingReconnectState(nSessionID, true )  )
            {
                return ;
            }
        }
        return ;
    }

    onPeerDisconnected( nSessionID : number ) : void 
    {
        XLogger.debug( "a player disconnect sessionID = " + nSessionID ) ;
        let vg = Object.keys(this.mSvrGroups) ;
        for ( let v of vg )
        {
            if ( this.mSvrGroups[v].removeSvr( nSessionID )  )
            {
                return ;
            }
        }
        return ;
    }

    onPeerMsg( nSessionID : number , msgID : eMsgType , jsMsg : Object) : void 
    {
        XLogger.debug( "recieved a msg from player session id = " + nSessionID + "id " + msgID + "content : " + jsMsg ) ;
        if ( eMsgType.MSG_TRANSER_DATA == msgID )
        {
            let targetPort = jsMsg["dstPort"] ;
            let targetID = jsMsg["dstID"] ;
            if ( this.mSvrGroups[targetPort] == null )
            {
                XLogger.error( "targtport svr is empty port = " + targetPort + " id = " + targetID + " msg : " + JSON.stringify(jsMsg) ) ;
                return ;
            }

            let vSvrs = this.mSvrGroups[targetPort].getTargetSvrs(targetID) ;
            if ( vSvrs == null || vSvrs.length == 0 )
            {
                XLogger.error( "can not find proper target , with targtport svr is empty port = " + targetPort + " id = " + targetID + " msg : " + JSON.stringify(jsMsg) ) ;
                return ;
            }

            for ( let s of vSvrs )
            {
                this.mSvr.sendMsg(s, msgID, jsMsg ) ;
            }
            return ;
        }
        else if ( eMsgType.MSG_REGISTER_SERVER_PORT_TO_CENTER == msgID )
        {
            let port = jsMsg["port"] ;
            let suggestIdx = jsMsg["suggestIdx"];
            let gsvr = this.mSvrGroups[port] ; 
            if ( gsvr == null )
            {
                gsvr = new ServerGroup();
                gsvr.init(port) ;
                this.mSvrGroups[port] = gsvr;
            }
            let jsBack = {} ;
            jsBack["idx"] = gsvr.addSvr(nSessionID, suggestIdx ) ;
            this.mSvr.sendMsg(nSessionID, msgID, jsBack ) ;
            XLogger.info( "register a server : " + port + " idx : " + jsBack["idx"]  ) ;
            return ;
        }
    }
}

let s = new CenterSvr();
s.init() ;
XLogger.info( "svr start" ) ;