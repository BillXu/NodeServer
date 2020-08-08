import { ePlayerNetState } from './../../common/commonDefine';
import { MatchPlayer } from './MatchPlayer';
import { eMsgPort } from '../../shared/MessageIdentifer';
import { Match } from './Match';
export interface IMatchLawDelegate
{
    onLawFinished( matchLaw : IMatchLaw ) : void ;
}

export interface IMatchLaw
{
    init( match : Match , lawIdx : number ) : void ;
    clear() : void ;
    getIdx() : number ;
    startLaw( players : HashMap<number,MatchPlayer> ) : void ;
    onDeskFinished( deskID : number, result : { uid : number , score : number }[] ) : void ;
    onRefreshPlayerNetState( uid : number , sessionID : number ,netState : ePlayerNetState ) : boolean ;
    setDelegate( pdel : IMatchLawDelegate ) : void ;
    visitPlayerMatchState( jsInfo : Object , sessionID : number ) : boolean ;
    onPlayerWantRelive( sessionID : number , uid : number ) : boolean ;
}