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
    Func_ReqPlayerPlayingMatch,
    // arg : { uid : 235 , sessionID : 23 }
    // result : { ret : 0 , matchID : 0 }
    // ret : 0 means ok , 1 can not find player with uid , 2 sessionID not equal ;
    Func_SetPlayingMatch,
    // arg { uid : 234 , matchID : 234, isStart : 0  }  // start or end ;
    Func_DeductionMoney,
    // arg : { uid : 2345 , sessionID : 23 , moneyType : eItemType , cnt : 234 , comment : "descript why this option" }
    // result : { ret : 0 , moneyType : eItemType , cnt : 234 }
    // ret : 0 , success , 1 uid error , 2 money not enough ;
    Func_addMoney,
    // arg : { uid : 2345, moneyType : eItemType , cnt : 234,comment : "descript why this option" }
    Func_CheckUID, // data svr ;
    // arg : { uid : 235, sessionID : 234 }
    // result : { ret : 0 }
    // ret : 0 check pass , 1 cannot find player with uid , 2 check failed ;
    Func_ModifySignedMatch,
    // arg { uid : 234 , matchID : 234 , isAdd : 0 }
    Func_InformNotice,
    // arg : { uid : 234 , notice : "2345" }
    Func_Max,
}