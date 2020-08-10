import { MJCardData } from './../../shared/mjData/MJCardData';
import { eMJActType, eMJCardType } from './../../shared/mjData/MJDefine';
import { MJPlayerData } from './../../shared/mjData/MJPlayerData';
import { IStrategy } from './IStrategy';
import { remove } from 'lodash';
class LackInfo
{
    lackCnt : number = 0 ;
    supplyCnt : number = 0 ;
    groupCards : number[] = [] ;
    next : LackInfo = null ;
    
    getFinalLackCnt() : number 
    {
        if ( this.next == null )
        {
            return this.supplyCnt ;
        }

        return this.supplyCnt + this.next.getFinalLackCnt();
    }

    getFinalSupplyCnt() : number
    {
        if ( this.next == null )
        {
            return this.lackCnt ;
        }

        return this.lackCnt + this.next.getFinalSupplyCnt();
    }
}

export class PingHuStrategy implements IStrategy
{
    getChuCard( data : MJPlayerData ) : number 
    {
        let vHold = data.getHoldCards().concat([]);
        let wan = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Wan ) ;
        let tong = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Tong ) ;
        let tiao = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Tiao ) ;
        let feng = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Feng ) ;

        let v = [ wan,tong,tiao,feng ] ;
        let card = 0 ;
        let pl : LackInfo = null ;
        for ( let p of v )
        {
            if ( p.length == 0 )
            {
                continue ;
            }

            let lt = new LackInfo();
            let cardTmp = this.getBestChu(p, MJCardData.parseCardType(p[0]) == eMJCardType.eCT_Feng, lt );
            if ( card == 0 )
            {
                card = cardTmp ;
                pl = lt ;
                continue ;
            }

            if ( lt.getFinalLackCnt() < pl.getFinalLackCnt() )
            {
                card = cardTmp ;
                pl = lt ;
            }
            else if ( lt.getFinalLackCnt() == pl.getFinalLackCnt() )
            {
                if ( lt.getFinalSupplyCnt() > pl.getFinalSupplyCnt() )
                {
                    card = cardTmp ;
                    pl = lt ;
                }
            }
        }

        return card ;
    }

    onDecideActWithOtherCard( data : MJPlayerData, actOpts : eMJActType[] ) : eMJActType 
    {

    }

    onDecideActWithSelfCard( data : MJPlayerData, actOpts : eMJActType[] ) : eMJActType 
    {

    }

    getLackValue( vCards : number[] , isMustKeZi : boolean , lackInfo : LackInfo )
    {
        if ( vCards.length == 0 )
        {
            return ;
        }

        let vlocal = vCards.concat([]) ;
        // as ke zi ;
        // one single ;
        let plOne = new LackInfo();
        plOne.lackCnt = 2 ;
        plOne.supplyCnt = 1 ;
        let card1 = vlocal.shift();
        let value = MJCardData.parseCardValue(card1) ;
        if ( value == 1 || 9 == value )
        {
            value += 2 ;
        }
        else if ( value == 2 || 8 == value )
        {
            value += 3 ;
        }
        else
        {
            value += 4 ;
        }

        plOne.groupCards.push(card1) ;
        this.getLackValue(vlocal, isMustKeZi, plOne ) ;
        // two
        if ( vCards.length < 2 )
        {
            lackInfo.next = plOne;
            return ;
        }

        let lbest = plOne ;
        // shunZi 2 ;
        let vlocalKe2 = vCards.concat([]) ;
        let card = vlocalKe2.shift();
        if ( card == vlocalKe2[0] ) // keZi
        {
            vlocalKe2.shift();
            let pke2 = new LackInfo();
            pke2.lackCnt = 1 ;
            pke2.supplyCnt = 1 ;
            pke2.groupCards.push(card,card) ;
            this.getLackValue(vlocalKe2, isMustKeZi, pke2 ) ;

            if ( lbest.getFinalLackCnt() > pke2.getFinalLackCnt() )
            {
                lbest = pke2 ;
            }
            else if ( lbest.getFinalLackCnt() == pke2.getFinalLackCnt() )
            {
                if ( lbest.getFinalSupplyCnt() < pke2.getFinalSupplyCnt() )
                {
                    lbest = pke2;
                }
            }
        }

        // shunZi 2 ;
        if ( false == isMustKeZi )
        {
            let vShun1 = vCards.concat([]) ;
            let card = vShun1.shift();
            let card2Idx = vShun1.indexOf( card + 1 ) ;
            if ( card2Idx != -1 && MJCardData.parseCardValue(card) <= 8 )
            {
                vShun1.splice(card2Idx,1) ;
                let shun1 = new LackInfo();
                shun1.lackCnt = 1 ;
                shun1.supplyCnt = 2 ;
                shun1.groupCards.push(card,card + 1 ) ;
                this.getLackValue(vShun1, isMustKeZi, shun1 ) ;

                if ( lbest.getFinalLackCnt() > shun1.getFinalLackCnt() )
                {
                    lbest = shun1 ;
                }
                else if ( lbest.getFinalLackCnt() == shun1.getFinalLackCnt() )
                {
                    if ( lbest.getFinalSupplyCnt() < shun1.getFinalSupplyCnt() )
                    {
                        lbest = shun1;
                    }
                }
            }

            let vShun2 = vCards.concat([]) ;
            card = vShun2.shift();
            card2Idx = vShun2.indexOf( card + 2 ) ;
            if ( card2Idx != -1 && MJCardData.parseCardValue(card) <= 7 )
            {
                vShun2.splice(card2Idx,1) ;
                let shun2 = new LackInfo();
                shun2.lackCnt = 1 ;
                shun2.supplyCnt = 1 ;
                shun2.groupCards.push(card,card + 2 ) ;
                this.getLackValue( vShun2, isMustKeZi, shun2 ) ;

                if ( lbest.getFinalLackCnt() > shun2.getFinalLackCnt() )
                {
                    lbest = shun2 ;
                }
                else if ( lbest.getFinalLackCnt() == shun2.getFinalLackCnt() )
                {
                    if ( lbest.getFinalSupplyCnt() < shun2.getFinalSupplyCnt() )
                    {
                        lbest = shun2;
                    }
                }
            }
        }

        // tree,
        if ( vCards.length < 3 )
        {
            lackInfo.next = lbest;
            return ;
        }

        // kezi 
        let lke3 = vCards.concat([]) ;
        if ( lke3[0] == lke3[2] )
        {
            lke3.splice(0,3) ;
            let ke = new LackInfo();
            ke.lackCnt = 0 ;
            ke.supplyCnt = 0 ;
            this.getLackValue( lke3, isMustKeZi, ke ) ;

            if ( lbest.getFinalLackCnt() > ke.getFinalLackCnt() )
            {
                lbest = ke ;
            }
            else if ( lbest.getFinalLackCnt() == ke.getFinalLackCnt() )
            {
                if ( lbest.getFinalSupplyCnt() < ke.getFinalSupplyCnt() )
                {
                    lbest = ke;
                }
            }
        }


        if ( isMustKeZi == false )
        {
            let shun3 = vCards.concat([]) ;
            card = shun3.shift();
            let idx1 = shun3.indexOf(card + 1 ) ;
            let idx2 = shun3.indexOf(card + 2 ) ;
            shun3.splice(idx1,1) ;
            shun3.splice(idx2,1) ;
            if ( idx1 != -1 && -1 != idx2 && MJCardData.parseCardValue(card) <= 7 )
            {
                let k = new LackInfo();
                k.lackCnt = 0 ;
                k.supplyCnt = 0 ;

                this.getLackValue( shun3, isMustKeZi, k ) ;

                if ( lbest.getFinalLackCnt() > k.getFinalLackCnt() )
                {
                    lbest = k ;
                }
                else if ( lbest.getFinalLackCnt() == k.getFinalLackCnt() )
                {
                    if ( lbest.getFinalSupplyCnt() < k.getFinalSupplyCnt() )
                    {
                        lbest = k;
                    }
                }
            }
        }

        lackInfo.next = lbest;
        return ;
    }

    getBestChu( vCards : number[] , isMustKeZi : boolean  , lackInfo : LackInfo ) : number
    {
        if ( vCards.length == 0 )
        {
            return 0 ;
        }

        let card = 0 ;
        for ( let idx = 0 ; idx < vCards.length ; ++idx )
        {
            if ( idx != 0 && vCards[idx] == vCards[idx-1] )
            {
                continue ;
            }

            let tmp = vCards.concat([]);
            tmp.splice(idx,1) ;
            let ltmp = new LackInfo();
            this.getLackValue(tmp, isMustKeZi, ltmp ) ;
            if ( card == 0 )
            {
                card = vCards[idx] ;
                lackInfo.next = ltmp;
            }
            else 
            {
                if ( ltmp.getFinalLackCnt() < lackInfo.next.getFinalLackCnt() )
                {
                    card = vCards[idx] ;
                    lackInfo.next = ltmp;
                }
                else if ( ltmp.getFinalLackCnt() == lackInfo.next.getFinalLackCnt() )
                {
                    if ( ltmp.getFinalSupplyCnt() > lackInfo.next.getFinalSupplyCnt() )
                    {
                        card = vCards[idx] ;
                        lackInfo.next = ltmp;
                    }
                }
            }
        } 

        return card ;
    }
}