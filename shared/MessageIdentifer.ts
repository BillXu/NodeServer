export enum eMsgPort
{
	ID_MSG_PORT_NONE, // client to game server 
	ID_MSG_PORT_CLIENT = ID_MSG_PORT_NONE,
	ID_MSG_PORT_GATE,
	ID_MSG_PORT_CENTER,
	ID_MSG_PORT_VERIFY,
	ID_MSG_PORT_DB,
	ID_MSG_PORT_DATA,
	ID_MSG_PORT_MATCH,
	ID_MSG_PORT_MJXY, // xiang yang ka wu xing ;
	ID_MSG_PORT_MJSH, // shang hai ma jiang ;
	ID_MSG_PORT_R,
	ID_MSG_PORT_ALL_SERVER,
	ID_MSG_PORT_MAX,
};

export enum eMsgType 
{
	MSG_NONE,
	//--new define begin---
	// the msg title used between servers 
	MSG_SERVERS_USE,

	MSG_PING,
	// client : { any }
	// svr : { any }
	
	MSG_VERIFY,   // used between svr ;
    // client : { pwd : aa , reconnectToken : number }
	// svr : { ret : 0 , reconnectToken : number, sessionID : 2345 } 
	// reconnectToken : must keep your token unique , recommond generate  = ( now() % 10000 ) * 1000 + random(1,1000) ;

    MSG_RECONNECT,   // client with gate 
    // client : { sessionID : 234, reconnectToken : number } // reconnect to sessionID ;
    // svr : { ret : 0 , sessionID : 234 } 
    // ret : 0 means ok , other value means failed , 
	// sessionID , means current session , in use . 
	
	MSG_REGISTER_SERVER_PORT_TO_CENTER,
	// subSvr : { port : eMsgPort, suggestIdx : number } 
	// centerSvr : { idx : number, maxCnt : 1  }  
	// if idx < 0 , means group is full ;
	
	MSG_SERVER_DISCONNECT, // some svr disconnected ;  // svr recived , send by center svr , not by transfer data ;
	// centerSvr : { port : eMsgPort , idx : number , maxCnt : number} 
	// idx means server idx ;

	MSG_TRANSER_DATA, // tranfer data between servers ;
	// { dstPort : eMsgPort, dstID : number , orgPort : eMsgPort , orgID : number ,msg : Object }
	
	MSG_RPC_REQUEST, // asyn request
	// send : { sieralNum : 23455 , funcID : eRpcFuncID, arg : {}  }

	MSG_RPC_RESULT, // asyn request
	// send : { sieralNum : 23452 , state : 0 , errMsg : "only state = 2 , have this key value " , result : {} } 
	// state : 0 , success , 1 delay respone , 2 error ;
	// only when state = 0 , " result " " key value  will exist ;
	
	MSG_PLAYER_REGISTER,     // register an account ;
	// client : { account : "adfag" , type : eAccountType, nickeName : "name" , headIconUrl : "", sex : eSex }
	// svr : { ret : 0 , account : "adfag" , type : eAccountType }
	// ret : 0 means success , 1 duplicate account , 2  invalid account type error ;

	MSG_PLAYER_LOGOUT,
	// client : null ;
	// svr : { ret : 0 }  // ret: 0 success , 1 can not find player , 2 player is doing something , can not logout,eg: in some room ;

	MSG_PLAYER_LOGIN,  // check an account is valid ;
	// client : { account : "234" , type : eAccountType }
	// svr : { ret : 0 }
	// ret : 0 success , 1 account error with your type ;

	MSG_PLAYER_BASE_DATA,
	// svr: { uid : 23, nickName : "lucy" , sex : eSex , headUrl : "http://url.com", diamond : 23 , inviterUID : 20 }

	MSG_PLAYER_OTHER_LOGIN, // tell player your account already logined in other device ;  client recived must disconnect from server
	// svr : { ip : "230.32.234.2" }
	// ip : other device 's ip ;

	MSG_REQUEST_PLAYER_SIMPLE_INFO, // request player simpleInfo  
	// client : { reqUID : 23  }
	// svr : { ret : 0 , uid : 23 , nickeName : "hello" , headUrl : "http://weshg.wx.com",sex : 1 ,isOnline : 0  }
	// ret : 0 success , 1 can not find target player , uid should equal target id ; 

	MSG_PLAYER_UPDATE_INFO,
	// client : { nickeName : "lucy", sex : 1 , headIcon : "http://url.com"  }
	// svr: { ret : 0 }

	MSG_PLAYER_REFRESH_MONEY,
	// client : null ;
	// svr { diamond : 235 }

	MSG_PlAYER_INFORM_MAX_MAIL_ID,
	// svr : { maxID : 1000 }

	MSG_PLAYER_REQ_MAIL,
	// client : { maxID : 1000 }
	// svr : { isFinal : false,  mails : [ mailkey : value ] }   

	MSG_PLAYER_PROCESS_MAIL,
	// client : { id : 23 , state : eMailState } . 
	// svr : { ret : 0 ,id : 23 ,state : eMailState }
	// ret : 0 success , 1 can not find mail , 2 can not finish operate , 3 do not contain items , 4 mail already expired; 


	MSG_PLAYER__DIAMOND_TREE_REQ_INFO,
	// client : null ;
	// svr : { level : 0 , curFertilizer : 100 , diamond : [ 100,200 ], leftCD : [ cur ,Max ], nextFertilizer : 2 , nextDiamond : [ 100,200 ] }
	// nextFertilizer : level up need Fertilizer cnt .  nextDiamonds: next level tree will produce diamon cnt ;

	MSG_PLAYER__DIAMOND_TREE_LEVEL_UP,
	// client : null 
	// svr :  {  ret : 0 , curFertilizer : 100 , level : 0 , diamond : [ 100,200 ], nextFertilizer : 2 , nextDiamond : [ 100,200 ] }
	// ret : 0 level up success , 1 lack of fertilizer ; 

	MSG_PLAYER__DIAMOND_TREE_GET_DIAMOND,
	// client : null ;
	// svr : { ret : 0 , leftCD : [ cur ,Max ] ,recivedDiamond : 23 , finalDiamond : 235 }
	// ret : 0 success , 1 CDing , please wait a while ;

	MSG_PLAYER__DIAMOND_TREE_DECREASE_CD,
	// client : { adTime : 10 } ;
	// svr : { ret : 0 , leftCD : [ cur ,Max ] } 
	// ret: 0 success , 1 invalid action ; 

	MSG_PLAYER_NOTICE_DLG,
	// svr : { noitice : "this is a notice", time : 234235234234  }  // time change change to local time . seconds ;
	
	MSG_RESULT_ERROR,
	//svr : { code : eErrorCode , msgID : eMsgType , err? : "" }   

	MSG_SYNC_TIME,
	// client : null
	// svr : { time : 2345234 }
	// utc : by seconds ; 

	MSG_PLAYER_REQ_MATCH_LIST = 200,
	// client : { type : eMatchType }
	// svr : { type : eMatchType, matchs : [ { matchData } , ...  ] }

	MSG_PLAYER_MATCH_SIGN_UP,
	// client : { uid : 2000 }
	// svr : { ret : 0 , matchID : 2000, type : eMatchType }
	// ret : 0 success , 1 uid error , 2 money not enough , 3 already in other match, 
	//  4 already in this match , 5 can not find player with uid , 6 member is full
	// 7 match not in wait signe up state;
	// uid : self uid , 
	// matchID : when sign up success , will return to client;

	MSG_PLAYER_MATCH_SIGN_OUT, // canncel match
	// client : { uid : 23000 }
	// svr : { ret : 0 }
	// ret : 0 , success , 1 you are not login , 2 uid error , 3 you are not in sign list , 4 match not in wait signe up state;

	MSG_PLAYER_MATCH_RESULT,
	//svr : { rankIdx : 0 , matchID : 234 , state : eMJPlayerState , canRelive : 0  , reward : IMoney[] } 
	// if do not have rewards , reward key will be null ;

