import { BaseDataModule } from './../BaseDataModule';
import { RobotClient } from './../RobotClient';
import { eMJActType } from './../../shared/mjData/MJDefine';
import { eMJPlayerState } from './../../shared/SharedDefine';
import { key } from './../../shared/KeyDefine';
import { MJDeskDataSH } from './../../shared/mjshData/MJDeskDataSH';
import { MJDeskData } from './../../shared/mjData/MJDeskData';
import { XLogger } from './../../common/Logger';
import { MJPlayerDataSH } from './../../shared/mjshData/MJPlayerDataSH';
import { MJPlayerData } from './../../shared/mjData/MJPlayerData';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { IClientModule } from "../IClientModule";

export class MJDeskModuleSH extends IClientModule
{
    static MODULE_NAME = "MJDeskModuleSH" ;
    protected mPlayers : MJPlayerData[] = [] ;
    protected mSelfPlayer : MJPlayerData = null ;
    protected mDeskInfo : MJDeskData = null ;

    init( pClient : RobotClient )
    {
        super.init(pClient) ;
        pClient.onWithTarget( BaseDataModule.EVENT_RECIVED_BASE_DATA , this.onRecivdBaseData, this ) ;
    }

    onRecivdBaseData()
    {
        XLogger.debug( "recieved base data , just enter desk uid = " + this.getClient().uid ) ;
        let msg = {} ;
        msg[key.uid] = this.getClient().uid;
        this.sendMsg( eMsgType.MSG_PLAYER_MJ_ETNTER, msg, eMsgPort.ID_MSG_PORT_MJSH, 200 ) ;
    }

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
                    if ( this.mDeskInfo == null )
                    {
                        this.mDeskInfo = this.createDeskInfo();
                    } 
                    this.mDeskInfo.parse(msg) ;
                }
                break ;
            case eMsgType.MSG_PLAYER_MJ_DESK_PLAYERS_INFO:
                {
                    let mPlayers : Object[] = msg[key.players] ;
                    for ( let vp of mPlayers )
                    {
                        let p = this.createMJPlayer();
                        p.parse(vp) ;
                        this.addPlayer(p) ;
                        if ( p.uid == this.getClient().uid )
                        {
                            this.mSelfPlayer = p ;
                        }
                    }
                    XLogger.debug( "recived player infos cur cnt = " + this.mPlayers.length + " deskID = " + this.mDeskInfo.deskID + " uid = " + this.getClient().uid ) ;
                }
                break ;
            case eMsgType.MSG_DEDK_MJ_PLAYER_ENTER:
                {
                    let p = this.createMJPlayer();
                    p.parse(msg) ;
                    this.addPlayer(p) ;
                    if ( p.uid == this.getClient().uid )
                    {
                        this.mSelfPlayer = p ;
                    }
                }
                break;
            case eMsgType.MSG_DESK_MJ_DISTRIBUTE:
                {
                    this.mSelfPlayer.onDistributedCard(msg[key.holdCards]) ;
                    let vHold = [0,0,0,0,0,0,0,0,0,0,0,0,0] ;
                    for ( let p of this.mPlayers )
                    {
                        if ( p.uid != this.mSelfPlayer.uid )
                        {
                            p.onDistributedCard(vHold) ;
                        }
                    }
                }
                break;
            case eMsgType.MSG_DESK_MJ_GAME_OVER:
                {
                    for ( let p of this.mPlayers )
                    {
                        p.onGameOver();
                    }
                }
                break ;
            case eMsgType.MSG_DESK_MJ_START:
                {
                    this.mDeskInfo.bankerIdx = msg[key.bankerIdx] ;
                    for ( let p of this.mPlayers )
                    {
                        p.onGameStart();
                    }
                }
                break;
            case eMsgType.MSG_DEKS_MJ_INFORM_ACT_WITH_OTHER_CARD:
                {
                    this.onInformActWithOther(msg[key.card], msg[key.act])
                }
                break;
            case eMsgType.MSG_DEKS_MJ_INFORM_SELF_ACT:
                {
                    // svr : { isOnlyChu : 0, canHu : 1 , buGang : [12,3] , anGang : [12,12], limitCards : [23,22] }
                    this.onInformActWitSelf(msg["isOnlyChu"]||false, msg["canHu"] != null && msg["canHu"] == 1, msg["buGang"], msg["anGang"], msg["limitCards"] ) ;
                }
                break;
            default:
                return false ;
        }
        return true  ;
    }

    protected onActMsg( msgID : eMsgType , msg : Object ) : boolean 
    {
        switch ( msgID )
        {
            case eMsgType.MSG_DESK_MJ_MO:
                {
                    let idx = msg[key.idx];
                    if ( idx == null )
                    {
                        XLogger.error("why idx is null ? uid = " + this.getClient().uid + " deskID = " + this.mDeskInfo.deskID  ) ;
                        return true ;
                    }
                    this.getPlayerByIdx(idx).onMoCard(msg[key.card]||0) ;
                }
                break ;
            case eMsgType.MSG_PLAYER_MJ_CHU:
                {
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "chu pai error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID + " uid = " + this.getClient().uid  ) ;
                        return true ;
                    } 

                    let idx = msg[key.idx];
                    this.getPlayerByIdx(idx).onChu(msg[key.card]||0) ;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_ANGANG:
                {
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "an gang error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID + " uid = " + this.getClient().uid  ) ;
                        return true ;
                    } 
                    
                    let idx = msg[key.idx];
                    this.getPlayerByIdx(idx).onAnGang(msg[key.card]||0) ;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_BU_GANG:
                {
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "Bu gang error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID + " uid = " + this.getClient().uid  ) ;
                        return true ;
                    } 
                    
                    let idx = msg[key.idx];
                    if ( msg[key.isDeclare] == 1 )
                    {
                        this.getPlayerByIdx(idx).onBuGangDeclare(msg[key.card]||0) ;
                    }
                    else
                    {
                        this.getPlayerByIdx(idx).onBuGangDone(msg[key.card]||0) ;
                    }
                    
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_EAT:
                {
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "eat error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID + " uid = " + this.getClient().uid  ) ;
                        return true ;
                    } 
                    
                    let idx = msg[key.idx];
                    this.getPlayerByIdx(idx).onChi(msg[key.card],msg[key.eatWith],msg[key.invokerIdx] ) ;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_PENG:
                {
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "peng error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID + " uid = " + this.getClient().uid  ) ;
                        return true ;
                    } 
                    
                    let idx = msg[key.idx];
                    this.getPlayerByIdx(idx).onPeng(msg[key.card], msg[key.invokerIdx] ) ;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_MING_GANG:
                {
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "ming gang error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID + " uid = " + this.getClient().uid  ) ;
                        return true ;
                    } 
                    
                    let idx = msg[key.idx];
                    this.getPlayerByIdx(idx).onMingGang(msg[key.card], msg[key.invokerIdx] ) ;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_HU:
                {
                    // svr : { ret : 0 , huCard : number , invokerIdx : idx , maCard : 23 , maScore : 23  ,huInfo : [ idx : 23 , fanxing : number , bei : 2  ], players : [ { hold : number[], offset : 23 , final : 23 } , ... ] }
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "MSG_PLAYER_MJ_HU error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID + " uid = " + this.getClient().uid  ) ;
                        return true ;
                    } 

                    let players : Object[] = msg[key.players] ;
                    for ( let p of players )
                    {
                        this.getPlayerByIdx(p[key.idx]).score = p[key.final] ;
                    }
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_PASS:
                {

                }
                break;
            case eMsgType.MSG_PLAYER_MJ_BU_HUA:
                {
                    // svr: { idx : number , vHua : [23,23] , vCard : [22,56] }
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "bu hua error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID + " uid = " + this.getClient().uid  ) ;
                        return true ;
                    } 
                    let idx = msg[key.idx];
                    (this.getPlayerByIdx(idx) as MJPlayerDataSH ).onBuHua(msg[key.vHua], msg[key.vCard] ) ;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_TING:
                {
                    // svr: { idx : number , vHua : [23,23] , vCard : [22,56] }
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "ting error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID + " uid = " + this.getClient().uid  ) ;
                        return true ;
                    } 
                    let idx = msg[key.idx];
                    (this.getPlayerByIdx(idx) as MJPlayerDataSH ).onChu( msg[key.card]) ;
                    (this.getPlayerByIdx(idx) as MJPlayerDataSH ).onTing( msg[key.card] ) ;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_TUO_GUAN:
                {
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "ting error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID + " uid = " + this.getClient().uid  ) ;
                        return true ;
                    } 
                    let idx = msg[key.idx];
                    this.getPlayerByIdx(idx).state = msg["isSet"] == 1 ?  eMJPlayerState.eState_TuoGuan : eMJPlayerState.eState_Normal ; 
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

        //XLogger.warn( "can not find player with idx = " + idx + " deskID = " + this.mDeskInfo.deskID ) ;
        return null ;
    }

    protected addPlayer( p : MJPlayerData ) : boolean
    {
        let pr = this.getPlayerByIdx(p.nIdx) ;
        if ( pr != null )
        {
            XLogger.warn( "duplicate a player in the same idx deskID = " + this.mDeskInfo.deskID +  " uid = " + this.getClient().uid ) ;
            return false ;
        }
        this.mPlayers.push(p) ;
        return true ;
    }

    protected onInformActWitSelf( isOnlyChu : boolean , canHu : boolean , vBuGang : number[] , vAnGang : number[] , limitCards : number[] )
    {
        XLogger.debug( "recived onInformActWitSelf " );
        let self = this ;
        setTimeout(() => {
            XLogger.debug( "chu card " ) ;
            let msg = {} ;
            msg[key.card] = self.mSelfPlayer.getAutoChuCard();
            self.sendMsg( eMsgType.MSG_PLAYER_MJ_CHU , msg, self.mDeskInfo.gamePort, self.mDeskInfo.deskID ) ;
        }, 6000 );
    }

    protected onInformActWithOther(  card : number , vActs : eMJActType[] )
    {
        XLogger.debug( "recived onInformActWithOther " );
        let self = this ;
        setTimeout(() => {
            XLogger.debug( "act pass " ) ;
            let msg = {} ;
            self.sendMsg( eMsgType.MSG_PLAYER_MJ_PASS , msg, self.mDeskInfo.gamePort, self.mDeskInfo.deskID ) ;
        }, 6000 );
    }
}