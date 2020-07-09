import { LocalEventEmitter } from './../LocalEventEmitter';
import { eMsgPort, eMsgType } from './../../shared/MessageIdentifer';
import WebSocket from "ws";

export interface IOneMsgCallback
{
    // return true means msg will not continue dispatch , return false , means msg will continue processed by other callback ;
    (jsmsg : Object) : boolean ;  
} ;

export default class ClientNetwork extends LocalEventEmitter{

    static EVENT_OPEN : string = "open";
    static EVENT_FAILED : string = "failed";
    static EVENT_MSG : string = "msg";
    static EVENT_CLOSED : string = "close";
    static EVENT_RECONNECT : string = "reconnect";
    static EVENT_RECONNECTED_FAILED : string = "reconnectFailed" ;

    static TIME_HEAT_BEAT : number = 3 ; 
    static MSG_ID : string = "msgID" ;
    static MSG_DATA : string = "msgData" ;

    private static s_pNetwork : ClientNetwork = null ;
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

    static getInstance() : ClientNetwork
    {
        if ( ClientNetwork.s_pNetwork == null )
        {
            ClientNetwork.s_pNetwork = new ClientNetwork();
        }
        return ClientNetwork.s_pNetwork ;
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
    connect( dstIP : string, targetPort : number , selfPort : number ) 
    {
       this.mDstIP = dstIP ;
       console.log( "direct connect to svr" );
       this.doConnect(); 
    }

    sendMsg( jsMsg : Object , msgID : number, targetPort : number , targetID : number , callBack? : IOneMsgCallback ):boolean
    {
        if ( this.mWebSocket == null )
        {
            console.warn( "not set up network" );
            return false;
        }

        if ( this.mWebSocket.readyState != WebSocket.OPEN )
        {
            console.error( "socket is not open , can not send msgid = " + msgID );
            return false;
        }
        let jsPacket = { } ;
        jsMsg[ClientNetwork.MSG_ID] = msgID ;

        jsPacket["cSysIdentifer"] = targetPort ;
        jsPacket["nTargetID"] = targetID ;
        jsPacket["JS"] = JSON.stringify(jsMsg);
        this.mWebSocket.send(JSON.stringify(jsPacket)) ;

        console.log( "send msg : " + JSON.stringify(jsPacket) );
        if ( callBack != null ) // reg call back ;
        {
            let p : [ number , IOneMsgCallback] ;
            p = [msgID,callBack];
            this.vMsgCallBack.push(p) ; 
        }
        return true;
    }

    protected setSessionID( newSessionID : number )
    {
        this.nSessionID = newSessionID ;
    }
    
    protected doConnect()
    {
        if ( this.mWebSocket != null && ( this.mWebSocket.readyState == WebSocket.CONNECTING || WebSocket.OPEN == this.mWebSocket.readyState ) )
        {
            console.log( "ok = " + WebSocket.OPEN + "ing = " + WebSocket.CONNECTING );
            console.error( "alredy doing reconnect , so need not connect state : " + this.mWebSocket.readyState  );
            return ;
        }

        console.log( "do connecting..." );
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
        console.log(" on error  " );
        if ( null != this.nPingCheckAlive )
        {
            clearInterval(this.nPingCheckAlive) ;
            this.nPingCheckAlive = null ;
        }

        this.emit(ClientNetwork.EVENT_FAILED) ;
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
            console.error( "socke already open , should not recived close event" );
            return ;
        }

        if ( this.isSkipOnCloseEnvet )
        {
            console.log( "skip on close event" );
            return ;
        }

        console.log( "on colse " );
        this.isSkipOnCloseEnvet = true ; // we do on close event invoke twice , before connected success ;

        console.log("stop heat beat");
        //clearTimeout(this.nTimeoutHandleNum); // sytem tell or heatbeat time out , lead to on close ,we should stop heatBet ;
        //this.nTimeoutHandleNum = null ;
        if ( null != this.nPingCheckAlive )
        {
            clearInterval(this.nPingCheckAlive) ;
            this.nPingCheckAlive = null ;
        }

        // dispatch event ;
        this.emit(ClientNetwork.EVENT_CLOSED) ;
        if ( null == this.nReconnectInterval )
        {
            this.doConnect();
            this.doTryReconnect();
        }
    }

