import HashMap  from 'hashmap';
import { ServerGroup } from './ServerGroup';
import { XLogger } from './../common/Logger';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IServerNetworkDelegate, ServerNetwork } from "../common/Net/ServerNetwork";

class CenterSvr implements IServerNetworkDelegate
{
    mSvr = new ServerNetwork();
    mSvrInfoGroups : HashMap<eMsgPort,ServerGroup> = new HashMap<eMsgPort,ServerGroup>() ;
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
        let vg = this.mSvrInfoGroups.values();
        for ( let v of vg )
        {
            if ( v.onSvrWaittingReconnectState(nSessionID, false )  )
            {
                return ;
            }
        }
        return ;
    }

    onPeerWaitingReconect( nSessionID : number ) : void 
    {
        XLogger.debug( "a player is waiting reconnect session id = " + nSessionID ) ;
        let vg = this.mSvrInfoGroups.values();
        for ( let v of vg )
        {
            if ( v.onSvrWaittingReconnectState(nSessionID, true )  )
            {
                return ;
            }
        }
        return ;
    }

    onPeerDisconnected( nSessionID : number ) : void 
    {
        XLogger.debug( "a player disconnect sessionID = " + nSessionID ) ;
        let vg = this.mSvrInfoGroups.values();
        let port = eMsgPort.ID_MSG_PORT_MAX ;
        let idx = -1 ;
        for ( let v of vg )
        {
            if ( v.removeSvr( nSessionID )  )
            {
                port = v.mPortType ;
                idx = v.getSvrIdxBySessionID( nSessionID ) ;
                break ;
            }
        }

        if ( idx == -1 )
        {
            XLogger.warn( "can not find disconnect svr sessionID = " + nSessionID ) ;
            return ;
        }
        // tell other svr 
        let jsInfoDisconnect = {} ;
        jsInfoDisconnect["port"] = port ;
        jsInfoDisconnect["idx"] = idx ;
        jsInfoDisconnect["maxCnt"] = this.mSvrInfoGroups.get(port).mMaxCnt;
        this.brocastAllServer( eMsgType.MSG_SERVER_DISCONNECT, jsInfoDisconnect , nSessionID ) ;
        return ;
    }

    onPeerMsg( nSessionID : number , msgID : eMsgType , jsMsg : Object) : void 
    {
        XLogger.debug( "recieved a msg from player session id = " + nSessionID + "id " + msgID + "content : " + jsMsg ) ;
        if ( eMsgType.MSG_TRANSER_DATA == msgID )
        {
            let targetPort = jsMsg["dstPort"] ;
            let targetID = jsMsg["dstID"] ;
            if ( targetPort == eMsgPort.ID_MSG_PORT_CLIENT )
            {
                targetPort = eMsgPort.ID_MSG_PORT_GATE ;
            }
            let targetGroup = this.mSvrInfoGroups.get(targetPort) ;
            if ( null == targetGroup )
            {
                XLogger.error( "targtport svr is empty port = " + targetPort + " id = " + targetID + " msg : " + JSON.stringify(jsMsg) ) ;
                return ;
            }

            let vSvrs = targetGroup.getTargetSvrs(targetID) ;
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
            let gsvr = this.mSvrInfoGroups.get(port) ; 
            if ( gsvr == null )
            {
                gsvr = new ServerGroup();
                gsvr.init(port) ;
                this.mSvrInfoGroups.set(port, gsvr);
            }
            let jsBack = {} ;
            jsBack["idx"] = gsvr.addSvr(nSessionID, suggestIdx ) ;
            jsBack["maxCnt"] = gsvr.mMaxCnt ;
            this.mSvr.sendMsg(nSessionID, msgID, jsBack ) ;
            XLogger.info( "registered a server : " + eMsgPort[port] + " idx : " + jsBack["idx"]  ) ;
            return ;
        }
    }

    protected brocastAllServer( msgID : eMsgType , msg : Object, exceptSesionID : number  )
    {
        let vg = this.mSvrInfoGroups.values();
        let targetSessionID = [] ;
        for ( let v of vg )
        {
             targetSessionID.push( v.getTargetSvrs(-1) );
        }

        let idx = targetSessionID.indexOf(exceptSesionID) ;
        if ( idx >= 0 )
        {
            targetSessionID.splice(idx,1);
        }
        
        for ( let s of targetSessionID )
        {
            this.mSvr.sendMsg(s , msgID, msg );
        }
    }
}

let s = new CenterSvr();
s.init() ;
XLogger.info( "svr start" ) ;