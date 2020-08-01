import { MJCardData } from './../mjData/MJCardData';
import { ActedCards } from './../mjData/MJPlayerCardData';
import { eFanxingMJ } from './../mjData/MJDefine';
import { IFanxing } from './IFanxing';
export class FanxingQingYiSe implements IFanxing
{
    getType() : eFanxingMJ 
    {
        return eFanxingMJ.eQingYiSe ;
    }

    checking( holds : number[] , vActed : ActedCards[] ) : boolean 
    {
        let type = -1 ;
        for ( let v of holds )
        {
            let t = MJCardData.parseCardType(v) ;
            if ( type == -1 )
            {
                type = t ;
                continue ;
            }

            if ( type != t )
            {
                return false ;
            }
        }

        // check acted cards 
        for ( let act of vActed )
        {
            let t = MJCardData.parseCardType(act.card) ;
            if ( type != t )
            {
                return false ;
            }
        }

        return true ;
    }
}