import { ePlayerNetState } from './../commonDefine';
import { key } from './../../shared/KeyDefine';
import { eRpcFuncID } from './../Rpc/RpcFuncID';
import HashMap  from 'hashmap';
import { XLogger } from './../Logger';
import { IDesk, IDeskDelegate } from './IDesk';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { IModule } from "../IModule";

export abstract class DeskMgr extends IModule implements IDeskDelegate
{
    static MODUEL_NAME : string = "DeskMgr" ;
    protected mDesks : HashMap<number,IDesk> = new HashMap<number,IDesk>();
    getModuleType() : string
    {
        return DeskMgr.MODUEL_NAME ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort, targetID : number ) : boolean
    {
        let p = this.mDesks.get(targetID) ;
        if ( null == p )
        {
            XLogger.warn( "send msg to desk , but desk is null deskID = " + targetID + " sessionID = " + orgID + " msgID = " + eMsgType[msgID] + " msg = " + JSON.stringify(msg||{}) ) ;
            msg[key.ret] = 200 ;
            msg["err"] = "can not find target with ID = " + targetID ;
            XLogger.debug( "desk cnt = " + this.mDesks.count() ) ;
            let vs = this.mDesks.values() ;
            vs.forEach( v=> XLogger.debug( "desk runing id = " + v.deskID )) ;
            return false ;
        }

        XLogger.debug( "recived desk msg , deskID = " + targetID + " msgID = " + eMsgType[msgID] + " detail = " + JSON.stringify(msg) ) ;
        return p.onLogicMsg(msgID, msg, orgID) ;
    }

    onRpcCall( funcID : eRpcFuncID, arg : Object , sieral : number , outResult : Object ) : boolean
    {
        switch ( funcID )
        {
            case eRpcFuncID.Func_CreateMatchDesk:
                {
                    // arg : { matchID : 234 , lawIdx : 2 , deskCnt : 4 , roundCnt : 2  ,diFen : 23 }
                    let cnt = arg[key.deskCnt] ;
                    let roundCnt = arg[key.roundCnt] ;
                    let diFen = arg[key.diFen] ;
                    let mid = arg[key.matchID] ;
                    let lidx = arg[key.lawIdx] ;
                    let cfgID = arg[key.cfgID] ;
                    let vIDs = [] ;
                    while ( cnt-- )
                    {
                        let d = this.createDesk();
                        let did = this.generateUniqueID();
                        while ( this.mDesks.has(did) )
                        {
                            XLogger.warn( "already have desk id = " + did + " try another" ) ;
                            did = this.generateUniqueID();
                        }
                        d.init(did, diFen, roundCnt, this ,this ) ;
                        d.setMatchInfo( mid, lidx , cfgID ) ;
                        this.mDesks.set(d.deskID, d ) ;
                        vIDs.push( d.deskID ) ;
                    }
                    outResult[key.deskIDs] = vIDs ;
                    XLogger.debug( "create desk ok = " + vIDs ) ;
                }
                break;
            case eRpcFuncID.Func_DeskUpdatePlayerNetState:
                {
                    // arg : { deskID : 234 , uid : 23 , sessionID : 234 , state : ePlayerNetState }
                    let deskID = arg[key.deskID] ;
                    let d = this.mDesks.get(deskID) ;
                    if ( null == d )
                    {
                        XLogger.debug( "inform desk player net state , but desk is null deskID = " + deskID + " uid = " + arg[key.uid] ) ;
                        break ;
                    }
                    XLogger.debug("refresh player netState , deskID = " + arg[key.deskID] + " uid = " + arg[key.uid] + " setate = " + ePlayerNetState[arg[key.state]] ) ;
                    d.onRpcCall(funcID, arg, sieral ) ;
                }
                break
            case eRpcFuncID.Func_PushPlayersToDesk:
                {
                    // arg : { deskID : 2 , players : { uid : 234 , sessionID : 234 , score : 234 }[] }
                    let deskID = arg[key.deskID] ;
                    let vPlayer = arg[key.players] ;
                    let pd = this.mDesks.get(deskID) ;
                    if ( null == pd )
                    {
                        XLogger.warn( "push player into desk , but desk is null , deskID = " + deskID ) ;
                        break ;
                    }
                    
                    XLogger.debug( "push player into desk matchID = " + pd.matchID + " deskID = " + deskID + " playes = " + JSON.stringify( vPlayer ) )
                    for ( let jsp of vPlayer )
                    {
                        pd.onPutPlayerToDesk( jsp[key.uid], jsp[key.token], jsp[key.score] ) ;
                    }
                }
                break ;
            default:
                return false ;
        }
        return true ;
    }

    // desk delegate ;
    onDeskFinished( result : { uid : number , score : number }[] , desk : IDesk ) : void
    {
        // arg : { matchID : 234 , lawIdx : 23 , deksID : 2 , players : { uid : 23 , score : 23 }[] }
        XLogger.debug( "match desk finished matchID = " + desk.matchID + " deskID= " + desk.deskID + " result = " + JSON.stringify(result)  ) ;
        let arg = {} ;
        arg[key.matchID] = desk.matchID;
        arg[key.lawIdx] = desk.lawIdx;
        arg[key.deskID] = desk.deskID;
        arg[key.players] = result;
        this.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_MATCH, desk.matchID, eRpcFuncID.Func_InformDeskResult, arg ) ;
        
        this.mDesks.delete( desk.deskID ) ;
    }

    abstract createDesk() : IDesk ;
}