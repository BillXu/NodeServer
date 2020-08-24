import { SVR_ARG } from './../common/ServerDefine';
import { MatchCfg } from './../shared/MatchConfigData';
import { MatchRepeatTime } from './Match/MatchRepeatTime';
import { MatchFixTime } from './Match/MatchFixTime';
import { MatchQuick } from './Match/MatchQuick';
import { Match } from './Match/Match';
import { MatchConfigLoader } from './MatchConfigLoader';
import { XLogger } from './../common/Logger';
import { key } from './../shared/KeyDefine';
import { eMatchType, eMatchState } from './../shared/SharedDefine';
import HashMap  from 'hashmap';
import { IMatch } from './Match/IMatch';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IModule } from "../common/IModule";
import { eRpcFuncID } from '../common/Rpc/RpcFuncID';
import { IServerApp } from '../common/IServerApp';

export class MatchMgr extends IModule
{
    static MODULE_NAME : string = "MatchMgr";
    protected mMatchs : HashMap<number,IMatch> = new HashMap<number,IMatch>(); // { matchiID : Imatch }
    protected mTypeMatchs : HashMap<eMatchType,Array<IMatch> > = new HashMap<eMatchType,Array<IMatch> >(); 
    protected mCfgLoader : MatchConfigLoader = null ;
    protected mMaxMatchID : number = 0 ;
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
        if ( null == this.mCfgLoader )
        {
            this.mCfgLoader = new MatchConfigLoader();
            this.mCfgLoader.loadConfig( SVR_ARG.matchCfgUrl, this.loadCfgResult.bind(this) ) ;
        }
    }

    onRegisterToSvrApp(svrApp : IServerApp )
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
            m.onDeskFinished(arg[key.lawIdx],arg[key.deskID],arg[key.players]) ;
            return {}
        } ) ;
    }

    onRpcCall(funcID : eRpcFuncID, arg : Object, sieral : number , outResult : Object ) : boolean
    {
        switch ( funcID )
        {
            case eRpcFuncID.Http_ReqMatchList:
                {
                    // result { list : { matchID : 23 , cfgID : 23 }[] }
                    outResult["ret"] = 0 ;
                    XLogger.debug( "http cmd Http_ReqMatchList ") ;
                    let vList : Object[] = [] ;
                    let vs = this.mMatchs.values();
                    for ( let m of vs )
                    {
                        vList.push( { matchID : m.getMatchID(), cfgID : m.getCfgID() } ) ;
                    }
                    outResult["list"] = vList;
                }
                break;
            case eRpcFuncID.Http_ReloadMatchCfg:
                {
                    XLogger.debug( "http cmd Http_ReloadMatchCfg ") ;
                    let self = this ;
                    this.mCfgLoader.loadConfig( SVR_ARG.matchCfgUrl, ( cfgs : MatchCfg[], loader : MatchConfigLoader )=>{ 
                        XLogger.debug( "reload matchCfg Ok " ) ; 
                        let ms = self.mMatchs.values();
                        ms.forEach(m=>m.onRefreshCfg(loader.getConfigByID(m.getCfgID()))) ;
                    } ) ;
                    outResult[key.ret] = 0 ;
                }
                break;
            case eRpcFuncID.Http_SetMatchState:
                {
                    // arg : { matchID : 23 , state : eMatchState }
                    XLogger.debug( "http set match state = " + JSON.stringify(arg) ) ;
                    let matchID = arg[key.matchID] ;
                    let match = this.mMatchs.get(matchID) ;
                    if ( match == null )
                    {
                        outResult["ret"] = 1 ;
                        outResult["error"] = "match do not exsit" ;
                        break ;
                    }

                    if ( arg[key.state] == eMatchState.eMatch_Delete )
                    {
                        this.deleteMatch(matchID) ;
                        outResult[key.ret] = 0 ;
                        break ;
                    }

                    (match as Match).mState = arg[key.state] ;
                }
                break;
            case eRpcFuncID.Http_ReqMatchInfo:
                {
                    let m = this.mMatchs.get(arg[key.matchID] ) ;
                    if ( m == null )
                    {
                        outResult[key.ret] = 1 ;
                        outResult["error"] = "match do not exist" ;
                        break ;
                    }
                    m.onHttpVisitInfo(outResult) ;
                    outResult[key.ret] = 0 ;
                }
                break;
            case eRpcFuncID.Http_ReqMatchLawInfo:
                {
                    let m = this.mMatchs.get(arg[key.matchID] ) ;
                    if ( m == null )
                    {
                        outResult[key.ret] = 1 ;
                        outResult["error"] = "match do not exist" ;
                        break ;
                    }
                    m.onHttpVisitLawInfo( arg[key.lawIdx] ,outResult) ;
                    outResult[key.ret] = 0 ;
                }
                break;
            default:
                return super.onRpcCall(funcID, arg, sieral, outResult) ;
        }
        return true ;
    }
    // self function 
    deleteMatch( matchID : number )
    {
        let m = this.mMatchs.get( matchID ) ;
        if ( m != null )
        {
            m.clear();
            this.mMatchs.delete( matchID ) ;
        }
        else
        {
            XLogger.warn( "delete match but match do not exit ,matchID = " + matchID  ) ;
        }
    }

    protected loadCfgResult( cfgs : MatchCfg[], loader : MatchConfigLoader )
    {
        for ( let cfg of cfgs )
        {
            let m : Match = null;
            if ( cfg.matchType == eMatchType.eMatch_Quick )
            {
                m = new MatchQuick();
            }
            else if ( cfg.matchType == eMatchType.eMatch_FixTime )
            {
                m = new MatchFixTime();
            }
            else if ( cfg.matchType == eMatchType.eMatch_RepeatTime )
            {
                XLogger.debug( "create match type = " + eMatchType[cfg.matchType] + " cfgID = " + cfg.cfgID ) ;
                m = new MatchRepeatTime();
            }
            else
            {
                XLogger.error( "unknown matchType = " + cfg.matchType + " cfgID = " + cfg.cfgID ) ;
                continue ;
            }
            XLogger.debug( "create match type = " + eMatchType[cfg.matchType] + " cfgID = " + cfg.cfgID ) ;
            m.init(cfg, this.generateMatchID(), this ) ;
            this.mMatchs.set(m.matchID,m) ;
            let type = m.getType();
            let tv = this.mTypeMatchs.get(type) ;
            if ( tv == null )
            {
                tv = new Array<Match>();
                this.mTypeMatchs.set(type, tv ) ;
            }
            tv.push(m) ;
            XLogger.debug( "created a matchID = " + m.matchID + " cfgID = " + m.mCfgID );
        }
    }

    protected generateMatchID() : number
    {
        if ( this.mMaxMatchID == 0 )
        {
            this.mMaxMatchID = this.getSvrApp().getCurSvrIdx();
        }
        this.mMaxMatchID += this.getSvrApp().getCurPortMaxCnt();
        return this.mMaxMatchID ;
    }
}