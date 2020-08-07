import { eMsgPort } from './../MessageIdentifer';
import { eMJDeskState } from './../SharedDefine';
import { key } from './../KeyDefine';
import { IShareData } from './../IShareData';
export class MJDeskData implements IShareData
{
    gamePort : eMsgPort = 0 ;
    deskID : number = 0 ;
    matchID : number = 0 ;
    lawIdx : number = 0 ;
    diFen : number = 0 ;
    roundCnt : number = 0 ;
    curRoundIdx : number = 0 ;
    bankerIdx : number = 0 ;
    seatCnt : number = 0 ;
    state : eMJDeskState = eMJDeskState.eState_WaitStart ;
    stateInfo : Object = {}; // key value depoend on state , diffent state , diffent info ;
    leftCardCnt : number = 0 ;
    vDice : number[] = [] ;
    lastChuIdx : number = -1 ;

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
        js[key.vDice] = this.vDice ;
        js[key.port] = this.gamePort ;
        js[key.lastChuIdx] = this.lastChuIdx ;
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
        this.leftCardCnt = js[key.leftCardCnt] ;
        this.vDice = js[key.vDice] ;
        this.gamePort = js[key.port] ;
        this.lastChuIdx = js[key.lastChuIdx] ;
    }
}