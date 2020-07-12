import { XLogger } from './../Logger';
import { eMsgType } from './../../shared/MessageIdentifer';
import WebSocket from "ws";
import { IncomingMessage } from 'http';
interface IClientPeerDelegate
{
    onMsg( nSessionID : number , msgID : number, jsMsg : Object ) : void ;
    onClosed( nSessionID : number ) : void ;
    onVerifyResult( nSessionID : number , isPass : boolean ) : void ;
    onWaitReconnectTimeout( nSessionID : number ) : void ;
}

class ClientPeer
{
    static TIME_HEAT_BEAT_ClIENT : number = 13 ;
    protected mSocketPeer : WebSocket = null ;
    protected mIP : string = null ;
    protected mSessionID : number = 0 ;
    protected mDelegate : IClientPeerDelegate = null ;
    protected mWaitVerifyTimer : NodeJS.Timeout = null ;
    protected mIsVerifyed : boolean = false ;
    protected mWaitReconnectTimer : NodeJS.Timeout = null ;
    protected mHeatBeatTimer : NodeJS.Timeout = null ;
    protected mIsKeepLive : boolean = true ;
    protected mCacherMsg : string[] = [] ;
    protected mMaxCacherMsgCnt : number = 0 ;
    get ip () : string
    {
        return this.mIP ;
    }

    init( sk : WebSocket, ip : string ,pDelegate : IClientPeerDelegate, sessionID : number , cacherCnt : number = 0 )
    {
        this.mSocketPeer = sk ;
        this.mIP = ip ;
        this.mSessionID = sessionID ;
        this.mDelegate = pDelegate ;
        this.mMaxCacherMsgCnt = cacherCnt ;
        this.mIsVerifyed = false ;

        this.mSocketPeer.onmessage = this.onMessage.bind(this);
        this.mSocketPeer.onclose = this.onClose.bind(this) ;
        this.mSocketPeer.onerror = this.onClose.bind(this) ;

        let self = this ;
        this.mSocketPeer.on("ping", ()=>{ self.mIsKeepLive = true }) ;

        this.mWaitVerifyTimer = setTimeout(()=>{
            self.mWaitVerifyTimer = null ;
            self.mDelegate.onVerifyResult(self.mSessionID,false);
            XLogger.debug( "wait verify time out close it session id = " + self.mSessionID ) ;
            self.close();
        } ,1500) ;

        this.mHeatBeatTimer = setInterval( ()=>{ 
            if ( self.mIsKeepLive == false )
            {
                XLogger.debug( "head bet timeout close it id = " + self.mSessionID ) ;
                self.close();
                return ;
            }
            self.mIsKeepLive = false ;
        }, ClientPeer.TIME_HEAT_BEAT_ClIENT * 1000 + 1500 ) ;
    }

    isVerifyed()
    {
        return this.mIsVerifyed ;
    }

    isWaitingReconnect() : boolean
    {
        return null != this.mWaitReconnectTimer ;
    }

    doWaitReconnect( nSeconds : number )
    {
        if ( null != this.mWaitReconnectTimer )
        {
            clearTimeout( this.mWaitReconnectTimer ) ;
            this.mWaitReconnectTimer = null ;
            XLogger.error("why already have waiting reconnect timer ? ") ;
        }

        let self = this ;
        this.mWaitReconnectTimer = setTimeout(() => {
            self.mCacherMsg.length = 0 ;
            self.mWaitReconnectTimer = null ;
            self.mDelegate.onWaitReconnectTimeout( self.mSessionID ) ;
        }, nSeconds * 1000 );
        XLogger.debug( "enter wait reconnect state session id = " + this.mSessionID ) ;
    }

