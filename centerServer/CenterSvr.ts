import { key } from './../shared/KeyDefine';
import { IServer } from './../common/Application';
import HashMap  from 'hashmap';
import { ServerGroup } from './ServerGroup';
import { XLogger } from './../common/Logger';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IServerNetworkDelegate, ServerNetwork } from "../common/Net/ServerNetwork";

export class CenterSvr implements IServerNetworkDelegate , IServer
{
    mSvr = new ServerNetwork();
    mSvrInfoGroups : HashMap<eMsgPort,ServerGroup> = new HashMap<eMsgPort,ServerGroup>() ;
    mCfg : Object = null ;
    init( cfg : Object )
    {
        XLogger.info( "server setup port = " + cfg["port"] ) ;
        this.mSvr.setup( cfg["port"] , this ) ;
        this.mCfg = cfg ;
    }

    getLocalPortType() : eMsgPort 
    {
        return eMsgPort.ID_MSG_PORT_CENTER ;
    }

    secondsForWaitReconnect() : number 
    {
        return 0 ;
    }

    cacheMsgCntWhenWaitingReconnect() : number 
    {
        return 0 ;
    }

    isPeerNeedWaitReconnected( nSessionID : number ) : boolean 
    {
        return false ;
    }

    onPeerConnected( nSessionID : number, ip : string ) : void 
    {
        
        //XLogger.debug( "a player connected ip =  " + ip + " session id = " + nSessionID ) ;
    }

    onPeerReconnected( nSessionID : number, ip : string, fromSessionID : number ) : void 
    {
        //XLogger.debug( "a player reconnected ip =  " + ip + " session id = " + nSessionID + "from session id = " + fromSessionID ) ;
        let vg = this.mSvrInfoGroups.values();
        for ( let v of vg )
        {
            if ( v.onSvrWaittingReconnectState(nSessionID, false, ip )  )
            {
                return ;
            }
        }
        return ;
    }

    onPeerWaitingReconect( nSessionID : number ) : void 
    {
       // XLogger.debug( "a player is waiting reconnect session id = " + nSessionID ) ;
        let vg = this.mSvrInfoGroups.values();
        for ( let v of vg )
        {
            if ( v.onSvrWaittingReconnectState(nSessionID, true , null )  )
            {
                return ;
            }
        }
        return ;
    }

    onPeerDisconnected( nSessionID : number ) : void 
    {
        let vg = this.mSvrInfoGroups.values();
        let port = eMsgPort.ID_MSG_PORT_MAX ;
        let idx = -1 ;
        for ( let v of vg )
        {
            idx = v.getSvrIdxBySessionID( nSessionID ) ;
            if ( -1 != idx )
            {
                v.removeSvr( nSessionID )
                port = v.mPortType ;
                break ;
            }
        }

        if ( idx == -1 )
        {
            XLogger.warn( "can not find disconnect svr with sessionID = " + nSessionID ) ;
            return ;
        }
        // tell other svr 
        let jsInfoDisconnect = {} ;
        jsInfoDisconnect["port"] = port ;
        jsInfoDisconnect["idx"] = idx ;
        jsInfoDisconnect["maxCnt"] = this.mSvrInfoGroups.get(port).mMaxCnt;
        this.mSvr.brocastMsg(eMsgType.MSG_SERVER_DISCONNECT, jsInfoDisconnect );

        XLogger.debug( "server disconnected port = " + eMsgPort[port] + " idx = " + idx  ) ;
        this.state();
        return ;
    }

