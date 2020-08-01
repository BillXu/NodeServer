import { eMJPlayerState } from './../SharedDefine';
import { key } from './../KeyDefine';
import { MJPlayerCardData, ActedCards } from './MJPlayerCardData';
import { IShareData } from './../IShareData';
export class MJPlayerData implements IShareData
{
    nIdx : number = 0 ;
    sessionID : number = 0 ;
    uid : number = 0 ;
    state : eMJPlayerState = eMJPlayerState.eState_Normal ;
    isOnline : boolean = true ;
    score : number = 0 ;
    offset : number = 0 ;
    cardData : MJPlayerCardData = null ;
    vLouPeng : number[] = [] ;
    huCard : number = 0 ;

    init( uid : number , sessionID : number , score : number ,idx? : number )
    {
        this.uid = uid ; this.sessionID = sessionID ;
        this.score = score ;
        this.isOnline = sessionID != 0 ;
        this.state = this.isOnline ? eMJPlayerState.eState_Normal : eMJPlayerState.eState_TuoGuan;
        this.offset = 0 ;
        this.nIdx = idx ;
        this.cardData = this.createMJPlayerCardData();
    }

    toJson() : Object 
    {
        let js = {} ;
        js[key.idx] = this.nIdx ;
        //js[key.sessionID] = this.sessionID ;
        js[key.uid] = this.uid ;
        js[key.score] = this.score ; 
        js[key.state] = this.state ;
        js[key.vLouPeng] = this.vLouPeng ;
        js[key.isOnline ] = this.isOnline ? 1 : 0 ;
        if ( this.cardData != null )
        {
            js[key.cardsData] = this.cardData.toJson();
        }
        return js ;
    }

    parse( js : Object  ) : void 
    {
        this.nIdx = js[key.idx] ;
        //this.sessionID = js[key.sessionID] ;
        this.uid = js[key.uid] ;
        this.score = js[key.score] ;
        this.state = js[key.state] ;
        this.vLouPeng = js[key.vLouPeng] || [] ;
        this.isOnline = js[key.isOnline] == 1 ;
        if ( this.cardData == null )
        {
            this.cardData = this.createMJPlayerCardData();
        }

        if ( js[key.cardsData] != null )
        {
            this.cardData.parse(js[key.cardsData]) ;
        }
    }

    addLouPeng( card : number )
    {
        this.vLouPeng.push(card) ;
    }

    createMJPlayerCardData() : MJPlayerCardData
    {
        return new MJPlayerCardData() ;
    }

    modifyScore( offset : number )
    {
        this.offset += offset ;
        this.score += offset ;
    }

    onGameStart()
    {
        this.offset = 0 ;
        this.cardData.clear();
        this.huCard = 0 ;
        this.vLouPeng.length = 0 ;
    }

    onGameOver() : void
    {
        this.offset = 0 ;
        this.huCard = 0 ;
        this.vLouPeng.length = 0 ;
    }

    onDistributedCard( vCards : number[] ) : void
    {
        if ( this.cardData == null )
        {
            this.cardData = this.createMJPlayerCardData();
        }

        this.cardData.onDistributedCard(vCards) ;
    }

    onMoCard( card : number ) : void
    {
        this.cardData.onMoCard(card) ;
        this.vLouPeng.length = 0 ;
    }

    onChu( card : number ) : boolean
    {
        return this.cardData.onChu(card) ;
    }

    onBuGangDeclare( card : number ) : boolean
    {
        return this.cardData.onBuGangDeclare(card) ;
    }

    onBuGangDone( card : number ) : void
    {
        this.cardData.onBuGangDone(card) ;
    }

    canAnGangWithCard( card : number ) : boolean
    {
        return this.cardData.canAnGangWithCard(card) ;
    }

    onAnGang( card : number ) : void
    {
        this.cardData.onAnGang(card) ;
    }

    canHuWithCard( card : number , isZiMo : boolean ) : boolean
    {
        return this.cardData.canHuWithCard(card, isZiMo) ;
    }

    onHuWithCard( card : number , isZiMo : boolean )
    {
        this.cardData.onHuWithCard(card, isZiMo) ;
        this.huCard = card ;
    }

    canChi( card : number ,eatWith? : number[] ) : boolean
    {
        return this.cardData.canChi(card,eatWith) ;
    }

    onChi( card : number ,eatWith : number[], invokerIdx : number  )
    {
        this.cardData.onChi(card, eatWith,invokerIdx ) ;
    }

    canMingGang( card : number ) : boolean
    {
        return this.cardData.canMingGang(card) ;
    }

    onMingGang( card : number , invokerIdx : number  )
    {
        this.cardData.onMingGang(card,invokerIdx ) ;
    }

    canPeng( card : number ) : boolean
    {
        if ( this.enableLouPeng() && this.vLouPeng.indexOf(card) != -1 )
        {
            return false ;
        }

        return this.cardData.canPeng(card) ;
    }

    onPeng( card : number , invokerIdx : number )
    {
        this.cardData.onPeng(card,invokerIdx ) ;
    }

    getAutoChuCard() : number
    {
        return this.cardData.getAutoChuCard();
    }

    enableLouPeng() : boolean
    {
        return true ;
    }

    getCanBuGangCards() : number[]
    {
        return this.cardData.getCanBuGangCards();
    }

    getCanAnGangCards() : number[]
    {
        return this.cardData.getCanAnGangCards();
    }

    getHoldCards() : number[]
    {
        return this.cardData.mHoldCards ;
    }

    getActedCards() : ActedCards[]
    {
        return this.cardData.vActedCards;
    }

    visitInfoForResult() : Object
    {
        let info = {} ;
        info[key.holdCards] = this.cardData.mHoldCards ;        
        info[key.offset] = this.offset;
        info[key.final] = this.score;
        if ( this.cardData.mHoldCards.length % 3 == 2 && this.huCard != 0 )
        {
            info[key.huCard] = this.huCard ;
        }
        
        return info ;
    }

    visitInfoForDeskInfo( reqPlayerIdx : number ) : Object
    {
        let js = this.toJson();
        if ( reqPlayerIdx != this.nIdx )
        {
            let cards : Object = js[key.cardsData] ;
            if ( cards != null )
            {
                let vhold : number[] = cards[key.holdCards];
                if ( null != vhold )
                {
                    vhold.forEach( (v , idx,va )=>va[idx]=0 ) ;
                }
            }
        }
        return js ;
    }
}