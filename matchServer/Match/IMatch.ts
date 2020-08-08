import { MatchCfg } from './../../shared/MatchConfigData';
import { ePlayerNetState } from './../../common/commonDefine';
import { eMatchType, eItemType } from './../../shared/SharedDefine';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { MatchMgr } from './../MatchMgr';

export interface ILawRoundConfig
{
    roundIdx : number ;
    upgradeCnt : number ; 
    gameRoundCnt : number;
    diFen : number ;
}

// export interface IMatchConfig
// {
//     id : number ;
//     matchName : string ;
//     matchType : eMatchType ;
//     gamePort : eMsgPort ;  // game type ;
//     startSignTime : string ;  // 1995-12-17T03:24:00 ; // must this format ; // fixTime match type used key 
//     startTime : string ;  // 1995-12-17T03:24:00 ; // must this format ;     // fixTime match type used key 
//     repeatTime : number ; // by minites ;           // repeatTime match type used key 
//     repeatTimeMatchOpenDuration : number[] // hour , by 24 type  eg : 18 means 6 pm ; two value [] , 26 means next day 2 : 00 am ;  // repeatTime match type used key 
//     signUpFee : { moneyType : eItemType , cnt : number } ;
//     playerCntLimt : number[] ; // low limit , and up limit ;
//     reward: { startIdx : number , endEndIdx : number , money : IMoney[], desc : string }[] ;
//     playerCntPerDesk : number ; 
//     guaFenPlayerCnt : number ; 
//     initScore : number ;
//     laws : ILawRoundConfig[] 
// }

export interface IMatch
{
    init( cfg : MatchCfg , matchID : number ,mgr : MatchMgr ) : void;
    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean ;
    onVisitInfo( jsInfo : Object ) : void ;
    onDeskFinished( lawIdx : number , deskID : number, result : { uid : number , score : number }[] ) : void ;
    onRefreshPlayerNetState( uid : number , sessionID : number ,netState : ePlayerNetState ) : boolean ;
    getType() : eMatchType ; 
    getMatchID() : number ;
    isClosed() : boolean ;
    clear() : void ;
}