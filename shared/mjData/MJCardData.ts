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

    public static getCardStr( card : number ) : string 
    {
        let vTs = ["none","万","筒","条"] ; 
        let type = MJCardData.parseCardType(card) ;
        let value = MJCardData.parseCardValue(card) ;
        if ( type < eMJCardType.eCT_Feng )
        {
            return value + vTs[type] ;
        }
        else if ( type == eMJCardType.eCT_Feng )
        {
            switch ( value )
            {
                case 1 : return "东" ;
                case 2 : return "南" ;
                case 3 : return "西" ;
                case 4 : return "北" ;
                default: return "unknown"
            }
        }
        else if ( type == eMJCardType.eCT_Jian )
        {
            switch ( value )
            {
                case 1 : return "中" ;
                case 2 : return "发" ;
                case 3 : return "白" ;
                default: return "unknown"
            }
        }
        else if ( type == eMJCardType.eCT_Hua )
        {
            switch ( value )
            {
                case 1 : return "春" ;
                case 2 : return "夏" ;
                case 3 : return "秋" ;
                case 4 : return "冬" ;
                case 5 : return "梅" ;
                case 6 : return "兰" ;
                case 7 : return "竹" ;
                case 8 : return "菊" ;
                default: return "unknown"
            }
        }
        return "unknownType" ;
    }

    public static printCard( card : number )
    {
        console.log( MJCardData.getCardStr(card) ) ;
    }

    public static printCards( preStr : string , cards : number[] )
    {
        let str = preStr ;
        for ( let c of cards )
        {
            str += this.getCardStr(c) + " ";
        }

        console.log( str ) ;
    }
}