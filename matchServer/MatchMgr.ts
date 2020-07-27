import { XLogger } from './../common/Logger';
import { key } from './../shared/KeyDefine';
import { eMatchType } from './../shared/SharedDefine';
import HashMap  from 'hashmap';
import { IMatch } from './Match/IMatch';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IModule } from "../common/IModule";
import { eRpcFuncID } from '../common/Rpc/RpcFuncID';

export class MatchMgr extends IModule
{
    static MODULE_NAME : string = "MatchMgr";
    protected mMatchs : HashMap<number,IMatch> = new HashMap<number,IMatch>(); // { matchiID : Imatch }
    protected mTypeMatchs : HashMap<eMatchType,Array<IMatch> > = new HashMap<eMatchType,Array<IMatch> >(); 
    getModuleType() : string
    {
        return MatchMgr.MODULE_NAME ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort, targetID : number ) : boolean 
    {
        if ( eMsgType.MSG_PLAYER_REQ_MATCH_LIST == msgID )
        {
            let type = msg[key.type] ;
            let v = this.mTypeMatchs.get(type) ;
            let vm = [] ;
            if ( v != null )
            {
                for ( let m of v )
                {
                    if ( m.isClosed() )
                    {
                        continue ;
                    }

                    let jsm = {};
                    m.onVisitInfo(jsm) ;
                    vm.push(jsm) ;
                }
            }

            msg[key.matchs] = vm;
            this.sendMsg(msgID, msg, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
            return true ;
        }

        let m = this.mMatchs.get(targetID) ;
        if ( m == null )
        {
            msg[key.ret] = 200 ;
            msg["err"] = "can not find math with ID = " + targetID ;
            this.sendMsg(msgID, msg, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
            return false ;
        }
        return m.onLogicMsg(msgID, msg, orgID ) ;
    }

    onRegistedToCenter( svrIdx : number , svrMaxCnt : number ) : void 
    {
        super.onRegistedToCenter(svrIdx, svrMaxCnt) ;
    }

    onRegisterToSvrApp(svrApp)
    {
        super.onRegisterToSvrApp(svrApp) ;
        this.installRpc() ;
    }

    protected installRpc()
    {
        let rpc = this.getSvrApp().getRpc();
        let self = this ;
        rpc.registerRPC( eRpcFuncID.Func_MatchUpdatePlayerNetState, ( seialID : number , arg : Object )=>{
            // arg : { matchID : 234 , uid : 23 , sessionID : 234 , state : ePlayerNetState }
            let matchID = arg[key.matchID] ;
            let m = self.mMatchs.get(matchID) ;
            if ( null == m )
            {
                XLogger.warn( "inform playe net state but match is null matchID = " + matchID + " uid = " + arg[key.uid] ) ;
                return {} ;
            } 
            m.onRefreshPlayerNetState( arg[key.uid], arg[key.sessionID], arg[key.state] ) ;
            return {}
        } ) ;

        rpc.registerRPC( eRpcFuncID.Func_InformDeskResult, ( seialID : number , arg : Object )=>{
            // arg : { matchID : 234 , lawIdx : 23 , deksID : 2 , players : { uid : 23 , score : 23 }[] }
            let matchID = arg[key.matchID] ;
            let m = self.mMatchs.get(matchID) ;
            if ( null == m )
            {
                XLogger.warn( "inform match result but match is null matchID = " + matchID + " reuslt = " + JSON.stringify(arg[key.result]) ) ;
                return {} ;
            } 
            m.onDeskFinished(arg[key.lawIdx],arg[key.deskID],arg[key.result]) ;
            return {}
        } ) ;
    }
    // self function 
    deleteMatch( matchID : number )
    {
        if ( this.mMatchs.has(matchID) )
        {
            this.mMatchs.delete( matchID ) ;
        }
        else
        {
            XLogger.warn( "delete match but match do not exit ,matchID = " + matchID  ) ;
        }
    }
}