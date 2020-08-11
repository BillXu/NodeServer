import { MJPlayerCardData } from './../mjData/MJPlayerCardData';
import { key } from './../KeyDefine';
import { MJPlayerData } from './../mjData/MJPlayerData';
import { MJPlayerCardDataSH } from './MJPlayerCardDataSH';
import { HuChecker } from '../mjData/HuChecker';
export class MJPlayerDataSH extends MJPlayerData
{
    isTing : boolean = false ;
    justChuCard : number = 0 ;  // can not eat or peng self chu this round ;

    get huaCnt() : number
    {
        return ( this.cardData as MJPlayerCardDataSH ).huaCnt ; 
    }

    toJson() : Object
    {
        let js = super.toJson();
        js[key.isTing] = this.isTing ? 1 : 0;
        js[key.justChu] = this.justChuCard;
        js[key.huaCnt] = this.huaCnt ;
        return js ;
    }

    parse( js : Object )
    {
        super.parse(js) ;
        this.isTing = js[key.isTing] == 1 ;
        this.justChuCard = js[key.justChu] || 0 ;
    }

    createMJPlayerCardData() : MJPlayerCardData
    {
        return new MJPlayerCardDataSH() ;
    }

    onGameStart()
    {
        super.onGameStart() ;
        this.isTing = false ;
        this.vLouPeng.length = 0 ;
        this.justChuCard = 0 ;
    }

    onChu( card : number ) : boolean
    {
        if ( this.isTing && card != this.cardData.justMoCard && this.cardData.mHoldCards[0] != 0 ) // client other ;
        {
            console.error( "player already ting , so only can chu just mo card , uid = " + this.uid );
            return false ;
        }

        if ( super.onChu(card) )
        {
            this.justChuCard = card ;
            return true ;
        }
        return false ;
    }

    onTing( chuedCard : number ) : void
    {
        this.isTing = true ;
        (this.cardData as MJPlayerCardDataSH).tingChu = chuedCard ;
    }
    
    getMayBeTingCards() : number[]
    {
        return HuChecker.getInstance().getTingCards(this.cardData.mHoldCards) ;
    }

    canHuWithCard( card : number , isZiMo : boolean ) : boolean
    {
        if ( this.isTing == false )
        {
            return false ;
        }
        return super.canHuWithCard(card, isZiMo ) ;
    }

    canChi( card : number, eatWith? : number[] ) : boolean
    {
        if ( this.justChuCard == card || this.isTing )
        {
            return false ;
        }
        return super.canChi(card, eatWith) ;
    }

    canPeng(card : number ) : boolean
    {
        if ( this.justChuCard == card || this.isTing )
        {
            return false ;
        }
        return super.canPeng(card) ;
    }

    canMingGang( card : number ) : boolean
    {
        let canGang = super.canMingGang(card) ;
        if ( canGang == false )
        {
            return false ;
        }

        if ( this.isTing == false )
        {
            return canGang ;
        }

        let vhold = [] ;
        vhold = vhold.concat(this.cardData.mHoldCards) ;
        let idx = vhold.indexOf(card) ;
        if ( -1 == idx || vhold.splice(idx,3).length != 3 )
        {
            console.error( "check ming gang , but donot have 3 " ) ;
            return false ;
        }
        let vting = HuChecker.getInstance().getTingCards(vhold) ;
        return vting != null && vting.length > 0 ;
    }

    onBuHua( huas : number[] , newCards : number[] )
    {
        ( this.cardData as MJPlayerCardDataSH).onBuHua( huas , newCards );
    }

    getHoldHuaCards() : number[]
    {
        return ( this.cardData as MJPlayerCardDataSH).getHoldHuaCards();
    }

    getCanAnGangCards() : number[]
    {
        if ( this.isTing )
        {
            return[] ;
        }

        return super.getCanAnGangCards();
    }

    getCanBuGangCards() : number[]
    {
        if ( this.isTing )
        {
            let v = super.getCanBuGangCards();
            if ( v.indexOf(this.cardData.getAutoChuCard()) != -1 )
            {
                return [this.cardData.getAutoChuCard()];
            }
        }

        return super.getCanBuGangCards();
    }

    getLimitCards() : number[]
    {
        return ( this.cardData as MJPlayerCardDataSH).getLimitCards();
    }

    getTotalHuaCnt() : number
    {
        return ( this.cardData as MJPlayerCardDataSH).getTotalHuaCnt();
    }

}