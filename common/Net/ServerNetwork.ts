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
    static TIME_HEAT_BEAT_ClIENT : number = 3 ;
    protected mSocketPeer : WebSocket = null ;
    protected mIP : string = null ;
    protected mSessionID : number = 0 ;
    protected mDelegate : IClientPeerDelegate = null ;
    protected mWaitVerifyTimer : NodeJS.Timeout = null ;
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

        this.mSocketPeer.onmessage = this.onMessage.bind(this);
        this.mSocketPeer.onclose = this.onClose.bind(this) ;
        this.mSocketPeer.onerror = this.onClose.bind(this) ;

        let self = this ;
        this.mSocketPeer.on("ping", ()=>{ self.mIsKeepLive = true }) ;

        this.mWaitVerifyTimer = setTimeout(()=>{
            self.mWaitVerifyTimer = null ;
            self.mDelegate.onVerifyResult(self.mSessionID,false);
        } ,1500) ;

        this.mHeatBeatTimer = setInterval( ()=>{ 
            if ( self.mIsKeepLive == false )
            {
                XLogger.debug( "head bet timeout on close" ) ;
                self.onClose();
                return ;
            }
            self.mIsKeepLive = false ;
        }, ClientPeer.TIME_HEAT_BEAT_ClIENT * 1000 + 1500 ) ;
    }

    isWaitingVerify()
    {
        return null != this.mWaitVerifyTimer ;
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
    }

    doReconnect( fromPeer : ClientPeer )
    {
        this.mSocketPeer = fromPeer.mSocketPeer ;
        this.mIP = fromPeer.mIP ;
        this.mSocketPeer.onmessage = this.onMessage.bind(this);
        this.mSocketPeer.onclose = this.onClose.bind(this) ;
        this.mSocketPeer.onerror = this.onClose.bind(this) ;

        this.mIsKeepLive = true ;
        let self = this ;
        this.mHeatBeatTimer = setInterval( ()=>{ 
            if ( self.mIsKeepLive == false )
            {
                XLogger.debug( "head bet timeout on close" ) ;
                self.onClose();
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
            this.mDelegate.onVerifyResult( this.mSessionID,ret ) ;
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
            return ;
        }

        if ( null != this.mWaitVerifyTimer )
        {
            XLogger.debug("first msg must verify msg, so you are wrong, regard as verify false ") ;
            this.mDelegate.onVerifyResult(this.mSessionID, false ) ;
            return ;
        }
        this.mDelegate.onMsg( this.mSessionID,msgID,js ) ;
    }

    protected onClose()
    {
        XLogger.debug( "websocket on close callback sessionid = " + this.mSessionID ) ;
        if ( this.mHeatBeatTimer != null )
        {
            clearInterval( this.mHeatBeatTimer ) ;
            this.mHeatBeatTimer = null ;
        }

        this.mDelegate.onClosed( this.mSessionID ) ;
    }

    protected checkVerify( pwd : string ) : boolean
    {
        XLogger.debug("pass all connection : pwd = " + pwd )
        return true ;
    }

    close()
    {
        XLogger.debug( "i do close sessionid = " + this.mSessionID ) ;
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
        this.mWebSocket.on("error", ()=>{ "websocket svr error "} ) ;
        this.mDelegate = pdelegate ;
        this.mlpfSessionIDGenerator = lpfSessionIDGenerator ; 
        return true ;
    }

    sendMsg( targetSessionID : number, msgID : number , jsMsg : Object ) : boolean
    {
        let peer = this.mClients[targetSessionID] ;
        if ( peer == null )
        {
            XLogger.debug( "invalid session id = " + targetSessionID + " msg = " + msgID + " c = " + jsMsg );
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
            delete this.mClients[nSessionID] ;
            XLogger.debug( "reconnect ok session id = " + targetSessionID + this.mClients[targetSessionID].ip + nSessionID  ) ;
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

        if ( client.isWaitingVerify() )
        {
            client.close();
            delete this.mClients[nSessionID] ;
            XLogger.debug( "peer still waiting verify , direct closed = " + nSessionID ) ;
            return ;
        }

        if ( this.mDelegate.isPeerNeedWaitReconnected(nSessionID) )
        {
            client.doWaitReconnect( this.mDelegate.secondsForWaitReconnect() ) ;
        }
        else
        {
            this.mDelegate.onPeerDisconnected(nSessionID) ;
            client.close();
            delete this.mClients[nSessionID] ;
        }
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
            client.close();
            delete this.mClients[nSessionID] ;
            XLogger.debug( "session id verify not pass id = " + nSessionID ) ;
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
        if ( client != null )
        {
            this.mDelegate.onPeerDisconnected( nSessionID ) ;
            client.close();
            delete this.mClients[nSessionID] ;
        }
        else
        {
            XLogger.error( "reconnect time out , why client is null ? session id = " + nSessionID ) ;
        }
    }
}