	MSG_PLAYER_REQ_MATCH_STATE,
	// client : null
	// svr { ret : 0 , rankIdx : number , deskID : 2345 , gamePort : eMsgPort }
	// ret : 0 , means in game ,  1 , lose out ;
	// when waiting other finish , have rankIdx key ;
	// when playing in room , deskID and gamePort key exist ;

	MSG_PLAYER_REQ_MATCH_RELIVE,
	// client : { uid : 234 }
	// svr { ret : 0 }
	// ret : 0 success , 1 money not enough , 2 not allow relive , 3 uid error ;

	MSG_R_BEGIN = 260,

	MSG_R_TELL,
	// client : null
	MSG_R_ORDER_JOIN,
	// svr : { matchID : 23 , lawIdx : 23 }
	// client : { ret : 0 , uid : 23 }
	// only when failed respone to svr ;

	MSG_R_JOIN_MATCH,
	// client : { lawIdx : 0 , uid : 234  }
	// svr : { ret }
	// ret: 0 success , 1 not need ;

	MSG_PLAYER_MJ_REQ_DESK_INFO = 300,
	// client : null
	// svr : { ret : 0 ,  MJDeskData  } ;

	MSG_PLAYER_MJ_DESK_PLAYERS_INFO,
	// svr : { players : { MJPlayerData } } ;

	MSG_DEDK_MJ_PLAYER_ENTER, // some player enter room ; 
	// svr : { uid : 0 , sessionID : 23 , idx : 2 , score : 2345 }

	MSG_DEKS_MJ_INFORM_ACT_WITH_OTHER_CARD,
	//svr : { card : 234 , act : eMJActType[] }

	MSG_DEKS_MJ_INFORM_SELF_ACT,
	// svr : { isOnlyChu : 0, canHu : 1 , buGang : [12,3] , anGang : [12,12], limitCards : [23,22] }

	MSG_DESK_MJ_DISTRIBUTE,
	// svr : { bankerIdx : 1 , holdCards : [ 2,2,3,4 ] }

	MSG_DESK_MJ_GAME_OVER,
	// svr : { isHuOver : 0 ,isDeskFinished : 1  } 

	MSG_MJ_ACT_BEGIN = 400,
	MSG_DESK_MJ_MO,
	// svr { idx : 23 , card : 234 }

	MSG_PLAYER_MJ_CHU,
	// client: { card : number } ;
	// ret : { ret : 0 , idx : number , card : number }
	// ret : 0 success , 1 state error , 2 card error ;

	MSG_PLAYER_MJ_ANGANG,
	// client: { card : number } ;
	// ret : { ret : 0 , card : number , idx : number  }
	// ret : 0 success , 1 state error , 2 card error  ;

	MSG_PLAYER_MJ_BU_GANG,
	// client: { card : 234 } ;
	// ret : { ret : 0 , card : 234 , isDeclare : 1  }
	// ret : 0 success , 1 state error , 2 card error  ;

	MSG_PLAYER_MJ_EAT,
	// client: { card : number , eatWith : [2,3] } ;
	// ret : { ret : 0 , idx : number , card : number , eatWith : [2,3]  }
	// ret : 0 success , 1 state error , 2 card error ;

	MSG_PLAYER_MJ_PENG,
	// client: null ;
	// ret : { ret : 0 , card : 234 , invokerIdx : 234 }
	// ret : 0 success , 1 state error , 2 card error , 3 can not do this act ;
 
	MSG_PLAYER_MJ_MING_GANG,
	// client: null ;
	// ret : { ret : 0 , card : 234 , invokerIdx : 234 }
	// ret : 0 success , 1 state error , 2 card error 

	MSG_PLAYER_MJ_HU,
	// client: null ;
	// svr : { ret : 0 , huCard : number , invokerIdx : idx , maCard : 23 , maScore : 23  ,huInfo : [ idx : 23 , fanxing : number , bei : 2  ], players : [ { idx : 2 , hold : number[], offset : 23 , final : 23 } , ... ] }
	// ret : 0 success , 1 state error , 2 card error 
	// maCard : mai ma card , or fly cang ying ;

	MSG_PLAYER_MJ_PASS,
	// client: null ;
	// ret : { ret : 0 }
	// ret : 0 success , 1 state error;

	MSG_PLAYER_MJ_BU_HUA,
	// svr: { idx : number , vHua : [23,23] , vCard : [22,56] }

	MSG_PLAYER_MJ_TING,
	// client { card : 23 }
	// svr:  { ret : 0 , idx : 2 , chu: 23 }
	// ret : 0 success , 1 you cannot ting , 2 you can not chu ;
	
	MSG_PLAYER_MJ_TUO_GUAN,
	// client : { isSet : 0 }
	// svr : { idx : 2 , isSet : 1 }


	MSG_MJ_ACT_END = 500,

	MSG_DESK_MJ_START,
	// svr : { bankerIdx : 23 , curRoundIdx : 0 , dice : [1,3] }
	MSG_PLAYER_MJ_ETNTER,
	// client : { uid : 23 } ;
	MSG_TEST_MJ_WANT_CARD,
	// client : { card : number }
	MSG_TEST_MJ_SWAP_CARD,
	// client: { orgCard : number , dstCard : number }
	// svr : { ret : 0 ,  orgCard : number , dstCard : number }

	MSG_PRIZE_WHEEL_SPIN = 600,
	// client : { type : 0 }
	// svr : { ret : 0 , pos : 0 }
	// type : 0 by diamond , 1 for free , 2 by video ;
	
	MSG_PRIZE_WHEEL_RANK,
	//client : null
	// svr : { rank : [ {name : "hello" , pos : 1} ] }


























	///------above is new ;
	MSG_JSON_CONTENT,
	MSG_TELL_CLIENT_SVR_DISCONNECT, // tell client svr
	MSG_CLIENT_CONNECT_STATE_CHANGED,  // client connect state changed ;  // send by gate 
	MSG_GATE_SVR_IS_FULL, // gate connect is full , let client change other gate ;

	MSG_TELL_GATE_PLAYER_OTHER_LOGIN,





	MSG_PLAYER_UPDATE_GPS,
	// client : { J : 23.23 , W : 2345  }   // j : jing du , w: wei du ;  
	// svr : null 


	MSG_SHOP_MAKE_ORDER,
	// client : { shopItemID : 23 , channel : ePayChannel }  // ePayChannel 渠道枚举
	// svr : { ret : 0 , shopItemID : 23 , channel : ePayChannel,cPrepayId : "asdgsfh234g22jhbjadjg",cOutTradeNo : "232hlhsfhasdg" }
	// ret : 0 success , 1 can not find shop item , 2 , can not find player , 3 pay channel error , 4 argument error ; 
	MSG_SHOP_BUY_ITEM,
	// client : { shopItemID : 23 , channel : ePayChannel, transcationID : "20 len" }
	// svr : { ret : 0 , shopItemID : 23 }
	// ret : 0 success , 1 can not find shop item , 2 can not find player , 3 transcationID lenght is not 20 ,4 pay channel error ,5 platform verify error , 6 time out;

	MSG_ASYNC_REQUEST_RESULT,  // temp put here
	// in room msg ;
	MSG_REQUEST_ROOM_INFO,
	// client : null ;

	MSG_PLAYER_CHAT_MSG, // 玩家发送 聊天信息
	// client : { type : 1 , content : "biao qing or viceID" }
	// svr : { ret : 0 } 
	MSG_ROOM_CHAT_MSG, // 房间内有玩家 发送聊天信息；
	// svr:  { playerIdx : 2 , type : 1 , content : "biao qing or viceID" } 

	MSG_NEW_MAIL,
	// svr : { mailID : 234 , type : 0 ,state : 0 , detail : { } }
	// type : eMailType
	// state : eMailState 枚举值
	// detail : 不同的邮件类型，内容不一样；

	MSG_PLAYER_INTERACT_EMOJI,
	// client : { targetIdx : 0 , emoji : 23 }
	// svr : { ret : 0 }  // 0 success , 1 money is not enough , 2 player is not online , 3 you are not sitdown  in room ;
	
