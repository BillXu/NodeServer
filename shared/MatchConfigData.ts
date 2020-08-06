import { eMatchType } from './SharedDefine';
import { eMsgPort } from './MessageIdentifer';
import { IMoney } from './IMoney';
export class RewardItem
{
    startRankIdx : number = 0 ; // both include , zero base idx ;
    endRankIdx : number = 0 ; // both include 
    rewards : IMoney[] = [] ;
    desc : string = "" ;
    
    parse( js : Object )
    {
        this.startRankIdx = js["startIdx"] ;
        this.endRankIdx = js["endIdx"] ;
        this.desc = js["desc"] ;
        let vr : Object[] = js["rewards"] ;
        for ( let v of vr )
        {
            let m = new IMoney() ;
            m.parse(js) ;
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
        js["rewards"] = v ;
        return js;
    }
}

export class GuaFenReward
{
    playerCnt : number = 0 ;
    reward : IMoney = null ;
    desc : string = "" ;

    parse( js : Object )
    {
        this.playerCnt = js["playerCnt"] ;
        if ( null == this.reward )
        {
            this.reward = new IMoney();
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
        return js ;
    }
}


export class LawRound
{
    idx : number = 0 ;
    gameRoundCnt : number = 2 ;
    canRelive : boolean = false ;
    reliveTicketCnt : number = 1 ;
    promoteCnt : number = 2 ;
    isByDesk : boolean = false ;
    
    parse( js : Object )
    {
        this.idx = js["idx"] ;
        this.gameRoundCnt = js["gameRoundCnt"] ;
        this.canRelive = js["canRelive"] == 1 ;
        this.reliveTicketCnt = js["reliveTicketCnt"] || 0 ;
        this.promoteCnt = js["promoteCnt"] ;
        this.isByDesk = js["isByDesk"] == 1 ;
    }

    toJs() : Object
    {
        let js = {} ;
        js[""] = this.idx ;
        js["gameRoundCnt"] = this.gameRoundCnt ;
        js["canRelive"] = this.canRelive ? 1 : 0 ;
        js["reliveTicketCnt"] = this.reliveTicketCnt ;
        js["promoteCnt"] = this.promoteCnt ;
        js["isByDesk"] = this.isByDesk ? 1 : 0 ;
        return js ;
    }
}

export class MatchCfg
{
    cfgID : number = 0 ;
    name : string = "" ;
    fee : IMoney = null ;
    gameType : eMsgPort = eMsgPort.ID_MSG_PORT_MAX ;
    matchType : eMatchType = eMatchType.eMatch_Max ;
    cntPerDesk : number = 4 ;
    playerCntLimit : number[] = [] ;
    startTime : string = "" ; // 1995-12-17T03:24:00 ; // must this format ; // fixTime match type used key 
    repeatTime : number = 60 ; // minites ;  // repeatTime match type used key 
    vRewards : RewardItem[] = [] ;
    mGuaFenReward : GuaFenReward = null ;
    vLawRounds : LawRound[] = [] ;

    parse( js : Object )
    {
        this.cfgID = js["cfgID"] ;
        this.name = js["name"] ;
        if ( null == this.fee )
        {
            this.fee = new IMoney();
        }
        this.fee.parse( js["fee"] ) ;
        this.gameType = js["gameType"] ;
        this.matchType = js["matchType"] ;
        this.cntPerDesk = js["cntPerDesk"] ;
        this.playerCntLimit = js["playerCntLimit"] ;
        this.startTime = js["startTime"] ;
        this.repeatTime = js["repeatTime"] ;
        let vR : Object[] = js["vRewards"]||[] ;
        for ( let v of vR )
        {
            let ri = new RewardItem();
            ri.parse(v) ;
            this.vRewards.push(ri) ;
        }

        if ( js["mGuaFenReward"] != null )
        {
            this.mGuaFenReward = new GuaFenReward();
            this.mGuaFenReward.parse(js["mGuaFenReward"]) ;
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
        js["startTime"] = this.startTime;
        js["repeatTime"] = this.repeatTime;
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

    isGuaFenReward()
    {
        return this.vRewards != null && ( this.vRewards == null || this.vRewards.length == 0 );
    }

    getRewardItemByIdx( rankIdx : number ) : RewardItem 
    {
        for ( let v of this.vRewards )
        {
            if ( v.startRankIdx <= rankIdx && rankIdx << v.endRankIdx )
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

    isLastRound( idx : number ) : boolean
    {
        return null == this.getLawRound( idx + 1 ) ;
    }
}