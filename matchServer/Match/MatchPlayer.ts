import { random } from 'lodash';
import { key } from './../../shared/KeyDefine';
import { eMathPlayerState } from './../../shared/SharedDefine';
export class MatchPlayer
{
    uid : number = 0;
    sessionID : number = 0  ;
    state : eMathPlayerState = eMathPlayerState.eState_SignUp ;
    signUpTime : number = 0;  
    stayDeskID : number = 0 ;
    score : number = 0;
    lastRankIdx : number = -1 ;
    rankIdx : number = -1 ;
    roundIdx : number = 0 ;
    isRobot : boolean = false ;
    token : number = random(10000,false ) + 1000;
    
    onVisitInfo( info : Object ) : void 
    {
        info[key.uid] = this.uid ;
        info[key.state] = this.state;
        info[key.deskID] = this.stayDeskID;
        info[key.token] = this.token ;
        info[key.rankIdx] = this.rankIdx;
        info[key.curRoundIdx] = this.roundIdx;
    }
    //feeMoney : { moneyType : eItemType , cnt : number } ;
}