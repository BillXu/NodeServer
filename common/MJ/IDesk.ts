import { eRpcFuncID } from './../Rpc/RpcFuncID';
import { eMsgType } from './../../shared/MessageIdentifer';
export interface IDeskDelegate
{
    onDeskFinished( result : { uid : number , score : number }[] , desk : IDesk ) : void ;
}

export interface IDesk
{
    init( deskID : number , diFen : number , roundCnt : number , delegate : IDeskDelegate ) : void ;
    setMatchInfo( matchID : number , lawIdx : number ) : void ;
    getDeskID() : number ;
    getMatchID() : number ;
    getMatchLawIdx() : number ;
    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number ) : boolean ;
    onRpcCall( funcID : eRpcFuncID , arg : Object , sieralNum : number ) : Object ;
    onPlayerEnter( uid : number , sessionID : number , score : number ) : void ; 
}