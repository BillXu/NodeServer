import { MJPlayerDataSH } from './../shared/mjshData/MJPlayerDataSH';
import { PingHuStrategy } from './../Robot/deskModule/PingHuStrategy';
import { eMJCardType } from './../shared/mjData/MJDefine';
import { MJCardData } from './../shared/mjData/MJCardData';
import { clone, cloneDeep, now, countBy } from 'lodash';
// import { MatchCfg } from './../shared/MatchConfigData';
// import { MailData, eMailState } from './../shared/playerData/PlayerMailData';
// import { XLogger } from './../common/Logger';
// import { eAccountType, eSex } from './../shared/SharedDefine';
// import { key } from './../shared/KeyDefine';
// import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
// import { Network, INetworkDelegate } from './../common/Net/Network';
// class TestClient implements INetworkDelegate
// {
//     mNet : Network = null ;
//     mAccount : string = "" ;
//     mLocalMaxMailID : number = 0 ;
//     mUID : number = 0 ;
//     // network delegate
//     onVerifyResult( isOk : boolean ) : void
//     {

//     }

//     onConnectResult( isOK : boolean ) : void 
//     {
//         if ( isOK )
//         {
//             XLogger.debug( "connect ok , just login" ) ;
//             this.login();
//             return;
//         }

//         XLogger.error( "connnect failed  , can not login" ) ;
//     }

//     onDisconnected() : void 
//     {

//     }

//     onMsg( msgID : eMsgType , msg : Object ) : void 
//     {
//         if ( eMsgType.MSG_TRANSER_DATA == msgID )
//         {
//             let unpackMsg = msg["msg"] ;
//             this.onLogicMsg(unpackMsg[key.msgID], unpackMsg );
//             return ;
//         }
//     }

//     onReconectedResult( isOk : boolean ) : void 
//     {
//         XLogger.debug( "client reconnect result = " + isOk ) ;
//         if ( isOk == false )
//         {
//             XLogger.debug( "reconnect failed , just login again" ) ;
//             this.login();
//         }
//     }   
    
//     // self func 
//     init( svrIP_Port : string , acc : string )
//     {
//         this.mNet = new Network() ;
//         this.mNet.setDelegate(this) ;
//         this.mNet.connect( svrIP_Port ) ;
//         this.mAccount = acc;
//     }

//     onLogicMsg( msgID : eMsgType , msg : Object )
//     {
//         XLogger.debug( "client recieved logic msg = " + eMsgType[msgID] + " msg = " + JSON.stringify(msg) ) ;
//         if ( eMsgType.MSG_PLAYER_OTHER_LOGIN == msgID )
//         {
//             process.exit(0) ;
//         }

//          if ( eMsgType.MSG_PLAYER_REGISTER == msgID )
//         {
//             this.onRegistered(msg) ;
//         }
//         else if ( eMsgType.MSG_PLAYER_LOGIN == msgID )
//         {
//             this.onLogin(msg) ;
//         }

//         if ( eMsgType.MSG_PlAYER_INFORM_MAX_MAIL_ID == msgID )
//         {
//             let mxid = msg[key.maxID] ;
//             if ( mxid <= this.mLocalMaxMailID )
//             {
//                 XLogger.debug("local and remote max mail id is the same = " + mxid + " localID = " + this.mLocalMaxMailID ) ;
//                 return ;
//             }

//             let msgreq = {} ;
//             msgreq[key.maxID] = this.mLocalMaxMailID; 
//             this.sendMsg(eMsgPort.ID_MSG_PORT_DATA, this.mUID, eMsgType.MSG_PLAYER_REQ_MAIL, msgreq );
//             XLogger.debug( "start req mail local mail id = " + this.mLocalMaxMailID ) ;
//         }
//         else if ( eMsgType.MSG_PLAYER_BASE_DATA == msgID )
//         {
//             this.mUID = msg[key.uid] ;

//             // req tree info ;
//             //this.sendMsg(eMsgPort.ID_MSG_PORT_DATA, this.mUID, eMsgType.MSG_PLAYER__DIAMOND_TREE_REQ_INFO, {} ) ;
            
