import  HashMap  from 'hashmap';
import { eMsgPort } from './../../shared/MessageIdentifer';
import { MatchPlayer } from './MatchPlayer';
import { ePlayerNetState } from './../../common/commonDefine';
import { IMatchLaw, IMatchLawDelegate } from './IMatchLaw';
import { Match } from './Match';
export class MatchLaw implements IMatchLaw
{
    protected mMatch : Match = null ;
    protected mGamePort : eMsgPort = 0 ;
    protected mLawIdx : number = 0 ;
    protected mPlayers = new HashMap<number,MatchPlayer>() // { uid : player }
    init( match : Match , gamePort : eMsgPort , lawIdx : number ) : void 
    {
        this.mMatch = match ;
        this.mGamePort = gamePort ;
        this.mLawIdx = lawIdx ;
    }

    getIdx() : number 
    {
        return this.mLawIdx ;
    }

    startLaw( players : HashMap<number,MatchPlayer> ) : void 
    {
        
    }

    onDeskFinished( deskID : number, result : { uid : number , score : number }[] ) : void 
    {

    }

    onRefreshPlayerNetState( uid : number , sessionID : number ,netState : ePlayerNetState  ) : void 
    {

    }

    setDelegate( pdel : IMatchLawDelegate ) : void 
    {

    }

    // self function 

}