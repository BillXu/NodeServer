import { eMJPlayerState } from './../SharedDefine';
import { key } from './../KeyDefine';
import { MJPlayerCardData } from './MJPlayerCardData';
import { IShareData } from './../IShareData';
export class MJPlayerData implements IShareData
{
    nIdx : number = 0 ;
    sessionID : number = 0 ;
    uid : number = 0 ;
    state : eMJPlayerState = eMJPlayerState.eState_Online ;
    score : number = 0 ;
    offset : number = 0 ;
    cardData : MJPlayerCardData = null ;

    init( uid : number , sessionID : number , score : number ,idx? : number )
    {
        this.uid = uid ; this.sessionID = sessionID ;
        this.score = score ;
        this.state = sessionID != 0 ? eMJPlayerState.eState_Online : eMJPlayerState.eState_TuoGuan;
        this.offset = 0 ;
        this.nIdx = idx ;
        this.cardData = this.createMJPlayerCardData();
    }

    toJson() : Object 
    {
        let js = {} ;
        js[key.idx] = this.nIdx ;
        js[key.sessionID] = this.sessionID ;
        js[key.uid] = this.uid ;
        js[key.score] = this.score ; 
        js[key.state] = this.state ;
        if ( this.cardData != null )
        {
            js[key.cardsData] = this.cardData.toJson();
        }
        return js ;
    }

    parse( js : Object  ) : void 
    {
        this.nIdx = js[key.idx] ;
        this.sessionID = js[key.sessionID] ;
        this.uid = js[key.uid] ;
        this.score = js[key.score] ;
        this.state = js[key.state] ;
        if ( this.cardData == null )
        {
            this.cardData = this.createMJPlayerCardData();
        }

        if ( js[key.cardsData] != null )
        {
            this.cardData.parse(js[key.cardsData]) ;
        }
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

    onGameOver() : void
    {
        this.offset = 0 ;
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
    }

    onChu( card : number ) : boolean
    {
        return this.cardData.onChu(card) ;
    }

    onBuGangDeclare( card : number ) : boolean
    {
        return this.cardData.onBuGangDeclare(card) ;
    }

    onBuGangDone( card : number , newCard : number ) : void
    {
        this.cardData.onBuGangDone(card, newCard) ;
    }

    canAnGangWithCard( card : number ) : boolean
    {
        return this.cardData.canAnGangWithCard(card) ;
    }

    onAnGang( card : number , newCard : number ) : void
    {
        this.cardData.onAnGang(card, newCard) ;
    }

    canHuWithCard( card : number , isZiMo : boolean ) : boolean
    {
        return this.cardData.canHuWithCard(card, isZiMo) ;
    }

    onHuWithCard( card : number , isZiMo : boolean )
    {
        this.cardData.onHuWithCard(card, isZiMo) ;
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

    onMingGang( card : number , newCard : number, invokerIdx : number  )
    {
        this.cardData.onMingGang(card, newCard,invokerIdx ) ;
    }

    canPeng( card : number ) : boolean
    {
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

}