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
        let vMaked : number[] = this.makeCard();
        if ( vMaked != null && vMaked.length > 0 )
        {
            XLogger.warn( "do make card take effect ") ;
            for ( let n of vMaked )
            {
                let idx = this.vCards.indexOf(n) ;
                if ( idx == -1 )
                {
                    XLogger.error( "delete card failed ? make card why card = " + n ) ;
                    continue ;
                }
                this.vCards.splice(idx,1) ;
            }
    
            this.vCards = vMaked.concat(this.vCards) ;
        }
    }

    makeCard() : number[]
    {
        let vHold = [] ;
        // vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Feng, 1) ) ;
        // vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Feng, 1) ) ;
        // vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Feng, 1) ) ;
        // vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Feng, 1) ) ;

        // vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Feng, 2) ) ;
        // vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Feng, 2) ) ;
        // vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Feng, 2) ) ;

        // vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Feng, 3) ) ;
        // vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Feng, 3) ) ;

        // let v = MJCardData.makeCardNum( eMJCardType.eCT_Tong, 1) ;
        // vHold = vHold.concat([65,65,65,65,66,66,66,67,67,21,v,49,50]) ;
        // vHold = vHold.concat([39,41,24,50,24,18,38,22,38,v,v,52,25]) ;
        // vHold = vHold.concat([19,57,21,68,54,41,37,38,v,54,36,54,25]) ;
        // vHold = vHold.concat([33,40,19,18,34,56,56,34,19,55,51,49,22]) ;

        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 1) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 2) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 3) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 4) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 5) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 6) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 7) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 8) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 9) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 1) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 2) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tong, 3) ) ;
        vHold.push( MJCardData.makeCardNum( eMJCardType.eCT_Tiao, 3) ) ;
        return vHold ;
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

    pushCardToFront( card : number )
    {
        let idx = this.vCards.indexOf(card) ;
        if ( idx == 0 )
        {
            return ;
        }
        else if ( -1 == idx )
        {
            XLogger.warn( "do not have card to push front card = " + card ) ;
            return ;
        }

        let card0 = this.vCards[0] ;
        this.vCards[0] = card ;
        this.vCards[idx] = card0 ;
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