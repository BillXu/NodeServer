import { IMoney } from './../../shared/IMoney';
import { eItemType } from './../../shared/SharedDefine';
import { key } from './../../shared/KeyDefine';
import { XLogger } from './../../common/Logger';
import { ePlayerNetState } from './../../common/commonDefine';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { IPlayerCompent } from './IPlayerCompent';
import { PlayerBaseData } from './../../shared/playerData/PlayerBaseData';
import { Player } from './Player';
import { random, remove } from 'lodash';
import { eRpcFuncID } from '../../common/Rpc/RpcFuncID';
export class PlayerBaseInfo extends PlayerBaseData implements IPlayerCompent
{
    static s_Name : string = "PlayerBaseInfo" ;
    protected mPlayer : Player = null ;
    protected mIsLoadedData : boolean = false ;
    protected mNetState : ePlayerNetState = ePlayerNetState.eState_Online ;
    protected mLastCheckGlobalMailID : number = -1 ;
    treeCDEndTime : number = 0 ;

    get isLoaded() : boolean
    {
        return this.mIsLoadedData ;
    }

    get lastCheckGlobalMailID() : number
    {
        return this.mLastCheckGlobalMailID ;
    }

    set lastCheckGlobalMailID( id : number )
    {
        this.mLastCheckGlobalMailID = id ;
        let arg = { sql : "update playerData set lastCheckGlobalMailID = " + id + " where uid = " + this.uid + " limit 1 ;" } ;
        this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;
    }

    get netState() : ePlayerNetState
    {
        return this.mNetState ;
    }

    toJson() : Object 
    {
        let js = super.toJson();
        js[key.treeCDEndTime] = this.treeCDEndTime ;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        super.parse(js) ;
        this.treeCDEndTime = js[key.treeCDEndTime] * 1000;
    }

    init( player : Player , ip : string ) : void 
    {
        this.mPlayer = player ;
        this.ip = ip ;
        this.mNetState = ePlayerNetState.eState_Online ;
        this.loadDataInfo();
    }

    getCompentName() : string
    {
        return PlayerBaseInfo.s_Name ;
    }

    onReactive( sessionID : number , ip : string ) : void 
    {
        this.ip = ip ;
        this.mNetState = ePlayerNetState.eState_Online ;
        if ( this.mIsLoadedData == false )
        {
            this.loadDataInfo();
        }
        else
        {
            this.sendDataInfoToClient();
            this.informMatchNetState();
        }
    }

    onLogicMsg( msgID : eMsgType , msg : Object ) : boolean
    {
        switch ( msgID )
        {
            case eMsgType.MSG_PLAYER_UPDATE_INFO:
                {
                    if ( this.nickName == msg[key.nickeName] && this.sex == msg[key.sex] && this.headIconUrl == msg[key.headIcon] )
                    {
                        XLogger.debug( "info is the same no need to modify uid = " + this.mPlayer.uid ) ;
                        msg[key.ret] = 0 ;
                        this.mPlayer.sendMsgToClient(msgID, msg ) ;
                        break ;
                    }

                    this.nickName = msg[key.nickeName];
                    this.sex = msg[key.sex] ;
                    this.headIconUrl = msg[key.headIcon] ;

                    msg[key.ret] = 0 ;
                    this.mPlayer.sendMsgToClient(msgID, msg ) ;

                    let arg = { sql : "update playerData set nickName = '" + this.nickName + "' ," + " sex = " + this.sex + " , headUrl = '" + this.headIconUrl + "' " + " where uid = " + this.uid + " limit 1 ;" } ;
                    this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;
                }
                break ;
            case eMsgType.MSG_PLAYER_REFRESH_MONEY:
                {
                    msg[key.diamond] = this.diamond ;
                    this.mPlayer.sendMsgToClient(msgID, msg) ;
                }
                break;
            case eMsgType.MSG_PLAYER_BASE_DATA:
                {
                    this.sendDataInfoToClient();
                }
                break ;
            default:
                return false ;
        }
        return true ;
    }

    onOtherLogin( nNewSessionID : number , ip : string ) : void
    {
        this.ip = ip ;
        this.sendDataInfoToClient();
    }

    onUpdateNetState( state : ePlayerNetState , ip? : string ) : void 
    {
        if ( ePlayerNetState.eState_Online == state )
        {
            this.ip = ip ;
        }
        this.mNetState = state ;
        XLogger.debug( "player update netState = " + state + "sessionID = " + this.mPlayer.sessionID ) ;
        this.informMatchNetState();
    }

