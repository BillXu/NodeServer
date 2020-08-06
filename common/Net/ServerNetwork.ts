import { key } from './../../shared/KeyDefine';
import HashMap  from 'hashmap';
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
    protected mpDelegate : IClientPeerDelegate = null ;
    protected mWaitVerifyTimer : NodeJS.Timeout = null ;
    protected mIsVerifyed : boolean = false ;
    protected mWaitReconnectTimer : NodeJS.Timeout = null ;
    protected mHeatBeatTimer : NodeJS.Timeout = null ;
    protected mIsKeepLive : boolean = true ;
    protected mCacherMsg : string[] = [] ;
    protected mMaxCacherMsgCnt : number = 0 ;
    protected mReconnectToken : number = 0 ;
    protected mMaxMsgLeng : number = 0 ;
    get reconnectToken() : number
    {
        return this.mReconnectToken ;
    }

    get ip () : string
    {
        return this.mIP ;
    }

    init( sk : WebSocket, ip : string ,pDelegate : IClientPeerDelegate, sessionID : number , cacherCnt : number = 0 )
    {
        this.mSocketPeer = sk ;
        this.mIP = ip ;
        this.mSessionID = sessionID ;
        this.mpDelegate = pDelegate ;
        this.mMaxCacherMsgCnt = cacherCnt ;
        this.mIsVerifyed = false ;

        this.mSocketPeer.onmessage = this.onMessage.bind(this);
        this.mSocketPeer.onclose = this.onClose.bind(this) ;
        this.mSocketPeer.onerror = this.onClose.bind(this) ;

        let self = this ;
        this.mSocketPeer.on("ping", ()=>{ self.mIsKeepLive = true }) ;

        this.mWaitVerifyTimer = setTimeout(()=>{
            self.mWaitVerifyTimer = null ;
            if ( self.mpDelegate )
            {
                self.mpDelegate.onVerifyResult(self.mSessionID,false);
            }
            
            XLogger.debug( "wait verify time out close it sessionID = " + self.mSessionID ) ;
            self.close();
        } ,1500) ;

        this.mHeatBeatTimer = setInterval( ()=>{ 
            if ( self.mIsKeepLive == false )
            {
                XLogger.debug( "head bet timeout close it sessionID = " + self.mSessionID ) ;
                self.close();
                return ;
            }
            self.mIsKeepLive = false ;
        }, ClientPeer.TIME_HEAT_BEAT_ClIENT * 1000 + 1500 ) ;
    }

    setDelegate( pDelegate : IClientPeerDelegate )
    {
        this.mpDelegate = pDelegate ;
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
            XLogger.error("why already have waiting reconnect timer ? sessionID = " + this.mSessionID ) ;
        }

        let self = this ;
        this.mWaitReconnectTimer = setTimeout(() => {
            self.mCacherMsg.length = 0 ;
            self.mWaitReconnectTimer = null ;
            XLogger.debug("TimeOut: waitReonnect timeout sessionID = " + self.mSessionID ) ;
            if ( self.mpDelegate )
            {
                self.mpDelegate.onWaitReconnectTimeout( self.mSessionID ) ;
            }
        }, nSeconds * 1000 );
        XLogger.debug( "enter wait reconnect state sessionID = " + this.mSessionID ) ;
    }

    doReconnect( fromPeer : ClientPeer )
    {
        this.mSocketPeer = fromPeer.mSocketPeer ;
        this.mReconnectToken = fromPeer.reconnectToken ;
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
                XLogger.debug( "head bet timeout on close1 sessionID = " + self.mSessionID ) ;
                self.close();
                return ;
            }
            self.mIsKeepLive = false ;
        }, ClientPeer.TIME_HEAT_BEAT_ClIENT * 1000 + 1500 ) ;

        XLogger.debug( "doReconnect sessionID = " + this.mSessionID + " from sessionID = " + fromPeer.mSessionID ) ;
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
            XLogger.debug( "do send cacher msg sessionID = " + this.mSessionID ) ;
            let self = this ;
            if ( null == this.mSocketPeer )
            {
                XLogger.error("null socket can not send cacher msg sessionID = " + this.mSessionID ) ;
                return ;
            }
            this.mSocketPeer.send(this.mCacherMsg.shift(),()=>{ self.sendCacherMsg() ;}) ;
        }
    }

    protected onMessage( data : WebSocket.MessageEvent )
    {
        let js = JSON.parse(data.data.toString());
        //XLogger.debug( "recived msg sessionID = " + this.mSessionID + " msg = " + data.data.toString() ) ;
        let msgID = js[ServerNetwork.MSG_ID] ;
        if ( eMsgType.MSG_PING == msgID )
        {
            this.mIsKeepLive = true ;
            this.mSocketPeer.send(data.data.toString()) ;
            return ;
        }
        else if ( msgID == eMsgType.MSG_VERIFY )
        {
            this.mReconnectToken = js[key.reconnectToken] ;
            let ret = this.checkVerify( js["pwd"] )
            this.mIsVerifyed = ret ;
            if ( this.mWaitVerifyTimer != null  )
            {
                clearTimeout( this.mWaitVerifyTimer ) ;
                this.mWaitVerifyTimer = null ;
            }
            let jsBack = {} ;
            jsBack[ServerNetwork.MSG_ID] = msgID ;
            jsBack[key.ret] = ret ? 0 : 1 ;
            jsBack[key.sessionID] = this.mSessionID ;
            jsBack[key.reconnectToken] = this.reconnectToken;
            this.sendMsg(jsBack) ;
            if ( this.mpDelegate )
            {
                this.mpDelegate.onVerifyResult( this.mSessionID,ret ) ;
            }
            
            if ( false == ret )
            {
                XLogger.debug( "verify failed , so close it sessionID = " + this.mSessionID ) ; 
                this.close();
            }
            else
            {
                XLogger.debug( "socket verifyed sessionID = " + this.mSessionID + " reconnectToken = " + this.mReconnectToken ) ;
            }
            return ;
        }

        if ( this.isVerifyed() == false )
        {
            XLogger.debug("first msg must verify msg, so you are wrong, regard as verify failed , sessionID = " + this.mSessionID ) ;
            if ( this.mpDelegate )
            {
                this.mpDelegate.onVerifyResult(this.mSessionID, false ) ;
            }
            
            this.close();
            return ;
        }

        if ( this.mpDelegate )
        {
            this.mpDelegate.onMsg( this.mSessionID,msgID,js ) ;
        }
        
    }

    protected onClose()
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

        XLogger.debug( "ClientPeer onClose callback sessionID = " + this.mSessionID ) ;
        if ( this.mpDelegate )
        {
            this.mpDelegate.onClosed( this.mSessionID ) ;
        }
    }

    protected checkVerify( pwd : string ) : boolean
    {
        //XLogger.debug(" pass all connection : pwd = " + pwd )
        return pwd == "1" ;
    }

    close()
    {
        XLogger.debug( "ClientPeeri close(). sessionID = " + this.mSessionID ) ;
        this.clear();
        this.mSocketPeer.terminate();
    }

    sendMsg( jsMsg : Object )
    {
        let strmsg = JSON.stringify(jsMsg);
        if ( strmsg.length > this.mMaxMsgLeng )
        {
            this.mMaxMsgLeng = strmsg.length ;
        }
        XLogger.debug( "max msg len = " + this.mMaxMsgLeng ) ;
        if ( this.mCacherMsg.length > 0 || ( this.mMaxCacherMsgCnt > 0 && this.isWaitingReconnect() ) )
        {
            this.mCacherMsg.push( strmsg );
            if ( this.mCacherMsg.length > this.mMaxCacherMsgCnt )
            {
                let p = this.mCacherMsg.shift();
                XLogger.warn("cacher too many msg : shift one : " + p + " sessionID = " + this.mSessionID ) ;
            }
            XLogger.debug( "send msg but we put it in cacha queue sessionID = " + this.mSessionID ) ;
        }
        else
        {
            this.mSocketPeer.send(strmsg) ;
            //XLogger.debug( "send msg directed" ) ;
        }
    }

    state()
    {
        XLogger.debug( "state : ClientPeer sessionID = " + this.mSessionID + " reconnectToken = " + this.mReconnectToken + " isVerify = " + this.isVerifyed() + " isWaitReconnect = " + this.isWaitingReconnect()  ) ;
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
    protected mClientPeers : HashMap<number,ClientPeer> = new HashMap<number,ClientPeer>() ;
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

    brocastMsg( msgID : number , jsMsg : Object )
    {
        if ( msgID != null )
        {
            jsMsg[ServerNetwork.MSG_ID] = msgID ;
        }

        let values = this.mClientPeers.values() ;
        for ( let v of values )
        {
            if ( v.isVerifyed() && v.isWaitingReconnect() == false )
            {
                v.sendMsg(jsMsg) ;
            }
        }

        XLogger.debug( "brocastMsg msgID " + jsMsg[key.msgID] + " msg =  " + JSON.stringify(jsMsg||{}) ) ;
    }

    sendMsg( targetSessionID : number, msgID : number , jsMsg : Object ) : boolean
    {
        let peer = this.mClientPeers.get(targetSessionID) ;
        if ( peer == null )
        {
            XLogger.warn( "invalid sessionID = " + targetSessionID + " msgID = " + eMsgType[msgID] + " c = " + JSON.stringify(jsMsg) );
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
                XLogger.debug( "invalid session , generator have bug curMaxSessionID = " + this.mCurMaxSessionID + " producedSessionID = " + session ) ;
                session = ++this.mCurMaxSessionID ;
            }
            this.mCurMaxSessionID = session ;
        }

        let p = new ClientPeer();
        p.init( socket, request.socket.remoteAddress, this , this.mCurMaxSessionID , this.mDelegate.cacheMsgCntWhenWaitingReconnect() ) ;
        this.mClientPeers.set( this.mCurMaxSessionID, p ) ;

        XLogger.debug( "clientPeer connected sessionID = " + this.mCurMaxSessionID + " ip : " + p.ip  ) ;

        this.state();
    }

    onMsg( nSessionID : number , msgID : number, jsMsg : Object ) : void 
    {
        if ( msgID == eMsgType.MSG_RECONNECT )
        {
            let targetSessionID = jsMsg[key.sessionID] ;
            if ( targetSessionID == nSessionID )
            {
                XLogger.error("reconnect failed, target is can not be self, taregetSessionID = " + targetSessionID + " this sessionID = " + nSessionID ) ;
                let js = {} ;
                js[key.ret] = 2 ;
                js[key.sessionID] = nSessionID ;
                js[key.reconnectToken] = this.mClientPeers.get(nSessionID).reconnectToken;
                this.sendMsg(nSessionID, msgID, js ) ;
                return ;
            }

            let target = this.mClientPeers.get(targetSessionID) ;
            if ( target == null)
            {
                XLogger.warn("reconnect failed, target is null , can not reconnect, taregetSessionID = " + targetSessionID + " this sessionID = " + nSessionID ) ;
                let js = {} ;
                js[key.ret] = 1 ;
                js[key.sessionID] = nSessionID ;
                js[key.reconnectToken] = this.mClientPeers.get(nSessionID).reconnectToken;
                this.sendMsg(nSessionID, msgID, js ) ;
                return ;
            }

            let token = jsMsg[key.reconnectToken] ;
            if ( token != target.reconnectToken )
            {
                XLogger.warn("reconnect failed, token not equal target token = " + target.reconnectToken + " this token = " + token ) ;
                let js = {} ;
                js[key.ret] = 1 ;
                js[key.sessionID] = nSessionID ;
                js[key.reconnectToken] = this.mClientPeers.get(nSessionID).reconnectToken;
                this.sendMsg(nSessionID, msgID, js ) ;
                return ;
            }

            target.doReconnect( this.mClientPeers.get(nSessionID) ) ;
            XLogger.debug( "reconnect ok tareget sessionID = " + targetSessionID  + " this sessionID = " + nSessionID + " ip = " + this.mClientPeers.get(targetSessionID).ip ) ;
            
            this.mDelegate.onPeerReconnected( targetSessionID, this.mClientPeers.get(targetSessionID).ip, nSessionID );
            this.mClientPeers.get(nSessionID).clear();
            this.mClientPeers.delete(nSessionID) ;
           
            let js = {} ;
            js[key.ret] = 0 ;
            js[key.sessionID] = targetSessionID ;
            js[key.reconnectToken] = target.reconnectToken;
            this.sendMsg(targetSessionID, msgID, js ) ;

            this.state();
            return ;
        }

        this.mDelegate.onPeerMsg(nSessionID, msgID, jsMsg ) ;
    }

    onClosed( nSessionID : number ) : void 
    {
        // XLogger.debug( "ServerNetwork onClosed callBack sessionID = " + nSessionID ) ;
        let client = this.mClientPeers.get(nSessionID) ;
        if ( null == client )
        {
            XLogger.debug( "ServerNetwork onClosed callBack , clientPeer already delete , sessionID = " + nSessionID ) ;
            this.state();
            return ;
        }

        if ( client.isVerifyed() == false )
        {
            this.deleteClientPeer(nSessionID) ;
            XLogger.debug( "ServerNetwork onClosed peer still waiting verify , just delete it, sessionID = " + nSessionID ) ;
            this.state();
            return ;
        }

        if ( this.mDelegate.isPeerNeedWaitReconnected(nSessionID) )
        {
            XLogger.debug( "ServerNetwork onClosed ClientPeer need waitReconnect , sessionID = " + nSessionID ) ;
            client.doWaitReconnect( this.mDelegate.secondsForWaitReconnect() ) ;
            this.mDelegate.onPeerWaitingReconect(nSessionID) ;
        }
        else
        {
            XLogger.debug( "ServerNetwork onClosed ClientPeer do not need waitReconnect, just delete it  , sessionID = " + nSessionID ) ;
            this.mDelegate.onPeerDisconnected(nSessionID) ;
            this.deleteClientPeer(nSessionID) ;
        }
        this.state();
    }

    onVerifyResult( nSessionID : number , isPass : boolean ) : void 
    {
        let client = this.mClientPeers.get( nSessionID ) ;
        if ( null == client )
        {
            XLogger.error( "onVerifyResult , client is null sessionID = " + nSessionID + " pass = " + isPass ) ;
            return ;
        }

        if ( false == isPass )
        {
            this.deleteClientPeer(nSessionID) ;
            XLogger.debug( "onVerifyResult failed, delete it sessionID = " + nSessionID ) ;
        }
        else
        {
            XLogger.debug( "onVerifyResult success, sessionID = " + nSessionID ) ; 
            this.mDelegate.onPeerConnected(nSessionID, client.ip ) ;
        }

        this.state();
    }

    onWaitReconnectTimeout( nSessionID : number ) : void
    {
        XLogger.debug( "onWaitReconnectTimeout, do delete it , sessionID  = " + nSessionID ) ;
        this.mDelegate.onPeerDisconnected( nSessionID ) ;
        this.deleteClientPeer(nSessionID) ;
        this.state();
    }

    getSessionIP( sessionID : number ) : string
    {
        let p = this.mClientPeers.get(sessionID ) ;
        if ( p == null )
        {
            return "-" ;
        }
        return p.ip ;
    }

    closeSession( sessionID : number )
    {
        let p = this.mClientPeers.get(sessionID) ; 
        if ( null == p )
        {
            XLogger.debug( "ClientPeer already deleted , can not close it , sessionID = " + sessionID ) ;
            return ;
        }
        XLogger.debug( "serverNetwork close sessionID = " + sessionID ) ;
        p.setDelegate( null ) ;
        p.close();
        this.deleteClientPeer(sessionID) ;
        this.state();
    }

    deleteClientPeer( sessionID : number )
    {
        let p = this.mClientPeers.get(sessionID) ; 
        if ( null == p )
        {
            XLogger.debug( "ClientPeer already deleted , sessionID = " + sessionID ) ;
            return ;
        }
        p.clear();
        p.setDelegate(null) ;
        this.mClientPeers.delete( sessionID ) ;
    }

    state()
    {
        XLogger.debug( "state : serverNetwork coreSocketCnt = " + this.mWebSocket.clients.size + " logic ClientPeerCnt = " + this.mClientPeers.count() ) ;
        let vs = this.mClientPeers.values() ;
        for ( let v of vs )
        {
            v.state();
        }
        XLogger.debug("state end : serverNetWork ") ;
    }
}