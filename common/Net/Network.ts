import { random } from 'lodash';
import { key } from './../../shared/KeyDefine';
import { XLogger } from './../Logger';
import { LocalEventEmitter } from './../LocalEventEmitter';
import { eMsgType } from './../../shared/MessageIdentifer';
import WebSocket from "ws";

export interface IOneMsgCallback
{
    // return true means msg will not continue dispatch , return false , means msg will continue processed by other callback ;
    (jsmsg : Object) : boolean ;  
} ;

export interface INetworkDelegate
{
    onVerifyResult( isOk : boolean ) : void;
    onConnectResult( isOK : boolean ) : void ;
    onDisconnected() : void ;
    onMsg( msgID : eMsgType , msg : Object ) : void ;
    onReconectedResult( isOk : boolean ) : void ;
}

export class Network extends LocalEventEmitter{

    static EVENT_CONNECT_RESULT : string = "connect_result"; // arg , isok : bool
    static EVENT_VERIFY_RESULT : string = "AUTHORITY_result"; // arg , isok : bool
    static EVENT_MSG : string = "msg"; // arg, msgID : eMsgType , msg : Object ;
    static EVENT_CLOSED : string = "close";
    static EVENT_RECONNECT_RESULT : string = "reconnect_result"; // arg , isok : bool

    static TIME_HEAT_BEAT : number = 3 ; 
    static MSG_ID : string = "msgID" ;
    static MSG_DATA : string = "msgData" ;

    private static s_pNetwork : Network = null ;
    protected mWebSocket : WebSocket = null;
    protected mDstIP : string = "";
    protected vMsgCallBack : [number,IOneMsgCallback][] = [];
    protected nSessionID : number = 0 ;
    protected isRecievedHeatBet : boolean = false ;
    protected nPingCheckAlive : NodeJS.Timeout = null ;
    protected nReconnectInterval : NodeJS.Timeout = null ;
    // when client side close connect , or reconnect error , onClose always be invoked , so we don't want this result ,
    // we only error one time is ok ;  
    protected isSkipOnCloseEnvet : boolean = false ; 
    protected mDelegate : INetworkDelegate = null ;
    protected mPingDelayMiniSeconds : number = 0;
    protected mReconnectToken : number = 0 ;

    get pingDelayMlliSeconds() : number
    {
        return this.mPingDelayMiniSeconds ;
    }

    static getInstance() : Network
    {
        if ( Network.s_pNetwork == null )
        {
            Network.s_pNetwork = new Network();
        }
        return Network.s_pNetwork ;
    }
    
    getSessionID()
    {
        return this.nSessionID ;
    }

    tryNewDstIP( newIP : string )
    {
        this.mDstIP = newIP ;
    }

    // can ony invoke in init method , only invoke one time , connect other ip ,please use function : tryNewDstIP()
    connect( dstIP : string ) 
    {
       this.mDstIP = dstIP ;
       XLogger.debug( "direct connect to svr" );
       this.doConnect(); 
    }

    setDelegate( del : INetworkDelegate )
    {
        this.mDelegate = del ;
    }

    sendMsg( msgID : number,jsMsg? : Object ,  callBack? : IOneMsgCallback ):boolean
    {
        if ( this.mWebSocket == null )
        {
            XLogger.warn( "not set up network" );
            return false;
        }

        if ( this.mWebSocket.readyState != WebSocket.OPEN )
        {
            XLogger.error( "socket is not open , can not send msgid = " + msgID );
            return false;
        }

        if ( null == jsMsg )
        {
            jsMsg = {} ;
        }

        jsMsg[Network.MSG_ID] = msgID ;
        this.mWebSocket.send(JSON.stringify(jsMsg)) ;

        //XLogger.debug( "send msg : " + JSON.stringify(jsMsg) );
        if ( callBack != null ) // reg call back ;
        {
            let p : [ number , IOneMsgCallback] ;
            p = [msgID,callBack];
            this.vMsgCallBack.push(p) ; 
        }
        return true;
    }

    protected setSessionID( newSessionID : number, reconnectToken : number )
    {
        this.nSessionID = newSessionID ;
        this.mReconnectToken = reconnectToken ;
    }
    
