import { XLogger } from './../../common/Logger';
import { MJPlayerCardData } from './../../shared/mjData/MJPlayerCardData';
import { MJCardData } from './../../shared/mjData/MJCardData';
import { eMJActType, eMJCardType } from './../../shared/mjData/MJDefine';
import { IStrategy } from './IStrategy';
import { remove, filter, countBy } from 'lodash';
export class LackInfo
{
    lackCnt : number = 0 ;
    supplyCnt : number = 0 ;
    groupCards : number[] = [] ;
    next : LackInfo = null ;
    
    getFinalLackCnt() : number 
    {
        if ( this.next == null )
        {
            return this.lackCnt ;
        }

        return this.lackCnt + this.next.getFinalLackCnt();
    }

    getFinalSupplyCnt() : number
    {
        if ( this.next == null )
        {
            return this.supplyCnt ;
        }

        return this.supplyCnt + this.next.getFinalSupplyCnt();
    }
}

export class PingHuStrategy implements IStrategy
{
    getChuCard( vHolds : number[] , limitCards : number[] , out : LackInfo = null ) : number 
    {
        let vHold = vHolds.concat([]);
        let wan = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Wan ) ;
        let tong = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Tong ) ;
        let tiao = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Tiao ) ;
        let feng = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Feng ) ;


        let v = [ wan,tong,tiao,feng ] ;
        let card = 0 ;
        let pl : LackInfo = null ;
        for ( let idx = 0 ; idx < v.length ; ++idx )
        {
            if ( v[idx].length == 0 )
            {
                continue ;
            }

            let cur = new LackInfo();
            let chu = this.getBestChu(v[idx], this.isCardMustKezi(v[idx][0] ), cur , limitCards );
            if ( chu == 0 && cur.getFinalLackCnt() == 0 )
            {
                continue ;
            }

            let vG = v.concat([]) ;
            vG.splice(idx,1) ;
            let tl = this.getGroupLackValue(vG) ;
            cur.lackCnt += tl.getFinalLackCnt();
            cur.supplyCnt += tl.getFinalSupplyCnt();
            
            if ( card == 0 )
            {
                card = chu;
                pl = cur;
            }
            else
            {
                if ( cur.getFinalLackCnt() < pl.getFinalLackCnt() )
                {
                    card = chu ;
                    pl = cur ;
                }
                else if ( cur.getFinalLackCnt() == pl.getFinalLackCnt() )
                {
                    if ( cur.getFinalSupplyCnt() > pl.getFinalSupplyCnt() )
                    {
                        card = chu ;
                        pl = cur ;
                    }
                }
            }
        }

        if ( null != out )
        {
            out.next = pl ;
        }
        return card ;
    }

    onDecideActWithOtherCard( vHolds : number[], actOpts : eMJActType[] , otherCard : number , vEatWith : number[] ) : eMJActType 
    {
        // peng , ming gang , hu , eat ;
        if ( -1 != actOpts.indexOf( eMJActType.eMJAct_Hu ) )
        {
            return eMJActType.eMJAct_Hu ;
        }

        let vHold = vHolds.concat([]);
        let wan = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Wan ) ;
        let tong = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Tong ) ;
        let tiao = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Tiao ) ;
        let feng = remove(vHold, (c)=> MJCardData.parseCardType(c) == eMJCardType.eCT_Feng ) ;


        let vG = [ wan,tong,tiao,feng ] ;
        let pCur = this.getGroupLackValue(vG) ;
        let BestAct = eMJActType.eMJAct_Pass ;

        // check peng ;
        if ( -1 != actOpts.indexOf( eMJActType.eMJAct_Peng ) )
        {
            let vPengH = vHolds.concat([]) ;
             let idx = vPengH.indexOf(otherCard) ;
             if ( idx == -1 || vPengH.length <= (idx + 1) || vPengH[idx + 1] != otherCard )
             {
                 console.error( "can not peng , why let me peng , other card = " + MJCardData.getCardStr(otherCard) ) ;
             }
             else
             {
                 vPengH.splice(idx,2) ;
                 let pengLack = new LackInfo();
                 this.getChuCard(vPengH,[],pengLack ) ;
                 if ( pengLack.getFinalLackCnt() < pCur.getFinalLackCnt() || ( pengLack.getFinalLackCnt() == pCur.getFinalLackCnt() && pengLack.getFinalSupplyCnt() > pCur.getFinalSupplyCnt() ) )
                 {
                     BestAct = eMJActType.eMJAct_Peng;
                     pCur = pengLack ;
                 }
             }
        }

        // check minggang 
        if ( -1 != actOpts.indexOf( eMJActType.eMJAct_MingGang ) )
        {
            let vMingGangH = vHolds.concat([]) ;
             let idx = vMingGangH.indexOf(otherCard) ;
             if ( idx == -1 || vMingGangH.length <= (idx + 2) || vMingGangH[idx+2] == otherCard )
             {
                 console.error( "can not ming gang , why let me ming gang , other card = " + MJCardData.getCardStr(otherCard) ) ;
             }
             else
             {
                vMingGangH.splice(idx,3) ;
                let mingLack = new LackInfo();
                this.getChuCard(vMingGangH,[],mingLack ) ;
                if ( mingLack.getFinalLackCnt() < pCur.getFinalLackCnt() || ( mingLack.getFinalLackCnt() == pCur.getFinalLackCnt() && mingLack.getFinalSupplyCnt() > pCur.getFinalSupplyCnt() ) )
                {
                    BestAct = eMJActType.eMJAct_MingGang;
                    pCur = mingLack ;
                }
             }
        }       
        
        // check eat 
        if ( -1 == actOpts.indexOf( eMJActType.eMJAct_Chi ) )
        {
            return BestAct ;
        }

        let vOpts : number[] = this.getChiOpts(otherCard, vHolds ) ;
        if ( vOpts == null || vOpts.length == 0 )
        {
            console.error( "can not eat why tell me eat" ) ;
            return BestAct ;
        }

        for ( let idx = 0 ; ( idx + 1 ) < vOpts.length; idx += 2  )
        {
            let vEat = vHolds.concat([]) ;
            let ridx = vEat.indexOf(vOpts[idx]) ;
            vEat.splice(ridx,1) ;

            ridx = vEat.indexOf(vOpts[idx + 1 ]) ;
            vEat.splice(ridx,1) ;
 

            let eatL = new LackInfo();
            this.getChuCard(vEat,[],eatL ) ;
            if ( eatL.getFinalLackCnt() < pCur.getFinalLackCnt() || ( eatL.getFinalLackCnt() == pCur.getFinalLackCnt() && eatL.getFinalSupplyCnt() > pCur.getFinalSupplyCnt() ) )
            {
                BestAct = eMJActType.eMJAct_Chi;
                pCur = eatL ;
                vEatWith.length = 0 ;
                vEatWith.push( vOpts[idx] , vOpts[idx+1] ) ;
            }
        }

        return BestAct;
    }

    onDecideActWithSelfCard( playerCard : MJPlayerCardData, actOpts : eMJActType[] ) : { act : eMJActType , card : number } 
    {
        if ( -1 != actOpts.indexOf( eMJActType.eMJAct_Hu ) )
        {
            return { act : eMJActType.eMJAct_Hu, card : 0 };
        }

        // an gang ;
        if ( -1 != actOpts.indexOf( eMJActType.eMJAct_AnGang ) )
        {
            let vHold = playerCard.mHoldCards.concat([]);
 
            let an = playerCard.getCanAnGangCards();
            if ( an == null || an.length == 0 )
            {
                console.error( "can not an Gang , why call me AnGang ? " ) ;
            }
            else
            {
                for ( let a of an )
                {
                    let vA = filter(vHold,c=> MJCardData.parseCardType(c) == MJCardData.parseCardType(a) );
                    let befor = new LackInfo();
                    this.getLackValue(vA,vA, this.isCardMustKezi(a) , befor );
    
                    let after = new LackInfo();
                    vA.splice(vA.indexOf(a),4) ;
                    this.getLackValue(vA,vA, this.isCardMustKezi(a) , after );
                    if ( after.getFinalLackCnt() <= befor.getFinalLackCnt() )
                    {
                        return { act : eMJActType.eMJAct_AnGang, card : a };
                    }
                }
            }

        }
        // bu gang ;

        if ( -1 != actOpts.indexOf( eMJActType.eMJAct_BuGang_Declare ) )
        {
            let vHold = playerCard.mHoldCards.concat([]);
 
            let bu = playerCard.getCanBuGangCards();
            if ( bu == null || bu.length == 0 )
            {
                console.error( "can not bu Gang , why call me bu ? " ) ;
            }
            else
            {
                for ( let a of bu )
                {
                    let vA = filter(vHold,c=> MJCardData.parseCardType(c) == MJCardData.parseCardType(a) );
                    let befor = new LackInfo();
                    this.getLackValue(vA,vA, this.isCardMustKezi(a) , befor );
    
                    let after = new LackInfo();
                    vA.splice(vA.indexOf(a),1) ;
                    this.getLackValue(vA,vA, this.isCardMustKezi(a) , after );
                    if ( after.getFinalLackCnt() <= befor.getFinalLackCnt() )
                    {
                        return { act : eMJActType.eMJAct_BuGang_Declare, card : a };
                    }
                }
            }

        }

        return { act : eMJActType.eMJAct_Pass, card : 0 };
    }

    getChiOpts( card : number , vHold :number[] ) : number[]
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
            if ( vHold.indexOf(A) != -1  && vHold.indexOf(B) != -1 )
            {
                vOpts.push(A,B) ;
            }
        }

        // xAB ;
        if ( value <= 7 )
        {
            let A = card + 1 ;
            let B = card + 2 ;
            if ( vHold.indexOf(A) != -1  && vHold.indexOf(B) != -1 )
            {
                vOpts.push(A,B) ;
            }
        }

        // ABx
        if ( value >= 3 )
        {
            let A = card - 1 ;
            let B = card - 2 ;
            if ( vHold.indexOf(A) != -1  && vHold.indexOf(B) != -1 )
            {
                vOpts.push(A,B) ;
            }
        }

        return vOpts ;
    }

    isCardMustKezi( card : number )
    {
        let t = MJCardData.parseCardType(card) ;
        return t == eMJCardType.eCT_Feng ;
    }

    getLackValue( vOrgCards : number[] ,vCards : number[] , isMustKeZi : boolean , lackInfo : LackInfo )
    {
        if ( vCards.length == 0 )
        {
            return ;
        }
        MJCardData.printCards("getLackValue cur cards = ", vCards ) ;
        MJCardData.printCards("getLackValue orig cards = ", vOrgCards ) ;
        let vlocal = vCards.concat([]) ;
        // as ke zi ;
        // one single ;
        let plOne = new LackInfo();
        plOne.lackCnt = 2 ;
        plOne.supplyCnt = 1 ;
        let card1 = vlocal.shift();
        let value = MJCardData.parseCardValue(card1) ;
        if (  false == isMustKeZi && ( value == 1 || 9 == value ) )
        {
            plOne.supplyCnt += 2 ;
            if ( 1 == value && vCards.indexOf( card1 + 1 ) != -1  )
            {
                plOne.supplyCnt += 6 ;
            }

            if ( 1 == value && vCards.indexOf( card1 + 2 ) != -1  )
            {
                plOne.supplyCnt += 5 ;
            }

            if ( 9 == value && vOrgCards.indexOf( card1 - 1 ) != -1  )
            {
                plOne.supplyCnt += 6
            }

            if ( 9 == value && vOrgCards.indexOf( card1 - 2 ) != -1  )
            {
                plOne.supplyCnt += 5
            }
        }
        else if ( false == isMustKeZi && ( value == 2 || 8 == value ) )
        {
            plOne.supplyCnt += 3 ;
            if ( 2 == value && vCards.indexOf( card1 + 1 ) != -1  )
            {
                plOne.supplyCnt += 6
            }

            if ( 2 == value && vCards.indexOf( card1 + 2 ) != -1  )
            {
                plOne.supplyCnt += 5
            }

            if ( 2 == value && vOrgCards.indexOf( card1 - 1 ) != -1  )
            {
                plOne.supplyCnt += 6
            }

            if ( 8 == value && vOrgCards.indexOf( card1 - 1 ) != -1  )
            {
                plOne.supplyCnt += 6
            }

            if ( 8 == value && vOrgCards.indexOf( card1 - 2 ) != -1  )
            {
                plOne.supplyCnt += 5
            }

            if ( 8 == value && vCards.indexOf( card1 + 1 ) != -1  )
            {
                plOne.supplyCnt += 6
            }
        }
        else if ( false == isMustKeZi )
        {
            plOne.supplyCnt += 4 ;
            if ( vCards.indexOf( card1 + 1 ) != -1  )
            {
                plOne.supplyCnt += 6
            }

            if ( vCards.indexOf( card1 + 2 ) != -1  )
            {
                plOne.supplyCnt += 5
            }

            if ( vCards.indexOf( card1 - 2 ) != -1  )
            {
                plOne.supplyCnt += 5
            }

            if ( vCards.indexOf( card1 - 1 ) != -1  )
            {
                plOne.supplyCnt += 6
            }
        }
        let cntsame = countBy(vOrgCards,vt=>vt == card1 ? "s" : "n" ) ;
        plOne.supplyCnt += ( cntsame["s"] - 1 ) * 7;
        if ( isMustKeZi )
        {
            plOne.supplyCnt -= 1;
        }

        plOne.groupCards.push(card1) ;
        this.getLackValue(vOrgCards,vlocal, isMustKeZi, plOne ) ;
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
            pke2.supplyCnt = 1.7 ; // better than ka zhang ;
            pke2.groupCards.push(card,card) ;
            let cntsame = countBy(vOrgCards,vt=>vt == card ? "s" : "n" ) ;
            pke2.supplyCnt += ( cntsame["s"] - 2 ) * 2;

            this.getLackValue(vOrgCards,vlocalKe2, isMustKeZi, pke2 ) ;

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

                let cntsame = countBy(vOrgCards,vt=>vt == card ? "s" : "n" ) ;
                shun1.supplyCnt += ( cntsame["s"] - 1 );
                cntsame = countBy(vOrgCards,vt=>vt == (card+1) ? "s" : "n" ) ;
                shun1.supplyCnt += ( cntsame["s"] - 1 );

                this.getLackValue(vOrgCards,vShun1, isMustKeZi, shun1 ) ;

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

                let cntsame = countBy(vOrgCards,vt=>vt == card ? "s" : "n" ) ;
                shun2.supplyCnt += ( cntsame["s"] - 1 );
                cntsame = countBy(vOrgCards,vt=>vt == (card+2) ? "s" : "n" ) ;
                shun2.supplyCnt += ( cntsame["s"] - 1 );

                this.getLackValue( vOrgCards,vShun2, isMustKeZi, shun2 ) ;

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
            ke.supplyCnt = 0.2 ;
            this.getLackValue( vOrgCards,lke3, isMustKeZi, ke ) ;

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
            if ( idx1 != -1 && -1 != idx2 && MJCardData.parseCardValue(card) <= 7 )
            {
                shun3.splice(shun3.indexOf(card + 1 ),1) ;
                shun3.splice(shun3.indexOf(card + 2 ),1) ;

                let k = new LackInfo();
                k.lackCnt = 0 ;
                k.supplyCnt = 0 ;

                this.getLackValue( vOrgCards,shun3, isMustKeZi, k ) ;

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

    getBestChu( vCards : number[] , isMustKeZi : boolean  , lackInfo : LackInfo, limitCards : number[] ) : number
    {
        if ( vCards.length == 0 )
        {
            return 0 ;
        }

        let card = 0 ;
        let bestChuLackInfo = new LackInfo();
        this.getLackValue( vCards,vCards, isMustKeZi, bestChuLackInfo ) ;
        if ( bestChuLackInfo.getFinalLackCnt() == 0 )
        {
            return 0 ;
        }

        for ( let idx = 0 ; idx < vCards.length ; ++idx )
        {
            if ( idx != 0 && vCards[idx] == vCards[idx-1] )
            {
                continue ;
            }

            if ( null != limitCards && limitCards.indexOf(vCards[idx]) != -1 )
            {
                continue ;
            }

            let tmp = vCards.concat([]);
            tmp.splice(idx,1) ;
            let ltmp = new LackInfo();
            this.getLackValue(vCards,tmp, isMustKeZi, ltmp ) ;

            if ( card == 0 || ltmp.getFinalLackCnt() < bestChuLackInfo.getFinalLackCnt() )
            {
                card = vCards[idx] ;
                bestChuLackInfo = ltmp;
            }
            else if ( ltmp.getFinalLackCnt() == bestChuLackInfo.getFinalLackCnt() )
            {
                if ( ltmp.getFinalSupplyCnt() > bestChuLackInfo.getFinalSupplyCnt() )
                {
                    card = vCards[idx] ;
                    bestChuLackInfo = ltmp;
                }
            }
        } 

        lackInfo.next = bestChuLackInfo ;
        return card ;
    }

    getGroupLackValue( vG : Array<number[]> ) : LackInfo
    {
        let p = new LackInfo();
        for ( let v of vG )
        {
            if ( v.length == 0 )
            {
                continue ;
            }

            let c = p ;
            while ( c.next != null )
            {
                c = c.next ;
                XLogger.debug( "node not null , go on find next " ) ;
            }
            this.getLackValue(v,v, this.isCardMustKezi(v[0]), c ) ;
        }
        return p ;
    }
}