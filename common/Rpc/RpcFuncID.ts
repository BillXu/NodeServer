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
    Func_MatchReward,
    // arg : { uid : 235 , rankIdx : 2 ,  reward : IItem[] , matchID : 2345, cfgID : 234 , matchName : "adkfja" }
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
    // arg : { deskID : 2 , players : { uid : 234 , sessionID : 234 , score : 234, isRobot : 0 }[] }
    Func_InformDeskResult,
    // arg : { matchID : 234 , lawIdx : 23 , deksID : 2 , players : { uid : 23 , score : 23 }[] }
    Func_MatchUpdatePlayerNetState,
    // arg : { matchID : 234 , uid : 23 , sessionID : 234 , state : ePlayerNetState }
    Func_DeskUpdatePlayerNetState,
    // arg : { deskID : 234 , uid : 23 , sessionID : 234 , state : ePlayerNetState }
    Func_Max,
}