	MSG_ROOM_INTERACT_EMOJI,
	// svr : { invokerIdx : 1 ,targetIdx : 0 , emoji : 23 } 

	MSG_REQUEST_JOINED_CLUBS,
	// client : {}
	// svr : { clubs : [ 23,1,23 ] } 

	MSG_PLAYER_RECIEVED_NEW_MAIL,
	// svr : { maxMailID : 23 }

	MSG_PLAYER_REQ_MAILS,
	// client : { clientMaxMailID : 23   }
	// svr : { pageIdx : 1 , mails : [ { mailID : 234 , type : 0 ,state : 0 ,time : 234523, detail : { } }, ....  ] } 
	// 10 cnt per page ,if mails size < 10 , means end ;
	


	MSG_PLAYER_BIND_ACCOUNT1,
	// client : { account : 123456 , password : 123456 }
	// svr : { ret : 0 }
	// ret : 0 success , 1 account is occured , 2 uid is error , 5 : account or password error , 7 : timeout

	MSG_PLAYER_GET_POINT_INFO,
	// client : { }
	// svr : { point : 0, withdraw : 0, totalGame : 0, withdrawTotalGame : 0 }

	MSG_PLAYER_WITHDRAW_POINT,
	// client : { }
	// svr will give MSG_PLAYER_GET_POINT_INFO message

	MSG_PLAYER_GET_VIP_INFO,
	// client : { }
	// svr : { vipLevel : 0, vipInvalidTime : 0 }

	MSG_PLAYER_GET_TOTAL_POINT_RANK_INFO,
	// client : { }
	// svr : { rankInfo : { { uid : 123, totalPoint : 123 } ,{},... } }

	MSG_CREATE_ROOM,
	// client: { uid : 234 ,gameType : 0 , seatCnt : 4 , payType : 1 , level : 2 , opts : {  .... }  }
	// payType : 0 the room owner pay cards , 1 AA pay card type , 2 big winer pay cards 
	// svr : {  ret : 0 , roomID : 23 } // ret : 0 success , 1 diamond is not enough, 2 create room count reach limit , 3 argument error , 4 room type error ,can not create room,  5  server maintenance,create room later   , 6 svr is busy , please try later , 7 internal time out;
	MSG_ROOM_REQ_ROOM_LIST, // send to data svr ;
	// client : null 
	// svr : { ret : 0 , rooms : [{id : 234, port : 23 }, ... ], stayInRoom : { id : 0 , port : 23 }  }
	// if player is not in any room , "stayInRoom" will be null , svr do not send this key 

	MSG_ENTER_ROOM,
	// client : { roomID : 23, uid : 23 }
	// svr: { roomID : 23 , ret : 0 } // ret : 0 success , 1 can not find room , 2 you already in other room ;3, room is full , 4, uid error ,5 , can not enter room , 6 unknown error, 7 arg not allow enter , 8 dianmond not enough, 9 can not enter club room;
	MSG_ROOM_CHANGE_STATE,
	// svr : { lastState : 23 , newState : 23 }
	MSG_ROOM_INFO, 
	// svr: { state : 2 , stateInfo : {} , roomID: 23, opts: {} , leftCircle : 2 ,isOpen : 1 , isWaitingDismiss : 0 ,applyDismissUID : 234, agreeIdxs : [2,3,1] ，leftWaitTime : 234, etc }
	// detail info , deponed on sepcail game ;

	MSG_ROOM_SIT_DOWN,   // tell all players , some one sit down ;
	// svr : { idx : 23 , uid : 23 ,isOnline : 0 , chips : 23 ... }  // the same as MSG_ROOM_INFO players item ;
	MSG_PLAYER_SIT_DOWN,
	// client : { idx : 1 } 
	// svr : { ret : 0 , idx : 1 } ;  // ret : 0 success , 1 pos already have players , 2, already in other room , 3, not in room , can not sit down , 4 already sit down , 5 session id error , 6 , unknown error  , 7 not in white list , 8 room open , can not sit down;
	MSG_PLAYER_STAND_UP,
	// client : null ;
	// svr : { ret : 0 } // ret : 0 success , 1 you are not sit down ,
	MSG_ROOM_STAND_UP,   // tell all players some one stand up 
	// svr : { idx : 23 , uid : 234 } 
	MSG_PLAYER_LEAVE_ROOM,
	// client : null 
	// svr : { ret : 0 }; // ret : 0 success , 1 you are not in this room , 2 unknown errro ;
	MSG_ROOM_REFRESH_NET_STATE, // player net state , changed 
	// svr : { idx : 0 , uid : 235 , state : 0  } , 0 is online , 1 lose connect , wait reconnect; 
	MSG_PLAYER_OPEN_ROOM,
	// client : null ;
	// svr: { ret : 0 } // 0 success , 1 you are not owner , 2 you are not in room ;
	MSG_ROOM_DO_OPEN,
	// svr : null ;
	MSG_ROOM_PLAYER_INFO,  // 房间内玩家的玩家信息，是一个数组,这个消息可能会收到多次
	// svr : {  players:[ { idx : 23 , uid : 23 ,isOnline : 0 , chips : 23, state : 23 ...}, ... ]  }

	MSG_APPLY_DISMISS_VIP_ROOM, // 申请解散vip 房间
	// client : { dstRoomID : 234 } 

	MSG_ROOM_APPLY_DISMISS_VIP_ROOM, //房间里有人申请解散vip 房间
	// svr : { applyerIdx : 2 }
	// applyerIdx : 申请者的idx 

	MSG_REPLY_DISSMISS_VIP_ROOM_APPLY,  // 答复申请解散的请求
	// client { dstRoomID : 23 , reply : 0 }
	// reply ： 1 表示同意， 0 表示拒绝。

	MSG_ROOM_REPLY_DISSMISS_VIP_ROOM_APPLY, // 收到有人回复解散房间
	// svr { idx : 23 , reply : 0 }
	// reply ： 1 表示同意， 0 表示拒绝。

	MSG_VIP_ROOM_DO_CLOSED, // vip 房间结束通知
	// svr : { isDismiss : 0 , roomID : 2345 , eType : eroomType }  
	// isDismiss : 是否是解散结束的房间。1 是解散房间，0 是自然结束。

	MSG_ADD_WHILE_LIST,
	// client : { uid : 23 }
	// ret : { ret : 0 , uid : 23 }
	// 0 success , 1 white list is full  ;

	MSG_REMOVE_WHITE_LIST,
	// client : { uid : 23 }
	// svr : { ret : 0 , uid : 23 }
	// ret : 0 success , 1 , uid not in white list ;

	MSG_REQUEST_WHITE_LIST,
	// client : null
	// svr : { list : [ 23, 232,52 ... ] } 

	MSG_ROOM_TEMP_OWNER_UPDATED,
	// svr : { uid : 23 }

	MSG_ROOM_KICK_PLAYER,
	// svr : { uid : 23 , targetUID : 123 }

	MSG_PLAYER_RTI,
	// client : { state : 0/1 }

	MSG_PLAYER_REAL_TIME_INFORMATION,
	// svr : { type : 0, detail : { roomID : 123, uid : 123 ... } }
	// type : as defined
	// detail : follow diffrent with type

	MSG_PLAYER_SET_READY ,   	// player do ready
	// client : { dstRoomID : 2345 } ;
	// svr : { ret : 1 , curState : 23 } // 1 you are not in room , 2 you are not state waitNextGame, tell curState ;
	MSG_ROOM_PLAYER_READY,  // some player did ready
	// svr : { idx : 2 }

	// niuniu msg 
	MSG_ROOM_PRODUCED_BANKER,
	// svr : { bankerIdx : 0, vCandinates : [2 ,3 ]  } 

	MSG_ROOM_START_BET,
	// svr : { players : [ { lastOffset : 0 , canTuiZhuang : 1 }, .... ] } ;

