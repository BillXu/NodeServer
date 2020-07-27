import { eMJDeskState } from './../SharedDefine';
import { key } from './../KeyDefine';
import { MJPlayerData } from './MJPlayerData';
import { IShareData } from './../IShareData';
export class MJDeskData implements IShareData
{
    deskID : number = 0 ;
    matchID : number = 0 ;
    lawIdx : number = 0 ;
    diFen : number = 0 ;
    roundCnt : number = 0 ;
    curRoundIdx : number = 0 ;
    bankerIdx : number = 0 ;
    seatCnt : number = 0 ;
    state : eMJDeskState = eMJDeskState.eState_WaitStart ;
    stateInfo : Object = {} ; // key value depoend on state , diffent state , diffent info ;
    leftCardCnt : number = 0 ;

    vPlayers : MJPlayerData[] = [] ;

    toJson() : Object 
    {
        let js = {} ;
        js[key.deskID] = this.deskID ;
        js[key.matchID] = this.matchID ;
        js[key.lawIdx] = this.lawIdx ;
        js[key.diFen] = this.diFen ;
        js[key.roundCnt] = this.roundCnt ;
        js[key.curRoundIdx] = this.curRoundIdx ;
        js[key.bankerIdx] = this.bankerIdx ;
        js[key.seatCnt] = this.seatCnt ;
        js[key.state] = this.state ;
        js[key.stateInfo] = this.stateInfo ;
        js[key.leftCardCnt] = this.leftCardCnt ;
        let vpls = [] ;
        for ( let p of this.vPlayers )
        {
            vpls.push(p.toJson()) ;
        }
        js[key.players] = vpls;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        this.deskID = js[key.deskID] ;
        this.matchID = js[key.matchID] ;
        this.lawIdx = js[key.lawIdx] ;
        this.diFen = js[key.diFen] ;
        this.roundCnt = js[key.roundCnt] ;
        this.curRoundIdx = js[key.curRoundIdx] ;
        this.bankerIdx = js[key.bankerIdx] ;
        this.seatCnt = js[key.seatCnt] ;
        this.state = js[key.state] ;
        this.stateInfo = js[key.state] ;
        this.leftCardCnt = js[key.leftCardCnt]
        let vps : Object[] = js[key.players] ;
        this.vPlayers.length = 0 ;
        if ( vps != null && vps.length > 0 )
        {
            if ( vps.length > this.seatCnt )
            {
                console.error( "player cnt is over seatCnt , pcnt = " + vps.length + " seatCnt = " + this.seatCnt ) ;
            }

            for ( let js of vps )
            {
                let p = this.createMJPlayerData();
                p.parse(js) ;
                this.vPlayers.push(p) ;
            }
        }
    }

    getPlayerByIdx( idx : number ) : MJPlayerData
    {
        for ( let v of this.vPlayers )
        {
            if ( v != null && v.nIdx == idx )
            {
                return v ;
            }
        }
        
        return null ;
    }

    addPlayer( player : MJPlayerData , idx : number ) : boolean 
    {
        if ( this.vPlayers.length >= this.seatCnt )
        {
            console.error( "player seat is full , can not add more player" ) ;
            return false ;
        }

        if ( this.getPlayerByIdx(idx) )
        {
            console.error( "already have player in pos of idx = " + idx ) ;
            return false ;
        }

        player.nIdx = idx ;
        this.vPlayers.push(player) ;
    }

    isPlayerInDesk( nSessionID : number ) : boolean
    {
        for ( let p of this.vPlayers )
        {
            if ( p.sessionID == nSessionID )
            {
                return true ;
            }
        }
        return false ;
    }

    createMJPlayerData() : MJPlayerData
    {
        return null ;
    }
}