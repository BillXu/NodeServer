import { eMJCardType } from './MJDefine';
export class MJCardData
{
    public static parseCardType( nCardNum : number  ) : eMJCardType
    {
        let nType = nCardNum & 0xF0 ;
        nType = nType >> 4 ;
        let type = <eMJCardType>nType ;
        if ( ( type < eMJCardType.eCT_Max && type > eMJCardType.eCT_None) == false )
        {
             console.error("parse card type error , cardnum = " + nCardNum) ;
        }
 
        return type ;
    }
 
    public static parseCardValue( nCardNumer : number ) : number
    {
        return  (nCardNumer & 0xF) ;
    }
 
    public static makeCardNum( type : eMJCardType , val : number ) : number
    {
        return (type << 4) | val ;
    }
}