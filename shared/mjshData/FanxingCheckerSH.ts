import { XLogger } from './../../common/Logger';
import { FanxingDaDiaoChe } from './../mjFaxnxingChecker/FanxingDaDiaoChe';
import { FanxingPengPengHu } from './../mjFaxnxingChecker/FanxingPengPengHu';
import { FanxingQingYiSe } from './../mjFaxnxingChecker/FanxingQingYiSe';
import { FanxingHunYiSe } from './../mjFaxnxingChecker/FanxingHunYiSe';
import { eFanxingMJ } from './../mjData/MJDefine';
import { IFanxing } from './../mjFaxnxingChecker/IFanxing';
import { MJPlayerDataSH } from './MJPlayerDataSH';
import { FanxingMenQing } from '../mjFaxnxingChecker/FanxingMenQing';
export class FanxingCheckerSH
{
    vFanxing : IFanxing[] = [] ;
    static s_Checker : FanxingCheckerSH = null ;
    static getInstance() : FanxingCheckerSH
    {
        if ( null == FanxingCheckerSH.s_Checker )
        {
            FanxingCheckerSH.s_Checker = new FanxingCheckerSH();
            FanxingCheckerSH.s_Checker.init();
        }

        return FanxingCheckerSH.s_Checker ;
    }

    protected init()
    {
        this.vFanxing.push(new FanxingHunYiSe()) ;
        this.vFanxing.push( new FanxingQingYiSe() ) ;
        this.vFanxing.push( new FanxingPengPengHu() , new FanxingDaDiaoChe(),new FanxingMenQing() ) ;
    }

    checkFanxing( playerData : MJPlayerDataSH , isGangKia : boolean , isRobGang : boolean , diFen : number ) : { fanxing : number , beiShu : number , score : number  } 
    {
        let fanxing = 0 ;
        let vh = playerData.getHoldHuaCards();
        let vac = playerData.getActedCards();
        if ( vh.length % 3 != 2 )
        {
            XLogger.error( "check card cnt is not ok , please put hu card into hold" ) ;
            return null ;
        }

        for ( let f of this.vFanxing )
        {
            if ( f.checking(vh, vac ) )
            {
                fanxing |= f.getType();
            }
        }

        if ( isGangKia )
        {
            fanxing |= eFanxingMJ.eGangKai ;
        }

        if ( isRobGang )
        {
            fanxing |= eFanxingMJ.eQiangGang;
        }

        let hua = playerData.getTotalHuaCnt();
        if ( hua == 0 )
        {
            hua = 10 ; 
            fanxing |= eFanxingMJ.eWuHuaGuo ;
        }

        hua += diFen ;
        let bei = this.getBeiShu(fanxing) ;
        let score = hua * bei ;
        if ( isRobGang )
        {
            score *= 3 ;
        }

        return { fanxing : fanxing , beiShu : bei , score : score } ;
    }

    protected getBeiShu( fanxing : number ) : number
    {
        let fan = 0 ;
        if ( this.isHave(fanxing, eFanxingMJ.eDaDiaoChe ) )
        {
            fan += 1 ;
        }

        if ( this.isHave(fanxing, eFanxingMJ.eGangKai ) )
        {
            fan += 1 ;
        }

        if ( this.isHave(fanxing, eFanxingMJ.eMengQing ) )
        {
            fan += 1 ;
        }

        if ( this.isHave(fanxing, eFanxingMJ.eHunYiSe ) )
        {
            fan += 1 ;
        }

        if ( this.isHave(fanxing, eFanxingMJ.ePengPengHu ) )
        {
            fan += 1 ;
        }

        if ( this.isHave(fanxing, eFanxingMJ.eQingYiSe ) )
        {
            fan += 2 ;
        }

        return Math.pow(2, fan) ;
    }

    isHave( fanxing : number , efanxing : eFanxingMJ )
    {
        return ( fanxing & efanxing ) == efanxing ;
    }
}