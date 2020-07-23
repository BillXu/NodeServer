import { eMatchType, eItemType } from './../../shared/SharedDefine';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { MatchMgr } from './../MatchMgr';

export interface IMatchConfig
{
    id : number ;
    matchName : string ;
    matchType : eMatchType ;
    gamePort : eMsgPort ;  // game type ;
    time : string ;
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