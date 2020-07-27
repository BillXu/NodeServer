import { eMJCardType } from './MJDefine';
//mport MJCard from "../layerCards/cards3D/MJCard";

// Learn TypeScript:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/typescript.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

//onst {ccclass, property} = cc._decorator;

class Group
{
    //private parent : Group  = null ;
    private subGroups : Group[] = [] ;
    cards : number[] = [] ;
    //static s_BaiDaCard : number[] = [] ;
    
    addChild( child : Group )
    {
        this.subGroups.push( child );
        //child.parent = this ;
    }

    popChild()
    {
        this.subGroups.pop();
    }

    // clear()
    // {
    //     this.cards.length = 0 ;
    //     this.subGroups.length = 0 ;
    // }

    // isHaveNotShun()
    // {
    //     if ( this.cards.length == 2 && this.cards[0] != this.cards[1] )
    //     {
    //         return true ;
    //     }

    //     return false ;
    // }

    // isHaveSingleCard() 
    // {
    //     if ( this.cards.length == 1 )
    //     {
    //         return true ;
    //     }

    //     if ( this.parent != null )
    //     {
    //         return this.parent.isHaveSingleCard();
    //     }

    //     return false ;
    // }

    // getPairCnt() : number
    // {
    //     return ( this.isThisGroupPair() ? 1 : 0 ) + ( this.parent != null ? this.parent.getPairCnt() : 0 ) ;
    // }

    // isCardBaiDa( card : number )
    // {
    //     return Group.s_BaiDaCard.indexOf(card) != -1 ;
    // }

    // isThisGroupPair()
    // {
    //     if ( this.cards.length == 0 )
    //     {
    //         return false ;
    //     }

    //     let isSelfPair : boolean = this.cards.length == 2 ;
    //     let isContainBaida = this.isCardBaiDa(this.cards[0] )  || this.isCardBaiDa(this.cards[1] ) ;
    //     isSelfPair = isSelfPair &&  ( isContainBaida || this.cards[0] == this.cards[1] );
    //     return isSelfPair ;
    // }

    // // warning : this function not consider baiDa 
    // getTingCards( jiang : number ) : number[]
    // {
    //     if ( this.cards.length == 3 || this.cards.length == 0  )
    //     {
    //         let v : number[] = [] ;
    //         for ( let item of this.subGroups )
    //         {
    //             v = v.concat(item.getTingCards(jiang)) ;
    //         }
    //         return v ; 
    //     }

    //     if ( this.cards.length == 1 )
    //     {
    //         return [this.cards[0]] ;
    //     }

    //     // when 2 cards ;
    //     if ( this.cards[0] == this.cards[1] )
    //     {
    //         if ( jiang == 0 )
    //         {
    //             jiang = this.cards[0] ;

    //             let v : number[] = [] ;
    //             for ( let item of this.subGroups )
    //             {
    //                 v = v.concat(item.getTingCards(jiang)) ;
    //             }
    //             return v ; 
    //         }
    //         else
    //         {
    //             return [ jiang, this.cards[0] ] ;
    //         }
    //     }
    //     else if ( this.cards[0] + 2 == this.cards[1] )
    //     {
    //         return [ this.cards[0] + 1 ] ;
    //     }
    //     else
    //     {
    //         let v0 = (this.cards[0] & 0xF) ;
    //         let v1 = (this.cards[1] & 0xF) ;
    //         let v = [] ;
    //         if ( v0 > 1 )
    //         {
    //             v.push( this.cards[0] - 1 );
    //         }

    //         if ( v1 < 9 )
    //         {
    //             v.push( this.cards[1] + 1 );
    //         }

    //         return v ;
    //     }
    // }

    // isAlreadyQue() : boolean 
    // {
    //     if ( this.cards.length == 1 )  // single jiang , so have que in chain ;
    //     {
    //         return true ;
    //     }

    //     if ( this.cards.length == 2 && this.parent != null )  // not jiang , but only have two cards so , always jiang put front ;
    //     {
    //         return true ;
    //     }

    //     if ( this.parent != null )
    //     {
    //         return this.parent.isAlreadyQue();
    //     }

    //     return false ;
    // }

}

//@ccclass
export class HuChecker {

    checkTing( vCards : number[] ) : { chu : number, tingCards : number[]} [] 
    {
        vCards.sort();
        let vresult : { chu : number, tingCards : number[]}[] = [] ;
        for ( let idx = 0 ; idx < vCards.length ; ++idx )
        {
            let v : number[] = [] ;
            v = v.concat(vCards) ;
            v.splice(idx,1);
            let vTing = this.getTingCards(v);
            if ( vTing == null || vTing.length == 0 )
            {
                continue ;
            }
            vresult.push( { chu : vCards[idx],tingCards : vTing } );
        }
        return vresult ;
    }

