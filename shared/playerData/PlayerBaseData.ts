import { eMsgPort } from './../MessageIdentifer';
import { PlayerSimpleInfo } from './PlayerSimpleInfo';
import { key } from './../KeyDefine';
export class PlayerBaseData extends PlayerSimpleInfo
{
    diamond : number = 0 ;
    reliveTicket : number = 0 ;
    redBag : number = 0 ; 
    honour : number = 0 ;
    inviter : number = 0 ;
    ip : string = "" ;
    treeLevel : number = 1 ;
    fertilizer : number = 0 ;
    playingMatchIDs : number[] = [] ;
    signedMatches : number[] = [] ;
    freePrizeWheelTime : number = 0 ;
    stayDeskID : number = 0 ;
    stayDeskPort : eMsgPort = eMsgPort.ID_MSG_PORT_MAX ;
    cardID : string = "" ;
    continueLoginDayCnt : number = 0 ;
    lastLoginRewardTime : number = 0 ;
    // share Data func ;
    toJson() : Object 
    {
        let js = super.toJson();
        js[key.diamond] = this.diamond ;
        js[key.inviterUID] = this.inviter;
        js[key.ip] = this.ip ;
        js[key.treeLevel] = this.treeLevel ;
        js[key.fertilizer] = this.fertilizer ;
        js[key.playingMatchIDs] = JSON.stringify(this.playingMatchIDs||[]) ;
        js[key.reliveTicket] = this.reliveTicket  ;
        js[key.redBag] = this.redBag;
        js[key.honour] = this.honour;
        js[key.signedMatches] = JSON.stringify( this.signedMatches||[] ) ;
        js[key.freeWheelTime] = this.freePrizeWheelTime ;
        js[key.stayDeskID] = this.stayDeskID;
        js[key.stayDeskPort] = this.stayDeskPort;
        js[key.lastLoginRewardTime] = ( this.lastLoginRewardTime / 1000 ).toFixed(0);
        js[key.continueLoginDayCnt] = this.continueLoginDayCnt ;
        js[key.cardID] = this.cardID.length > 3 ? "1" : "" ;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        super.parse(js) ;
        this.diamond = js[key.diamond];
        this.inviter = js[key.inviterUID];
        this.ip = js[key.ip] ;
        this.treeLevel = js[key.treeLevel] ;
        this.fertilizer = js[key.fertilizer] ;
        this.reliveTicket = js[key.reliveTicket] ;
        this.redBag = js[key.redBag] ;
        this.honour = js[key.honour] ;
        this.stayDeskPort = js[key.stayDeskPort] || 0  ;
        this.stayDeskID = js[key.stayDeskID] || 0  ;
        this.freePrizeWheelTime = js[key.freeWheelTime] ;
        this.lastLoginRewardTime = js[key.lastLoginRewardTime] * 1000 ;
        this.continueLoginDayCnt = js[key.continueLoginDayCnt] ;
        this.cardID = js[key.cardID] || "";
        if ( js[key.playingMatchIDs] != null && (js[key.playingMatchIDs] as string).length > 2 )
        {
            this.playingMatchIDs = JSON.parse(js[key.playingMatchIDs]) ;
        }

        if ( js[key.signedMatches] != null && (js[key.signedMatches] as string).length > 2 )
        {
            this.signedMatches = JSON.parse(js[key.signedMatches]) ;
        }
    }
}