	MSG_PLAYER_DO_BET,
	// client : { betTimes : 2 }
	// svr : { ret: 0 } , ret : 0 success , 1 invalid arguments , 2 you are not in room , 3 already beted, 4 state error  ;
	MSG_ROOM_DO_BET,
	// svr : { idx : 2 , betTimes : 23 }
	MSG_ROOM_START_ROBOT_BANKER,
	// svr : null ;
	MSG_PLAYER_ROBOT_BANKER,
	// client : { robotTimes : 2 }
	// svr : { ret : 0 }  ret : 0 success , 1 invalid arguments , 2 you are not in room , 3 already beted, 4 state error  ;
	MSG_ROOM_ROBOT_BANKER,
	// svr : { idx : 2 , robotTimes : 23 }
	MSG_ROOM_DISTRIBUTE_CARD,
	// svr: { info : [ { idx : 0 , cards : [23,23,42,2] }, ..... ] } // info is a array , per item is a player , idx is player idx , cards is current sended hold cards , may be not 5 ;
	MSG_PLAYER_CACULATE_NIU,
	// client : null ;
	// svr : { ret: 0 } , ret : 0 success , 1 you are not in room , 2 already beted ;
	MSG_ROOM_CACULATE_NIU,
	// svr : { idx : 2  }
	MSG_ROOM_NIUNIU_GAME_END, 
	// svr: { bankerIdx : 2 , result : [ { uid : 23 , offset : 23, final : -23 }, .... ] }
	MSG_ROOM_GAME_OVER,
	// svr : { dismissID : 23 , result: [ { uid : 23 , final : -23 , anGangCnt : 23 , cycloneCnt : 23 , dianPaoCnt : 23 , huCnt : 23 , mingGangCnt : 23 , ZMCnt : 23 , bestCards : 23 , bestChips : 23 , extraTime : 60.2 }, .... ]  }
	// dismissID is null or 0 , means normal dismiss ;
	// dismissID is 1 , means system dismiss room ;
	// dismissID biger than 1 , means player dismiss room ;

	MSG_REQ_ROOM_ITEM_INFO,
	// client : { roomID : 23 }
	// svr : { state : 2 ,isOpen : 0 ,leftRound : 2 , roomID: 23, opts: {} , players: [23,234,23 ..] }

	MSG_NN_PLAYER_UPDATE_TUO_GUAN,
	// client : { isTuoGuan : 0  }
	// svr : { ret : 0 } ;   // 0 success , 1 the same , not change , 2 not in Room , 3 arg error;

	MSG_NN_ROOM_UPDATE_TUO_GUAN,
	// svr : { idx : 0 , isTuoGuan : 0 } 

	MSG_POKER_BJ_BEGIN ,
	
	MSG_ROOM_BJ_START_GAME,
	// svr : { vSelfCard : [23,23,23,2,23] }

	MSG_PLAYER_MAKED_GROUP,
	// client : { vCards : [23,23,23,23,23] } 
	// svr : { ret : 0 }
	// ret : 0 success , 1 you are not in this room ,2 cards not fit , 3 already maked card ;

	MSG_ROOM_BJ_MAKE_GROUP_CARD,
	// svr : { idx : 0 }

	MSG_ROOM_BJ_GAME_END,
	//svr : { players : [ { idx : 23 ,offset : 23 ,xiPaiOffset : 2 , xiPaiTypes : [2,23,23] , tongGuanOffset : 23 ,vGuoInfo : [ { type : 23 , offset : 2 , cards : [23,23,21] }, ..... ]  } , .....    ] } 
	// offset 表示玩家最终的输赢,eXiPaiType 定义了喜牌枚举，如果没有就是eXiPai_Max

	MSG_ROOM_BJ_GAME_OVER,
	// svr : { dismissID : 23 , result: [ { uid : 23 , final : -23, win : 0 , lose : -2 , xiPai : -23  }, .... ]  }
	// dismissID is null or 0 , means normal dismiss ;
	// dismissID is 1 , means system dismiss room ;
	// dismissID biger than 1 , means player dismiss room ;

	MSG_POKER_GAME_MSG_MAX ,
	
	// dou di zhu 
	MSG_DDZ_ROOM_WAIT_ROBOT_DZ,
	// svr: { idx : 2 }

	MSG_DDZ_PLAYER_ROBOT_DZ,
	// client: { times : 0 }
	// svr: { ret : 0 }
	// times ; 0 means do not robot , 1 means one times ;
	// ret : 0 success , 1 you are not in room , 2 argument error , 3 you are not cur act player, 4 times must big than previous player, 5 you must rob banker 

 	MSG_DDZ_ROOM_ROBOT_DZ,  // some player roboted dz ;
	// svr : { times : 0 , idx } 

	MSG_DDZ_ROOM_PRODUCED_DZ,
	// svr: { dzIdx : 2 , times : 2 , cards : [23,23,23] }

	MSG_DDZ_ROOM_WAIT_CHU,
	// svr: { idx : 0 }

	MSG_DDZ_PLAYER_SHOW_CARDS,
	// client : null ;
	// svr : { ret : 0  }
	// 0 success , 1 you aret not banker , 2 already show cards , 3 only can shou cards before chu pai , 4 other code ;

	MSG_DDZ_ROOM_SHOW_CARDS,
	// svr : { idx : 2 , cards: [ 23,23,2,23] }

	MSG_DDZ_PLAYER_CHU,
	// client: { cards: [23,23,2] , type : 23 }
	// svr : { ret : 0 } // 0 success , 1 you don't have card , 2 you can not chu card , weight invalid , 3 you are not in room , 4 argument error, 5 you are not current act player; 
	MSG_DDZ_ROOM_CHU,
	// svr: { cards : [ 23,22,23], type : 23, idx : 2 }
	MSG_DDZ_ROOM_RESULT,
	// svr : { bombCnt : 2 , isChunTian : 0 , isMingPai : 1 , bottom : 2 , players : [ { idx : 2 , offset : -2,cards : [23,23,2] }, ..... ]  } 
	
	MSG_DDZ_PLAYER_UPDATE_TUO_GUAN, 
	// client : { isTuoGuan : 0  }
	// svr : { ret : 0 } ;   // 0 success , 1 the same , not change , 2 not in Room , 3 arg error;

	MSG_DDZ_ROOM_UPDATE_TUO_GUAN,
	// svr : { idx : 0 , isTuoGuan : 0 } 
	
	MSG_DDZ_WAIT_PLAYER_CHAO_ZHUANG,
	// svr: null
	
	MSG_DDZ_PLAYER_CHAO_ZHUANG,
	// client : { isChao : 0 }
	// svr : { ret : 0 } // ret : 0 success , 1 not in room , 2 you can not chao 
	
	MSG_DDZ_ROOM_CHAO_ZHUANG,
	// svr: { idx : 0 , isChao : 0 }
	
	MSG_ROOM_DDZ_START_GAME,
	// svr : { vSelfCard : [23,23,23,2,23] }

	MSG_DDZ_WAIT_PLAYER_TI_LA_CHUAI,
	// svr: { waitTiLaChuaiPlayers : [ 2,2]}

	MSG_DDZ_PLAYER_TI_LA_CHUAI,
	// client : { isTiLaChuai : 0 }
	// svr : { ret : 0 } // ret : 0 success , 1 not in room , 2 you can not TiLaChuai 

	MSG_DDZ_ROOM_TI_LA_CHUAI,
	// svr: { idx : 0 , isTiLaChuai : 0 }

	MSG_DDZ_PLAYER_DOUBLE,
	// svr : {ret : 0} if 0 add {idx : 0} send all
	// svr : {state : 1} //开始加倍触发消息

	MSG_GD_MESSAGE_BEGIN = 1100,

	MSG_GD_CONFIRM_DAJI,

	MSG_GD_WAIT_PAYTRIBUTE,

	MSG_GD_CONFIRM_PAYTRIBUTE,

	MSG_GD_DO_PAYTRIBUTE,

	MSG_GD_WAIT_BACKTRIBUTE,

	MSG_GD_DO_BACKTRIBUTE,

