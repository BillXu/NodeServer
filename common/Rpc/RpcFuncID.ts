export enum eRpcFuncID
{
    Func_ExcuteSql, 
    // arg : { sql : string } , // can not contain user input values ; 
    // result : { ret : 0 , errMsg : "", result : {} }  
    Func_InformPlayerNetState,
    // arg : { uid : 244 , state : ePlayerNetState, sessionID : 23 , ip : string } // only online state have ip key ;
    Func_Register,
    // arg : { account : "dfagadf" , type : eAccountType , nickeName : "name" , headIconUrl : "http://www.baidu.com" ,sex : eSex, ip : "192.168.1.35" } 
    // result : { ret : 0 , uid : 233 } 
    // ret : 0 success , 1 duplicate account ;
    Func_Login,
    // arg : { account : "dfagadf" , type : eAccountType } 
    // result: { ret : 0 , uid : 233 }
    // ret : 0 success , 1 account not exsit ,2 account was forbiten ;
    Func_DoLogin,
    // arg: { uid : 22, sessionID : 234, ip : "192.168.1.12"  } 
    Func_OtherLogin,
    // arg : { sessionID : 234 , uid : 234 } 
    Func_LoadPlayerInfo,
    // arg : { uid : 2345 }
    // result : {  key : value } , key means table fialed ;  , if ObjectKeys() return length is 0 , means failed
    Func_SendMail,
    // arg : { uid : 2345 , content : "this is content" , title? : "hello" }
    Func_ReqPlayerPlayingMatch,
    // arg : { uid : 235 , sessionID : 23 }
    // result : { ret : 0 , matchID: number[] }
    // ret : 0 means ok , 1 can not find player with uid , 2 sessionID not equal ;
    Func_SetPlayingMatch,
    // arg { uid : 234 , matchID : 234, isStart : 0  }  // start or end ;
    Func_ReqEnrollMatchFee,
    // arg : { uid : 2345 , sessionID : 23 , fee : IItem , matchID : 23  }
    // result : { ret : 0 }
    // ret : 0 , success , 1 uid error , 2 money not enough ;
    Func_ReturnBackEnrollMatchFee,
    // arg : { uid : 2345, matchID : 323 , fee : IItem ,notice : "descript why this option" }
    Func_CheckUID, // data svr ;
    // arg : { uid : 235, sessionID : 234 }
    // result : { ret : 0 }
    // ret : 0 check pass , 1 cannot find player with uid , 2 check failed ;
    Func_ModifySignedMatch,
    // arg { uid : 234 , matchID : 234 , isAdd : 0 }
    Func_InformNotice,
    // arg : { uid : 234 , notice : "2345" }
    Func_MatchResult,
    // arg : { uid : 235 , rankIdx : 2 , lawIdx : 0 ,  reward : IItem[] , matchID : 2345, cfgID : 234 , isBoLeMode : 0 , matchName : "adkfja" }
    Func_MatchReqRelive,
    // arg : { uid : 23 , fee : IItem , matchID : 23 , cfgID : 234 }
    // result : { ret : 1 }
    // ret : 0 success , 1 money not enough , 3 can not find player ;
    Func_ReturnBackMatchReliveFee,
    // arg : { uid : 2345, matchID : 323 , fee : IItem , cfgID : 234  }
    Func_CreateMatchDesk,
    // arg : { matchID : 234 , lawIdx : 2 , deskCnt : 4 , roundCnt : 2  ,diFen : 23, matchRoundIdx : 0 , matchRoundCnt : 23 }
    // result : { deskIDs : number[] }
    Func_PushPlayersToDesk,
    // arg : { deskID : 2 , players : { uid : 234 , token : 234 , score : 234, isRobot : 0 }[] }
    Func_InformDeskResult,
    // arg : { matchID : 234 , lawIdx : 23 , deksID : 2 , players : { uid : 23 , score : 23 }[] }
    Func_MatchUpdatePlayerNetState,
    // arg : { matchID : 234 , uid : 23 , sessionID : 234 , state : ePlayerNetState }
    Func_DeskUpdatePlayerNetState,
    // arg : { deskID : 234 , uid : 23 , sessionID : 234 , state : ePlayerNetState }
    Func_OnRobotLogin,
    // arg : { uid : 2344 , sessionID : 23 }
    Func_RobotWorkingState,
    // arg: { isJoin : 0 , uid : 234 }
    Func_ReqRobot,
    // arg { matchID : 23 , lawIdx : 23 , cnt : 23 }
    // result { lackCnt : 23 } 
    Func_UpdateCurDeskID,
    // arg { uid : 23 , deskID : 234 , port : eMsgPort , isSet : 0 }
    // arg { ret : 0 }
    // ret : 0 success , 1 already in other deskID ;
    Func_IncreateInvitorCnt,
    // arg : { uid : 23 , beInviterUID : 23 }
    // result : {};
    Func_BeInvited,
    // arg : { uid : 23 , inviterUID : 23 }
    // result {} 
    HttpBegin = 100,

    Http_ReqPlayerInfo,  // port : data
    // arg : { uid : 23 }
    // result : { ... }
    Http_ReqPlayerSimple,  // port : data ;
    // arg : { uid : 23 }
    // result : { ... }
    Http_SetAccountState,    // port : data 
    // arg: { uid : 23 , state : 0 } 
    // result: { ret : 0 }
    Http_BrocastNotice, // port : Gate 
    // arg: { notice : "this is a string" , endTime : 234 , type : 0 }
    // result : { ret : 0 }
    Http_SendMail,   // port : data svr ;
    // arg : { uid : 23 , notice : "232" , items: Item[] }
    // ret : { ret : 0 }
    Http_ReloadPrizeWheelCfg,
    // arg: { null }
    // result: { ret : 0 }
    Http_ModifyItem, // port : data , can be diamond , redbag , honour,
    // arg : { uid : 23 , offset : Item }  // cnt < 0 , means decrease ,
    // result : { ret : 0 , final : Item }
    Http_ReqMatchList, // port : match 
    // arg: { null }
    // result { list : { matchID : 23 , cfgID : 23 }[] }
    Http_ReloadMatchCfg,  // port : match
    // arg { null }
    // ret : { ret : 0 }
    Http_SetMatchState,
    // arg : { matchID : 23 , state : eMatchState }
    // result : { ret : 0 } 
    Http_ReqMatchInfo, // port : match Svr ;
    // arg : { matchID : 234 }
    // result: { openTime : string , signed : { cnt : 243 , players : { uid:23, enrollTime : number }[] } , laws : number[] }
    Http_ReqMatchLawInfo,
    // arg : { matchID : 234 , lawIdx : 2 }
    // result: { roundIdx : 23 , players : { uid : 23 , isRobot : 0  , state : eMatchPlayerState , deskID : 23 , token : 23 , rankIdx : 23 , lastRankIdx : -1 , enrollTime : number, score : 23 }[] }
    Http_ReqDeskInfo,
    // arg : { deskID : 32 }
    // result: { deskInfo : {} , players: {}[] }
    Http_ReqDeskFinish,
    // arg: { deskID : 23 , setScore : { uid : 23 , score : 23 }[] }
    // result : { ret : 0 }
    Http_PutCardToDealFront,
    // arg : { deskID : 23 , card : number }
    // resut : { ret : 0 }
    Http_ReqCenterSvrInfo,
    // arg : { null }
    // result : { svrGroups : {port : eMsgPort , maxCnt : number, vSvr : { idx : 23 , ip : "192.168.1.1", isConnected : 1 }[] }[] } 
    Http_Register,
    // arg : { account : "" , nickeName : "", headIconUrl : "", type : 0 , sex : 0 , ip : "" }
    // ret : { ret : 0 , uid : 2345 , account : "223"  }
    // type : 0 weixin , 1 phone 
    // sex : 0 male , 1 female.
    // ret : 0 means duplicate account , 1 create baseData error ;
    Http_BindInviteCode,
    // arg : { isFirst : 0 , uid : 23 , nickeName : "heello", inviterUID : 234 }
    // ret : { ret : 0 } 
    // isFirst : 1 will send sys prize , 0 not send prize 
    // ret : 0 success , 1 uid not exsit , 2 inviter not exsit , 3 already have inviter ;
    HttpEnd = 500,
    Func_Max,
}