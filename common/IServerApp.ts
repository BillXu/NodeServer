import { XLogger } from './Logger';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { Network, INetworkDelegate } from './Net/Network';
export class IServerApp implements INetworkDelegate
{
    protected mNet : Network = null ;
    init( jsCfg : Object )
    {
        this.mNet = new Network();
        this.mNet.setDelegate(this) ;
        this.mNet.connect( jsCfg["dstIP"] ) ;
    }

    // network delegate ;
    onVerifyResult( isOk : boolean ) : void
    {
        XLogger.info( "server verify : " + isOk ? "ok" : "failed" ) ;
    }

    onConnectResult( isOK : boolean ) : void 
    {
        XLogger.info( "server onConnectResult : " + isOK ? "ok" : "failed" ) ;
    }

    onDisconnected() : void 
    {
        XLogger.info( "server disconnect" ) ;
    }

    onMsg( msgID : eMsgType , msg : Object ) : void 
    {
        if ( msgID == eMsgType.MSG_TRANSER_DATA )
        {
            this.onLogicMsg(msg["msg"][Network.MSG_ID], msg["msg"], msg["orgID"], msg["orgPort"] ) ;
        }
    }

    onReconectedResult( isOk : boolean ) : void 
    {
        XLogger.info( "server reconnect : " + isOk ? "ok" : "failed" ) ;
    }

    // self method 
    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort )
    {

    }

    sendMsg( msgID : number , msg : Object , dstPort : eMsgPort, dstID : number , orgID : number )
    {
        if ( msg == null )
        {
            msg = {} ;
        }
        msg[Network.MSG_ID] = msgID;

        let jsTransfer = {} ;
        jsTransfer["dstPort"] = dstPort ;
        jsTransfer["dstID"] = dstID ;
        jsTransfer["orgID"] = orgID ;
        jsTransfer["orgPort"] = this.getLocalPortType() ;
        jsTransfer["msg"] = msg ;
        this.mNet.sendMsg(eMsgType.MSG_TRANSER_DATA,jsTransfer ) ;
    }

    onOtherServerDisconnect( port : eMsgPort , idx : number )
    {

    }

    getLocalPortType() : eMsgPort 
    {
        return eMsgPort.ID_MSG_PORT_MAX ;
    }
}