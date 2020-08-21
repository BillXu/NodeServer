import { MatchCfg } from './../../shared/MatchConfigData';
import { eRpcFuncID } from './../../common/Rpc/RpcFuncID';
import { key } from './../../shared/KeyDefine';
import { XLogger } from './../../common/Logger';
import { MatchMgr } from './../MatchMgr';
import { Match } from "./Match";
import { eMatchState } from '../../shared/SharedDefine';
import { eMsgPort } from '../../shared/MessageIdentifer';

export class MatchRepeatTime extends Match
{
    protected mRepeatTimer : NodeJS.Timeout = null ;
    protected mNextStartTime : number = 0 ;
    
    init( cfg : MatchCfg , matchID : number ,mgr : MatchMgr ) : void
    {
        super.init(cfg, matchID, mgr ) ;

        let self = this ;
        self.mNextStartTime = Date.now() + self.mCfg.repeatTime * 60* 1000 ; 
        this.mRepeatTimer = setInterval( ()=>{ 
            self.mNextStartTime = Date.now() + self.mCfg.repeatTime * 60* 1000 ; 
            self.startEnterBattle(); 
        },1000 * 60 * this.mCfg.repeatTime );
    }

    clear()
    {
        super.clear();
        if ( this.mRepeatTimer != null )
        {
            clearInterval(this.mRepeatTimer) ;
            this.mRepeatTimer = null ;
        }
    } 

    onVisitInfo( jsInfo : Object ) : void 
    {
        super.onVisitInfo(jsInfo) ;
        jsInfo[key.leftTime] = Math.floor(   (  this.mNextStartTime - Date.now()   )   /  1000       );
    }

    startEnterBattle()
    {   
        if ( this.mEnrollPlayers.count() >= this.mCfg.getLowLimit() ) 
        {
            this.doEneterMatchBattle();
        }
        else
        {
            let v = this.mEnrollPlayers.keys() ;

            let rpc = this.mMatchMgr.getSvrApp().getRpc();
            let arg = {} ;
            arg[key.notice] = "尊敬的玩家您好，您报名的【" + this.mCfg.name + "】因人数不足而取消，已经帮你顺延本比赛下一期，如有不便，您也可以手动退赛。感谢您的参与和支持，谢谢！" ;
            for ( let uid of v )
            {
                // tell player the cannecl event ;
                arg[key.uid] = uid ;
                rpc.invokeRpc( eMsgPort.ID_MSG_PORT_DATA, uid, eRpcFuncID.Func_InformNotice, arg ) ;
            }
        }
        this.mState = eMatchState.eMatch_Enroll ;
    }

    onHttpVisitInfo( info : Object ) : void
    {
        info["openTime"] = Math.floor( this.mNextStartTime / 1000 ) ;
        super.onHttpVisitInfo(info) ;
    }
}