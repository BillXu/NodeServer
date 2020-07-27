import { ePlayerNetState } from './../../common/commonDefine';
import { MatchPlayer } from './MatchPlayer';
import { eMsgPort } from '../../shared/MessageIdentifer';
import { Match } from './Match';
export interface IMatchLawDelegate
{
    onPlayerFinish( player : MatchPlayer , rankIdx : number, matchLaw : IMatchLaw ) : void ;
    onGuaFenResultFinished( player : MatchPlayer[] , matchLaw : IMatchLaw ) : void ;
    onLawFinished( matchLaw : IMatchLaw ) : void ;
}

export interface IMatchLaw
{
    init( match : Match , gamePort : eMsgPort , lawIdx : number ) : void ;
    getIdx() : number ;
    startLaw( players : HashMap<number,MatchPlayer> ) : void ;
    onDeskFinished( deskID : number, result : { uid : number , score : number }[] ) : void ;
    onRefreshPlayerNetState( uid : number , sessionID : number ,netState : ePlayerNetState ) : boolean ;
    setDelegate( pdel : IMatchLawDelegate ) : void ;
}