import { ActedCards } from './../mjData/MJPlayerCardData';
import { eFanxingMJ, eMJActType } from './../mjData/MJDefine';
import { IFanxing } from './IFanxing';
export class FanxingPengPengHu implements IFanxing
{
    getType() : eFanxingMJ 
    {
        return eFanxingMJ.ePengPengHu ;
    }

    checking( holds : number[] , vActed : ActedCards[] ) : boolean 
    {
        for ( let v of vActed )
        {
            if ( v.act == eMJActType.eMJAct_Chi )
            {
                return  false ;
            }
        }

        let jiang = 0 ;
        for ( let idx = 0 ; idx + 1 < holds.length ; )
        {
            if ( ( idx + 2)  < holds.length && holds[idx+2] == holds[idx] )
            {
                idx += 3 ;
                continue ;
            }

            if ( jiang == 0 && holds[idx+1] == holds[idx] )
            {
                jiang = holds[idx] ;
                idx += 2 ;
                continue ;
            } 

            return false ;
        }

        return true ;
    }
}