    onPeerMsg( nSessionID : number , msgID : eMsgType , jsMsg : Object) : void 
    {
        //XLogger.debug( "recieved a msg from player session id = " + nSessionID + "id " + msgID + "content : " + jsMsg ) ;
        if ( eMsgType.MSG_TRANSER_DATA == msgID )
        {
            let targetPort = jsMsg["dstPort"] ;
            let targetID = jsMsg["dstID"] ;
            if ( targetPort == null || targetID == null || jsMsg["orgPort"] == null || jsMsg["orgID"] == null || jsMsg["msg"] == null )
            {
                XLogger.error( "transfer msg lack of proper value : " + JSON.stringify( jsMsg ) ) ;
            }
            
            if ( targetPort == eMsgPort.ID_MSG_PORT_CLIENT )
            {
                targetPort = eMsgPort.ID_MSG_PORT_GATE ;
            }
            let targetGroup = this.mSvrInfoGroups.get(targetPort) ;
            if ( null == targetGroup )
            {
                XLogger.error( "TransferData Error , can not find port = " + eMsgPort[targetPort] + " msgTargetID = " + targetID + " msg : " + JSON.stringify(jsMsg["msg"]) + " orginMsgID = " + eMsgType[jsMsg["msg"][key.msgID]] ) ;
                return ;
            }

            let vSvrs = targetGroup.getTargetSvrs(targetID) ;
            if ( vSvrs == null || vSvrs.length == 0 )
            {
                XLogger.error( "Can not find dstSvr in portGroup = " + eMsgPort[targetPort] + "with targetID = " + targetID + " msg : " + JSON.stringify(jsMsg["msg"]) + " orginMsgID = " + eMsgType[jsMsg["msg"][key.msgID]]  ) ;
                return ;
            }

            for ( let s of vSvrs )
            {
                this.mSvr.sendMsg(s, msgID, jsMsg ) ;
                XLogger.debug( "TransferMsg to Port = " + eMsgPort[targetPort] + " with targetID = " + targetID + " orginMsgID = " + eMsgType[jsMsg["msg"][key.msgID]] + " msg : " + JSON.stringify(jsMsg["msg"])  )
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
                gsvr.init(port,this.getGroupMaxItemCnt(port)) ;
                this.mSvrInfoGroups.set(port, gsvr);
            }
            let jsBack = {} ;
            jsBack["idx"] = gsvr.addSvr(nSessionID, suggestIdx , this.mSvr.getSessionIP(nSessionID) ) ;
            jsBack["maxCnt"] = gsvr.mMaxCnt ;
            this.mSvr.sendMsg(nSessionID, msgID, jsBack ) ;
            if ( -1 != jsBack["idx"] )
            {
                XLogger.info( "a server connected : " + eMsgPort[port] + " idx : " + jsBack["idx"] + "ip = " + this.mSvr.getSessionIP(nSessionID) ) ;
            }
            this.state();
            return ;
        }
        else if ( eMsgType.MSG_REQ_SVR_GROUP_INFO == msgID )
        {
            let vList : Object[] = [] ;
            this.mSvrInfoGroups.forEach( ( v : ServerGroup )=>{ let gs = {} ; v.toJson(gs); vList.push( gs) ; } ) ;
            let jsBack = {} ;
            jsBack["svrGroups"] = vList ;
            this.mSvr.sendMsg(nSessionID, msgID, jsBack ) ;
            return ;
        }
    }

    protected getGroupMaxItemCnt( port : eMsgPort ) : number
    {
        XLogger.warn( "default set group svr cnt = 1 , port = " + eMsgPort[port] ) ; 
        return 1 ;
    }

    // protected brocastAllServer( msgID : eMsgType , msg : Object, exceptSesionID : number  )
    // {
    //     let vg = this.mSvrInfoGroups.values();
    //     let targetSessionID = [] ;
    //     for ( let v of vg )
    //     {
    //          targetSessionID.push( v.getTargetSvrs(-1) );
    //          targetSessionID.push()
    //     }

    //     let idx = targetSessionID.indexOf(exceptSesionID) ;
    //     if ( idx >= 0 )
    //     {
    //         targetSessionID.splice(idx,1);
    //     }
        
    //     for ( let s of targetSessionID )
    //     {
    //         this.mSvr.sendMsg(s , msgID, msg );
    //     }
    // }

    state()
    {
        XLogger.debug( "state : svr group cnt = " + this.mSvrInfoGroups.count() ) ;
        let vs = this.mSvrInfoGroups.values() ;
        for ( let v of vs )
        {
            v.state();
        }
    }
}