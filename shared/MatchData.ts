import { key } from './KeyDefine';
import { eMatchType, eMatchState } from './SharedDefine';
import { IShareData } from './IShareData';
export class MatchData implements IShareData
{
    matchID : number = 0 ;
    mState : eMatchState = 0 ;
    mType : eMatchType = 0 ;

    toJson() : Object 
    {
        let js = {} ;
        js[key.id] = this.matchID ;
        js[key.state] = this.mState ;
        js[key.type] = this.mType ;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        this.matchID = js[key.id] ;
        this.mState = js[key.state] ;
        this.mType = js[key.type] ;
    }
}