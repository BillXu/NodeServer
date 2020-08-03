import { MJCardData } from './MJCardData';
import { key } from './../KeyDefine';
import { eMJActType, eMJCardType } from './MJDefine';
import { IShareData } from './../IShareData';
import { HuChecker } from './HuChecker';
export class ActedCards implements IShareData
{
    invokerIdx : number = -1 ;
    act : eMJActType = eMJActType.eMJAct_Max ;
    card : number = 0 ;
    eatWith? : number[] ;

    toJson() : Object 
    {
        let js = {} ;
        js[key.act] = this.act ;
        js[key.card] = this.card ;
        js[key.invokerIdx] = this.invokerIdx ;
        if ( this.eatWith != null )
        {
            js[key.eatWith] = this.eatWith ;
        }
        return js ;
    }

    parse( js : Object  ) : void
    {
        this.invokerIdx = js[key.invokerIdx] ;
        this.act = js[key.act] ;
        this.card = js[key.card] ;
        this.eatWith = null ;
        if ( js[key.eatWith] != null )
        {
            this.eatWith = js[key.eatWith] ;
        }
    }
}

export class MJPlayerCardData implements IShareData
{
    mHoldCards : number[] = [] ;
    protected mOutCards : number[] = [] ;
    vActedCards : ActedCards[] = [] ;
    protected nJustMoCard : number = 0 ;
    protected nBuGanging : number = 0 ;
    toJson() : Object 
    {
        let js = {} ;
        js[key.holdCards] = this.mHoldCards;
        js[key.outCards ] = this.mOutCards ;
        let va = [] ;
        for ( let v of this.vActedCards )
        {
            va.push(v.toJson()) ;
        }

        if ( va.length != 0 )
        {
            js[key.vActedCard] = va ;
        }
        js[key.buGangIng ] = this.nBuGanging ;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        this.mHoldCards = js[key.holdCards] ;
        this.mOutCards = js[key.outCards] ;
        this.nBuGanging = js[key.buGangIng] || 0 ;
        let v : Object[] = js[key.vActedCard] ||[];
        if ( v != null && v.length > 0 )
        {
            for ( let va of v )
            {
                let p = new ActedCards();
                p.parse(va) ;
                this.vActedCards.push(p) ;
            }
        }
    }

    get justMoCard() : number
    {
        return this.nJustMoCard ;
    }

    clear()
    {
        this.mHoldCards.length = 0 ;
        this.mOutCards.length = 0 ;
        this.vActedCards.length = 0 ;
        this.nJustMoCard = 0 ;
    }

    onDistributedCard( vCards : number[] ) : void
    {
        this.mHoldCards = vCards ;
        this.mHoldCards.sort((a,b)=>a-b) ;
    }
    
    onMoCard( card : number ) : void
    {
        this.mHoldCards.push(card) ;
        this.mHoldCards.sort((a,b)=>a-b) ;
        this.nJustMoCard = card ;
    }

    onChu( card : number ) : boolean
    {
        if ( this.getCardCnt(card) == 0 )
        {
            return false ;
        }

        this.removeCard(card) ;
        return true ;
    }

    onBuGangDeclare( card : number ) : boolean
    {
        if ( this.getCardCnt(card) != 1 )
        {
            return false ;
        }

        let findPeng = false ;
        for ( let v of this.vActedCards )
        {
            if ( v.card == card && v.act == eMJActType.eMJAct_Peng )
            {
                findPeng = true ;
                break ;
            }
        }

        if ( findPeng == false )
        {
            return false ;
        }

        this.removeCard(card) ;
        this.nBuGanging = card ;
        return true ;
    }

    onBuGangDone( card : number  ) : void
    {
        for ( let v of this.vActedCards )
        {
            if ( v.card == card && v.act == eMJActType.eMJAct_Peng )
            {
                v.act = eMJActType.eMJAct_BuGang_Done;
                break ;
            }
        }

        let acted = new ActedCards() ;
        acted.act = eMJActType.eMJAct_BuGang_Done ;
        acted.card = card ;
        this.vActedCards.push(acted) ;
        this.nBuGanging = 0 ;
    }

    beRobedGang()
    {
        if ( this.nBuGanging != 0 )
        {
            this.nBuGanging = 0 ;
        }
        else
        {
            console.error( "not buGanging , how to be robotedGAng" ) ;
        }
    }

    beEatPengGang( nCard : number )
    {
        if ( this.mOutCards[this.mOutCards.length -1 ] == nCard )
        {
            this.mOutCards.splice(this.mOutCards.length-1,1) ;
        }
        else
        {
            console.error( "do not chu card = " + nCard + " how to be eat peng gang ?" ) ;
        }
    }

    canAnGangWithCard( card : number ) : boolean
    {
        return this.getCardCnt(card) == 4 ;
    }

    onAnGang( card : number ) : void
    {
        this.removeCard(card,4) ;

        let acted = new ActedCards() ;
        acted.act = eMJActType.eMJAct_AnGang ;
        acted.card = card ;
        this.vActedCards.push(acted) ;
    }

