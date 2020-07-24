import { Match } from "./Match";
import { eMatchState } from "../../shared/SharedDefine";

export class MatchQuick extends Match
{
    onPlayerSignedUp( uid : number , sessionID : number )
    {
        super.onPlayerSignedUp(uid, sessionID ) ;
        if ( this.mSignedPlayers.count() >= this.mCfg.playerCntLimt[0] )
        {
            this.doEneterMatchBattle();
        }
        this.mState = eMatchState.eMatch_SignUp ;
    }
}