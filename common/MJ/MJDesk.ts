import { eMJActType } from './../../shared/mjData/MJDefine';
import { XLogger } from './../Logger';
import { eMJDeskState } from './../../shared/SharedDefine';
import { IMJDeskState } from './IMJDeskState';
import { DeskMgr } from './DeskMgr';
import { eRpcFuncID } from './../Rpc/RpcFuncID';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { IDesk, IDeskDelegate } from './IDesk';
import { MJDeskData } from './../../shared/mjData/MJDeskData';
export class MJDesk extends MJDeskData implements IDesk
{
    protected mDelegate : IDeskDelegate = null ;
    protected mDeskMgr : DeskMgr = null ;
    protected vStates : IMJDeskState[] = [] ;
    //  idesk 
    init( deskID : number , diFen : number , roundCnt : number , delegate : IDeskDelegate , deskMgr : DeskMgr ) : void 
    {
        this.deskID = deskID ;
        this.diFen = diFen ;
        this.roundCnt = roundCnt ;
        this.mDelegate = delegate ;
        this.mDeskMgr = deskMgr ;
        this.intallDeskState();
    }

    setMatchInfo( matchID : number , lawIdx : number ) : void 
    {
        this.matchID = matchID ;
        this.lawIdx = lawIdx ;
    }

    getDeskID() : number 
    {
        return this.deskID ;
    }

    getMatchID() : number 
    {
        return this.matchID ;
    }

    getMatchLawIdx() : number 
    {
        return this.lawIdx ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean 
    {
        return false ;
    }

    onRpcCall( funcID : eRpcFuncID , arg : Object , sieralNum : number ) : Object 
    {
        return {} ;
    }

    onPlayerEnter( uid : number , sessionID : number , score : number ) : boolean 
    {
        let p = this.createMJPlayerData();
        p.uid = uid ;
        p.sessionID = sessionID ;
        p.score = score ;
        return this.addPlayer(p) ;
    }

    // self function 
    canStartGame() : boolean
    {
        return this.vPlayers.length == this.seatCnt;
    }

    distributeCards()
    {

    }

    informOtherPlayerAct( players : number[], card : number , invokeIdx : number , invokerAct : eMJActType )
    {

    }

    onPlayerDoActWitSelfCard( idx : number ,act : eMJActType , card : number , invokerIdx : number  ) : boolean 
    {
        return true ;
    }

    onPlayerDoActWithOtherCard( idx : number ,act : eMJActType , card : number , invokerIdx : number , invokerGangCnt : number , eatWith? : number[] )
    {

    }

    canPlayerDoAct( idx : number ,act : eMJActType , card : number , invokerIdx : number , eatWith? : number[]  ) : boolean 
    {
        return true ;
    }

    onPlayerMo( idx : number ) : void
    {

    }

    getPlayerAutoChuCard() : number
    {
        return 0;
    }

    getPlayersNeedTheCard( card : number , invokerIdx : number , isBuGang : boolean ) : { idx : number , maxAct : eMJActType } []
    {
        return null ;
    }

    getNextActIdx( curIdx : number ) : number
    {
        return ( curIdx + 1 ) % this.seatCnt ;
    }

    protected intallDeskState()
    {

    }
    
    transferState( state : eMJDeskState , info? : Object )
    {
        if ( this.state == state )
        {
            XLogger.warn( "duplicate enter same state = " + state + " deskID = " + this.deskID ) ;
        }

        if ( this.vStates[this.state] != null )
        {
            this.vStates[this.state].onLevelState();
        }
        this.state = state ;
        this.vStates[this.state].onEnterState(info) ;
    }

    sendMsgToPlayer( nSessionID : number , msgID : eMsgType , msg : Object )
    {
        this.mDeskMgr.sendMsg(msgID, msg, eMsgPort.ID_MSG_PORT_CLIENT, nSessionID, this.deskID ) ;
    }

    sendDeskMsg( msgID : eMsgType , msg : Object , ignorePlayerIdx? : number )
    {
        for ( let p of this.vPlayers )
        {
            if ( ignorePlayerIdx != null && p.nIdx == ignorePlayerIdx )
            {
                continue ;
            }
            this.sendMsgToPlayer(p.sessionID, msgID,  msg ) ;
        }
    }
}