    protected doConnect()
    {
        if ( this.mWebSocket != null && ( this.mWebSocket.readyState == WebSocket.CONNECTING || WebSocket.OPEN == this.mWebSocket.readyState ) )
        {
            XLogger.debug( "ok = " + WebSocket.OPEN + "ing = " + WebSocket.CONNECTING );
            XLogger.error( "alredy doing reconnect , so need not connect state : " + this.mWebSocket.readyState  );
            return ;
        }

        XLogger.debug( "do connecting..." );
        this.mWebSocket = new WebSocket(this.mDstIP) ;
        this.mWebSocket.onclose = this.onClose.bind(this) ; 
        this.mWebSocket.onopen = this.onOpen.bind(this); ;
        this.mWebSocket.onmessage = this.onMsg.bind(this) ;
        this.mWebSocket.onerror = this.onError.bind(this);
        this.mWebSocket.on("pong",this.onPong.bind(this)) ;

        if ( null != this.nPingCheckAlive )
        {
            clearInterval(this.nPingCheckAlive) ;
            this.nPingCheckAlive = null ;
        }
    }

    protected onError( ev : WebSocket.ErrorEvent )
    {
        this.isSkipOnCloseEnvet = true ;
        XLogger.debug(" on error =  " + ev.message );
        if ( null != this.nPingCheckAlive )
        {
            clearInterval(this.nPingCheckAlive) ;
            this.nPingCheckAlive = null ;
        }

        this.emit(Network.EVENT_CONNECT_RESULT,false ) ;
        if ( null != this.mDelegate )
        {
            this.mDelegate.onConnectResult( false ) ;
        }

        if ( null == this.nReconnectInterval )
        {
            this.doConnect();
            this.doTryReconnect();
        }
    }

    protected onClose( ev: WebSocket.CloseEvent )
    {
        if ( this.mWebSocket != null && WebSocket.OPEN == this.mWebSocket.readyState )
        {
            XLogger.error( "socke already open , should not recived close event" );
            return ;
        }

        if ( this.isSkipOnCloseEnvet )
        {
            XLogger.debug( "skip on close event" );
            return ;
        }

        XLogger.debug( "on colse " );
        this.isSkipOnCloseEnvet = true ; // we do on close event invoke twice , before connected success ;

        XLogger.debug("stop heat beat");
        //clearTimeout(this.nTimeoutHandleNum); // sytem tell or heatbeat time out , lead to on close ,we should stop heatBet ;
        //this.nTimeoutHandleNum = null ;
        if ( null != this.nPingCheckAlive )
        {
            clearInterval(this.nPingCheckAlive) ;
            this.nPingCheckAlive = null ;
        }

        // dispatch event ;
        this.emit(Network.EVENT_CLOSED) ;
        if ( null != this.mDelegate )
        {
            this.mDelegate.onDisconnected();
        }

        if ( null == this.nReconnectInterval )
        {
            this.doConnect();
            this.doTryReconnect();
        }
    }

    close()
    {
        XLogger.debug( "self colse" );
        this.mWebSocket.terminate();
    }