    doReconnect( fromPeer : ClientPeer )
    {
        this.mSocketPeer = fromPeer.mSocketPeer ;
        this.mIP = fromPeer.mIP ;
        this.mSocketPeer.onmessage = this.onMessage.bind(this);
        this.mSocketPeer.onclose = this.onClose.bind(this) ;
        this.mSocketPeer.onerror = this.onClose.bind(this) ;
        let self = this ;
        this.mIsKeepLive = true ;
        this.mSocketPeer.on("ping", ()=>{ self.mIsKeepLive = true }) ;

        this.mHeatBeatTimer = setInterval( ()=>{ 
            if ( self.mIsKeepLive == false )
            {
                XLogger.debug( "head bet timeout on close1 session id = " + self.mSessionID ) ;
                self.close();
                return ;
            }
            self.mIsKeepLive = false ;
        }, ClientPeer.TIME_HEAT_BEAT_ClIENT * 1000 + 1500 ) ;

        if ( null != this.mWaitReconnectTimer )
        {
            clearTimeout( this.mWaitReconnectTimer ) ;
            this.mWaitReconnectTimer = null ;
        }

        this.sendCacherMsg() ;
    }

    clear()
    {
        if ( this.mHeatBeatTimer != null )
        {
            clearInterval( this.mHeatBeatTimer ) ;
            this.mHeatBeatTimer = null ;
        }

        if ( this.mWaitVerifyTimer != null )
        {
            clearTimeout( this.mWaitVerifyTimer ) ;
            this.mWaitVerifyTimer = null ;
        }

        if ( null != this.mWaitReconnectTimer )
        {
            clearTimeout( this.mWaitReconnectTimer ) ;
            this.mWaitReconnectTimer = null ;
        }

        this.mCacherMsg.length = 0 ;
    }

    protected sendCacherMsg()
    {
        if ( this.mCacherMsg.length > 0 )
        {
            XLogger.debug( "do send cacher msg " ) ;
            let self = this ;
            this.mSocketPeer.send(this.mCacherMsg.shift(),()=>{ self.sendCacherMsg() ;}) ;
        }
    }

    protected onMessage( data : WebSocket.MessageEvent )
    {
        let js = JSON.parse(data.data.toString());
        let msgID = js[ServerNetwork.MSG_ID] ;
        if ( msgID == eMsgType.MSG_VERIFY )
        {
            let ret = this.checkVerify( js["pwd"] )
            this.mIsVerifyed = ret ;
            if ( this.mWaitVerifyTimer != null  )
            {
                clearTimeout( this.mWaitVerifyTimer ) ;
                this.mWaitVerifyTimer = null ;
            }
            let jsBack = {} ;
            jsBack[ServerNetwork.MSG_ID] = msgID ;
            jsBack["ret"] = ret ? 0 : 1 ;
            jsBack["sessionID"] = this.mSessionID ;
            this.sendMsg(jsBack) ;
            this.mDelegate.onVerifyResult( this.mSessionID,ret ) ;
            if ( false == ret )
            {
                XLogger.debug( "verify failed , so close it session id = " + this.mSessionID ) ; 
                this.close();
            }
            return ;
        }

        if ( this.isVerifyed() == false )
        {
            XLogger.debug("first msg must verify msg, so you are wrong, regard as verify false id = " + this.mSessionID ) ;
            this.mDelegate.onVerifyResult(this.mSessionID, false ) ;
            this.close();
            return ;
        }
        this.mDelegate.onMsg( this.mSessionID,msgID,js ) ;
    }

    protected onClose()
    {
        XLogger.debug( "websocket on close callback sessionid = " + this.mSessionID ) ;
        this.clear();
        this.mDelegate.onClosed( this.mSessionID ) ;
    }

    protected checkVerify( pwd : string ) : boolean
    {
        XLogger.debug(" pass all connection : pwd = " + pwd )
        return pwd == "1" ;
    }

    protected close()
    {
        XLogger.debug( "i do close sessionid = " + this.mSessionID ) ;
        this.clear();
        this.mSocketPeer.terminate();
    }

