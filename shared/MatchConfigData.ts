import { XLogger } from './../common/Logger';
import { random } from 'lodash';
import { key } from './KeyDefine';
import { eMatchType, eItemType } from './SharedDefine';
import { eMsgPort } from './MessageIdentifer';
import { Item } from './IMoney';
export class RewardItem
{
    startRankIdx : number = 0 ; // both include , zero base idx ;
    endRankIdx : number = 0 ; // both include 
    rewards : Item[] = [] ;
    desc : string = "" ;
    
    parse( js : Object )
    {
        this.startRankIdx = js["startIdx"] ;
        this.endRankIdx = js["endIdx"] ;
        this.desc = js["desc"] ;
        let vr : Object[] = js["rewards"] ;
        for ( let v of vr )
        {
            let m = new Item() ;
            m.parse(v) ;
            this.rewards.push(m) ;
        }
    }

    toJs() : Object
    {
        let js = {} ;
        js["startIdx"] = this.startRankIdx;
        js["endIdx"] = this.endRankIdx ;
        js["desc"] = this.desc ;
        let v = [] ;
        for ( let vr of this.rewards )
        {
            v.push( vr.toJs() ) ;
        }
        js[key.rewards] = v ;
        return js;
    }

    getMoneyJs() : Object
    {
        let v = [] ;
        for ( let vr of this.rewards )
        {
            v.push( vr.toJs() ) ;
        }
        return v ;
    }
}

export class GuaFenReward
{
    playerCnt : number = 0 ;
    reward : Item = null ;
    honour : number = 0 ;
    desc : string = "" ;

    parse( js : Object )
    {
        this.playerCnt = js["playerCnt"] ;
        this.honour = js["honour"] ;
        if ( null == this.reward )
        {
            this.reward = new Item();
        }
        this.reward.parse(js["reward"]) ;
        this.desc = js["desc"] ;
    }

    toJs() : Object
    {
        let js = {} ;
        js["playerCnt"] = this.playerCnt;
        js["reward"] = this.reward.toJs();
        js["desc"] = this.desc;
        js["honour"] = this.honour ;
        return js ;
    }
}

export class LawRound
{
    idx : number = 0 ;
    gameRoundCnt : number = 2 ;
    canRelive : boolean = false ;
    reliveMoney : Item = null ;
    diFen : number = 10 ;
    promoteCnt : number = 2 ;
    isByDesk : boolean = false ;
    
    parse( js : Object )
    {
        this.idx = js["idx"] ;
        this.gameRoundCnt = js["gameRoundCnt"] ;
        this.canRelive = js["canRelive"] == 1 ;
        if ( this.canRelive )
        {
            this.reliveMoney = new Item();
            this.reliveMoney.parse(js["reliveMoney"]) ;
        }
        this.promoteCnt = js["promoteCnt"] ;
        this.isByDesk = js["isByDesk"] == 1 ;
        this.diFen = js["diFen"] ;
    }

    toJs() : Object
    {
        let js = {} ;
        js["idx"] = this.idx ;
        js["gameRoundCnt"] = this.gameRoundCnt ;
        js["canRelive"] = this.canRelive ? 1 : 0 ;
        if ( this.canRelive )
        {
            js["reliveTicketCnt"] = this.reliveMoney.toJs() ;
        }
        
        js["promoteCnt"] = this.promoteCnt ;
        js["isByDesk"] = this.isByDesk ? 1 : 0 ;
        js["diFen"] = this.diFen ;
        return js ;
    }
}

export class MatchCfg
{
    cfgID : number = 0 ;
    name : string = "" ;
    fee : Item = null ;
    gameType : eMsgPort = eMsgPort.ID_MSG_PORT_MAX ;
    matchType : eMatchType = eMatchType.eMatch_Max ;
    cntPerDesk : number = 4 ;
    playerCntLimit : number[] = [] ;
    startTime : string = "" ; // 1995-12-17T03:24:00 ; // must this format ; // fixTime match type used key 
    repeatTime : number = 60 ; // minites ;  // repeatTime match type used key 
    vRewards : RewardItem[] = [] ;
    mGuaFenReward : GuaFenReward = null ;
    vLawRounds : LawRound[] = [] ;
    initScore : number = 0 ;
    isBoLeMode : boolean = false ;
    ruleDesc : string = "" ;
    parse( js : Object )
    {
        this.cfgID = js["cfgID"] ;
        this.name = js["name"] ;
        if ( null == this.fee )
        {
            this.fee = new Item();
        }
        this.fee.parse( js["fee"] ) ;
        this.initScore = js["initScore"] ;
        this.gameType = js["gameType"] ;
        this.matchType = js["matchType"] ;
        this.cntPerDesk = js["cntPerDesk"] ;
        this.playerCntLimit = js["playerCntLimit"] ;
        this.startTime = js["startTime"] ;
        this.repeatTime = js["repeatTime"] ;
        this.isBoLeMode = js["isBoLeMode"] == 1 ;
        this.ruleDesc = js["ruleDesc"] ;
        let vR : Object[] = js["vRewards"]||[] ;
        for ( let v of vR )
        {
            let ri = new RewardItem();
            ri.parse(v) ;
            this.vRewards.push(ri) ;
        }

        if ( js["mGuaFenReward"] != null && vR.length == 0  )
        {
            this.mGuaFenReward = new GuaFenReward();
            this.mGuaFenReward.parse(js["mGuaFenReward"]) ;
        }

        if ( vR.length != 0 && js["mGuaFenReward"] != null )
        {
            XLogger.error( "two type of rewards can not be exsit at the same time" ) ;
        }

        let vl : Object[] = js["vLawRounds"] ;
        for ( let l of vl )
        {
            let lr = new LawRound();
            lr.parse(l) ;
            this.vLawRounds.push(lr) ;
        }
    }