    getTingCards( vCards : number[] ) : number[]
    {
        let vBaiDa = vCards.filter( this.filterBaiDa.bind(this) ) ; // baida ;
        vCards = vCards.filter( ( v )=>{ return vBaiDa.indexOf(v) == -1 ;} ); // not cantin baida ;

        vCards.sort();
        let vWan = vCards.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Wan ; } ) ;
        let vTong = vCards.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Tong ; } ) ;
        let vTiao = vCards.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Tiao ; } ) ;
        let vFeng = vCards.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Feng ; } ) ;
        let vJian = vCards.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Jian ; } ) ;

        let vCheck = [ vWan,vTong,vTiao,vFeng,vJian ] ;
        let vMayTing = [] ;
        if ( vBaiDa.length == 0 )
        {
            for ( let idx = 0 ; idx < vCheck.length ; ++idx )
            {
                let vWillCheck = vCheck[idx] ;
                if ( null == vWillCheck || vWillCheck.length == 0 || vWillCheck.length % 3 == 0 )
                {
                    continue ;
                }

                if ( idx > 2 )
                {
                    vMayTing = vMayTing.concat( vWillCheck );
                }
                else
                {
                    for ( let mc of vWillCheck )
                    {
                        let value = (mc & 0xF) ;
                        if ( value > 1 )
                        {
                            let candit = mc -1 ;
                            if ( vMayTing.indexOf( candit ) == -1  )
                            {
                                vMayTing.push(candit);
                            }
                        }

                        if ( value < 9 )
                        {
                            let candit = mc + 1 ;
                            if ( vMayTing.indexOf( candit ) == -1  )
                            {
                                vMayTing.push(candit);
                            }
                        }

                        if ( vMayTing.indexOf( mc ) == -1  )
                        {
                            vMayTing.push(mc);
                        }
                    }
                }
            }

        }
        else
        {
            // baida ting pai ?
            for ( let testC = 1 ; testC <= 9 ; ++testC )
            {
                vMayTing.push( HuChecker.makeCardNum(eMJCardType.eCT_Wan,testC));
                vMayTing.push( HuChecker.makeCardNum(eMJCardType.eCT_Tong,testC));
                vMayTing.push( HuChecker.makeCardNum(eMJCardType.eCT_Tiao,testC));
                if ( testC <= 3 )
                {
                    vMayTing.push( HuChecker.makeCardNum(eMJCardType.eCT_Feng,testC));
                    vMayTing.push( HuChecker.makeCardNum(eMJCardType.eCT_Jian,testC));
                }

                if ( testC <= 4 )
                {
                    vMayTing.push( HuChecker.makeCardNum(eMJCardType.eCT_Feng,testC));
                }
            }
        }   

        // check can hu 
        let vTing = [] ;
        for ( let ting of vMayTing )
        {
            let vtc = [] ;
            vtc = vtc.concat(vCards);
            vtc.push(ting);
            let vb = [] ;
            if ( vBaiDa != null && vBaiDa.length > 0 )
            {
                vb = vb.concat(vBaiDa);
            }
            let g = this.getHuPaiGroup(vtc,vb) ;
            if ( null != g )
            {
                vTing.push(ting);
            }
        }

        return vTing ;
    }      

    filterBaiDa( card : number ) : boolean 
    {
        if ( card == HuChecker.makeCardNum(eMJCardType.eCT_Tiao,1) )
        {
            return true ;
        }
        return false ;
    }

    private verifyCards( result : Group, cards : number[] , mustKeZi : boolean, vBaiDa : number[] ) : boolean
    {
        if ( cards.length == 0 )
        {
            return true ;
        }

        let ccnt = cards.length % 3 
        if ( ccnt != 0 && ( vBaiDa == null || ( 3 - ccnt ) > vBaiDa.length  ) )
        {
            return false ;
        }

        let curValue = cards[0] ;
        cards.splice(0,1);
        // try make kezi
        let keIdx0 = cards.indexOf(curValue);
        let keIdx1 = -1 ;
        if ( keIdx0 != -1 )
        {
            keIdx1 = cards.indexOf(curValue , keIdx0 + 1 );
        }

        let shunIdx0 = cards.indexOf( curValue + 1 );
        let shunIdx1 = cards.indexOf( curValue + 2 );

        if ( keIdx1 != -1 ) // make ke zi ok 
        {
            let g = new Group();
            g.cards.push( curValue,curValue,curValue );
            result.addChild(g);

            let vSub : number[] = [] ;
            vSub = vSub.concat(cards);
            this.removeValueFromArray(vSub,curValue);
            this.removeValueFromArray(vSub,curValue);
            let ok = this.verifyCards(g,vSub,mustKeZi,vBaiDa);
            if ( ok == false )
            {
                result.popChild();
            }
            else
            {
                return true ;
            }
        }

        if ( mustKeZi == false && shunIdx0 != -1 && shunIdx1 != -1 ) // shun zi ok 
        {
            let g = new Group();
            g.cards.push( curValue,curValue + 1 ,curValue + 2 );
            result.addChild(g);

            let vSub : number[] = [] ;
            vSub = vSub.concat(cards);
            this.removeValueFromArray(vSub,curValue + 1 );
            this.removeValueFromArray(vSub,curValue + 2 );
            let ok = this.verifyCards(g,vSub,mustKeZi,vBaiDa);
            if ( ok == false )
            {
                result.popChild();
            }
            else
            {
                return true ;
            }
        }
        
        // when lack of only one to Ke , but have bai da 
        if (  keIdx0 != -1 && keIdx1 == -1 && vBaiDa != null && vBaiDa.length >= 1 )
        {
            let baiDa = vBaiDa[0] ;
            let g = new Group();
            g.cards.push( curValue,curValue,baiDa );
            result.addChild(g);
            vBaiDa.splice(0,1);

            let vSub : number[] = [] ;
            vSub = vSub.concat(cards);
            this.removeValueFromArray(vSub,curValue );
            let ok = this.verifyCards(g,vSub,mustKeZi,vBaiDa);
            if ( ok == false )
            {
                result.popChild();
                vBaiDa.push(baiDa);
            }
            else
            {
                return true ;
            }
        }

        // when lack of only one to shun
        if ( mustKeZi == false && vBaiDa != null && vBaiDa.length >= 1 && ( ( shunIdx0 == -1 && shunIdx1 != -1 ) || ( shunIdx0 != -1 && shunIdx1 == -1 ) ) )
        {
            let usedValue = cards[shunIdx0 != -1 ? shunIdx0 : shunIdx1] ;
            // use bai da to shun 
            let baiDa = vBaiDa[0] ;
            let g = new Group();
            g.cards.push( curValue,usedValue,baiDa );
            result.addChild(g);
            vBaiDa.splice(0,1);

            let vSub : number[] = [] ;
            vSub = vSub.concat(cards);
            this.removeValueFromArray(vSub,usedValue );
            let ok = this.verifyCards(g,vSub,mustKeZi,vBaiDa);
            if ( ok == false )
            {
                result.popChild();
                vBaiDa.push(baiDa);
            }
            else
            {
                return true ;
            }
        }
 
        // build shun with 2 bai da 
        if ( vBaiDa != null && vBaiDa.length >= 2 )
        {
            let baiDa = vBaiDa[0] ;
            let baiDa2 = vBaiDa[1] ;
            let g = new Group();
            g.cards.push( curValue,baiDa2,baiDa );
            result.addChild(g);
            vBaiDa.splice(0,2);

            let vSub : number[] = [] ;
            vSub = vSub.concat(cards);
            let ok = this.verifyCards(g,vSub,mustKeZi,vBaiDa) ;
            if ( ok == false )
            {
                result.popChild();
                vBaiDa.push(baiDa);
                vBaiDa.push(baiDa2);
            }
            else
            {
                return true ;
            }
        }
        return false ;
    }

    private isHoldCardShunWithoutJiang( vWan : number[] , vTong : number[] , vTiao : number[], vJian : number[],vFeng : number[], vBaiDa : number[] ) : Group
    {
        let g = new Group();
        if ( this.verifyCards(g,vWan,false,vBaiDa) == false )
        {
            return null ;
        }

        if ( this.verifyCards(g,vTong,false,vBaiDa) == false )
        {
            return null ;
        }

        if ( this.verifyCards(g,vTiao,false,vBaiDa) == false )
        {
            return null ;
        }

        if ( this.verifyCards(g,vJian,true,vBaiDa) == false )
        {
            return null ;
        }

        if ( this.verifyCards(g,vFeng,true,vBaiDa) == false )
        {
            return null ;
        }
        return g ;   
    }

    private getHuPaiGroup( vCards : number[] , vBaiDa : number[] ) : Group 
    {
        vCards.sort();
        // bai da no jiang 
        let jiang = [] ;
        for ( let idx = 0 ; idx + 1 < vCards.length ; )
        {
            if ( vCards[idx] == vCards[idx+1] )
            {
                if ( jiang.length != 0 && jiang[jiang.length -1 ] == vCards[idx]  )
                {
                    ++idx ;
                    continue ;
                }
                jiang.push(vCards[idx]);
                idx += 2 ;
            }
            else
            {
                ++idx ;
            }
        }

        for ( let v of jiang )
        {
            let tmp = [] ; tmp = tmp.concat(vCards);
            tmp.splice(tmp.indexOf(v),2 );

            let vWan = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Wan ; } ) ;
            let vTong = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Tong ; } ) ;
            let vTiao = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Tiao ; } ) ;
            let vFeng = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Feng ; } ) ;
            let vJian = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Jian ; } ) ;
            let vb = [] ; 
            if ( vBaiDa != null && vBaiDa.length > 0 )
            {
                vb = vb.concat(vBaiDa);
            }
            
            let g = this.isHoldCardShunWithoutJiang(vWan,vTong,vTiao,vJian,vFeng,vb) ;
            if ( g != null )
            {
                let result = new Group();
                result.cards.push(v,v);
                result.addChild(g);
                return result ;
            }
        }

        // one bai da  join jiang 
        if ( vBaiDa != null && vBaiDa.length >= 1 )
        {
            let jiangWithBaiDa = [] ;
            for ( let idx = 0 ; idx + 1 < vCards.length ; )
            {
                if ( vCards[idx] == vCards[idx+1] )
                {
                    idx += 2 ;
                    continue ;
                }

                if ( idx > 0 && vCards[idx] == vCards[idx-1] )
                {
                    ++idx ;
                    continue ;
                }
                jiangWithBaiDa.push(vCards[idx]);
                ++idx ;
            }
            let baiDaJiang = vBaiDa.pop();// remove one baida as jiang ;

            for ( let v of jiangWithBaiDa )
            {
                let tmp = [] ; tmp = tmp.concat(vCards);
                tmp.splice(tmp.indexOf(v),1 );

                let vWan = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Wan ; } ) ;
                let vTong = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Tong ; } ) ;
                let vTiao = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Tiao ; } ) ;
                let vFeng = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Feng ; } ) ;
                let vJian = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Jian ; } ) ;
                let vb = [] ; 
                if ( vBaiDa != null && vBaiDa.length > 0 )
                {
                    vb = vb.concat(vBaiDa);
                }
                
                let g = this.isHoldCardShunWithoutJiang(vWan,vTong,vTiao,vJian,vFeng,vb) ;
                if ( g != null )
                {
                    let result = new Group();
                    result.cards.push(v,baiDaJiang);
                    result.addChild(g);
                    return result ;
                }
            }
        }

        // two bai da as jiang 
        if ( vBaiDa != null && vBaiDa.length >= 2 )
        {
            let baiDaJiang = vBaiDa.pop();// remove one baida as jiang ;
            let baiDa2 = vBaiDa.pop(); // remove one baida as jiang ;

            let tmp = [] ; tmp = tmp.concat(vCards);
            let vWan = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Wan ; } ) ;
            let vTong = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Tong ; } ) ;
            let vTiao = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Tiao ; } ) ;
            let vFeng = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Feng ; } ) ;
            let vJian = tmp.filter( ( v )=>{ return HuChecker.parseCardType(v) == eMJCardType.eCT_Jian ; } ) ;
            let vb = [] ; 
            if ( vBaiDa != null && vBaiDa.length > 0 )
            {
                vb = vb.concat(vBaiDa);
            }
            
            let g = this.isHoldCardShunWithoutJiang(vWan,vTong,vTiao,vJian,vFeng,vb) ;
            if ( g != null )
            {
                let result = new Group();
                result.cards.push(baiDa2,baiDaJiang);
                result.addChild(g);
                return result ;
            }
        }
        
        return null ;
    }

    private removeValueFromArray( v : number[] , value : number )
    {
        let idx = v.indexOf(value);
        v.splice(idx,1);
    }

    public static parseCardType( nCardNum : number  ) : eMJCardType
   {
       let nType = nCardNum & 0xF0 ;
       nType = nType >> 4 ;
       let type = <eMJCardType>nType ;
       if ( ( type < eMJCardType.eCT_Max && type > eMJCardType.eCT_None) == false )
       {
            console.error("parse card type error , cardnum = " + nCardNum) ;
       }

       return type ;
   }

    public static makeCardNum( type : eMJCardType , val : number ) : number
    {
        return (type << 4) | val ;
    }
}
