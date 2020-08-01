import { ActedCards } from './../mjData/MJPlayerCardData';
import { eFanxingMJ } from './../mjData/MJDefine';
import { IFanxing } from './IFanxing';
export class FanxingDaDiaoChe implements IFanxing
{
    getType() : eFanxingMJ 
    {
        return eFanxingMJ.eDaDiaoChe ;
    }

    checking( holds : number[] , vActed : ActedCards[] ) : boolean 
    {
        return holds.length == 2 ;
    }
}