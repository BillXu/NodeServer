import { XLogger } from './../common/Logger';
import { eAccountType, eSex } from './../shared/SharedDefine';
import { key } from './../shared/KeyDefine';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { Network, INetworkDelegate } from './../common/Net/Network';
class TestClient implements INetworkDelegate
{
    mNet : Network = null ;
    mAccount : string = "" ;
    // network delegate
    onVerifyResult( isOk : boolean ) : void
    {

    }

    onConnectResult( isOK : boolean ) : void 
    {
        if ( isOK )
        {
            XLogger.debug( "connect ok , just login" ) ;
            this.login();
            return;
        }

        XLogger.error( "connnect failed  , can not login" ) ;
    }

    onDisconnected() : void 
    {

    }

    onMsg( msgID : eMsgType , msg : Object ) : void 
    {
        if ( eMsgType.MSG_TRANSER_DATA == msgID )
        {
            let unpackMsg = msg["msg"] ;
            this.onLogicMsg(unpackMsg[key.msgID], unpackMsg );
            return ;
        }
        else if ( eMsgType.MSG_PLAYER_REGISTER == msgID )
        {
            this.onRegistered(msg) ;
        }
        else if ( eMsgType.MSG_PLAYER_LOGIN == msgID )
        {
            this.onLogin(msg) ;
        }
    }

    onReconectedResult( isOk : boolean ) : void 
    {
        XLogger.debug( "client reconnect result = " + isOk ) ;
        if ( isOk == false )
        {
            XLogger.debug( "reconnect failed , just login again" ) ;
            //this.login();
        }
    }   
    
    // self func 
    init( svrIP_Port : string , acc : string )
    {
        this.mNet = new Network() ;
        this.mNet.setDelegate(this) ;
        this.mNet.connect( svrIP_Port ) ;
        this.mAccount = acc;
    }

    onLogicMsg( msgID : eMsgType , msg : Object )
    {
        XLogger.debug( "client recieved logic msg = " + eMsgType[msgID] + " msg = " + JSON.stringify(msg) ) ;
    }

    sendMsg( port : eMsgPort , targetID : number , msgID : eMsgType , msg : Object , isTransfor : boolean = true )
    {
        if ( null == msg )
        {
            msg = {} ;
        }
        msg[key.msgID] = msgID ;
        if ( isTransfor == false )
        {
            this.mNet.sendMsg(msgID,msg ) ;
            return ;
        }

        let msgTransfer = {} ;
        msgTransfer[key.msgID] = eMsgType.MSG_TRANSER_DATA ;
        msgTransfer["dstPort"] = port ;
        msgTransfer["dstID"] = targetID ;
        msgTransfer["orgPort"] = eMsgPort.ID_MSG_PORT_CLIENT ;
        msgTransfer["orgID"] = this.mNet.getSessionID();
        msgTransfer["msg"] = msg;
        this.mNet.sendMsg(eMsgType.MSG_TRANSER_DATA,msgTransfer) ;
        return ;
    }

    register()
    {
        let msg = {} ;
        //MSG_PLAYER_REGISTER,     // register an account ;
        // client : { account : "adfag" , type : eAccountType, nickeName : "name" , headIconUrl : "", sex : eSex }
        // svr : { ret : 0 , account : "adfag" , type : eAccountType }
        // ret : 0 means success , 1 duplicate account , 2  invalid account type error ;
        msg[key.account] = this.mAccount ;
        msg[key.type] = eAccountType.eAccount_Wechat ;
        msg[key.nickeName] = this.mAccount + "_name" ;
        msg[key.headIcon] = this.mAccount + "_headIcon";
        msg[key.sex] = eSex.eSex_Female ;
        this.sendMsg(eMsgPort.ID_MSG_PORT_GATE, 0, eMsgType.MSG_PLAYER_REGISTER, msg ,false ) ;
    }

    onRegistered( msg : Object )
    {
        let ret = msg[key.ret] ;
        if ( 0 == ret )
        {
            XLogger.debug( this.mAccount + " registered success , just do login" ) ;
            this.login();
            return ;
        }

        XLogger.error( this.mAccount + "regsiter failed , just login ok ?" ) ;
        this.login();
    }

    login()
    {
        let msg = {} ;
        //MSG_PLAYER_LOGIN,  // check an account is valid ;
        // client : { account : "234" , type : eAccountType }
        // svr : { ret : 0 }
        // ret : 0 success , 1 account error with your type ;
        msg[key.account] = this.mAccount ;
        msg[key.type] = eAccountType.eAccount_Wechat ;
        this.sendMsg(eMsgPort.ID_MSG_PORT_GATE, 0, eMsgType.MSG_PLAYER_LOGIN, msg ,false ) ;

       // let self = this ;
        //setTimeout(()=>{ XLogger.debug("try disconnect test reconnect") ; self.mNet.close(); },3000 ) ;

        //setTimeout(()=>{ XLogger.debug("try disconnect test reconnect") ; self.mNet.close(); },6000 ) ;
    }

    onLogin( msg : Object )
    {
        let ret = msg["ret"] ;
        if ( ret != 0 )
        {
            XLogger.debug( this.mAccount +  " login failed , so we register" ) ;
            this.register();
            return ;
        }
        XLogger.debug( this.mAccount + " login ok " ) ;
    }

}

//let c = new TestClient();
//c.init("ws://localhost:3001", "wechatName" ) ;
let date = new Date();
//date.setDate(date.getDate() - 20 ) ;
let a = date.getTime();
let b = Date.now();
console.log( "utc = " + a + " s = " + b + " offset = " + ( b - a) ) ;
console.log( " str =  " + date.toLocaleString() + " day = " + date.getMonth() ) ; 