import { eMJCardType } from './../mjData/MJDefine';
import { MJCardData } from './../mjData/MJCardData';
import { key } from './../KeyDefine';
import { MJPlayerCardData } from './../mjData/MJPlayerCardData';
export class MJPlayerCardDataSH extends MJPlayerCardData
{
    vHuaCard : number[] = [] ;
    vLimitCards : number[] = [] ;
    get huaCnt() : number
    {
        return this.vHuaCard.length;
    }

    toJson() : Object
    {
        let js = super.toJson();
        js[key.vHuaCards] = this.vHuaCard;
        js[key.vLimitCards] = this.vLimitCards ;
        return js ;
    }

    parse(js : Object )
    {
        super.parse(js) ;
        this.vLimitCards = js[key.vLimitCards] || [] ;
        this.vHuaCard = js[key.vHuaCards] || [] ;
    }

    clear()
    {
        super.clear();
        this.vHuaCard.length = 0 ;
        this.vLimitCards.length = 0 ;
    }

    getHoldHuaCards() : number[]
    {
        let v = [] ;
        let hua = MJCardData.makeCardNum( eMJCardType.eCT_Jian, 1 );
        for ( let idx = this.mHoldCards.length -1 ; idx >= 0 ; --idx ) 
        {
            if ( this.mHoldCards[idx] >= hua )
            {
                v.push( this.mHoldCards[idx] ) ;
            }
            else
            {
                break ;  // because holdCards already sort ;
            }
        }

        return v ;
    }

    onBuHua( huas : number[] , newCards : number[] )
    {
        let self = this ;
        huas.forEach((v : number)=>self.removeCard(v) ) ;
        newCards.forEach((v : number)=>self.onMoCard(v) ) ;
    }

    onChi( card : number ,eatWith : number[], invokerIdx : number  )
    {
        super.onChi(card, eatWith, invokerIdx) ;
        eatWith.sort() ;
        let v1 = MJCardData.parseCardValue(eatWith[1]);
        let v0 = MJCardData.parseCardValue(eatWith[0]);
        if ( eatWith[1] - eatWith[0] == 1  )
        {
            if ( v0 > 1 )
            {
                this.vLimitCards.push(eatWith[0] - 1 ) ;
            }
            
            if ( v1 < 9 )
            {
                this.vLimitCards.push(eatWith[1] + 1 ) ;
            }
        }
        else
        {
            this.vLimitCards.push( card ) ;
        }
    }

    onChu( card : number ) : boolean
    {
        if ( this.vLimitCards.length > 0 && this.vLimitCards.indexOf(card) != -1 )
        {
            return false ;
        }

        if ( super.onChu(card) )
        {
            this.vLimitCards.length = 0 ;
            return true ;
        }

        return false ;
    }

    getLimitCards() : number[]
    {
        return this.vLimitCards ;
    }
}