    sendMsg( jsMsg : Object )
    {
        let strmsg = JSON.stringify(jsMsg);
        if ( this.mCacherMsg.length > 0 || ( this.mMaxCacherMsgCnt > 0 && this.isWaitingReconnect() ) )
        {
            this.mCacherMsg.push( strmsg );
            if ( this.mCacherMsg.length > this.mMaxCacherMsgCnt )
            {
                let p = this.mCacherMsg.shift();
                XLogger.warn("cacher too many msg : shift one : " + p ) ;
            }
            XLogger.debug( "send msg but we put it in cacha queue" ) ;
        }
        else
        {
            this.mSocketPeer.send(strmsg) ;
            XLogger.debug( "send msg directed" ) ;
        }
    }
}

export interface IServerNetworkDelegate
{
    secondsForWaitReconnect() : number ;
    cacheMsgCntWhenWaitingReconnect() : number ;
    isPeerNeedWaitReconnected( nSessionID : number ) : boolean ;
    onPeerConnected( nSessionID : number, ip : string ) : void ;
    onPeerReconnected( nSessionID : number, ip : string, fromSessionID : number ) : void ;
    onPeerWaitingReconect( nSessionID : number ) : void ;
    onPeerDisconnected( nSessionID : number ) : void ;
    onPeerMsg( nSessionID : number , msgID : eMsgType , jsMsg : Object) : void ;
}

export class ServerNetwork implements IClientPeerDelegate
{
    static MSG_ID : string = "msgID" ;
    protected mWebSocket : WebSocket.Server = null ;
    protected mClients : { [key : number ] : ClientPeer } = { } ;
    protected mCurMaxSessionID : number = 0 ;
    protected mlpfSessionIDGenerator : ( curMaxSessionID : number )=>number = null ;
    protected mDelegate : IServerNetworkDelegate = null ;
    setup( port : number , pdelegate : IServerNetworkDelegate , lpfSessionIDGenerator? : ( curMaxSessionID : number )=>number ) : boolean 
    {
        this.mWebSocket = new WebSocket.Server({ port : port }) ;
        this.mWebSocket.on( "connection", this.onConnect.bind(this) ) ;
        this.mWebSocket.on("close" , ()=>{ XLogger.error( "why sever closed ? " )} ) ;
        this.mWebSocket.on("error", ( er : Error)=>{ XLogger.error("websocket svr error = " + er.message ) ; } ) ;
        this.mDelegate = pdelegate ;
        this.mlpfSessionIDGenerator = lpfSessionIDGenerator ; 
        return true ;
    }

    sendMsg( targetSessionID : number, msgID : number , jsMsg : Object ) : boolean
    {
        let peer = this.mClients[targetSessionID] ;
        if ( peer == null )
        {
            XLogger.warn( "invalid session id = " + targetSessionID + " msg = " + msgID + " c = " + jsMsg );
            return false;
        }

        if ( msgID != null )
        {
            jsMsg[ServerNetwork.MSG_ID] = msgID ;
        }

        peer.sendMsg( jsMsg ) ;
        return true ;
    }

    protected onConnect( socket : WebSocket , request : IncomingMessage )
    {
        if ( this.mlpfSessionIDGenerator == null )
        {
            ++this.mCurMaxSessionID ;
        }
        else
        {
            let session = this.mlpfSessionIDGenerator( this.mCurMaxSessionID ) ;
            if ( session <= this.mCurMaxSessionID )
            {
                XLogger.debug( "invalid session , generator have bug" ) ;
                session = ++this.mCurMaxSessionID ;
            }
            this.mCurMaxSessionID = session ;
        }

        let p = new ClientPeer();
        p.init( socket, request.socket.remoteAddress, this , this.mCurMaxSessionID , this.mDelegate.cacheMsgCntWhenWaitingReconnect() ) ;
        this.mClients[this.mCurMaxSessionID] = p ;
        XLogger.debug( "new peer session id = " + this.mCurMaxSessionID + " ip : " + p.ip  ) ;

        XLogger.info( "core clients = " + this.mWebSocket.clients.size + " logic clients = " + Object.keys( this.mClients ).length ) ;
    }

