export enum eAccountType
{
    eAccount_Wechat,
    eAccount_PhoneNum,
    eAccount_Max,
}

export enum eSex
{
    eSex_Male,
    eSex_Female,
    eSex_Max,
}

export enum eMailType
{
    eMail_OfflineEvent,
    eMail_RpcCall, // { funcID : eRpcFuncID , arg : {} } 
    eMail_DlgNotice,
    eMail_Sys = 100,
    eMial_Normal,
    eMail_SysRefForState, // a refrence to the sys mail that be sended to everyone , the mail of this type record sys mail state , example : if already get the gif 
    eMail_Max,
}

export enum eItemType
{
    eItem_Diamond,
    eItem_ReliveTicket,
    eItem_Honour,
    eItem_RedBag,
    eItem_Money = 20 ,

    eItem_Max,
}

export enum eMatchType
{
    eMatch_Quick,  // reach fix player cnt , then start match ;
    eMatch_FixTime, // match started on fix time ;
    eMatch_RepeatTime, // every one hour start a game ;
    eMatch_Max,
}

export enum eMatchState
{
    eMatch_Enroll,
    eMatch_Playing,
    eMatch_Finished,
    eMatch_Pause,
    eMatch_Delete,
    eMatch_Max,
}

export enum eMathPlayerState
{
    eState_SignUp,
    eState_Matching,
    eState_Playing,
    eState_Promoted,
    eState_Relived,
    eState_WaitOtherFinish,
    eState_Finished,
    eState_Lose,
    eState_Max,
}

export enum eMJDeskState
{
    eState_WaitStart,
    eState_Start,
    eState_WaitAct, // stateInfo : { idx : 23, act : eMJActType }
    eState_WaitOtherAct, // stateInfo : { card : number, act : eMJActType , invokerIdx : number }  // act , maybe emjAct_Chu or emjAct_buGangDeclear
    eState_End,
    eState_Max,
}

export enum eMJPlayerState
{
    eState_Normal,
    eState_TuoGuan,
    eState_Max,
}

export class G_ARG
{
    static TIME_MJ_BU_HUA : number = 0.8 ;
    static TIME_MJ_WAIT_ACT : number = 300 ;
    static TIME_MJ_WAIT_ACT_TUOGUAN : number = 0.9 ; 
    static TIME_MATCH_WAIT_RELIVE : number = 3 ;
    static TIME_QUICK_MATCH_WAIT : number = 4 ;
    static WHEEL_SPIN_DIAMOND : number = 20;
    static WHEEL_FREE_TIME_INTERVAL : number = 60*60*5 ; // 5 hours ; 
}