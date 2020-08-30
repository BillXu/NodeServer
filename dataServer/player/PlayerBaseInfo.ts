import { CheckInCfgLoader } from './CheckInCfgLoader';
import { PlayerMgr } from './../PlayerMgr';
import { MailModule } from './../MailModule';
import { IItem, Item } from './../../shared/IMoney';
import { eItemType, S_CFG } from './../../shared/SharedDefine';
import { key } from './../../shared/KeyDefine';
import { XLogger } from './../../common/Logger';
import { ePlayerNetState, ePlayerMoneyLogReason } from './../../common/commonDefine';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { IPlayerCompent } from './IPlayerCompent';
import { PlayerBaseData } from './../../shared/playerData/PlayerBaseData';
import { Player } from './Player';
import { random, remove } from 'lodash';
import { eRpcFuncID } from '../../common/Rpc/RpcFuncID';
import { eMailReasonFlag } from '../../shared/playerData/PlayerMailData';
import { eNotifyPlatformCmd } from '../../common/MgrPlatformCmd';
import request from 'request';
export class PlayerBaseInfo extends PlayerBaseData implements IPlayerCompent
{
    static s_Name : string = "PlayerBaseInfo" ;
    protected mPlayer : Player = null ;
    protected mIsLoadedData : boolean = false ;
    protected mNetState : ePlayerNetState = ePlayerNetState.eState_Online ;
    protected mLastCheckGlobalMailID : number = -1 ;
    treeCDEndTime : number = 0 ;
    protected mInviteCnt : number = 0 ;
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
        js[key.inviteCnt] = this.mInviteCnt;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        super.parse(js) ;
        this.treeCDEndTime = js[key.treeCDEndTime] * 1000;
        this.mInviteCnt = js[key.inviteCnt] ;
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
                    if ( this.nickName == msg[key.nickeName] && this.sex == msg[key.sex] && this.headIconUrl == msg[key.headIconUrl] )
                    {
                        XLogger.debug( "info is the same no need to modify uid = " + this.mPlayer.uid ) ;
                        msg[key.ret] = 0 ;
                        this.mPlayer.sendMsgToClient(msgID, msg ) ;
                        break ;
                    }

                    this.nickName = msg[key.nickeName];
                    this.sex = msg[key.sex] ;
                    this.headIconUrl = msg[key.headIconUrl] ;

                    msg[key.ret] = 0 ;
                    this.mPlayer.sendMsgToClient(msgID, msg ) ;

