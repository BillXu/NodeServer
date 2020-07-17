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
    get netState() : ePlayerNetState
    {
        return this.mNetState ;
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
        return false ;
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
            self.mIsLoadedData = true ;
            self.sendDataInfoToClient();
            XLogger.debug( "finish load base data uid = " + self.mPlayer.uid + " sessionID = " + self.mPlayer.sessionID ) ;
        } );
    }

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