	MSG_DDZ_MAX = 1500,

	    // club msg 
	MSG_CLUB_MSG = 2800,
	MSG_CLUB_CREATE_CLUB,
	// client : { name : "23",opts : {} }
	// svr : { ret : 0 , clubID : 2 } 
	// ret : 0 success , 1 condition is not meet , 2 name duplicate;

	MSG_CLUB_DISMISS_CLUB,
	// client : { clubID : 23 }
	// svr : { ret : 0 }
	// ret : 0 , 1 invalid privilige ,3 still have playing room , can not dissmiss , 4 player is null;

	MSG_CLUB_SET_STATE,
	// client: { clubID : 23 , isPause : 0 }
	// svr : { ret : 0 }
	// ret : 0 success , 1 invalid privilige 

	MSG_CLUB_APPLY_JOIN, 
    // client : { clubID : 23 }
	// svr : { ret : 0 }
	// ret : 0 success , 1 already in club , 2 already applyed , do not apply again , 3 memeber cnt  reach limit , 4 player is null ;
	MSG_CLUB_KICK_PLAYER,
	// client : { clubID : 23 , kickUID : 23 }
	// svr : { ret : 0 }
	// ret : 0 success ,1  kickUID not in club , 2 you are not mangager , 4 you do not login , invalid player 
	MSG_CLUB_PLAYER_LEAVE,
	// client : { clubID : 0 }
	// svr : { ret : 0 }
	// ret : 0 success , 1 you are not in club ,4 you do not login , invalid player  ;
	MSG_CLUB_SET_ROOM_OPTS,
	// client : { clubID : 0 , opts : { }  }
	// svr : { ret :0 }
	// ret : 0 success , 1 privilige too low ,4 you do not login , invalid player  ; .
	// opts : create room opts ;
	MSG_CLUB_UPDATE_PRIVILIGE,
	// client : { clubID : 0 , playerUID : 234 , privilige : eClubPrivilige }
	// svr : { ret : 0 }
	// ret : 0 success , 1 privilige invalid, 2 mgr cnt reach limit ,  3 player not in club , 4 you do not login , invalid player , 5 the same privilige ;
	MSG_CLUB_REQ_EVENTS,
	// client : { clubID : 23, clientMaxEventID : 23, state : eEventState   }
	// svr : { ret : 0 ,pageIdx : 0 , vEvents : [ { eventID : 8 , type : eClubEvent , state : eEventState , time : 23452 ,detail : {} } ] }
	// ret : 0 success , 4 ,you do not login , invalid player , 1 privilige invalid 
	// ps : if vEvents's size less then 10 , means last page ;
	MSG_CLUB_PROCESS_EVENT,
	// client : { clubID : 23 , eventID : 23 ,  detial : {} }
	// svr : { ret : 0 }
	// ret : 0 success , 1 event not exsit , 2 already processed ,3 invalid privilige , 4 you are not login, 5 invalid detail ;
	MSG_CLUB_REQ_INFO,
	// client : { clubID : 23 }
	// svr : {  inviteCnt : 23 , notice : "this is notice" name : 2 , creator : 23, mgrs : [23,23,52], clubID : 23,diamond : 23 , state : 0, curCnt : 23, capacity : 23 , maxEventID : 23 ,opts : {} }
	// state : 0 normal , 1 pause ;
	MSG_CLUB_REQ_ROOMS,
	// client : { clubID : 0 }
	// svr : { clubID : 234, name : 23, fullRooms : [ 23,23,4 ], emptyRooms :  [  23,2, .... ]  }

	MSG_CLUB_REQ_PLAYERS,
	// client : { clubID : 10  }
	// svr : { pageIdx : 0 ,players : [ { uid : 235, privilige : eClubPrivilige  } .... ] } 
	// ret : 0 , players's size < 10 means last page;
	MSG_CLUB_INVITE_JOIN,
	// client : { clubID : 3, invites : [ 23,45,2] }
	// svr : { ret : 0 }
	// ret : 0 , 1 invalid privilige 
	MSG_CLUB_RESPONE_INVITE,
	// client : { clubID : 3 , nIsAgree : 0  }
	// svr : { ret : 0 }
	// ret : 0 success , 1 member cnt reach limit , 2 invitation time out ;
	MSG_CLUB_REQ_INVITATIONS ,
	// client : { clubID : 3 }
	// svr : { ret : 0 , invitations : [ 23,23,42] } ;
	MSG_CLUB_UPDATE_NOTICE,
	// client : { clubID : 23 , notice : "hello hapyy join" }
	// svr : { ret : 0 , notice : "hello" }
	// ret : 0 , 1 invalid privilige
	MSG_CLUB_UPDATE_NAME,
	// client : { clubID : 23 , name : "hello hapyy join" }
	// svr : { ret : 0 , name : "hello" }
	// ret : 0 , 1 invalid privilige , 2 new name is the same as old name , 3 duplicate name 

	MSG_CLUB_CHECK_NAME, // check if the name is duplicate 
	// client : { name : 234 }
	// svr : { ret : 0 } // ret : 0 ok , 1 duplicate 

	MSG_CLUB_UPDATE_DIAMOND, 
	// client : { clubID : 23 }
	// svr : { ret : 0 ,clubID : 23, diamond : 23 }

	MSG_CLUB_SET_PLAYER_INIT_POINTS,
	// client : { clubID : 23 , uid : 23 , points : 23 }
	// svr : { ret : 0 ,clubID : 23 , uid : 23 , points : 23 }
	// ret : 0 success , 1 privilige is invalid , 2 player is not in club , 3 invalid points ;

	MSG_CLUB_RESET_PLAYER_POINTS,
	// client : { clubID : 23 , uid : 23 }
	// svr : { ret : 0 ,clubID : 23 , uid : 23 }
	// ret : 0 success , 1 privilige is invalid , 2 player is not in club ;

	MSG_CLUB_CREATE_PRIVATE_ROOM, //阜新麻将俱乐部玩家自建房间

	MSG_CLUB_PLAYER_APPLY_LEAVE, //阜新麻将玩家申请离开俱乐部

	MSG_CLUB_PLAYER_APPLY_ENTER_ROOM, //阜新麻将玩家申请加入俱乐部房间
	// client : { clubID : 23, uid : 123 }
	// svr : { ret : 0, roomID : 123456 }
	// ret : 0 success, other means faild do not have any room to enter so roomID will default

	MSG_CLUB_PLAYER_RTI, //俱乐部实时消息推送列表更新
	// client : { clubID : 23, uid : 123, state : 0 }
	// state : 0 close, 1 open

	MSG_CLUB_REAL_TIME_INFORMATION, //俱乐部实时消息
	// svr : { type : 0, detail : { roomID : 123, clubID : 123, uid : 123 ... } }
	// type : as defined
	// detail : follow diffrent with type
	TARGET_NEW_CLUB_MESSAGE = 2850, //新增命令号防冲突标记

	MSG_CLUB_ADD_ROOM_OPTS,
	// client : { clubID : 0 , opts : { }  }
	// svr : { ret :0 }
	// ret : 0 success , 1 privilige too low ,4 you do not login , invalid player  3 same opts, 2 opts out of range; .
	// opts : create room opts ;
   
	MSG_CLUB_ERASE_ROOM_OPTS,
	// client : { clubID : 0 , idx = 0  }
	// svr : { ret :0 }
	// ret : 0 success , 1 privilige too low ,4 you do not login , invalid player  3 argument error, 4 erase failed; .
	// opts : erase room opts ;
   
	MSG_CLUB_DISMISS_ROOM,
	// client : { clubID : 0, roomID : 0  }
	// svr : { clubID : 0, roomID : 0, ret : 0 }
   
	MSG_CLUB_FORCE_INVITE_MEMBER,
	// clinet : { clubID : 0, uid : 123 }
	// svr : { clubID : 0, ret : 0 }
	// targetID : self uid
	// ret : 0 success , 1 targetID invalid , 2 targetID invalid , 3 already join , 4 targetID invalid , 5 member limit
   