    protected close( ev : WebSocket.CloseEvent )
    {
        console.log( "self colse" );
        this.mWebSocket.terminate();
    }

    protected onOpen( ev : WebSocket.OpenEvent )
    {
        console.log(" on open +  " + this.mWebSocket.readyState );
        if ( this.nReconnectInterval != null )
        {
            console.log("clear time out ");
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
        this.nPingCheckAlive = setInterval(this.doSendHeatBet.bind(this),ClientNetwork.TIME_HEAT_BEAT * 1000 );

        this.emit( ClientNetwork.EVENT_OPEN) ;
        // verify client ;
        let jsMsg = {} ;
        let self = this ;
        this.sendMsg(jsMsg,eMsgType.MSG_VERIFY_CLIENT,eMsgPort.ID_MSG_PORT_GATE,0 , ( jsm :any)=>
        {
            //let pEvent : any ;
            if ( jsm["nRet"] != 0 )
            {
                console.error("can not verify this client ret :" + jsm["nRet"] );
                //pEvent = new cc.Event.EventCustom(Network.EVENT_FAILED,true) ;
                //cc.systemEvent.dispatchEvent(pEvent);
                self.emit( ClientNetwork.EVENT_FAILED) ;
                return true;
            }

            self.emit( ClientNetwork.EVENT_OPEN) ;
            console.log("verifyed session id = " + jsm["nSessionID"] + " ret =" + jsm["nRet"] );
            // decide if need reconnect 
            if ( self.getSessionID() == 0 ) // we need not reconnect 
            {
                self.setSessionID( jsm["nSessionID"] );
                return ;
            }
            
            // we need do reconnect 
            let jsRec = {};
            jsRec["nSessionID"] = self.getSessionID();
            self.sendMsg(jsRec,eMsgType.MSG_RECONNECT,eMsgPort.ID_MSG_PORT_GATE,0,( jsRet : any)=>{
                let ret : number = jsRet["nRet"];
                self.setSessionID(jsRet["sessionID"]);
                let ev : any = ClientNetwork.EVENT_RECONNECT ;
                if ( 0 != ret ) // reconnect ok 
                {
                    ev = ClientNetwork.EVENT_RECONNECTED_FAILED ;
                }
                self.emit(ev,self.getSessionID() ) ;
                return true ;
            } ) ;
            
            console.log("verifyed session id = " + jsm["nSessionID"] + " ret =" + jsm["nRet"] + "do reconnect" );
            return true ;
        } ) ;      
    }

    protected onMsg( ev : WebSocket.MessageEvent )
    {
        console.log(" on msg " + ev.data );
        let msg = JSON.parse(ev.data.toString() ) ;
        if ( msg == null )
        {
            console.error("can not pase set msg : " + ev.data );
            return ;
        }

        let nMsgID : number = msg[ClientNetwork.MSG_ID];
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
    
       //console.log("dispath msg id " + msg );
        /// dispatch event ;
        this.emit(ClientNetwork.EVENT_MSG,nMsgID,msg ) ;
    }

    protected onPong()
    {
        this.isRecievedHeatBet = true ;
    }

    protected doSendHeatBet()
    {
        // send heat bet ;
        if ( this.mWebSocket.readyState != WebSocket.OPEN )
        {
            console.error( "socket is not open , can not send heat bet " );
            return ;
        }

        if ( this.isRecievedHeatBet == false )
        {
            this.onClose(null) ;
            return ;
        }
        this.isRecievedHeatBet = false ;
        this.mWebSocket.ping() ;
    }

    protected doTryReconnect()
    {
       let self = this ;
       this.nReconnectInterval = setInterval(()=>{ console.log("interval try connect"); self.doConnect();},3000);
    }
}
