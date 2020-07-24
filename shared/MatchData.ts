import { key } from './KeyDefine';
import { eMatchType, eMatchState } from './SharedDefine';
import { IShareData } from './IShareData';
export class MatchData implements IShareData
{
    matchID : number = 0 ;
    mState : eMatchState = 0 ;
    mType : eMatchType = 0 ;
    mCfgID : number = 0 ;

    toJson() : Object 
    {
        let js = {} ;
        js[key.matchID] = this.matchID ;
        js[key.state] = this.mState ;
        js[key.type] = this.mType ;
        js[key.cfgID] = this.mCfgID ;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        this.matchID = js[key.matchID] ;
        this.mState = js[key.state] ;
        this.mType = js[key.type] ;
        this.mCfgID = js[key.cfgID] ;
    }
}