    canHuWithCard( card : number , isZiMo : boolean ) : boolean
    {
        let vCheck = [] ;
        vCheck = vCheck.concat(this.mHoldCards) ;
        if ( isZiMo == false )
        {
            vCheck.push(card) ;
        }

        // check 7 pair
        if ( this.vActedCards.length == 0 && this.enable7Pair() )
        {
            vCheck.sort() ;
            let is7Pair = true ;
            for ( let idx = 0 ; ( idx + 1 ) < vCheck.length ; idx +=2 )
            {
                if ( vCheck[idx] != vCheck[idx+1] )
                {
                    is7Pair = false ;
                    break ;
                }
            }

            if ( is7Pair )
            {
                return true ;
            }
        }
        return HuChecker.getInstance().getHuPaiGroup(vCheck, null ) != null;
    }

    onHuWithCard( card : number , isZiMo : boolean )
    {
        if ( isZiMo == false )
        {
            this.onMoCard(card) ;
        }
    } 

    canChi( card : number ,eatWith? : number[] ) : boolean
    {
        let opts = this.getChiOpts(card) ;
        if ( null == opts )
        {
            return false ;
        }

        if ( eatWith == null || eatWith.length == 0 )
        {
            return opts.length > 0 ;
        }

        return opts.indexOf(eatWith[0]) != -1 && opts.indexOf(eatWith[1]) != -1 ;
    }

    getChiOpts( card : number ) : number[]
    {
        let type = MJCardData.parseCardType( card ) ;
        let value = MJCardData.parseCardValue( card ) ;
        if ( type != eMJCardType.eCT_Wan && type != eMJCardType.eCT_Tiao && type != eMJCardType.eCT_Tong )
        {
            return null ;
        }

        // AxB;
        let vOpts = [] ;
        if ( value > 1 && value < 9 )
        {
            let A = card -1 ;
            let B = card + 1 ;
            if ( this.getCardCnt(A) > 0 && this.getCardCnt(B) > 0 )
            {
                vOpts.push(A,B) ;
            }
        }

        // xAB ;
        if ( value <= 7 )
        {
            let A = card + 1 ;
            let B = card + 2 ;
            if ( this.getCardCnt(A) > 0 && this.getCardCnt(B) > 0 )
            {
                vOpts.push(A,B) ;
            }
        }

        // ABx
        if ( value <= 3 )
        {
            let A = card - 1 ;
            let B = card - 2 ;
            if ( this.getCardCnt(A) > 0 && this.getCardCnt(B) > 0 )
            {
                vOpts.push(A,B) ;
            }
        }

        return vOpts ;
    }

    onChi( card : number ,eatWith : number[], invokerIdx : number  )
    {
        this.removeCard(eatWith[0]) ;
        this.removeCard(eatWith[1]) ;

        let acted = new ActedCards();
        acted.act = eMJActType.eMJAct_Chi ;
        acted.card = card ;
        acted.eatWith = eatWith ;
        acted.invokerIdx = invokerIdx ;
        this.vActedCards.push( acted ) ;
    }

    canMingGang( card : number ) : boolean
    {
        return this.getCardCnt(card) >= 3 ;
    }

    onMingGang( card : number , invokerIdx : number  )
    {
        this.removeCard(card,3 ) ;

        let acted = new ActedCards() ;
        acted.act = eMJActType.eMJAct_MingGang ;
        acted.card = card ;
        acted.invokerIdx = invokerIdx ;
        this.vActedCards.push(acted) ;
    }

    canPeng( card : number ) : boolean
    {
        return this.getCardCnt(card) >= 2 ;
    }

    onPeng( card : number, invokerIdx : number  )
    {
        this.removeCard(card,2 ) ;

        let acted = new ActedCards() ;
        acted.act = eMJActType.eMJAct_Peng ;
        acted.card = card ;
        acted.invokerIdx = invokerIdx ;
        this.vActedCards.push(acted) ;
    }

    getAutoChuCard() : number
    {
        if ( this.nJustMoCard > 0 && this.getCardCnt(this.nJustMoCard) > 0 )
        {
            return this.nJustMoCard ;
        }
        else
        {
            this.nJustMoCard = 0 ;
        }

        return this.mHoldCards[0] ;
    }

    getCanBuGangCards() : number[]
    {
        let vout = [] ;
        for ( let v of this.vActedCards )
        {
            if ( v.act != eMJActType.eMJAct_Peng )
            {
                continue ;
            }

            if ( -1 != this.mHoldCards.indexOf(v.card) )
            {
                vout.push(v.card) ;
            } 
        }

        return vout ;
    }

    getCanAnGangCards() : number[]
    {
        this.mHoldCards.sort() ;
        let vout = [] ;
        for ( let idx = 0 ; (idx + 3) < this.mHoldCards.length ; idx += 4 )
        {
            if ( this.mHoldCards[idx] == this.mHoldCards[idx+3] )
            {
                vout.push(this.mHoldCards[idx]) ;
            }
        }
        return vout ;
    }

    protected getCardCnt( card : number ) : number
    {
        let cnt = 0 ;
        for ( let c of this.mHoldCards  )
        {
            if ( c == card )
            {
                ++cnt ;
            }
        }

        return cnt ;
    }

    protected removeCard( card : number , cnt : number = 1 )
    {
        if ( card == this.nJustMoCard )
        {
            this.nJustMoCard = 0 ;
        }

        while ( cnt-- )
        {
            let idx = this.mHoldCards.indexOf(card) ;
            if ( idx == -1 )
            {
                console.error( "do not have enough card to remove card = " + card ) ;
                break ;
            }
            this.mHoldCards.splice(idx,1) ;
        }
    }

    protected enable7Pair() : boolean 
    {
        return true ;
    }
}