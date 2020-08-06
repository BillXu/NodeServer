import { XLogger } from './../common/Logger';
import  HashMap  from 'hashmap';
import { key } from './../shared/KeyDefine';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { INetworkDelegate, Network, IOneMsgCallback } from './../common/Net/Network';
import { join } from 'path';

export interface IClientNetworkDelegate
{
    onConnectResult( isOK : boolean ) : void ;
    onDisconnected() : void ;
    onReconectedResult( isOk : boolean ) : void ;
    onLogicMsg( msgID : eMsgType , msg : Object ) : boolean ;
}

export class ClientNetwork implements INetworkDelegate
{
    protected mNet : Network = null ;
    protected mDelegate : IClientNetworkDelegate = null ;
    protected mCallBacks : HashMap<eMsgType,IOneMsgCallback> = new HashMap<eMsgType,IOneMsgCallback>(); 

    onVerifyResult( isOk : boolean ) : void
    {

    }

    onConnectResult( isOK : boolean ) : void 
    {
        if ( this.mDelegate )
        {
            this.mDelegate.onConnectResult(isOK) ;
        }
    }

    onDisconnected() : void 
    {
        if ( this.mDelegate )
        {
            this.mDelegate.onDisconnected() ;
        }
    }

    onMsg( msgID : eMsgType , msg : Object ) : void 
    {
        if ( eMsgType.MSG_TRANSER_DATA == msgID )
        {
            let unpackMsg = msg["msg"] ;
            this.onLogicMsg(unpackMsg[key.msgID], unpackMsg );
            return ;
        }
    }

    onReconectedResult( isOk : boolean ) : void 
    {
        if ( this.mDelegate )
        {
            this.mDelegate.onReconectedResult(isOk) ;
        }
    }

    // self function 
    init( dstIP : string , pdelegate : IClientNetworkDelegate )
    {
        this.mNet = new Network() ;
        this.mNet.setDelegate(this) ;
        this.mNet.connect(dstIP) ;
        this.mDelegate = pdelegate ;
    }

    tryOtherIP( dstIP : string )
    {
        if ( null == this.mNet )
        {
            XLogger.error("mNet is not created, can not use try otherIP") ;
            return ;
        }
        this.mNet.tryNewDstIP(dstIP) ;
    }

    sendMsg( msgID : eMsgType , msg : Object , dstPort : eMsgPort, dstID : number , lpCallBack? : IOneMsgCallback ) : boolean
    {
        if ( null != lpCallBack )
        {
            let p = this.mCallBacks.get(msgID) ;
            if ( p == null )
            {
                this.mCallBacks.set(msgID, lpCallBack ) ; 
            }
            else
            {
                XLogger.error( "already have callBackFor this msg = " + eMsgType[msgID] ) ;
            }
        }

        if ( null == msg )
        {
            msg = {} ;
        }
        msg[key.msgID] = msgID ;
 
        let msgTransfer = {} ;
        msgTransfer[key.msgID] = eMsgType.MSG_TRANSER_DATA ;
        msgTransfer["dstPort"] = dstPort ;
        msgTransfer["dstID"] = dstID ;
        msgTransfer["orgPort"] = eMsgPort.ID_MSG_PORT_CLIENT ;
        msgTransfer["orgID"] = this.mNet.getSessionID();
        msgTransfer["msg"] = msg;
        return this.mNet.sendMsg(eMsgType.MSG_TRANSER_DATA,msgTransfer) ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object )
    {
        XLogger.debug( "recieved msgID = " + eMsgType[msgID] + " detail = " + JSON.stringify(msg) ) ;
        let pc = this.mCallBacks.get(msgID) ;
        if ( pc != null )
        {
            let isR = pc(msg);
            this.mCallBacks.delete(msgID) ;
            if ( isR )
            {
                return ;
            }
        }

        if ( this.mDelegate )
        {
            if ( !this.mDelegate.onLogicMsg(msgID, msg) )
            {
                XLogger.warn( "msg not process , msgID = " + eMsgType[msgID] + " msg = " + JSON.stringify(msg) ) ;
            }
        }

        return ;
    }
}