    onMsg( nSessionID : number , msgID : number, jsMsg : Object ) : void 
    {
        if ( msgID == eMsgType.MSG_RECONNECT )
        {
            let targetSessionID = jsMsg["sessionID"] ;
            let target = this.mClients[targetSessionID] ;
            if ( target == null )
            {
                XLogger.warn("target session is null , can not reconnect ") ;
                let js = {} ;
                js["ret"] = 1 ;
                js["sessionID"] = nSessionID ;
                this.sendMsg(nSessionID, msgID, js ) ;
                return ;
            }

            target.doReconnect( this.mClients[nSessionID] ) ;
            this.mDelegate.onPeerReconnected( targetSessionID, this.mClients[targetSessionID].ip, nSessionID );
            this.mClients[nSessionID].clear();
            delete this.mClients[nSessionID] ;
            XLogger.debug( "reconnect ok session id = " + targetSessionID + " ip = " + this.mClients[targetSessionID].ip + " sessionid = " + nSessionID  ) ;

            let js = {} ;
            js["ret"] = 0 ;
            js["sessionID"] = targetSessionID ;
            this.sendMsg(targetSessionID, msgID, js ) ;
            return ;
        }

        this.mDelegate.onPeerMsg(nSessionID, msgID, jsMsg ) ;
    }

    onClosed( nSessionID : number ) : void 
    {
        let client = this.mClients[nSessionID] ;
        if ( null == client )
        {
            XLogger.warn( "when close , why session id is null ? = " + nSessionID ) ;
            return ;
        }

        if ( client.isVerifyed() == false )
        {
            delete this.mClients[nSessionID] ;
            XLogger.debug( "peer still waiting verify , direct closed = " + nSessionID ) ;
            XLogger.info( "core clients = " + this.mWebSocket.clients.size + " logic clients = " + Object.keys( this.mClients ).length ) ;
            return ;
        }

        if ( this.mDelegate.isPeerNeedWaitReconnected(nSessionID) )
        {
            client.doWaitReconnect( this.mDelegate.secondsForWaitReconnect() ) ;
        }
        else
        {
            this.mDelegate.onPeerDisconnected(nSessionID) ;
            delete this.mClients[nSessionID] ;
            XLogger.debug( "peer no need wait reconnect , direct closed = " + nSessionID ) ;
        }
        XLogger.info( "core clients = " + this.mWebSocket.clients.size + " logic clients = " + Object.keys( this.mClients ).length ) ;
    }

    onVerifyResult( nSessionID : number , isPass : boolean ) : void 
    {
        let client = this.mClients[nSessionID] ;
        if ( null == client )
        {
            XLogger.warn( "onverify result but client is null id = " + nSessionID + " pass = " + isPass ) ;
            return ;
        }

        if ( false == isPass )
        {
            delete this.mClients[nSessionID] ;
            XLogger.debug( "session id verify not pass delete ite id = " + nSessionID ) ;
        }
        else
        {
            XLogger.debug( "session id passed, id = " + nSessionID ) ; 
            this.mDelegate.onPeerConnected(nSessionID, client.ip ) ;
        }
    }

    onWaitReconnectTimeout( nSessionID : number ) : void
    {
        XLogger.debug( "wait reconnect time out session = " + nSessionID ) ;
        let client = this.mClients[nSessionID] ;
        this.mDelegate.onPeerDisconnected( nSessionID ) ;
        if ( client != null )
        {
            delete this.mClients[nSessionID] ;
            XLogger.debug( "wait reconnect time out session do delete it = " + nSessionID ) ;
        }
        else
        {
            XLogger.error( "reconnect time out , why client is null ? session id = " + nSessionID ) ;
        }

        XLogger.info( "core clients = " + this.mWebSocket.clients.size + " logic clients = " + Object.keys( this.mClients ).length ) ;
    }
}