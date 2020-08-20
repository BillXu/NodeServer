import { MJCardData } from './../../shared/mjData/MJCardData';
import { countBy, random } from 'lodash';
import { HuChecker } from './../../shared/mjData/HuChecker';
import { PingHuStrategy } from './PingHuStrategy';
import { IStrategy } from './IStrategy';
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
import { eMsgType,eMsgPort } from './../../shared/MessageIdentifer';
import { IClientModule } from "../IClientModule";

export class MJDeskModuleSH extends IClientModule
{
    static MODULE_NAME = "MJDeskModuleSH" ;
    protected mPlayers : MJPlayerData[] = [] ;
    protected mSelfPlayer : MJPlayerData = null ;
    protected mDeskInfo : MJDeskData = null ;
    protected mStrategy : IStrategy = null ;
    protected mWaitActOtherTimer : NodeJS.Timeout = null ;
    protected mWaitActSelfTimer : NodeJS.Timeout = null ;
    init( pClient : RobotClient )
    {
        super.init(pClient) ;
        pClient.onWithTarget( BaseDataModule.EVENT_RECIVED_BASE_DATA , this.onRecivdBaseData, this ) ;
        this.mStrategy = new PingHuStrategy();
    }

    onRecivdBaseData()
    {
        //XLogger.debug( "recieved base data , just enter desk uid = " + this.getClient().uid ) ;
        //let msg = {} ;
       // msg[key.uid] = this.getClient().uid;
        //this.sendMsg( eMsgType.MSG_PLAYER_MJ_ETNTER, msg, eMsgPort.ID_MSG_PORT_MJSH, 300 ) ;
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
                    this.mPlayers.length = 0 ;
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
            case eMsgType.MSG_PLAYER_MJ_TUO_GUAN:
                {
                    if ( msg[key.idx] == this.mSelfPlayer.nIdx && msg[key.isSet] == 1 )
                    {
                        XLogger.error( "why robot enter tuoGuan" ) ;
                        msg[key.isSet] = 0 ;
                        this.sendMsg(msgID, msg, this.mDeskInfo.gamePort, this.mDeskInfo.deskID );
                    }
                }
                break;
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
                    this.onInformActWitSelf(msg["isOnlyChu"]||false, msg["canHu"] != null && msg["canHu"] == 1, msg["buGang"], msg["anGang"], msg["limitCards"]||[] ) ;
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
                        XLogger.error( "chu pai error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID  + " selfIdx = " + this.mSelfPlayer.nIdx + " uid = " + this.getClient().uid ) ;
                        XLogger.debug( "holds : " + JSON.stringify(this.mSelfPlayer.getHoldCards()) ) ;
                        return true ;
                    } 

                    let idx = msg[key.idx];
                    if ( idx == null )
                    {
                        XLogger.error( "why do not have idx key ?" ) ;
                        return true;
                    }

                    this.getPlayerByIdx(idx).onChu(msg[key.card]||0) ;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_ANGANG:
                {
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "an gang error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID  + " selfIdx = " + this.mSelfPlayer.nIdx + " uid = " + this.getClient().uid  ) ;
                        XLogger.debug( "holds : " + JSON.stringify(this.mSelfPlayer.getHoldCards()) ) ;
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
                        XLogger.error( "Bu gang error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID  + " selfIdx = " + this.mSelfPlayer.nIdx + " uid = " + this.getClient().uid  ) ;
                        XLogger.debug( "holds : " + JSON.stringify(this.mSelfPlayer.getHoldCards()) ) ;
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
                        XLogger.error( "eat error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID  + " selfIdx = " + this.mSelfPlayer.nIdx + " uid = " + this.getClient().uid  ) ;
                        XLogger.debug( "holds : " + JSON.stringify(this.mSelfPlayer.getHoldCards()) ) ;
                        return true ;
                    } 
                    
                    let idx = msg[key.idx];
                    this.getPlayerByIdx(idx).onChi(msg[key.card],msg[key.eatWith],msg[key.invokerIdx] ) ;
                    this.getPlayerByIdx(msg[key.invokerIdx]).beEatPengGang(msg[key.card]) ;
                    if ( null != this.mWaitActOtherTimer )
                    {
                        clearTimeout(this.mWaitActOtherTimer) ;
                        this.mWaitActOtherTimer = null ;
                    }
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_PENG:
                {
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "peng error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID  + " selfIdx = " + this.mSelfPlayer.nIdx + " uid = " + this.getClient().uid  ) ;
                        XLogger.debug( "holds : " + JSON.stringify(this.mSelfPlayer.getHoldCards()) ) ;
                        return true ;
                    } 
                    
                    let idx = msg[key.idx];
                    this.getPlayerByIdx(idx).onPeng(msg[key.card], msg[key.invokerIdx] ) ;
                    this.getPlayerByIdx(msg[key.invokerIdx]).beEatPengGang(msg[key.card]) ;
                    if ( null != this.mWaitActOtherTimer )
                    {
                        clearTimeout(this.mWaitActOtherTimer) ;
                        this.mWaitActOtherTimer = null ;
                    }
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_MING_GANG:
                {
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "ming gang error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID  + " selfIdx = " + this.mSelfPlayer.nIdx + " uid = " + this.getClient().uid  ) ;
                        XLogger.debug( "holds : " + JSON.stringify(this.mSelfPlayer.getHoldCards()) ) ;
                        return true ;
                    } 
                    
                    let idx = msg[key.idx];
                    this.getPlayerByIdx(idx).onMingGang(msg[key.card], msg[key.invokerIdx] ) ;
                    if ( null != this.mWaitActOtherTimer )
                    {
                        clearTimeout(this.mWaitActOtherTimer) ;
                        this.mWaitActOtherTimer = null ;
                    }

                    this.getPlayerByIdx(msg[key.invokerIdx]).beEatPengGang(msg[key.card]) ;
                }
                break;
            case eMsgType.MSG_PLAYER_MJ_HU:
                {
                    // svr : { ret : 0 , huCard : number , invokerIdx : idx , maCard : 23 , maScore : 23  ,huInfo : [ idx : 23 , fanxing : number , bei : 2  ], players : [ { hold : number[], offset : 23 , final : 23 } , ... ] }
                    if ( msg[key.ret] != null && msg[key.ret] != 0 )
                    {
                        XLogger.error( "MSG_PLAYER_MJ_HU error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID  + " selfIdx = " + this.mSelfPlayer.nIdx + " uid = " + this.getClient().uid  ) ;
                        XLogger.debug( "holds : " + JSON.stringify(this.mSelfPlayer.getHoldCards()) ) ;
                        return true ;
                    } 

                    let players : Object[] = msg[key.players] ;
                    for ( let p of players )
                    {
                        this.getPlayerByIdx(p[key.idx]).score = p[key.final] ;
                    }

                    if ( null != this.mWaitActOtherTimer )
                    {
                        clearTimeout(this.mWaitActOtherTimer) ;
                        this.mWaitActOtherTimer = null ;
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
                        XLogger.error( "bu hua error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID  + " selfIdx = " + this.mSelfPlayer.nIdx + " uid = " + this.getClient().uid  ) ;
                        XLogger.debug( "holds : " + JSON.stringify(this.mSelfPlayer.getHoldCards()) ) ;
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
                        XLogger.error( "ting error  ret = " + msg[key.ret] + " deskID " + this.mDeskInfo.deskID  + " selfIdx = " + this.mSelfPlayer.nIdx + " uid = " + this.getClient().uid  ) ;
                        XLogger.debug( "holds : " + JSON.stringify(this.mSelfPlayer.getHoldCards()) ) ;
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
                        XLogger.debug( "holds : " + JSON.stringify(this.mSelfPlayer.getHoldCards()) ) ;
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
        XLogger.debug( "recived onInformActWitSelf idx =  "  + this.mSelfPlayer.nIdx );
        if ( (this.mSelfPlayer as MJPlayerDataSH).isTing )
        {
            XLogger.debug( "already ting do nonthing" );
            return ;
        }

        if ( this.mWaitActSelfTimer != null )
        {
            clearTimeout(this.mWaitActSelfTimer) ;
            this.mWaitActSelfTimer = null ;
        }

        let self = this ;
        this.mWaitActSelfTimer = setTimeout(() => {
            XLogger.debug( "chu card idx = " + self.mSelfPlayer.nIdx ) ;
            self.mWaitActSelfTimer = null ;
            self.printHolds();
            self.robotDoAct(isOnlyChu, canHu, vBuGang, vAnGang, limitCards) ;
        }, 800 + random(1000,false) );
    }

    robotDoAct( isOnlyChu : boolean , canHu : boolean , vBuGang : number[] , vAnGang : number[] , limitCards : number[] )
    {
        let vAct : eMJActType[] = [] ;
        if ( canHu )
        {
            vAct.push( eMJActType.eMJAct_Hu );
        }

        if ( null != vBuGang && vBuGang.length != 0 )
        {
            vAct.push( eMJActType.eMJAct_BuGang_Declare );
        }
        
        if ( null != vAnGang && vAnGang.length != 0 )
        {
            vAct.push( eMJActType.eMJAct_AnGang );
        }

        if ( isOnlyChu || vAct.length == 0 )
        {
            this.robotDecideChu( limitCards );
        }
        else
        {
            let v = this.mStrategy.onDecideActWithSelfCardNew(this.mSelfPlayer.cardData, vAct );
            if ( v.act == eMJActType.eMJAct_Pass )
            {
                this.sendMsg( eMsgType.MSG_PLAYER_MJ_PASS , {}, this.mDeskInfo.gamePort, this.mDeskInfo.deskID ) ;

                this.robotDecideChu( limitCards );
                return ;
            }

            let msg = {} ;
            msg[key.card] = v.card ;
            switch ( v.act )
            {
                case eMJActType.eMJAct_AnGang:
                    {
                        console.log( "AnGang : " + MJCardData.getCardStr(v.card) ) ;
                        this.sendMsg( eMsgType.MSG_PLAYER_MJ_ANGANG , msg, this.mDeskInfo.gamePort, this.mDeskInfo.deskID ) ;
                    }
                    break;
                case eMJActType.eMJAct_BuGang_Declare:
                    {
                        console.log( "BuGang : " + MJCardData.getCardStr(v.card) ) ;
                        this.sendMsg( eMsgType.MSG_PLAYER_MJ_BU_GANG , msg, this.mDeskInfo.gamePort, this.mDeskInfo.deskID ) ;
                    }
                    break;
                case eMJActType.eMJAct_Hu:
                    {
                        console.log( "HuGang : " + MJCardData.getCardStr(v.card) ) ;
                        this.sendMsg( eMsgType.MSG_PLAYER_MJ_HU , msg, this.mDeskInfo.gamePort, this.mDeskInfo.deskID ) ;
                    }
                    break;
                default:
                    console.error( "unknown act for self act = " + eMJActType[v.act] ) ;
            }
        }
    }

    protected onInformActWithOther(  card : number , vActs : eMJActType[] )
    {
        XLogger.debug( "recived onInformActWithOther idx = "  + this.mSelfPlayer.nIdx  );
        let self = this ;
        this.mWaitActOtherTimer = setTimeout(() => {
            XLogger.debug( "act pass idx = " + self.mSelfPlayer.nIdx ) ;
            self.mWaitActOtherTimer = null ;
            self.printHolds();
            self.robotDoActWithOtherCard(card, vActs) ;
        }, 800 + random(1000,false) );
    }

    robotDoActWithOtherCard( card : number , vActs : eMJActType[] )
    {
        let vEatWith = [] ;
        let c = this.mStrategy.onDecideActWithOtherCardNew( this.mSelfPlayer.getHoldCards(), vActs, card, vEatWith ) ;
        switch ( c )
        {
            case eMJActType.eMJAct_Hu:
                {
                    let msg = {} ;
                    msg[key.card] = card ;
                    this.sendMsg( eMsgType.MSG_PLAYER_MJ_HU , msg, this.mDeskInfo.gamePort, this.mDeskInfo.deskID ) ;
                    console.log( "hu : " + MJCardData.getCardStr(card) ) ;
                }
                break;
            case eMJActType.eMJAct_Chi:
                {
                    let msg = {} ;
                    msg[key.card] = card ;
                    msg[key.eatWith] = vEatWith;
                    this.sendMsg( eMsgType.MSG_PLAYER_MJ_EAT , msg, this.mDeskInfo.gamePort, this.mDeskInfo.deskID ) ;
                    console.log( "chi : " + MJCardData.getCardStr(card) + "with : " + MJCardData.getCardStr(vEatWith[0]) + " and " + MJCardData.getCardStr( vEatWith[1] ) ) ;
                }
                break;
            case eMJActType.eMJAct_Peng:
                {
                    let msg = {} ;
                    msg[key.card] = card ;
                    this.sendMsg( eMsgType.MSG_PLAYER_MJ_PENG , msg, this.mDeskInfo.gamePort, this.mDeskInfo.deskID ) ;
                    console.log( "peng : " + MJCardData.getCardStr(card) ) ;
                }
                break;
            case eMJActType.eMJAct_MingGang:
                {
                    let msg = {} ;
                    msg[key.card] = card ;
                    this.sendMsg( eMsgType.MSG_PLAYER_MJ_MING_GANG , msg, this.mDeskInfo.gamePort, this.mDeskInfo.deskID ) ;
                    console.log( "ming gang : " + MJCardData.getCardStr(card) ) ;
                }
                break;
            case eMJActType.eMJAct_Pass:
                {
                    let msg = {} ;
                    msg[key.card] = card ;
                    this.sendMsg( eMsgType.MSG_PLAYER_MJ_PASS , msg, this.mDeskInfo.gamePort, this.mDeskInfo.deskID ) ;
                }
                break;
            default:
                XLogger.warn( "unknown act = " + c ) ;
                return ;
        }
    }

    protected getLeftCardCnt( card : number ) : number
    {
        let cnt = 0 ;
        for ( let p of this.mPlayers )
        {
            if ( p == null )
            {
                continue ;
            }

            let vOut = p.cardData.mOutCards;
            let ret = countBy(vOut,c=>c==card ? card : 0 ) ;
            cnt += ret[card] == null ? 0 : ret[card] ;
            if ( cnt >= 4 )
            {
                break ;
            }

            for ( let acted of p.cardData.vActedCards )
            {
                if ( acted.act == eMJActType.eMJAct_Chi )
                {
                    if ( acted.card == card || acted.eatWith.indexOf(card) != -1 )
                    {
                        ++cnt ;
                    }
                    continue ;
                }

                if ( acted.card != card )
                {
                    continue ;
                }

                if ( acted.act == eMJActType.eMJAct_Peng )
                {
                    cnt += 3 ;
                    continue ;
                }

                
                if ( acted.act == eMJActType.eMJAct_MingGang || acted.act == eMJActType.eMJAct_AnGang || acted.act == eMJActType.eMJAct_BuGang_Done )
                {
                    cnt += 4 ;
                    break ;
                }

            }

            if ( cnt >= 4 )
            {
                break ;
            }

            if ( p.nIdx == this.mSelfPlayer.nIdx )
            {
                let ret = countBy(p.cardData.mHoldCards,c=>c==card ? card : 0 ) ;
                cnt += ret[card] == null ? 0 : ret[card] ;
            }
        }

        cnt = 4 - cnt ;
        if ( cnt < 0 )
        {
            console.error( "why card left < 0 card = " + MJCardData.getCardStr(card) + " cnt = " + cnt ) ;
            cnt = 0 ;
        }
        return cnt ;
    }

    protected robotDecideChu( limtCards : number[] ) 
    {
        let v = HuChecker.getInstance().checkTing( this.mSelfPlayer.getHoldCards() ) ;
        if ( v == null || v.length == 0 )
        {
            
            let msg = {} ;
            msg[key.card] = this.mStrategy.getBestChuCard(this.mSelfPlayer.getHoldCards(),this.getLeftCardCnt.bind(this),limtCards ) ;
            this.sendMsg( eMsgType.MSG_PLAYER_MJ_CHU , msg, this.mDeskInfo.gamePort, this.mDeskInfo.deskID ) ;
            console.log( "chu pai : " + MJCardData.getCardStr(msg[key.card]) ) ;
            return ;
        }

        let chu = 0 ;
        let tingCnt = 0 ;
        for ( let c of v )
        {
            let cnt = 0 ;
            let vting = c.tingCards;
            for ( let tc of vting )
            {
                cnt += this.getLeftCardCnt(tc) ;
            }

            if ( tingCnt < cnt || 0 == chu )
            {
                tingCnt = cnt ;
                chu = c.chu ;
            }
        }

        let msg = {} ;
        msg[key.card] = chu ;
        this.sendMsg( eMsgType.MSG_PLAYER_MJ_TING , msg, this.mDeskInfo.gamePort, this.mDeskInfo.deskID ) ;
        console.log( "chu pai : " + MJCardData.getCardStr(chu) ) ;
    }

    protected printHolds()
    {
        MJCardData.printCards( "holds " , this.mSelfPlayer.cardData.mHoldCards ) ;
    }
}