//             // enter room 
//             this.sendMsg( eMsgPort.ID_MSG_PORT_MJSH , 200, eMsgType.MSG_PLAYER_MJ_ETNTER, msg ) ;
//         }
//         else if ( eMsgType.MSG_PLAYER__DIAMOND_TREE_REQ_INFO == msgID )
//         {
//             let cnt = 3 ; 
//             while ( cnt-- )
//             {
//                 // req tree info ;
//                 this.sendMsg(eMsgPort.ID_MSG_PORT_DATA, this.mUID, eMsgType.MSG_PLAYER__DIAMOND_TREE_GET_DIAMOND, {} ) ;
//             }
//         }
//         else if ( eMsgType.MSG_PLAYER_REQ_MAIL == msgID )
//         {
//             let mails : Object[] = msg["mails"] ;
//             for ( let m of mails )
//             {
//                 let ml = new MailData();
//                 ml.parse(m) ;
//                 let mp = {} ;
//                 mp[key.id] = ml.id ;

//                 mp[key.state] = eMailState.eState_Read ;
//                 if ( ml.items != null && ml.items.length > 0  )
//                 {
//                     mp[key.state] = eMailState.eState_GotItems ;
//                     XLogger.debug( "get mail items mailID = " + ml.id ) ;
//                 }
//                 else
//                 {
//                     mp[key.state] = eMailState.eState_Delete;
//                 }
                
//                 XLogger.debug( "set mail setate mail id = " + ml.id ) ;
//                 this.sendMsg(eMsgPort.ID_MSG_PORT_DATA, this.mUID, eMsgType.MSG_PLAYER_PROCESS_MAIL, mp ) ;
//             }
//         }
//     }

//     sendMsg( port : eMsgPort , targetID : number , msgID : eMsgType , msg : Object , isTransfor : boolean = true )
//     {
//         if ( null == msg )
//         {
//             msg = {} ;
//         }
//         msg[key.msgID] = msgID ;
//         if ( isTransfor == false )
//         {
//             this.mNet.sendMsg(msgID,msg ) ;
//             return ;
//         }

//         let msgTransfer = {} ;
//         msgTransfer[key.msgID] = eMsgType.MSG_TRANSER_DATA ;
//         msgTransfer["dstPort"] = port ;
//         msgTransfer["dstID"] = targetID ;
//         msgTransfer["orgPort"] = eMsgPort.ID_MSG_PORT_CLIENT ;
//         msgTransfer["orgID"] = this.mNet.getSessionID();
//         msgTransfer["msg"] = msg;
//         this.mNet.sendMsg(eMsgType.MSG_TRANSER_DATA,msgTransfer) ;
//         return ;
//     }

//     register()
//     {
//         let msg = {} ;
//         //MSG_PLAYER_REGISTER,     // register an account ;
//         // client : { account : "adfag" , type : eAccountType, nickeName : "name" , headIconUrl : "", sex : eSex }
//         // svr : { ret : 0 , account : "adfag" , type : eAccountType }
//         // ret : 0 means success , 1 duplicate account , 2  invalid account type error ;
//         msg[key.account] = this.mAccount ;
//         msg[key.type] = eAccountType.eAccount_Wechat ;
//         msg[key.nickeName] = this.mAccount + "_name" ;
//         msg[key.headIcon] = this.mAccount + "_headIcon";
//         msg[key.sex] = eSex.eSex_Female ;
//         this.sendMsg(eMsgPort.ID_MSG_PORT_GATE, 0, eMsgType.MSG_PLAYER_REGISTER, msg ) ;
//     }

//     onRegistered( msg : Object )
//     {
//         let ret = msg[key.ret] ;
//         if ( 0 == ret )
//         {
//             XLogger.debug( this.mAccount + " registered success , just do login" ) ;
//             this.login();
//             return ;
//         }

//         XLogger.error( this.mAccount + "regsiter failed , just login ok ?" ) ;
//         this.login();
//     }

//     login()
//     {
//         let msg = {} ;
//         //MSG_PLAYER_LOGIN,  // check an account is valid ;
//         // client : { account : "234" , type : eAccountType }
//         // svr : { ret : 0 }
//         // ret : 0 success , 1 account error with your type ;
//         msg[key.account] = this.mAccount ;
//         msg[key.type] = eAccountType.eAccount_Wechat ;
//         this.sendMsg(eMsgPort.ID_MSG_PORT_GATE, 0, eMsgType.MSG_PLAYER_LOGIN, msg ) ;

//        // let self = this ;
//         //setTimeout(()=>{ XLogger.debug("try disconnect test reconnect") ; self.mNet.close(); },3000 ) ;

//         //setTimeout(()=>{ XLogger.debug("try disconnect test reconnect") ; self.mNet.close(); },6000 ) ;
//     }

