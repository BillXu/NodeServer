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
    eMatch_Stoped,  // did not open during some time ; 
    eMatch_WaitOpenSignUp,
    eMatch_SignUp,
    eMatch_Playing,
    eMatch_Closed,
    eMatch_Max,
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
    static TIME_MJ_WAIT_ACT : number = 100000 ;
    static TIME_MJ_WAIT_ACT_TUOGUAN : number = 300000 ; 
}