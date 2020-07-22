import { key } from './../../shared/KeyDefine';
import { XLogger } from './../../common/Logger';
import { ePlayerNetState } from './../../common/commonDefine';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { IPlayerCompent } from './IPlayerCompent';
import { PlayerBaseData } from './../../shared/playerData/PlayerBaseData';
import { Player } from './Player';
import { random } from 'lodash';
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
}