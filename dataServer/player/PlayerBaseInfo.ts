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
    init( player : Player , ip : string ) : void 
    {
        this.mPlayer = player ;
        this.ip = ip ;
        this.loadDataInfo();
    }

    getCompentName() : string
    {
        return PlayerBaseInfo.s_Name ;
    }

    onReactive( sessionID : number , ip : string ) : void 
    {
        this.ip = ip ;
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
    }

    protected loadDataInfo()
    {
        if ( this.mIsLoadedData )
        {
            XLogger.warn( "player already loaded base data uid = " + this.mPlayer.uid ) ;
            return ;
        }
        let rpc = this.mPlayer.getRpc();
        let self = this ;
        rpc.invokeRpc( eMsgPort.ID_MSG_PORT_DB, random(200,false ), eRpcFuncID.Func_LoadPlayerInfo,{uid : this.mPlayer.uid },( result : any )=>{
            if ( Object.keys(result).length == 0 )
            {
                XLogger.error( "db do not have data of uid = " + self.uid ) ;
                return ;
            }
            self.parse(result) ;
            self.mIsLoadedData = true ;
            self.sendDataInfoToClient();
            XLogger.debug( "player finish load base data uid " + self.mPlayer.uid ) ;
        } );
    }

    protected sendDataInfoToClient()
    {
        if ( this.mIsLoadedData == false )
        {
            XLogger.warn( "do not finish load data , should send to client , uid = " + this.mPlayer.uid ) ;
            return ;
        }

        let js = this.toJson();
        this.mPlayer.sendMsgToClient(eMsgType.MSG_PLAYER_BASE_DATA, js ) ;
        XLogger.debug( "send base data to client uid = " + this.mPlayer.uid ) ;
    }
}