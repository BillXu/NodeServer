import { ActedCards } from './../mjData/MJPlayerCardData';
import { eFanxingMJ } from './../mjData/MJDefine';
export interface IFanxing
{
    getType() : eFanxingMJ ;
    checking( holds : number[] , vActed : ActedCards[] ) : boolean ;
}