import { key } from './../../shared/KeyDefine';
import { eRpcFuncID } from './../Rpc/RpcFuncID';
import HashMap  from 'hashmap';
import { XLogger } from './../Logger';
import { IDesk, IDeskDelegate } from './IDesk';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { IModule } from "../IModule";

export class DeskMgr extends IModule implements IDeskDelegate
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
            return false ;
        }

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
                    let vIDs = [] ;
                    while ( cnt-- )
                    {
                        let d = this.createDesk();
                        d.init(this.generateUniqueID(), diFen, roundCnt, this ) ;
                        d.setMatchInfo( mid, lidx ) ;
                        this.mDesks.set(d.getDeskID(), d ) ;
                        vIDs.push( d.getDeskID() ) ;
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
                    
                    XLogger.debug( "push player into desk matchID = " + pd.getMatchID() + " deskID = " + deskID + " playes = " + JSON.stringify( vPlayer ) )
                    for ( let jsp of vPlayer )
                    {
                        pd.onPlayerEnter( jsp[key.uid], jsp[key.sessionID], jsp[key.score] ) ;
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
        XLogger.debug( "match desk finished matchID = " + desk.getMatchID() + " deskID= " + desk.getDeskID() + " result = " + JSON.stringify(result)  ) ;
        let arg = {} ;
        arg[key.matchID] = desk.getMatchID();
        arg[key.lawIdx] = desk.getMatchLawIdx();
        arg[key.deskID] = desk.getDeskID();
        arg[key.players] = result;
        this.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_MATCH, desk.getMatchID(), eRpcFuncID.Func_InformDeskResult, arg ) ;
        
        this.mDesks.delete( desk.getDeskID() ) ;
    }

    createDesk() : IDesk
    {
        XLogger.error( "must implement in sub class " ) ;
        return null ;
    }

    
}