	MSG_CLUB_SWITCH_MEMBER_CAN_PLAY,
	// client : { clubID : 0, uid : 123 }
	// svr : { clubID : 0, uid : 123, playTime : 0/1, ret : 0 }
	// targetID : self uid
	// ret : 0 success , 1 uid is error , 2 targetID invalid , 3 uid not join , 4 targetID invalid , 5 can not update manger
	// playTime : when the ret is 0 use this parameter . 0 can enter room , 1 can not enter room , > 1 can enter room
	// when ever call this message switch playTime between 0 and 1
   
	MSG_CLUB_UPDATE_MEMBER_REMARK,
	// client : { clubID : 0, uid : 123, remark : "sRemark" }
	// svr : { clubID : 0, uid : 123, remark : "sRemark", ret : 0 }
	// targetID : self uid
	// ret : 0 success , 1 uid is error , 2 targetID invalid , 3 uid not join , 4 targetID invalid , 5 can not update high-level
   
	MSG_CLUB_TRANSFER_CREATOR,
	// client : { clubID : 0, uid : 123 }
	// svr : { clubID : 0, uid : 123, ret : 0 }
	// targetID : self uid
	// ret : 0 success , 1 uid is error , 2 targetID invalid , 3 targetID invalid not creator , 10 uid not join, 11 uid is error, 12 error
	
	MSG_CLUB_MSG_END = 2900,

	// mj specail msg ;
	MSG_PLAYER_WAIT_ACT_ABOUT_OTHER_CARD,  // 有人出了一张牌，等待需要这张牌的玩家 操作，可以 碰，杠，胡
	// svr : { invokerIdx : 2,cardNum : 32 , acts : [type0, type 1 , ..] }  ;
	// 这个消息不会广播，只会发给需要这张牌的玩家，cardNum 待需要的牌，type 类型参照 eMJActType

	MSG_PLAYER_WAIT_ACT_AFTER_RECEIVED_CARD,  // 自己获得一张牌，杠或者摸，然后可以进行的操作 杠，胡
	// svr : { acts : [ {act :eMJActType , cardNum : 23 } , {act :eMJActType , cardNum : 56 }, ... ]  }  ;
	// 这个消息不会广播，只会发给当前操作的玩家，acts： 可操作的数组， 因为获得一张牌，以后可以进行的操作很多。cardNum 操作相对应的牌，type 类型参照 eMJActType

	MSG_PLAYER_ACT, // 玩家操作
	// client : { dstRoomID : 2345 ,actType : 0 , card : 23 , eatWith : [22,33] }
	// actType : eMJActType   操作类型，参照枚举值, card 操作的目标牌。eatWith: 当动作类型是吃的时候，这个数组里表示要用哪两张牌吃
	// svr : { ret : 0 }
	// ret : 0 操作成功 , 1 没有轮到你操作 , 2 不能执行指定的操作，条件不满足, 3 参数错误 , 4 状态错误 ;

	MSG_ROOM_ACT,  // 房间里有玩家执行了一个操作
	// svr : { idx : 0 , actType : 234, card : 23, gangCard : 12, eatWith : [22,33], huType : 23, fanShu : 23  }
	// idx :  执行操作的那个玩家的索引。 actType : 执行操作的类型，参照枚举值eMJActType 。 card： 操作涉及到的牌  gangCard: 杠牌后 获得的牌;
	// eatWith : 当吃牌的时候，表示用哪两张牌进行吃
	// huType : 胡牌类型，只有是胡的动作才有这个字段；
	// fanShu :  胡牌的时候的翻数，只有胡牌的动作才有这个字段

	MSG_REQ_ACT_LIST,   //玩家重新上线，断线重连 收到roomInfo 后，发送此消息请求玩家操作列表；
	// client : { dstRoomID : 356 } ,
	// svr : { ret : 0 } ;
	// ret : 0 等待你出牌，只能出牌，1 此刻不是你该操作的时候。
	MSG_SET_NEXT_CARD, // send to mj server 
	 //client : {card : 0,dstRoomID : 123465}

	// new request zhan ji 
	MSG_ROOM_SETTLE_DIAN_PAO, //  实结算的 点炮
	//svr : { paoIdx : 234 , isGangPao : 0 , isRobotGang : 0 , huPlayers : [ { idx : 2 , coin : 2345 }, { idx : 2, coin : 234 }, ... ]  }
	// paoIdx : 引跑者的索引， isGangShangPao ： 是否是杠上炮， isRobotGang ： 是否是被抢杠， huPlayer ： 这一炮 引发的所有胡牌这，是一个数组。 { idx ： 胡牌人的索引， coin 胡牌人赢的金币} 

	MSG_ROOM_SETTLE_MING_GANG, // 实结算 明杠 
	// svr :  { invokerIdx : 234 , gangIdx : 234 , gangWin : 2344 }
	// invokerIdx ： 引杠者的索引， gangIdx ： 杠牌这的索引 ， gangWin： 此次杠牌赢的钱；

	MSG_ROOM_SETTLE_AN_GANG, // 实时结算 暗杠 
	//svr： { gangIdx: 234, losers : [{idx: 23, lose : 234 }, .....] }
	// gangIdx : 杠牌者的索引。 losers 此次杠牌输钱的人，数组。 { idx 输钱人的索引， lose  输了多少钱 }

	MSG_ROOM_SETTLE_BU_GANG, // 实际结算 补杠
	// svr : 参数和解释都跟 暗杠一样。

	MSG_ROOM_SETTLE_ZI_MO, // 实时结算 自摸
	// svr ： { ziMoIdx: 234, losers : [{idx: 23, lose : 234 }, .....] }
	// ziMoIdx : 自摸的人的索引。 losers ： 自摸导致别人数钱了。一个数字。 {idx 输钱人的索引， lose ： 输了多少钱 } 

	MSG_PLAYER_DETAIL_BILL_INFOS, // 游戏结束后收到的个人详细账单，每个人只能收到自己的。
	// svr ： { idx： 23 ， bills：[ { type: 234, offset : -23, huType : 23, beiShu : 234, target : [2, 4] } , .......... ] } 
	// idx : 玩家的索引。
	// bills : 玩家的账单数组，直接可以用于显示。 账单有多条。
	// 账单内解释： type ： 取值参考枚举 eSettleType ， offset ： 这个账单的输赢，负数表示输了， 结合type 得出描述，比如：Type 为点炮，正数就是被点炮，负数就是点炮，
	// 同理当type 是自摸的时候，如果offset 为负数，那么就是被自摸，整数就是自摸。依次类推其他类型。
	// huType : 只有当是自摸的时候有效，表示自摸的胡类型，或者被点炮 这个字段也是有效的。beiShu ：就是胡牌的倍数，有效性随同　ｈｕＴｙｐｅ。 
	// target : 就是自己这个账单 相对的一方， 就是赢了哪些人的钱，或者输给谁了。被谁自摸了，被谁点炮了，点炮了谁。具体到客户端表现，就是最右边那个 上家下家，之类的那一列。

	MSG_ROOM_PLAYER_CARD_INFO,
	// svr : { idx : 2, queType: 2, anPai : [2,3,4,34], mingPai : [ 23,67,32] , huPai : [1,34], chuPai: [2,34,4] },{ anPai : [2,3,4,34], mingPai : [ 23,67,32], anGangPai : [23,24] , huPai : [1,34] }
	//  anPai 就是牌，没有展示出来的，mingPai 就是已经展示出来的牌（碰，杠），huPai ： 已经胡了的牌。 queType : 1,万 2, 筒 3, 条
	// anGangPai : 就是安杠的牌，单张，不是4张。比如 暗杠8万，那么就是一个8万，也不是4个8万。

