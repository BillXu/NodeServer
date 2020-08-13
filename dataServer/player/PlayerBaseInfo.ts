import { MailModule } from './../MailModule';
import { IItem } from './../../shared/IMoney';
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
    protected mIsRobot : boolean  = false ;

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
            case eMsgType.MSG_R_TELL:
                {
                    if ( this.mIsRobot )
                    {
                        XLogger.debug( "already telled robot , not need tell again uid = " + this.uid ) ;
                        return ;
                    }
                    this.mIsRobot = true ;
                    let arg = {} ;
                    arg[key.uid] = this.uid;
                    arg[key.sessionID] = this.mPlayer.sessionID ;
                    this.mPlayer.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_R, 0, eRpcFuncID.Func_OnRobotLogin, arg) ;
                    XLogger.debug( "tell robot svr , robot login uid = " + this.uid ) ;
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
        this.informRobotSvrNetState();
    }

    onMoneyChanged( isRefreshToClient : boolean = false )
    {
        let arg = { sql : "update playerData set diamond = " + this.diamond + " , fertilizer = " + this.fertilizer  + " , reliveTicket = " + this.reliveTicket + " , honour = " + this.honour + " , redBag = " + this.redBag  + " where uid = " + this.uid + " limit 1 ;" } ;
        this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;

        if ( isRefreshToClient )
        {
            let msg = {} ;
            msg[key.diamond] = this.diamond ;
            msg[key.fertilizer] = this.fertilizer ;
            msg[key.reliveTicket] = this.reliveTicket ;
            msg[key.honour] = this.honour;
            msg[key.redBag] = this.redBag;
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
            if ( null == result || Object.keys(result).length == 0 )
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
        if ( this.playingMatchIDs.length > 0 )
        {
            // arg : { matchID : 234 , uid : 23 , sessionID : 234 , state : ePlayerNetState }
            for ( let pid of this.playingMatchIDs )
            {
                let arg = {} ;
                arg[key.matchID] = pid ;
                arg[key.uid] = this.uid ;
                arg[key.sessionID] = this.mPlayer.sessionID ;
                arg[key.state] = this.mNetState ;
                this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_MATCH, pid, eRpcFuncID.Func_MatchUpdatePlayerNetState, arg ) ;
            }
        }
    }

    protected informRobotSvrNetState()
    {
        if ( this.mIsRobot )
        {
            let arg = {} ;
            arg[key.uid] = this.uid;
            arg[key.sessionID] = this.mPlayer.sessionID ;
            arg[key.state] = this.mNetState ;
            this.mPlayer.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_R, 0, eRpcFuncID.Func_InformPlayerNetState, arg) ;
            XLogger.debug( "tell robot svr robot state changed uid = " + this.uid + " state = " + ePlayerNetState[this.mNetState] ) ;
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
                    return { ret : 0 , matchID : this.playingMatchIDs } ;
                }
                break ;
            case eRpcFuncID.Func_SetPlayingMatch:
                {
                    let mid = arg[key.matchID] ;
                    let isStart = arg[key.isStart] == 1 ;
                    let idx = this.playingMatchIDs.indexOf(mid) ;
                    if ( isStart == false && idx == -1 && this.mIsRobot == false )
                    {
                        XLogger.warn( "ending match is not playing match ,why ? uid = " + this.uid + " playing matchID = " + this.playingMatchIDs + " ending MatchID = " + mid ) ;
                    }
                    
                    if ( isStart && idx != -1  && this.mIsRobot == false )
                    {
                        XLogger.warn( "playing matchID is not 0 , how can start another game uid = " + this.uid + " starting matchID = " + mid + " playing matchID " + this.playingMatchIDs  ) ;
                    }
  
                    if ( isStart && idx == -1 )
                    {
                        this.playingMatchIDs.push( mid ) ;

                        let vR = remove(this.signedMatches,( id : number )=> id == mid ) || [];
                        if ( vR.length == 0 )
                        {
                            XLogger.warn( "remove signed math to playing match , but can not find uid = " + this.uid + " matchID = " + mid ) ;
                        }
                    }

                    if ( isStart == false && idx != -1 )
                    {
                        this.playingMatchIDs.splice(idx,1) ;
                    }

                    XLogger.debug( "cur playing matchIDs = " + this.playingMatchIDs + " uid = " + this.uid ) ;

                    if ( this.mIsRobot )
                    {
                        let arg = {} ;
                        arg[key.uid] = this.uid;
                        arg["isJoin"] = isStart ? 1 : 0 ;
                        this.mPlayer.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_R, 0, eRpcFuncID.Func_RobotWorkingState, arg) ;
                        XLogger.debug( "robot working state changed , is working ? = " + ( isStart ? "working " : " finished " ) ) ;
                    }
                }
                break ;
            case eRpcFuncID.Func_ReqEnrollMatchFee:
                {
                    // arg : { uid : 2345 , sessionID : 23 , fee : IItem , matchID : 23  }
                    // result : { ret : 0 }
                    // ret : 0 , success , 1 uid error , 2 money not enough ;
                    let fee : IItem = arg[key.fee] ;
                    fee.cnt *= -1 ;
                    arg[key.ret] = this.onModifyMoney( fee, true ) ? 0 : 2 ;
                    if ( arg[key.ret] == 0 )
                    {
                        XLogger.debug( "enroll successed , uid = " + this.uid + " matchID = " + arg[key.matchID] ) ;
                    }
                    else
                    {
                        XLogger.debug( "player deduction money uid = " + this.uid + " result = " + ( arg[key.ret] == 0  ? " success " : " failed "  ) + " detail : " + JSON.stringify(arg) );
                    }
                    
                    return arg ;
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
            case eRpcFuncID.Func_MatchReward:
                {
                    // arg : { uid : 235 , rankIdx : 2 ,  reward : IItem[] , matchID : 2345, cfgID : 234 , matchName : "adkfja" }
                    XLogger.debug( "recieved match reward rankIdx = " + arg[key.rankIdx] + " uid = " + this.uid + " cfgID = " + arg[key.cfgID] ) ;
                    let vRwards : IItem[] = arg[key.reward] ;
                    let mid = arg[key.matchID] ;
                    if ( vRwards == null )
                    {
                        XLogger.warn( "player do not get reward uid = " + this.uid + " matchID = " + mid ) ;
                    }
                    else
                    {
                        let moneyDirty = false ;
                        for ( let m of vRwards )
                        {
                            if ( m.type <= eItemType.eItem_Money )
                            {
                                moneyDirty = true ;
                                this.onModifyMoney( m,false ) ;
                            }
                            else
                            {
                                this.recievedRealGoodReward(m, mid, arg[key.cfgID], arg[key.matchName] ) ;
                            } 
                        }

                        if ( moneyDirty )
                        {
                            this.onMoneyChanged(true) ;
                        }
                    }

                    if ( arg[key.isBoLeMode] != null && arg[key.isBoLeMode] == 1 )
                    {
                        if ( arg[key.rankIdx] == 0 )
                        {
                            XLogger.debug( "in boLe Mode , player rank no.1 invite will also get prize uid = " + this.uid +  "inviteID = " + this.inviter ) ;
                        }
                        
                        if ( this.inviter != 0 )
                        {
                            // do give prize 
                            MailModule.sendNormalMail(this.inviter, "", "恭喜您获奖了，您邀请的玩家【" + this.nickName + "+ (ID:" + this.uid + ")】获得了【" + arg[key.matchName] + "】的冠军，您也获得同样奖励，感谢您为我们推荐优秀的玩家！" , vRwards ) ;
                        }
                    }
                }
                break ;
            case eRpcFuncID.Func_ReturnBackMatchReliveFee:
                {
                    // arg : { uid : 2345, matchID : 323 , fee : IItem , cfgID : 234  }
                    let fee : IItem = arg[key.fee] ;
                    XLogger.debug( "recieved relive failed back fee , cfgID = " + arg[key.cfgID] + " cnt = " + fee.cnt + " type = " + eItemType[fee.type] ) ;
                    this.onModifyMoney( fee, true );
                }
                break;
            case eRpcFuncID.Func_MatchReqRelive:
                {
                    // arg : { uid : 23 , fee : IItem[] , matchID : 23 , cfgID : 234 }
                    let fee : IItem = arg[key.fee] ;
                    fee.cnt *= -1 ;
                    arg[key.ret] = this.onModifyMoney( fee, true ) ? 0 : 1 ;
                    if ( arg[key.ret] == 0 )
                    {
                        XLogger.debug( "relive successed , uid = " + this.uid + " matchID = " + arg[key.matchID] ) ;
                    }
                    XLogger.debug( "player relive deduction money uid = " + this.uid + " result = " + ( arg[key.ret] == 0  ? " success " : " failed "  ) + " detail : " + JSON.stringify(arg) );
                    return arg ;
                }
                break;
            default:
                XLogger.warn("unknown rpc call for player rpc funcID = " + eRpcFuncID[funcID] + " uid = " + this.uid + " arg = " + JSON.stringify(arg || {} )) ; 
                return {} ;
        }
        return {} ;
    }

    recievedRealGoodReward( item : IItem , matchID : number , cfgID : number , matchName : string )
    {
        XLogger.debug( "recieved real good reward , please save to db uid = " + this.uid + " matchName = " + matchName + " item type = " + eItemType[item.type] ) ;
    }

    onModifyMoney( item : IItem , isSaveDB : boolean = true  ) : boolean 
    {
        let cnt = item.cnt ;
        let moneyType = item.type ;
        if ( cnt == 0 )
        {
            XLogger.warn( "modify money cnt = 0 type = " + moneyType + " uid = " + this.uid ) ;
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
        else if ( moneyType == eItemType.eItem_RedBag )
        {
            if ( isAdd == false && this.redBag < Math.abs(cnt) )
            {
                return false ;
            }
            this.redBag += cnt ;
            if ( isSaveDB )
            {
                this.onMoneyChanged( false ) ;
            }
            return true ;
        }
        else if ( moneyType == eItemType.eItem_ReliveTicket )
        {
            if ( isAdd == false && this.reliveTicket < Math.abs(cnt) )
            {
                return false ;
            }
            this.reliveTicket += cnt ;
            if ( isSaveDB )
            {
                this.onMoneyChanged( false ) ;
            }
            return true ;
        }
        else if ( eItemType.eItem_Honour == moneyType )
        {
            if ( isAdd == false )
            {
                XLogger.warn( "what situation need to decrease honour value ?  uid = " +  this.uid + " cnt = " + cnt ) ;
            }

            this.honour += cnt ;
            if ( isSaveDB )
            {
                this.onMoneyChanged( false ) ;
            }
            return true ;
        }

        XLogger.warn( "known money type = " + eItemType[moneyType] + " cnt = " + cnt + " uid = " + this.uid ) ;
        return false ;
    }
}