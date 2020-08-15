import { MJPlayerCardData } from './../../shared/mjData/MJPlayerCardData';
import { eMJActType } from './../../shared/mjData/MJDefine';
import { LackInfo } from './PingHuStrategy';
export interface IStrategy
{
    getBestChuCard( vCards : number[] , pfcGetLeftCnt : ( card : number )=>number , limitCards : number[] ) : number
    onDecideActWithOtherCardNew( vHolds : number[], actOpts : eMJActType[], otherCard : number, vEatWith : number[] ) : eMJActType ;
    onDecideActWithSelfCardNew( playerCard : MJPlayerCardData, actOpts : eMJActType[] ) : { act : eMJActType , card : number } 
}