    toJs() : Object
    {
        let js = {} ;
        js["cfgID"] = this.cfgID ;
        js["name"] = this.name;
        js["fee"] = this.fee.toJs();
        js["gameType"] = this.gameType;
        js["matchType"] = this.matchType;
        js["cntPerDesk"] = this.cntPerDesk ;
        js["playerCntLimit"] = this.playerCntLimit ;
        js["initScore"] = this.initScore;
        js["startTime"] = this.startTime;
        js["repeatTime"] = this.repeatTime;
        js["isBoLeMode"] = this.isBoLeMode ? 1 : 0 ;
        js["ruleDesc"] = this.ruleDesc;
        let vR : Object[] = []  ;
        for ( let v of this.vRewards )
        {
            vR.push(v.toJs()) ;
        }
        js["vRewards"] = vR ;

        if ( this.mGuaFenReward != null )
        {
            js["mGuaFenReward"] = this.mGuaFenReward.toJs();
        }

        let vl : Object[] = [] ;
        for ( let l of this.vLawRounds )
        {
            vl.push(l.toJs()) ;
        }
        js["vLawRounds"] = vl ;
        return js ;
    }

    getRewardItemByIdx( rankIdx : number ) : RewardItem 
    {
        if ( this.mGuaFenReward != null && this.vRewards.length == 0 )
        {
            XLogger.debug( "this is gua fen mode , cfgID = " + this.cfgID + " cnt = " + this.mGuaFenReward.reward.cnt + " honour = " + this.mGuaFenReward.honour ) ;
            let v = this.guaFen(this.mGuaFenReward.reward.cnt * 100, this.mGuaFenReward.playerCnt ) ;
            for ( let c of v )
            {
                let rv = new RewardItem() ;
                rv.startRankIdx = rv.endRankIdx = this.vRewards.length ;
                let item = new Item();
                item.type = this.mGuaFenReward.reward.type ;
                item.cnt = c/100;
                rv.rewards.push(item) ;

                if ( this.mGuaFenReward.honour != 0 )
                {
                    let hi = new Item();
                    hi.cnt = this.mGuaFenReward.honour ;
                    hi.type = eItemType.eItem_Honour ;
                    rv.rewards.push(hi) ;
                }

                this.vRewards.push(rv) ;
            }
        }

        for ( let v of this.vRewards )
        {
            if ( v.startRankIdx <= rankIdx && rankIdx <= v.endRankIdx )
            {
                return v ;
            }
        }

        return null ;
    }

    getLawRound( idx : number ) : LawRound 
    {
        for ( let l of this.vLawRounds )
        {
            if ( l.idx == idx )
            {
                return l ;
            }
        }

        return null ;
    }

    getLawRoundCnt()
    {
        return this.vLawRounds.length ;
    }

    isLastRound( idx : number ) : boolean
    {
        return null == this.getLawRound( idx + 1 ) ;
    }

    getTopLimit() : number
    {
        if ( this.playerCntLimit.length < 1 )
        {
            console.error("player cnt limt array length is < 1") ;
            return 100 ;
        }
        return this.playerCntLimit[1] ;
    }

    getLowLimit() : number
    {
        if ( this.playerCntLimit.length == 0 )
        {
            console.error("player cnt limt array length is zero") ;
            return 100 ;
        }
        return this.playerCntLimit[0] ;
    }

    protected guaFen( total : number , cnt : number  ) : number[]
    {
        let aver = ( total / cnt ) * 0.05;
        let base = Math.floor(aver) ;
        base = Math.max( base, 1 ) ;
        let vp = new Array<number>();
        for ( let idx = 0 ; idx < cnt ; ++idx )
        {
            vp.push(base) ;
        }

        total -= base * cnt ;
        let step = ( total / Math.max(100 ,cnt ) ) ;
        step = Math.floor(step) ;
        step = Math.max(step,1) ;
        while ( total != 0 )
        {
            let real = step ;
            if ( step >= total )
            {
                real = total ;
            }
            let idx = random(cnt-1,false);         
            vp[idx] += real ;
            total -= real ;
        }
        return vp ;
    }
}