    onMoneyChanged( isRefreshToClient : boolean = false )
    {
        let arg = { sql : "update playerData set diamond = " + this.diamond + " , fertilizer = " + this.fertilizer + " where uid = " + this.uid + " limit 1 ;" } ;
        this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;

        if ( isRefreshToClient )
        {
            let msg = {} ;
            msg[key.diamond] = this.diamond ;
            msg[key.fertilizer] = this.fertilizer ;
            this.mPlayer.sendMsgToClient(eMsgType.MSG_PLAYER_REFRESH_MONEY, msg )  ;
        }

    }

    protected loadDataInfo()
    {
        if ( this.mIsLoadedData )
        {
            XLogger.warn( "player already loaded base data uid = " + this.mPlayer.uid + " sessionID = " + this.mPlayer.sessionID ) ;
            return ;
        }
        let rpc = this.mPlayer.getRpc();
        let self = this ;
        rpc.invokeRpc( eMsgPort.ID_MSG_PORT_DB, random(200,false ), eRpcFuncID.Func_LoadPlayerInfo,{uid : this.mPlayer.uid },( result : any )=>{
            if ( Object.keys(result).length == 0 )
            {
                XLogger.error( "db load base data error uid = " + self.uid + " sessionID = " + self.mPlayer.sessionID ) ;
                return ;
            }
            self.parse(result) ;
            self.mLastCheckGlobalMailID = result["lastCheckGlobalMailID"] || 0 ;
            XLogger.debug( "finish load base data uid = " + self.mPlayer.uid + " sessionID = " + self.mPlayer.sessionID ) ;
            self.onFinishLoadData();
        } );
    }

    protected onFinishLoadData()
    {
        this.mIsLoadedData = true ;
        this.mPlayer.onLoadBaseInfoFinished();
        this.sendDataInfoToClient();
        this.informMatchNetState();
    }