                    let arg = { sql : "update playerData set nickName = '" + this.nickName + "' ," + " sex = " + this.sex + " , headUrl = '" + this.headIconUrl + "' " + " where uid = " + this.uid + " limit 1 ;" } ;
                    this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;
                }
                break ;
            case eMsgType.MSG_PLAYER_REFRESH_MONEY:
                {
                    let msg = {} ;
                    msg[key.diamond] = this.diamond ;
                    msg[key.fertilizer] = this.fertilizer ;
                    msg[key.reliveTicket] = this.reliveTicket ;
                    msg[key.honour] = this.honour;
                    msg[key.redBag] = this.redBag;
                    this.mPlayer.sendMsgToClient(eMsgType.MSG_PLAYER_REFRESH_MONEY, msg )  ;
                }
                break;
            case eMsgType.MSG_PLAYER_BASE_DATA:
                {
                    this.sendDataInfoToClient();
                }
                break ;
            case eMsgType.MSG_R_TELL:
                {
                    // if ( this.mIsRobot )
                    // {
                    //     XLogger.debug( "already telled robot , not need tell again uid = " + this.uid ) ;
                    //     return ;
                    // }
                    this.mIsRobot = true ;
                    let arg = {} ;
                    arg[key.uid] = this.uid;
                    arg[key.sessionID] = this.mPlayer.sessionID ;
                    this.mPlayer.getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_R, 0, eRpcFuncID.Func_OnRobotLogin, arg) ;
                    XLogger.debug( "tell robot svr , robot login uid = " + this.uid ) ;
                }
                break ;
            case eMsgType.MSG_SYNC_TIME:
                {
                    msg[key.time] = Math.floor( Date.now() / 1000 ) ;
                    this.mPlayer.sendMsgToClient(msgID, msg) ;  
                }
                break ;
            case eMsgType.MSG_BIND_INVITE_CODE:
                {
                    if ( this.inviter != 0 )
                    {
                        msg[key.ret] = 1 ;
                        this.mPlayer.sendMsgToClient(msgID, msg) ;
                        break ;
                    }
                    let inviterUID = msg["inviteUID"] ;
                    let self = this ;
                    let mgr = this.mPlayer.mgr as PlayerMgr;
                    let rpc = this.mPlayer.getRpc();
                    let checkInvitor = new Promise<any>( relove =>{
                        if ( 0 == inviterUID )
                        {
                            relove(2);
                            return ;
                        }
                        let p = mgr.getPlayerByUID(inviterUID, true ) ;
                        if ( p )
                        {
                            relove(0);
                            return ;
                        }
                        let argSql = { sql : "select uid from playerData where uid = " + inviterUID + " limit 1;" } ;
                        rpc.invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false), eRpcFuncID.Func_ExcuteSql, argSql,( result : Object )=>{
                            if ( result[key.ret] != 0 || (result["result"] as Object[]).length <= 0  )
                            {
                                XLogger.debug( "check inviter error uid = " + inviterUID ) ;
                                relove(2);
                                return ;
                            }
                            relove(0);
                        } ) ;
                    });
                    checkInvitor.then(ret=>{
                        XLogger.debug( "bind invite code ret = " + ret + " uid = " + self.uid + " inviteUID = " + inviterUID ) ;
                        if ( ret != 0 )
                        {   
                            msg[key.ret] = ret ;
                            self.mPlayer.sendMsgToClient(msgID, msg) ;
                            return ;
                        }

                        if ( self.inviter != 0 )
                        {
                            XLogger.debug( "send bind code msg too quick ? uid = " + self.uid ) ;
                            msg[key.ret] = 1 ;
                            self.mPlayer.sendMsgToClient(msgID, msg) ;
                            return ;
                        }
                        self.inviter = inviterUID ;
                        self.saveUpdateToDB([key.inviterUID], [inviterUID] ) ;

                        // give prize ;
                        MailModule.sendNormalMail(inviterUID, "", `您邀请的玩家【 ${self.nickName} ( uid : ${self.uid}) 】进入游戏了`, S_CFG.vInviteReward ,eMailReasonFlag.eInvitePlayer ) ;
                        XLogger.debug( "invite player to give prize uid = " + self.uid + " inviterUID = " + inviterUID ) ;

                        // give prize to self ;
                        msg[key.ret] = 0 ;
                        msg[key.items] = S_CFG.vBeInviteReward;
                        self.mPlayer.sendMsgToClient(msgID, msg) ;
                        S_CFG.vBeInviteReward.forEach( v=> self.onModifyMoney(v) ) ;
                        S_CFG.vBeInviteReward.forEach( v=> self.saveLogMoney(v,ePlayerMoneyLogReason.eBeInvited ) ) ;
                        XLogger.debug( "bind invite code , give prize to self = " + JSON.stringify(S_CFG.vBeInviteReward) + " uid = " + self.uid + " inviteID = " + inviterUID )  ;
                    }) ;
                } 
                break;
            case eMsgType.MSG_VERIFY_REAL_IDENTIFY:
                {
                    if ( this.cardID.length > 0 )
                    {
                        this.mPlayer.sendMsgToClient(msgID, {ret:2} ) ;
                        XLogger.debug( "already verified real identify, uid = " + this.uid ) ;
                        break ;
                    }

                    let self = this ;
                    // uid:uid, name:name, cardNo:cardNo
                    this.mPlayer.mgr.sendHttpRequest( eNotifyPlatformCmd.eRealIdentifyVerify, { uid : this.uid, name : msg["name"], cardNo : msg["ID"] },( error: any, response: request.Response, body: any )=>{
                        if (!error && response.statusCode == 200) {
                            XLogger.info("real verify = " + body ) ;
                            if ( body["msg"] != null )
                            {
                                XLogger.debug( "real verify error = " + body["msg"] + " name = " + msg["name"]) ;
                            }
                            let c = body ;
                            if ( c[key.ret] != 0 )
                            {
                                self.mPlayer.sendMsgToClient(msgID, { ret : c[key.ret] } ) ;
                                return ;
                            }

                            self.cardID = msg["ID"] ;
                            self.mPlayer.sendMsgToClient(msgID, { ret : 0, reward : S_CFG.vRealVerifyReward } ) ;
                            self.onModifyMoney( S_CFG.vRealVerifyReward );
                            self.saveLogMoney( S_CFG.vRealVerifyReward, ePlayerMoneyLogReason.eRealVerify );
                            self.saveUpdateToDB([key.cardID,"name"],[self.cardID,msg["name"]] );
                            XLogger.debug( "verify ok" ) ;  
                        }
                        else
                        {
                            XLogger.error( "real verify interface error" ) ;
                            self.mPlayer.sendMsgToClient(msgID, { ret : 3 } ) ;
                        }
                    } ) ;
                }
                break;
            case eMsgType.MSG_LOGIN_REWARD:
                {
                    // check is got today ;
                    let now = new Date();
                    let last : Date = null ;
                    if ( this.lastLoginRewardTime != 0 )
                    {
                        last = new Date(this.lastLoginRewardTime);
                        if ( last.getDate() == now.getDate() && last.getMonth() == now.getMonth() )
                        {
                            this.mPlayer.sendMsgToClient(msgID, {ret:1} ) ;
                            break ;
                        }
                    }
                    // check day idx ;
                    if ( last != null )
                    {
                        last.setDate(last.getDate() + 1 ); // next ;
                        if ( last.getDate() != now.getDate() || last.getMonth() != now.getMonth() ) // do continue
                        {
                            this.continueLoginDayCnt = 0 ;
                        }
                    }
                    else
                    {
                        this.continueLoginDayCnt = 0 ;
                    }

                    let curDayIdx = this.continueLoginDayCnt ;
                    let maxDayIdx = CheckInCfgLoader.getInstance().getCfgItemCnt() - 1 ;
                    if ( curDayIdx > maxDayIdx )
                    {
                        curDayIdx = maxDayIdx ;
                    }

                    let dayIdx = msg["dayIdx"];
                    if ( dayIdx > curDayIdx )
                    {
                        this.mPlayer.sendMsgToClient(msgID, {ret:2} ) ;
                        break ;
                    }
                    let vItem = CheckInCfgLoader.getInstance().getRewardForDayIdx(curDayIdx) ;
                    this.mPlayer.sendMsgToClient(msgID, {ret:0} ) ;
                    let self = this ;
                    vItem.forEach(v=>{ self.onModifyMoney(v) ; self.saveLogMoney(v, ePlayerMoneyLogReason.eCheckIn ) ; }) ;
                    this.lastLoginRewardTime = now.valueOf();
                    ++this.continueLoginDayCnt;
                    let lt = parseInt( Math.floor(this.lastLoginRewardTime/1000).toFixed(0) ) ;
                    this.saveUpdateToDB([key.lastLoginRewardTime,key.continueLoginDayCnt], [lt,this.continueLoginDayCnt] ) ;
                }
                break;
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

        if ( this.stayDeskID != 0 )
        {
            XLogger.debug( "player stayin desk , infor state to deskID = " + this.stayDeskID + " uid = " + this.uid + " netState = " + ePlayerNetState[state] ) ;
            let arg = {} ;
            arg[key.deskID] = this.stayDeskID ;
            arg[key.uid] = this.uid ;
            arg[key.sessionID] = this.mPlayer.sessionID ;
            arg[key.state] = state ;
            this.mPlayer.getRpc().invokeRpc(this.stayDeskPort, this.stayDeskID, eRpcFuncID.Func_DeskUpdatePlayerNetState, arg ) ;
        }
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
        let vmids = (this.playingMatchIDs ||[] ).concat(this.signedMatches) ;
        if ( vmids.length > 0 )
        {
            // arg : { matchID : 234 , uid : 23 , sessionID : 234 , state : ePlayerNetState }
            for ( let pid of vmids )
            {
                XLogger.debug( "inform net state to matchID = " + pid +  "state = " + ePlayerNetState[this.mNetState] ) ;
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

        let msg = {} ;
        msg[key.time] = Math.floor( Date.now() / 1000 ) ;
        this.mPlayer.sendMsgToClient( eMsgType.MSG_SYNC_TIME, msg) ;  
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
                        this.saveLogMoney(fee, ePlayerMoneyLogReason.eMatchFee ) ;
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
            case eRpcFuncID.Func_MatchResult:
                {
                    // arg : { uid : 235 , lawIdx : 0 , rankIdx : 2 ,  reward : IItem[] , matchID : 2345, cfgID : 234 , matchName : "adkfja" }
                    XLogger.debug( "recieved match reward rankIdx = " + arg[key.rankIdx] + " uid = " + this.uid + " cfgID = " + arg[key.cfgID] ) ;
                    let vRwards : IItem[] = arg[key.reward] ;
                    let mid = arg[key.matchID] ;
                    this.saveMatchResultToLog(vRwards, mid, arg[key.cfgID], arg[key.lawIdx], arg[key.rankIdx] );
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
                                this.saveLogMoney(m, ePlayerMoneyLogReason.eMatchReward,null,{ matchID : mid, cfgID : arg[key.cfgID], lawIdx : arg[key.lawIdx] ,rankIdx : arg[key.rankIdx] } ) ;
                            }
                            else
                            {
                                this.recievedRealGoodReward(m, mid, arg[key.cfgID],arg[key.lawIdx],arg[key.rankIdx] ) ;
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
                    this.saveLogMoney(fee, ePlayerMoneyLogReason.eReliveFeeReturnBack , null, { matchID : arg[key.matchID] , cfgID : arg[key.cfgID] } ) ;
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
                        this.saveLogMoney(fee, ePlayerMoneyLogReason.eReliveFee , null, { matchID : arg[key.matchID] , cfgID : arg[key.cfgID] } ) ;
                        XLogger.debug( "relive successed , uid = " + this.uid + " matchID = " + arg[key.matchID] ) ;
                    }
                    XLogger.debug( "player relive deduction money uid = " + this.uid + " result = " + ( arg[key.ret] == 0  ? " success " : " failed "  ) + " detail : " + JSON.stringify(arg) );
                    return arg ;
                }
                break;
            case eRpcFuncID.Func_UpdateCurDeskID:
                {
                    // arg { deskID : 234 , port : eMsgPort , isSet : 0 }
                    // arg { ret : 0 }
                    // ret : 0 success , 1 already in other deskID ;
                    let deskID = arg[key.deskID] ;
                    let port = arg[key.port] ;
                    let isSet = arg[key.isSet] == 1 ;
                    let result = { ret : 0 } ;
                    if ( isSet )
                    {
                        if ( this.stayDeskID != 0 && (this.stayDeskID != deskID || this.stayDeskPort != port ) )
                        {
                            result[key.ret] = 1 ;
                            XLogger.debug( "player alredy in other desk ,why enter to a new deskID uid = " + this.uid + " old deskPort = " + this.stayDeskPort + " deskID = " + this.stayDeskID );
                        }

                        this.stayDeskID = deskID;
                        this.stayDeskPort = port;
                        this.saveUpdateToDB([key.stayDeskPort,key.stayDeskID], [ this.stayDeskPort,this.stayDeskPort] ) ;
                    }
                    else
                    {
                        if ( this.stayDeskID != deskID || this.stayDeskPort != port )
                        {
                            XLogger.debug( "not current deskID , can not clear it" ) ;
                            result[key.ret] = 1 ;
                        }
                        else
                        {
                            this.stayDeskPort = 0 ;
                            this.stayDeskID = 0 ;
                            this.saveUpdateToDB([key.stayDeskPort,key.stayDeskID], [ this.stayDeskPort,this.stayDeskPort] ) ;
                        }
                    }

                    return result ;
                }
                break ;
            case eRpcFuncID.Func_BeInvited:
                {
                    // arg : { uid : 23 , inviterUID : 23 }
                    XLogger.debug( "be invited , inivte uid = " + arg["inviterUID"] ) ;
                    this.inviter = arg["inviterUID"];
                    this.saveUpdateToDB([key.inviterUID], [ this.inviter]) ;
                }
                break;
            case eRpcFuncID.Func_IncreateInvitorCnt:
                {
                    // arg : { uid : 23 , beInviterUID : 23 }
                    XLogger.debug( "increate cnt beInvite = " + arg["beInviterUID"] ) ;
                    ++this.mInviteCnt;
                    this.saveUpdateToDB([key.inviteCnt], [ this.mInviteCnt]) ;
                }
                break;
            case eRpcFuncID.Http_ModifyItem:
                {
                    // arg : { uid : 23 , offset : Item }  // cnt < 0 , means decrease ,
                    // result : { ret : 0 , final : Item }
                    XLogger.debug( "http modify money item " + JSON.stringify( arg ) ) ;
                    let item = new Item();
                    item.parse(arg["offset"]) ;
                    if ( item.type >= eItemType.eItem_Money )
                    {
                        return { ret : 1 , error : "only support money modify" } ;
                    }

                    if ( this.onModifyMoney(item) )
                    {
                        this.saveLogMoney(item, ePlayerMoneyLogReason.eHttpModify , null, { matchID : arg[key.matchID] , cfgID : arg[key.cfgID] } ) ;
                    }
                    
                    switch ( item.type )
                    {
                        case eItemType.eItem_Diamond:
                            {
                                item.cnt = this.diamond;
                            }
                            break;
                        case eItemType.eItem_Honour:
                            {
                                item.cnt = this.honour;
                            }
                            break;
                        case eItemType.eItem_RedBag:
                            {
                                item.cnt = this.redBag;
                            }
                            break;
                        case eItemType.eItem_ReliveTicket:
                            {
                                item.cnt = this.reliveTicket ;
                            }
                            break;
                        default:
                            {
                                XLogger.debug( "http modify unsupport type = " + item.type ) ;
                            }
                    }

                    return { ret : 0 , final : item.toJs() } ;
                }
                break;
            default:
                XLogger.warn("unknown rpc call for player rpc funcID = " + eRpcFuncID[funcID] + " uid = " + this.uid + " arg = " + JSON.stringify(arg || {} )) ; 
                return {} ;
        }
        return {} ;
    }

    saveUpdateToDB( keys : string[] , values : any [] )
    {
        if ( keys.length != values.length )
        {
            XLogger.error( "save update to db , key and vaue length do not equal" ) ;
            return;
        }

        let sql = "update playerData set" ;
        for ( let idx = 0 ; idx < keys.length ; ++idx )
        {
            if ( idx == 0 )
            {
                sql += " " + keys[idx] + " =  " + `'${values[idx]}'` ;
            }
            else
            {
                sql += " , " + keys[idx] + " =  " + `'${values[idx]}'` ;
            }
        }
        sql += " where uid = " + this.uid + " limit 1 ;" ;
        this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, { sql : sql } ) ;
    }

    protected recievedRealGoodReward( item : IItem , matchID : number , cfgID : number , lawIdx : number , rankIdx : number )
    {
        XLogger.debug( "recieved real good reward , please save to db uid = " + this.uid + " item type = " + eItemType[item.type] ) ;
        if ( this.mIsRobot )
        {
            return ;
        }

        let arg = {
            sql : `insert into logGoods set uid = ${this.uid} , itemType = ${item.type} , cnt = ${item.cnt} , matchID = ${matchID} ,cfgID = ${cfgID}, lawIdx = ${lawIdx} , rankIdx = ${rankIdx} ;`,
        } ;
        this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_LOG_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;
    }

    protected saveMatchResultToLog( rewards : IItem[] , matchID : number , cfgID : number , lawIdx : number , rankIdx : number )
    {
        let strRe = JSON.stringify(rewards||{}) ;
        let isR = this.mIsRobot ? 1 : 0 ;
        let arg = {
            sql : `insert into logMatchResult set uid = ${this.uid} , rewards = '${strRe}', matchID = ${matchID} ,cfgID = ${cfgID}, lawIdx = ${lawIdx} , rankIdx = ${rankIdx}, isRobot = ${isR} ;`,
        } ;
        this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_LOG_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;
    }

    saveLogMoney( itemOffset : IItem, reason : number,rmark? : string , data? : Object )
    {
        let rmk = rmark || "" ;
        let usd = JSON.stringify( data || {} ) ;
        let final = 0 ;
        switch ( itemOffset.type )
        {
            case eItemType.eItem_ReliveTicket:
                {
                    final = this.reliveTicket;
                }
                break;
            case eItemType.eItem_Diamond:
                {
                    final = this.diamond;
                }
                break;
            case eItemType.eItem_Honour:
                {
                    final = this.honour;
                }
                break;
            case eItemType.eItem_RedBag:
                {
                    final = this.redBag;
                }
                break;
            default:
                XLogger.error( "unknown money type = " + eItemType[itemOffset.type] + " for save log ") ;
                return ;
        }
        let sql = `insert into logMoneyRecorder set uid = ${this.uid} , itemType = ${itemOffset.type} , offset = ${itemOffset.cnt} , final = ${final} , reason = ${reason}, remark = '${rmk}', userData = '${usd} ';` ;
        this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_LOG_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, {sql : sql} ) ;
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