	// NanJing ma jiang :
	// svr: { idx : 2 , newMoCard : 2, anPai : [2,3,4,34] , chuPai: [2,34,4] , huaPai: [23,23,23] , anGangPai : [23,24],buGang : [23,45] ,pengGangInfo : [ { targetIdx : 23 , actType : 23 , card : 23 } , .... ]  }
	// idx ： 玩家索引,  anPai 就是牌，没有展示出来的, chuPai ： 就是已经出了的牌。buGang : 补杠的牌
	// newMoCard : 最新摸的牌，可能是杠 或者 摸牌
	// pengGangInfo: 杠牌和碰牌的数组。{ targetIdx ： 23， actType ： 23 ， card ： 234 } 分别是： 触发动作的索引，actType ， 就是碰了 还是杠了，card 就是哪张牌；

	// SuZhou ma jiang
	// svr: { idx : 2 , newMoCard : 2, anPai : [2,3,4,34] , chuPai: [2,34,4] , huaPai: [23,23,23] , anGangPai : [23,24],buGang : [23,45], pengCard : [23,45] }
	// idx ： 玩家索引,  anPai 就是牌，没有展示出来的, chuPai ： 就是已经出了的牌。buGang : 补杠的牌, pengCard: 碰的牌
	// newMoCard : 最新摸的牌，可能是杠 或者 摸牌

	MSG_MJ_ROOM_INFO,  // 房间的基本信息
	// svr : { roomID ： 23 , configID : 23 , waitTimer : 23, bankerIdx : 0 , curActIdex : 2 , leftCardCnt : 23 , roomState :  23 , players : [ {idx : 0 , uid : 233, coin : 2345 , state : 34, isOnline : 0  }, {idx : 0 , uid : 233, coin : 2345, state : 34, isOnline : 0 },{idx : 0 , uid : 233, coin : 2345 , state : 34,isOnline : 0 } , ... ] }
	// roomState  , 房间状态
	// isOnline : 玩家是在线 ， 1 是在线， 0 是不在线
	// leftCardCnt : 剩余牌的数量，重新进入已经在玩的房间，或者断线重连，就会收到这个消息，
	// bankerIdx : 庄家的索引
	// curActIdx :  当前正在等待操作的玩家

	

	MSG_VIP_ROOM_CLOSED,
	// { uid : 2345 , roomID : 2345 , eType : eroomType } 

	MSG_ROOM_PLAYER_ENTER, // 有其他玩家进入房间
	// svr : {idx : 0 , uid : 233, coin : 2345,state : 34 }

	MSG_ROOM_PLAYER_LEAVE, // 有玩家离开房间;
	// svr : { idx : 2 ,isExit : 0 }
	// isExit : 是否是离开，还是真的退出。 1 是真的退出 。一定要判断 isExit 这个值是存在，并且是值为 1 。

	MSG_ROOM_NJ_PLAYER_HU, // 南京麻将玩家胡牌 
	// svr : { isZiMo : 0 , detail : {}, realTimeCal : [ { actType : 23, detial : [ {idx : 2, offset : -23 } ]  } , ... ] }
	//  当是自摸的时候，isZiMo : 1 , detail = { huIdx : 234 , isKuaiZhaoHu : 0, baoPaiIdx : 2 , winCoin : 234,huardSoftHua : 23, gangKaiCoin : 0 ,vhuTypes : [ eFanxing , ], LoseIdxs : [ {idx : 1 , loseCoin : 234 }, .... ]   }
	// 当不是自摸的时候，isZiMo : 0 , detail = { dianPaoIdx : 23 , isRobotGang : 0 , nLose : 23, nWaiBaoLose : 23 huPlayers : [{ idx : 234 , win : 234 , baoPaiIdx : 2  , isKuaiZhaoHu : 0, huardSoftHua : 23, vhuTypes : [ eFanxing , ] } , .... ] } 
	//	isKuaiZhaoHu : 是否是快照胡牌
	// huPlayers : json 数组包含子类型，表示胡牌玩家的数组，一炮多响，有多个胡牌玩家 
	// 胡牌子类型: idx :胡牌玩家的idx ， huardSoftHua : 花数量，offset ：胡牌玩家赢的钱，gangFlag ，胡牌玩家是否是杠开， vhuTypes 是一个数组，表示胡牌时候的 各种翻型叠加, baoPaiIdx : 包牌者的索引，只有包牌情况，才有这个key值，引用钱要判断
	// invokerIdx : 点炮者的UID,  InvokerGangFlag : 放炮者 是不是被抢杠。 当自摸的时候，这个idx 和 胡牌的玩家是一样的。
	// realTimeCal :实时结算的信息 是一个数组 包含每一次的子类型详情；
	// 实时结算子类型是：actType 是什么类型时间导致的结算，参考eMJActType， detial： 也是一个数组 表示，这次结算每个玩家的输赢，idx 玩家的索引，offset，表示加钱 还是减钱，正负表示。

	MSG_ROOM_NJ_GAME_OVER, // 南京麻将结束
	// svr: { isLiuJu : 0 , isNextBiXiaHu : 0 , detail : [ {idx : 0 , offset : 23, waiBaoOffset : 234 }, ...  ], realTimeCal : [ { actType : 23, detial : [ {idx : 2, offset : -23 } ]  } , ... ] } 
	// svr : isLiuJu : 是否是流局
	// detail : 数组就是每个玩家的本局的最终输赢 ；
	// realTimeCal : 实时结算信息，只有流局的情况才存在这个字段；
	// isNextBiXiaHu : 下一局是否要比下胡

	MSG_ROOM_NJ_REAL_TIME_SETTLE, // 南京麻将实时结算
	// svr : {  actType : 0 , winers : [ {idx : 2, offset : 23}, .... ] , loserIdxs : [ {idx : 2 , offset : 23} , ... ]  } } 
	// actType 此次结算的原因是什么，参考eMJActType ;
	// winers : 所有赢钱人的数组 ， { 赢钱人的索引， 赢了多少钱 }
	// loserIdxs : 所有输钱人的数组， { 输钱的索引， 输了多少钱 } 

	MSG_REQ_MJ_ROOM_BILL_INFO,  // 请求vip 房间的账单, 此消息发往麻将游戏服务器；
	// client : { sieral : 2345 }
	// svr : { ret : 0 , sieral : 234, billTime : 23453, roomID : 235, roomType : eRoomType , creatorUID : 345 , circle： 8 ，initCoin : 2345 , detail : [  { uid : 2345 , curCoin : 234, ziMoCnt : 2 , huCnt : 23,dianPaoCnt :2, mingGangCnt : 23,AnGangCnt : 23  }, ....]  } 
	// ret : 0 成功，1 账单id不存在，billID, 账单ID， billTime ： 账单产生的时间, roomID : 房间ID ， roomType 房间类型eRoomType， creatorUID 创建者的ID，circle 房间的圈数，initCoin ： 初始金币，detail : 每个人的输赢详情 json数组
	// uid : 玩家的uid，curCoin 结束时剩余钱；

	// su zhou ma jiang
	MSG_ROOM_SZ_PLAYER_HU, // 苏州麻将玩家胡牌 
   // svr : { isZiMo : 0 ,isFanBei : 0 , detail : {} }
   //  当是自摸的时候，isZiMo : 1 , detail = { huIdx : 234 , winCoin : 234,huHuaCnt : 23,holdHuaCnt : 0, isGangKai :0 , invokerGangIdx : 0, vhuTypes : [ eFanxing , ] }
   // 当不是自摸的时候，isZiMo : 0 , detail = { dianPaoIdx : 23 , isRobotGang : 0 , nLose : 23, huPlayers : [{ idx : 234 , win : 234 , huHuaCnt : 23,holdHuaCnt : 0, vhuTypes : [ eFanxing , ] } , .... ] } 
   // huPlayers : json 数组包含子类型，表示胡牌玩家的数组，一炮多响，有多个胡牌玩家 
   // 胡牌子类型: idx :胡牌玩家的idx ， huaCnt : 花数量，offset ：胡牌玩家赢的钱，isGangKai ，胡牌玩家是否是杠开， vhuTypes 是一个数组，表示胡牌时候的 各种翻型叠加,
   // invokerGangIdx : 引杠者的索引，当明杠，直杠才有这个key值,暗杠的时候这个就是胡牌者自己

