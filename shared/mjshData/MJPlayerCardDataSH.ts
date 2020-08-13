import { XLogger } from './../../common/Logger';
import { eMJCardType, eMJActType } from './../mjData/MJDefine';
import { MJCardData } from './../mjData/MJCardData';
import { key } from './../KeyDefine';
import { MJPlayerCardData } from './../mjData/MJPlayerCardData';
export class MJPlayerCardDataSH extends MJPlayerCardData
{
    vHuaCard : number[] = [] ;
    vLimitCards : number[] = [] ;
    tingChu : number = 0 ;
    get huaCnt() : number
    {
        XLogger.debug( "start to caculate hua " ) ;
        let cnt = this.vHuaCard.length ;
        let dong = MJCardData.makeCardNum(eMJCardType.eCT_Feng , 1 ) ;
        for ( let v of this.vActedCards )
        {
            if ( v.act == eMJActType.eMJAct_Peng && v.card >= dong  )
            {
                ++cnt;
                XLogger.debug( "Feng peng + 1 , cnt = " + cnt + " card = " + MJCardData.getCardStr(v.card) ) ;
                continue ;
            }

            if ( v.act == eMJActType.eMJAct_MingGang || v.act == eMJActType.eMJAct_BuGang_Done )
            {
                ++cnt ;
                XLogger.debug( "MingGang + 1 , cnt = " + cnt + " card = " + MJCardData.getCardStr(v.card) ) ;
                if ( v.card >= dong )
                {
                    ++cnt ;
                    XLogger.debug( "feng zai MingGang + 1 , cnt = " + cnt + " card = " + MJCardData.getCardStr(v.card) ) ;
                }
                continue ;
            }

            if ( v.act == eMJActType.eMJAct_AnGang )
            {
                cnt += 2 ;
                XLogger.debug( "AnGang + 2 , cnt = " + cnt + " card = " + MJCardData.getCardStr(v.card) ) ;
                if ( v.card >= dong )
                {
                    ++cnt ;
                    XLogger.debug( "Feng AnGang + 1 , cnt = " + cnt + " card = " + MJCardData.getCardStr(v.card) ) ;
                }
            }
        }
        XLogger.debug( "final hua = " + cnt ) ;
        return cnt;
    }

    toJson() : Object
    {
        let js = super.toJson();
        js[key.vHuaCards] = this.vHuaCard;
        js[key.vLimitCards] = this.vLimitCards ;
        if ( this.tingChu != 0 )
        {
            js[key.tingChu] = this.tingChu ;
        }
        return js ;
    }

    parse(js : Object )
    {
        super.parse(js) ;
        this.vLimitCards = js[key.vLimitCards] || [] ;
        this.vHuaCard = js[key.vHuaCards] || [] ;
        this.tingChu = js[key.tingChu] || 0 ;
    }

    clear()
    {
        super.clear();
        this.vHuaCard.length = 0 ;
        this.vLimitCards.length = 0 ;
        this.tingChu = 0 ;
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
        this.vHuaCard = this.vHuaCard.concat(huas) ;
    }

    onChi( card : number ,eatWith : number[], invokerIdx : number  )
    {
        super.onChi(card, eatWith, invokerIdx) ;
        eatWith.sort( (a,b)=>a-b ); ;
        this.vLimitCards = this.produceLimitCard(card, eatWith).concat(this.vLimitCards) ;
    }

    canChi( card : number ,eatWith? : number[] ) : boolean
    {
        let opts = this.getChiOpts(card) ;
        if ( null == opts || opts.length <= 0 )
        {
            return false ;
        }

        if ( eatWith == null || eatWith.length == 0 )
        {
            for ( let idx = 0 ; (idx + 1 ) < opts.length ; idx += 2 )
            {
                let vew = [ opts[idx],opts[idx+1]] ;
                let vl = this.produceLimitCard(card, vew) ;
                let notInLimitRange = this.mHoldCards.findIndex( ( c : number )=>{ return vl.indexOf(c) == -1; } ) ;
                if ( -1 != notInLimitRange )
                {
                    return true ;
                }
            }
            return false ;
        }

        let resultLimit = this.produceLimitCard(card, eatWith) ;
        let notInLimitRange = this.mHoldCards.findIndex( ( c : number )=>{ return resultLimit.indexOf(c) == -1; } ) ;
        if ( -1 == notInLimitRange )
        {
            return false ;
        }
        return opts.indexOf(eatWith[0]) != -1 && opts.indexOf(eatWith[1]) != -1 ;
    }

    protected produceLimitCard( card : number , eatWith : number[] ) : number[]
    {
        let vLimit = [] ;
        let v1 = MJCardData.parseCardValue(eatWith[1]);
        let v0 = MJCardData.parseCardValue(eatWith[0]);
        if ( eatWith[1] - eatWith[0] == 1  )
        {
            if ( v0 > 1 )
            {
                vLimit.push(eatWith[0] - 1 ) ;
            }
            
            if ( v1 < 9 )
            {
                vLimit.push(eatWith[1] + 1 ) ;
            }
        }
        else
        {
            vLimit.push( card ) ;
        }

        return vLimit ;
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

    getTotalHuaCnt() : number
    {
        MJCardData.printCards( "holds" , this.mHoldCards ) ;
        let dong = MJCardData.makeCardNum( eMJCardType.eCT_Feng, 1 ) ;
        let keCnt = 0 ;
        for ( let i = 0 ; i < 4 ; ++i )
        {
            if ( this.mHoldCards.indexOf(dong + i) != -1 )
            {
                ++keCnt ;
            }
        }
        XLogger.debug( "get totoal hua hold have hua = " + keCnt ) ;
        return this.huaCnt + keCnt ;
    }

    protected enable7Pair() : boolean 
    {
        return false ;
    }
}