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
    cardData : MJPlayerCardData = null ;

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
        return null ;
    }

}