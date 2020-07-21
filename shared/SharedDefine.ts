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
    eMail_Popup,
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