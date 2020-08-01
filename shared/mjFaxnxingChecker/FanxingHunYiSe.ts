import { MJCardData } from './../mjData/MJCardData';
import { ActedCards } from './../mjData/MJPlayerCardData';
import { eFanxingMJ, eMJCardType } from './../mjData/MJDefine';
import { IFanxing } from './IFanxing';
export class FanxingHunYiSe implements IFanxing
{
    getType() : eFanxingMJ 
    {
        return eFanxingMJ.eHunYiSe ;
    }

    checking( holds : number[] , vActed : ActedCards[] ) : boolean 
    {
        let notFengType = -1 ;
        let haveFeng = false ;
        for ( let v of holds )
        {
            let t = MJCardData.parseCardType(v) ;
            if ( t == eMJCardType.eCT_Feng )
            {
                haveFeng = true ;
                continue ;
            }

            if ( notFengType == -1 )
            {
                notFengType = t ;
                continue ;
            }

            if ( notFengType != t )
            {
                return false ;
            }
        }

        // check acted cards 
        for ( let act of vActed )
        {
            let t = MJCardData.parseCardType(act.card) ;
            if ( t == eMJCardType.eCT_Feng )
            {
                haveFeng = true ;
                continue ;
            }

            if ( notFengType == -1 )
            {
                notFengType = t ;
                continue ;
            }

            if ( notFengType != t )
            {
                return false ;
            }
        }

        return notFengType != -1 && haveFeng ;
    }
}