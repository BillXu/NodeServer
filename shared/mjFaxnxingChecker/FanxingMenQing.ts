import { ActedCards } from './../mjData/MJPlayerCardData';
import { eFanxingMJ, eMJActType } from './../mjData/MJDefine';
import { IFanxing } from './IFanxing';
export class FanxingMenQing implements IFanxing
{
    getType() : eFanxingMJ 
    {
        return eFanxingMJ.eMengQing ;
    }

    checking( holds : number[] , vActed : ActedCards[] ) : boolean 
    {
        for ( let v of vActed )
        {
            if ( v.act != eMJActType.eMJAct_AnGang )
            {
                return false ;
            }
        }

        return true ;
    }
}