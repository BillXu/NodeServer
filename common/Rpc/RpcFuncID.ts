export enum eRpcFuncID
{
    Func_ExcuteSql, 
    // arg : { sql : string } , // can not contain user input values ; 
    // result : { ret : 0 , errMsg : "", result : {} }  
    Func_InformPlayerNetState,
    // arg : { uid : 244 , state : ePlayerNetState, ip : string } // only online state have ip key ;
    Func_Register,
    // arg : { account : "dfagadf" , type : eAccountType , nickeName : "name" , headIconUrl : "http://www.baidu.com" ,sex : eSex, ip : "192.168.1.35" } 
    // result : { ret : 0 , uid : 233 } 
    // ret : 0 success , 1 duplicate account ;
    Func_Login,
    // arg : { account : "dfagadf" , type : eAccountType } 
    // result: { ret : 0 , uid : 233 }
    // ret : 0 success , 1 account not exsit ;
    Func_DoLogin,
    // arg: { uid : 22, sessionID : 234, ip : "192.168.1.12"  } 
    Func_OtherLogin,
    // arg : { sessionID : 234 , uid : 234 } 
    Func_LoadPlayerInfo,
    // arg : { uid : 2345 }
    // result : {  key : value } , key means table fialed ;  , if ObjectKeys() return length is 0 , means failed
    Func_Max,
}