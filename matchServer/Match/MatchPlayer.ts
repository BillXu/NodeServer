import { eItemType } from './../../shared/SharedDefine';
export enum eMathPlayerState
{
    eState_SignUp,
    eState_Playing,
    eState_WaitResult,
    eState_Rewarded,
    eState_Lose,
    eState_Max,
};

export class MatchPlayer
{
    uid : number = 0;
    sessionID : number = 0  ;
    state : eMathPlayerState = eMathPlayerState.eState_SignUp ;
    signUpTime : number = 0;  
    scoreRecorder : number[] = [] ;
    stayRoomID : number = 0 ;
    //feeMoney : { moneyType : eItemType , cnt : number } ;
}