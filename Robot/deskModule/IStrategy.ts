import { MJPlayerCardData } from './../../shared/mjData/MJPlayerCardData';
import { eMJActType } from './../../shared/mjData/MJDefine';
import { LackInfo } from './PingHuStrategy';
export interface IStrategy
{
    getChuCard( vHolds : number[] , limitCards : number[], out : LackInfo ) : number ;
    onDecideActWithOtherCard( vHolds : number[], actOpts : eMJActType[], otherCard : number, vEatWith : number[] ) : eMJActType ;
    onDecideActWithSelfCard( playerCard : MJPlayerCardData, actOpts : eMJActType[] ) : { act : eMJActType , card : number } 
}