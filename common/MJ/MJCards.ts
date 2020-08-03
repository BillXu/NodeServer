import { XLogger } from './../Logger';
import { shuffle } from 'lodash';
import { MJCardData } from './../../shared/mjData/MJCardData';
import { eMJCardType } from '../../shared/mjData/MJDefine';
export class MJCards extends MJCardData
{
    protected vCards : number[] = [] ;
    protected haveWan : boolean = true ;
    protected haveTong : boolean = true ;
    protected haveTiao : boolean = true ;
    protected haveFeng : boolean = true ;
    protected haveJian : boolean = true ;
    protected haveHua : boolean = true ;

    constructor( haveHua : boolean = true , haveFeng : boolean = true, haveJian : boolean = true , haveWan : boolean = true , haveTong : boolean = true , haveTiao : boolean = true )
    {
        super();
        this.haveFeng = haveFeng ;
        this.haveJian = haveJian ;
        this.haveHua = haveHua ;
        this.haveWan = haveWan ;
        this.haveTong = haveTong ;
        this.haveTiao = haveTiao ;
    }

    shuffle()
    {
        this.vCards.length = 0 ;
        for ( let i = 1 ; i <= 9 ; ++i )
        {
            if ( i <= 3 && this.haveJian )
            {
                let v = MJCardData.makeCardNum( eMJCardType.eCT_Jian, i );
                this.vCards.push(v,v,v,v) ;
            }

            if ( i <= 4 && this.haveFeng )
            {
                let v = MJCardData.makeCardNum( eMJCardType.eCT_Feng, i );
                this.vCards.push(v,v,v,v) ;
            }

            if ( i <= 8 && this.haveHua )
            {
                this.vCards.push( MJCardData.makeCardNum( eMJCardType.eCT_Hua, i ) ) ;
            }

            if ( this.haveWan )
            {
                let v = MJCardData.makeCardNum( eMJCardType.eCT_Wan, i );
                this.vCards.push(v,v,v,v) ;
            }

            if ( this.haveTong )
            {
                let v = MJCardData.makeCardNum( eMJCardType.eCT_Tong, i );
                this.vCards.push(v,v,v,v) ;
            }

            if ( this.haveTiao )
            {
                let v = MJCardData.makeCardNum( eMJCardType.eCT_Tiao, i );
                this.vCards.push(v,v,v,v) ;
            }
        }

        this.vCards = shuffle(this.vCards) ;
        XLogger.debug( "after shuffle cardCnt = " + this.vCards.length ) ;
    }

    getCard( dstCard? : number ) : number
    {
        if ( this.vCards.length == 0 )
        {
            return null ;
        }

        if ( null != dstCard )
        {
            let idx = this.vCards.indexOf(dstCard) ;
            if ( idx != -1 )
            {
                this.vCards.splice(idx,1 ) ;
                return dstCard ;
            }
        }

        return this.vCards.shift();
    }

    swapCard( dstCard : number , orgCard : number  ) : boolean
    {
        let idx = this.vCards.indexOf(dstCard) ;
        if ( idx == -1 )
        {
            return false ;
        }
        this.vCards[idx] = orgCard ;
        return true ;
    }

    getLeftCnt() : number
    {
        return this.vCards.length ;
    }
}