    protected onOpen( ev : WebSocket.OpenEvent )
    {
        XLogger.debug(" on open +  " + this.mWebSocket.readyState );
        if ( this.nReconnectInterval != null )
        {
            XLogger.debug("clear time out ");
            clearInterval(this.nReconnectInterval);
            this.nReconnectInterval = null ;
        }
        this.isSkipOnCloseEnvet = false ; // reset flag ;

        // start heat beat ;
        if ( null != this.nPingCheckAlive )
        {
            clearInterval(this.nPingCheckAlive) ;
        }
        this.isRecievedHeatBet = true ;
        let self = this ;
        this.nPingCheckAlive = setInterval(self.doSendHeatBet.bind(this),Network.TIME_HEAT_BEAT * 1000 );

        // verify client ;
        let jsMsg = {} ;
        jsMsg["pwd"] = this.getSecrectKeyForVerify() ;
        jsMsg[key.reconnectToken] = ( Date.now() % 10000 ) * 1000 + random(1000,false ) ;
        this.sendMsg(eMsgType.MSG_VERIFY,jsMsg,( jsm :any)=>
        {
            //let pEvent : any ;
            self.emit( Network.EVENT_VERIFY_RESULT, jsm["ret"] == 0 ) ;
            if ( null != this.mDelegate )
            {
                this.mDelegate.onVerifyResult( jsm["ret"] == 0 ) ;
            }

            if ( jsm["ret"] != 0 )
            {
                XLogger.warn("can not verify this client ret :" + jsm["ret"] );
                return true;
            }

            // decide if need reconnect 
            if ( self.getSessionID() == 0 ) // we need not reconnect 
            {
                XLogger.debug("verifyed session id = " + jsm["sessionID"] + " ret =" + jsm["ret"] );
                self.setSessionID( jsm[key.sessionID],jsm[key.reconnectToken] );

                self.emit( Network.EVENT_CONNECT_RESULT,true) ;
                if ( null != self.mDelegate )
                {
                    self.mDelegate.onConnectResult( true ) ;
                }
                return ;
            }
            
            // we need do reconnect 
            XLogger.debug("verifyed session id = " + jsm["sessionID"] + " ret =" + jsm["ret"] + "do reconnect" );

            let jsRec = {};
            jsRec[key.sessionID] = self.getSessionID();
            jsRec[key.reconnectToken] = self.mReconnectToken ;
            self.sendMsg( eMsgType.MSG_RECONNECT,jsRec,( jsRet : any)=>{
                self.setSessionID(jsRet[key.sessionID],jsRet[key.reconnectToken] );
                let ret : number = jsRet["ret"];
                self.emit(Network.EVENT_RECONNECT_RESULT,0 == ret , self.getSessionID() ) ;
                if ( null != self.mDelegate )
                {
                    self.mDelegate.onReconectedResult( 0 == ret )
                }
                return true ;
            } ) ;
            
            return true ;
        } ) ;      
    }

    protected onMsg( ev : WebSocket.MessageEvent )
    {
        //XLogger.debug(" on msg " + ev.data );
        let msg = JSON.parse(ev.data.toString() ) ;
        if ( msg == null )
        {
            XLogger.error("can not pase set msg : " + ev.data );
            return ;
        }

        let nMsgID : number = msg[Network.MSG_ID];
        // check call back 
        for ( let idx = 0 ; idx < this.vMsgCallBack.length; ++idx )
        {
            if ( this.vMsgCallBack[idx][0] != nMsgID )
            {
                continue ;
            }
            let isCapture = this.vMsgCallBack[idx][1](msg);
            this.vMsgCallBack.splice(idx,1);
            if ( isCapture )
            {
                break ;
            }

        }
    
        if ( eMsgType.MSG_RECONNECT == nMsgID || eMsgType.MSG_VERIFY == nMsgID )
        {
            return ;
        }
       //XLogger.debug("dispath msg id " + msg );
        /// dispatch event ;
        this.emit(Network.EVENT_MSG,nMsgID,msg ) ;
        if ( null != this.mDelegate )
        {
            this.mDelegate.onMsg( nMsgID , msg ) ;
        }
    }

    protected onPong( data : Buffer )
    {
        this.isRecievedHeatBet = true ;
        let offset = Date.now() % (1000*10*1000) - parseInt( data.toString() );
        //XLogger.debug( "ping value = " +  data.toString() + "offset = " + offset );
        if ( offset <= 0 )
        {
            offset = 2 ;
        }
        this.mPingDelayMiniSeconds = offset ;
    }

    protected doSendHeatBet()
    {
        // send heat bet ;
        if ( this.mWebSocket.readyState != WebSocket.OPEN )
        {
            XLogger.error( "socket is not open , can not send heat bet " );
            return ;
        }

        if ( this.isRecievedHeatBet == false )
        {
            //this.onClose(null) ;
            XLogger.debug( "heat time out , so close it " ) ;
            this.close() ;
            return ;
        }
        this.isRecievedHeatBet = false ;
        let ping = Date.now() % (1000*10*1000) + "";
        //XLogger.debug( "ping befor value = " +  ping );
        this.mWebSocket.ping(ping) ;
    }

    protected doTryReconnect()
    {
       if ( null != this.nReconnectInterval )
       {
           XLogger.warn( "already interval reconect " ) ;
           return ;
       } 
       let self = this ;
       this.nReconnectInterval = setInterval(()=>{ XLogger.debug("interval try connect"); self.doConnect();},4000);
    }

    protected getSecrectKeyForVerify() : string
    {
        return "1" ;
    }
}