	MSG_ROOM_SZ_GAME_OVER, // 苏州麻将结束
	// svr: { isLiuJu : 0 , isNextFanBei : 0 , detail : [ {idx : 0 , offset : 23 }, ...  ] } 
   // svr : isLiuJu : 是否是流局
	// detail : 数组就是每个玩家的本局的最终输赢 ；
	// isNextFanBei : 下一局是否要翻倍

	MSG_ROOM_UPDATE_PLAYER_NET_STATE, // 更新房间内玩家的在线状态
	// svr : { idx : 0 , isOnLine : 0 } // isOnline 0 不在线，1 在线 。  

	MSG_REQ_ZHAN_JI, // send to mj server 
	// client : { userUID : 234 , curSerial : 2345 }
	// svr : { nRet : 0 ,sieral : 2345 ,cirleCnt : 2, roomID : 235 , createrUID : 234, roomOpts : {} , rounds : [ { replayID : 234, time : 234 , result : [ { uid :234， offset ： 234  }, ... ]  }, .... ]    } 
	//	nRet: 0 成功， 1 找不到战绩, 2 uid 不没参与制定战绩房间
	// userUID : 请求者的Uid ， curSerial ： 客户端当前的 的序列号，返回的 战绩从这个序列号开始
	// sieral : 当前返回战绩的房间序列号，roomOpts ： 不同的游戏参数不一样，
	// cirleCnt ： 圈数 或者 局数
	//  rounds ： 每一局的战绩详情数组，数组内 replayID 回放ID， time 结束时间，result： 每个玩家的输赢记录数组，{ 玩家id ， 玩家输赢} 

	// 当南京麻将的时候，opts ： { isBiXiaHu : 0 , isHuaZa : 0 , isKuaiChong : 0 , kuaiChongPool : 234 , isJinYuanZi : 0 , yuanZi : 200 }
	// 每个局 每个玩家的输赢 多一个 特殊的key值较 waiBaoOffset : 表示外包输赢； 

	MSG_CHANGE_BAOPAI_CARD,
	// svr: {idx : 0,card : 0}
	//card : 0是取消，其它的是包牌的card

	MSG_ROOM_GOLDEN_BEGIN = 1700, //三张命令号开始标识

	MSG_ROOM_GOLDEN_GAME_END, //三张游戏结束消息
	// svr: { bankerIdx : 2 , result : [ { uid : 23 , offset : 23, final : -23 }, .... ] }

	MSG_ROOM_GOLDEN_GAME_WAIT_ACT, //三张发送玩家操作列表消息
	// sur: { acts : { act ： 1 , info : 1 } , { act : 2 , info : 1 } ... }

	MSG_ROOM_GOLDEN_GAME_PASS, //三张玩家弃牌
	// sur : { ret : 0 }  0, 成功; 1, 玩家为空.

	MSG_ROOM_GOLDEN_GAME_CALL, //三张玩家跟注
	// sur : { ret : 0 , idx : 1 , coin : 10 , (mutiple : 1)//只有在加注时会发 }

	MSG_ROOM_GOLDEN_GAME_CALL2END, //三张玩家更改一跟到底
	// sur : { ret : 0, call2end : 1 }

	MSG_ROOM_GOLDEN_GAME_LOOK_CARDS, //三张看牌
	// sur : { ret : 0, (idx : 1)//群发用于其他玩家知晓, (cards : { 23 , 24, 25 })//用于发送给看牌的玩家知晓 } 当失败时只给要求看牌玩家发失败信息(只有ret)

	MSG_ROOM_GOLDEN_GAME_PK, //三张比牌
	// sur : { ret : 0, idx : 1, withIdx : 2, result : 1 }
	// result : 1, 胜利; 0, 失败

	MSG_ROOM_GOLDEN_GAME_END_PK, //三张最终PK
	// sur : { participate : { 1 , 2, 3 } , lose : { 2 , 3 } }
	// participate : 参与者
	// lose : 输的人

	MSG_ROOM_GOLDEN_GAME_CANCLE_TRUSTEE, //三张取消托管
	// sur : { ret : 0}

	MSG_ROOM_GOLDEN_GAME_UPDATE_TRUSTEE, //三张托管状态变化
	// sur : { idx : 1 , state : 1 }
	// state : 0, 取消托管  1, 托管

	MSG_ROOM_GOLDEN_END = 1900, //三张命令号结束标识



	MSG_ROOM_SICHUAN_MAJIANG_BEGIN = 2000, //四川麻将命令号开始标记

	MSG_ROOM_SCMJ_GAME_END, //四川麻将游戏结束
	// realTimeCal : { { actType : 1, detial : { {idx : 0, offset : 1} , {idx : 1, offset : -1} ... }, (msg : { ...as hu message }) } , {} ... }
	// players : { { idx : 0, offset : 10, chips : 10, holdCard : { 12, 23 ,... } }, {}... }

	MSG_ROOM_SCMJ_PLAYER_HU, //四川麻将胡

	MSG_ROOM_SCMJ_PLAYER_EXCHANGE_CARDS, //四川麻将换三张

	MSG_ROOM_SCMJ_PLAYER_DECIDE_MISS, //四川麻将定缺

	MSG_ROOM_SCMJ_GAME_START, //四川麻将开始游戏消息

	MSG_ROOM_SICHUAN_MAJIANG_END = 2100, //四川麻将命令号结束标识


	MSG_ROOM_MOQI_MAJIANG_BEGIN = 2200, //莫旗麻将命令号开始标记

	MSG_ROOM_MQMJ_GAME_START, //莫旗麻将游戏开始消息

	MSG_ROOM_MQMJ_PLAYER_HU, //莫旗麻将胡
	//{ isZiMo : 0/1, huCard : 23, detail : {...} }
	//detail胡 : { dianPaoIdx : 1, huPlayers : { { idx : 0, vhuTypes : { 1,2... } }, { }... }  }
	//detail自摸 : { huIdx : 0, vhuTypes : { 1,2,... } }

	MSG_ROOM_MQMJ_WAIT_ACT_AFTER_CP, //莫旗麻将吃碰后等待玩家操作

	MSG_ROOM_FXMJ_PLAYER_TING,

	MSG_ROOM_FXMJ_WAIT_GANG_TING, //阜新麻将等待玩家杠后是否听牌

	MSG_ROOM_FXMJ_DO_GANG_TING, //阜新麻将玩家选择杠听操作结果

	MSGNU_CLUB_CREATE_PRIVATE_ROOM, //阜新麻将俱乐部玩家自建房间

	MSG_ROOM_FXMJ_PLAYER_ONFOLLOW, //阜新麻将玩家打牌跟庄

	MSG_ROOM_FXMJ_REAL_TIME_CELL, //阜新麻将实时结算

	MSG_ROOM_PLAYER_EXCHANGE_SEAT, //麻将玩家重新分配位置
	//{detail : { {uid : 123, idx : 0}, {}, ...} }

	MSG_ROOM_PLAYER_WAIT_IDX, //麻将发送等待玩家索引

	MSGNU_CLUB_PLAYER_APPLY_LEAVE, //阜新麻将玩家申请离开俱乐部

	MSG_GET_SHARE_PRIZE, //分享送钻
	// sur : {diamond : 0, sharetimes : 0}

	MSG_PLAYER_REFRESH_GATE_IP, //刷新gateIP

	MSG_ROOM_CHIFENG_MAJIANG_BEGIN = 2300, //赤峰麻将命令号开始标识

	MSG_ROOM_CF_GUA_PU, //赤峰麻将挂铺消息
	// svr : {races : { 0, 2, 4 }}

	MSG_PLAYER_DO_GUA_PU, //赤峰麻将挂铺消息
	// client : {race : 0}
	// svr : {ret : 0, idx : 0, race : 0}

	MSG_ROOM_CFMJ_GAME_WILL_START, //赤峰麻将游戏对铺之前的消息
	// svr : {leftCircle : 1, bankerIdx : 0}
};
