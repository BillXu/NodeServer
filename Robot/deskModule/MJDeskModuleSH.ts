import { MJDeskDataSH } from './../../shared/mjshData/MJDeskDataSH';
import { MJDeskData } from './../../shared/mjData/MJDeskData';
import { XLogger } from './../../common/Logger';
import { MJPlayerDataSH } from './../../shared/mjshData/MJPlayerDataSH';
import { MJPlayerData } from './../../shared/mjData/MJPlayerData';
import { eMsgType } from './../../shared/MessageIdentifer';
import { IClientModule } from "../IClientModule";

export class MJDeskModuleSH extends IClientModule
{
    static MODULE_NAME = "MJDeskModuleSH" ;
    protected mPlayers : MJPlayerData[] = null ;
    protected mSelfPlayer : MJPlayerData = null ;
    protected mDeskInfo : MJDeskData = null ;
    protected clear()
    {
        this.mPlayers.length = 0 ;
        this.mSelfPlayer = null ;
    }

    getModuleName() : string 
    {
        return MJDeskModuleSH.MODULE_NAME ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object ) : boolean 
    {
        if ( this.onActMsg(msgID, msg) )
        {
            return true ;
        }

        switch ( msgID )
        {
            case eMsgType.MSG_PLAYER_MJ_REQ_DESK_INFO:
                {

                }
                break ;
            case eMsgType.MSG_PLAYER_MJ_DESK_PLAYERS_INFO:
                {

                }
                break ;
            case eMsgType.MSG_DEDK_MJ_PLAYER_ENTER:
                {

                }
                break;
            case eMsgType.MSG_DEKS_MJ_INFORM_ACT_WITH_OTHER_CARD:
                {

                }
                break;
            case eMsgType.MSG_DEKS_MJ_INFORM_SELF_ACT:
                {

                }
                break;
            case eMsgType.MSG_DESK_MJ_DISTRIBUTE:
                {

                }
                break;
            case eMsgType.MSG_DESK_MJ_GAME_OVER:
                {

                }
                break ;
            case eMsgType.MSG_DESK_MJ_START:
                {

                }
                break;
            default:
                return false ;
        }
        return true  ;
    }

    onActMsg( msgID : eMsgType , msg : Object ) : boolean 
    {
        switch ( msgID )
        {
            case eMsgType.MSG_DESK_MJ_MO:
                {

                }
                break ;
            case eMsgType.MSG_PLAYER_MJ_CHU:
                {

                }
                break;
            case eMsgType.MSG_PLAYER_MJ_ANGANG:
                {

                }
                break;
            case eMsgType.MSG_PLAYER_MJ_BU_GANG:
                {

                }
                break;
            case eMsgType.MSG_PLAYER_MJ_EAT:
                {

                }
                break;
            case eMsgType.MSG_PLAYER_MJ_PENG:
                {

                }
                break;
            case eMsgType.MSG_PLAYER_MJ_MING_GANG:
                {

                }
                break;
            case eMsgType.MSG_PLAYER_MJ_HU:
                {

                }
                break;
            case eMsgType.MSG_PLAYER_MJ_PASS:
                {

                }
                break;
            case eMsgType.MSG_PLAYER_MJ_BU_HUA:
                {

                }
                break;
            case eMsgType.MSG_PLAYER_MJ_TING:
                {

                }
                break;
            case eMsgType.MSG_PLAYER_MJ_TUO_GUAN:
                {

                }
                break ;
            default :
                return false ;
        }
        return true ;
    }

    protected createMJPlayer() : MJPlayerData
    {
        return new MJPlayerDataSH();
    }

    protected createDeskInfo() : MJDeskData
    {
        return new MJDeskDataSH();
    }

    protected getPlayerByIdx( idx : number ) : MJPlayerData
    {
        for ( let p of this.mPlayers )
        {
            if ( p.nIdx == idx )
            {
                return p ;
            }
        }

        XLogger.warn( "can not find player with idx = " + idx + " deskID = " + this.mDeskInfo.deskID ) ;
        return null ;
    }
}