//     onLogin( msg : Object )
//     {
//         let ret = msg["ret"] ;
//         if ( ret != 0 )
//         {
//             XLogger.debug( this.mAccount +  " login failed , so we register" ) ;
//             this.register();
//             return ;
//         }
//         XLogger.debug( this.mAccount + " login ok " ) ;
//     }

// }

// let c = new TestClient();
//c.init("ws://localhost:3001", "wechatNameNew3" ) ;
// c.init("ws://localhost:3001", "wechatNameNew2" ) ;
 //c.init("ws://localhost:3001", "wechatNameNew1" ) ;
 //c.init("ws://localhost:3001", "wechatNameNew0" ) ;
// let p = {"cfgID":8,"name":"123","fee":{"1":100},"gameType":0,"matchType":1,"cntPerDesk":4,"playerCntLimit":[5,10],"startTime":"2020-08-07T16:36","repeatTime":60,"vRewards":[{"startIdx":"1","endIdx":"1","rewards":{"5":100},"desc":"\u7b2c\u4e00\u540d100\u7ea2\u5305"},{"startIdx":"2","endIdx":"3","rewards":{"5":30},"desc":"2-3\u540d30\u7ea2\u5305"}],"mGuaFenReward":{"playerCnt":"20","reward":{"5":100},"desc":"12345"},"vLawRounds":[{"idx":1,"gameRoundCnt":3,"canRelive":0,"reliveTicketCnt":0,"promoteCnt":2,"isByDesk":1},{"idx":2,"gameRoundCnt":3,"canRelive":0,"reliveTicketCnt":0,"promoteCnt":2,"isByDesk":1},{"idx":3,"gameRoundCnt":3,"canRelive":1,"reliveTicketCnt":1,"promoteCnt":2,"isByDesk":1}]}

// let mcfg = new MatchCfg();
// mcfg.parse(p) ;

let v = [2,3,5] ;
let v2 = [ 4,8] ;
let v9 = [1,9] ;
let v0 = [];
console.log( v + " v " + v2 + " v2 " + v9 + "v9 " + v0  ) ;

class A 
{
    a : string = "a" ;
    b : number = 3 ;
    m : A = null ;
    pintf()
    {
        console.log( "--------" ) ;
    }
}

let cc = new A();
let cb = new A();
cc.m = cb ;

cb.a = "cb" ;
cb.b = 2333;

let ccc = clone(cc) ;
let cccd = cloneDeep(cc) ;
cc.a = " a changed " ;
cb.a = "changed" ;
console.log( "org : " + JSON.stringify(cc) ) ;
console.log( "normal clone : " + JSON.stringify(ccc) ) ;
console.log( "deep clone : " + JSON.stringify(cccd) ) ;

let jsc = {} ;
jsc["cc"] = cc;
console.log( JSON.stringify(jsc) ) ;

let vCard = [] ;
 //vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Wan, 3 ) );
 //vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Wan, 3 ) );
 vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Wan, 3 ) );
 vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Wan, 4 ) );
 vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Wan, 5 ) );
 //vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Wan, 8 ) );
 //vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Wan, 9 ) );

 vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tong, 8 ) );
 vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tong, 9 ) );
 vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tong, 3 ) );
 vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tong, 5 ) );
// vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tong, 8 ) );
// vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tong, 9 ) );
// vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tong, 9 ) );
vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tiao, 1 ) );
vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tiao, 2 ) );
vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tiao, 2 ) );
vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tiao, 3 ) );
vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tiao, 7 ) );
vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Tiao, 9 ) );
vCard.push( MJCardData.makeCardNum(eMJCardType.eCT_Feng, 2 ) );
vCard.sort((a,b)=> a-b ) ;
let pingHu = new PingHuStrategy();
let t = Date.now();
let card = pingHu.getBestChuCard(vCard, (v)=>4,[]) ;
MJCardData.printCard(card) ;
console.log( "time offset = " + ( Date.now() - t ) ) ;


let c = 23 ;
console.log( `this is a number ${c}`  ) ;

let vCards = [2,2,3,5,3,3,3] ;
card = 3 ;
let ret = countBy(vCards);
let cccc = ret[3] || 0 ;
console.log( "add = " + cccc) ;


let timer = new Date() ;
console.log(" cur : " + timer.valueOf() + "  date  " + Date.now() ) ;
timer.setHours(1,0);
timer.setDate(13+timer.getDate()) ;
console.log(timer.toLocaleString()) ;