import { eRpcFuncID } from './../Rpc/RpcFuncID';
import { eMsgType } from './../../shared/MessageIdentifer';
import { DeskMgr } from './DeskMgr';
export interface IDeskDelegate
{
    onDeskFinished( result : { uid : number , score : number }[] , desk : IDesk ) : void ;
}

export interface IDesk
{
    deskID : number ;
    matchID : number ;
    lawIdx : number ;
    init( deskID : number , diFen : number , roundCnt : number , delegate : IDeskDelegate , deskMgr : DeskMgr ) : void ;
    setMatchInfo( matchID : number , lawIdx : number ) : void ;

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean ;
    onRpcCall( funcID : eRpcFuncID , arg : Object , sieralNum : number ) : Object ;
    onPlayerEnter( uid : number , sessionID : number , score : number ) : boolean ; 
}