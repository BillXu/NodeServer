import { eMatchType, eItemType } from './../../shared/SharedDefine';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { MatchMgr } from './../MatchMgr';

export interface IMatchConfig
{
    id : number ;
    matchName : string ;
    matchType : eMatchType ;
    gamePort : eMsgPort ;  // game type ;
    startSignTime : string ;  // 1995-12-17T03:24:00 ; // must this format ; // fixTime match type used key 
    startTime : string ;  // 1995-12-17T03:24:00 ; // must this format ;     // fixTime match type used key 
    repeatTime : number ; // by minites ;           // repeatTime match type used key 
    repeatTimeMatchOpenDuration : number[] // hour , by 24 type  eg : 18 means 6 pm ; two value [] , 26 means next day 2 : 00 am ;  // repeatTime match type used key 
    signUpFee : { moneyType : eItemType , cnt : number } ;
    playerCntLimt : number[] ; // low limit , and up limit ;
    reward: { startIdx : string , endEndIdx : string , itemType : eItemType , cnt : number, desc : string }[] ;
}

export interface IMatch
{
    init( cfg : IMatchConfig , matchID : number ,mgr : MatchMgr ) : void;
    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean ;
    onVisitInfo( jsInfo : Object ) : void ;
    getType() : eMatchType ; 
    getMatchID() : number ;
    isClosed() : boolean ;
}