    protected informMatchNetState()
    {
        if ( this.playingMatchID != 0 )
        {
            // arg : { matchID : 234 , uid : 23 , sessionID : 234 , state : ePlayerNetState }
            let arg = {} ;
            arg[key.matchID] = this.playingMatchID ;
            arg[key.uid] = this.uid ;
            arg[key.sessionID] = this.mPlayer.sessionID ;
            arg[key.state] = this.mNetState ;
            this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_MATCH, this.playingMatchID, eRpcFuncID.Func_MatchUpdatePlayerNetState, arg ) ;
        }
    }
    onLoadBaseInfoFinished() : void{}

    protected sendDataInfoToClient()
    {
        if ( this.mIsLoadedData == false )
        {
            XLogger.warn( "do not finish load data , should not send to client , uid = " + this.mPlayer.uid + " sessionID = " + this.mPlayer.sessionID ) ;
            return ;
        }

        let js = this.toJson();
        this.mPlayer.sendMsgToClient(eMsgType.MSG_PLAYER_BASE_DATA, js ) ;
        XLogger.debug( "send base data to client uid = " + this.mPlayer.uid + "sessionID = " +  this.mPlayer.sessionID ) ;
    }

    onRPCCall( funcID : eRpcFuncID , arg : Object ) : Object
    {        
        switch ( funcID )
        {
            case eRpcFuncID.Func_ReqPlayerPlayingMatch:
                {
                    return { ret : 0 , matchID : this.playingMatchID } ;
                }
                break ;
            case eRpcFuncID.Func_SetPlayingMatch:
                {
                    let mid = arg[key.matchID] ;
                    let isStart = arg[key.isStart] == 1 ;
                    if ( isStart == false && mid != this.playingMatchID )
                    {
                        XLogger.warn( "ending match is not playing match ,why ? uid = " + this.uid + " playing matchID = " + this.playingMatchID + " ending MatchID = " + mid ) ;
                    }
                    
                    if ( isStart && this.playingMatchID != 0 )
                    {
                        XLogger.warn( "playing matchID is not 0 , how can start another game uid = " + this.uid + " starting matchID = " + mid + " playing matchID " + this.playingMatchID  ) ;
                    }

                    this.playingMatchID = isStart ? mid : 0 ;
                    let vR = remove(this.signedMatches,( id : number )=> id == mid ) || [];
                    if ( vR.length == 0 )
                    {
                        XLogger.warn( "remove signed math to playing match , but can not find uid = " + this.uid + " matchID = " + mid ) ;
                    }
                }
                break ;
            case eRpcFuncID.Func_DeductionMoney:
                {
                    // arg : { uid : 2345 , sessionID : 23 , moneyType : eItemType , cnt : 234 , comment : "descript why this option" }
                    // result : { ret : 0 , moneyType : eItemType , cnt : 234 }
                    // ret : 0 , success , 1 uid error , 2 money not enough ;
                    arg[key.ret] = this.onModifyMoney( arg[key.moneyType], arg[key.cnt] * -1 ,arg[key.comment] ) ? 0 : 2 ;
                    XLogger.debug( "player deduction money uid = " + this.uid + " result = " + ( arg[key.ret] == 0  ? " success " : " failed "  ) + " detail : " + JSON.stringify(arg) );
                    return arg ;
                }
                break ;
            case eRpcFuncID.Func_addMoney:
                {
                    // arg : { uid : 2345, moneyType : eItemType , cnt : 234,comment : "descript why this option" }
                    this.onModifyMoney( arg[key.moneyType], arg[key.cnt] ,arg[key.comment] ) ? 0 : 2 ;
                    XLogger.debug( "player add money uid = " + this.uid + " type = " + arg[key.moneyType] + " cnt = " + arg[key.cnt] + " comment = " + key.comment ) ;
                }
                break ;
            case eRpcFuncID.Func_ModifySignedMatch:
                {
                    // arg { uid : 234 , matchID : 234 , isAdd : 0 }
                    let mid = arg[key.matchID] ;
                    let idx = this.signedMatches.indexOf( mid ) ;
                    let isAdd = arg[key.isAdd] == 1 ;
                    if ( isAdd && idx != -1 )
                    {
                        XLogger.warn( "adding signed up matchID , but already in list matchID = " + mid + " uid = " + this.uid + " signedMatches = " + JSON.stringify(this.signedMatches) ) ;
                        break ;
                    }

                    if ( isAdd == false && idx == -1 )
                    {
                        XLogger.warn( "removing signed up matchID , but do not in list matchID = " + mid + " uid = " + this.uid + " signedMatches = " + JSON.stringify(this.signedMatches) ) ;
                        break ;
                    }
                    
                    let r = isAdd ? this.signedMatches.push(mid) : this.signedMatches.splice(idx,1) ;
                    XLogger.debug( "stop complie remove unuse var , so print r = " + r  ) ;
                }
                break ;
            case eRpcFuncID.Func_MatchResult:
                {
                    // arg : { uid : 235 , rankIdx : 2 ,  reward : IMoney[] , matchID : 2345 , matchName : "this is a match" }
                    let vRwards : IMoney[] = arg[key.reward] ;
                    let mid = arg[key.matchID] ;
                    if ( vRwards == null )
                    {
                        XLogger.debug( "player do not get reward uid = " + this.uid + " matchID = " + mid ) ;
                    }
                    else
                    {
                        for ( let m of vRwards )
                        {
                            this.onModifyMoney(m.type, m.cnt, arg[key.matchName] + " 获奖名次：" + arg[key.rankIdx] ,false ) ;
                        }
                        this.onMoneyChanged(true) ;
                    }

                    if ( mid != this.playingMatchID )
                    {
                        XLogger.warn( "result ending match is not playing match ,why ? uid = " + this.uid + " playing matchID = " + this.playingMatchID + " ending MatchID = " + mid ) ;
                    }
                    this.playingMatchID = 0 ; // clear playing flag ;
                }
                break ;
            default:
                XLogger.warn("unknown rpc call for player rpc funcID = " + eRpcFuncID[funcID] + " uid = " + this.uid + " arg = " + JSON.stringify(arg || {} )) ; 
                return {} ;
        }
        return {} ;
    }

    onModifyMoney( moneyType : eItemType , cnt : number , commont : string, isSaveDB : boolean = true  ) : boolean 
    {
        if ( cnt == 0 )
        {
            XLogger.warn( "modify money cnt = 0 type = " + moneyType + " uid = " + this.uid + " comment = " + commont ) ;
            return true ;
        }

        let isAdd = cnt > 0 ;
        if ( eItemType.eItem_Diamond == moneyType )
        {
            if ( isAdd == false && this.diamond < Math.abs(cnt) )
            {
                return false ;
            }
            this.diamond += cnt ;
            if ( isSaveDB )
            {
                this.onMoneyChanged( false ) ;
            }
            return true ;
        }

        XLogger.warn( "known money type = " + moneyType + " cnt = " + cnt + " uid = " + this.uid ) ;
        return false ;
    }
}