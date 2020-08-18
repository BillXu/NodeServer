import { remove } from 'lodash';
import { ePlayerNetState } from './../common/commonDefine';
import { XLogger } from './../common/Logger';
import { key } from './../shared/KeyDefine';
import HashMap  from 'hashmap';
import { eRpcFuncID } from './../common/Rpc/RpcFuncID';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IModule } from "../common/IModule";
enum eRobotState
{
    eIdle,
    eOnTheWay,
    eWorking,
    eMax,
};

class Robot
{
    uid : number = 0 ;
    sessionID : number = 0 ;
    state : eRobotState = eRobotState.eIdle ; 
};

export class RobotMgr extends IModule
{
    static MODULE_NAME : "robotMgr" ;
    mAllRobots : HashMap<number,Robot>  = new HashMap<number,Robot>() // { uid ,  robot } 
    mIdles : Robot[]  = []; // { uid ,  robot } 
    mWorkings : HashMap<number,Robot>  = new HashMap<number,Robot>(); // { uid ,  robot } 
    mOnTheWays : HashMap<number,Robot>  = new HashMap<number,Robot>() ; // { uid ,  robot } 
    getModuleType() : string
    {
        return RobotMgr.MODULE_NAME ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort, targetID : number ) : boolean
    {
        if ( eMsgType.MSG_R_ORDER_JOIN == msgID )
        {
            // robot join match failed ;
            // remove from onthe way to idle ;
            let uid = msg[key.uid] ;
            let p = this.mOnTheWays.get(uid) ;
            if ( p == null )
            {
                XLogger.debug( "robot join match failed but on the way is null ? uid = " + uid ) ;
                return true ;
            }
            p.state = eRobotState.eIdle ;
            this.mIdles.push(p) ;
            this.mOnTheWays.delete( uid ) ;
            XLogger.debug( "robot join match failed uid = " + uid ) ;
        }
        return false ;
    }

    onRpcCall( funcID : eRpcFuncID , arg : Object , sieral : number , outResult : Object ) : boolean
    {
        switch ( funcID )
        {
            case eRpcFuncID.Func_InformPlayerNetState:
                {
                    let uid = arg[key.uid] ;
                    let sessionID = arg[key.sessionID] ;
                    let state = arg[key.state] ;
                    let p = this.mAllRobots.get(uid) ;
                    // if in idle , just remove ;
                    if ( p == null )
                    {
                        XLogger.warn( "why a robot is null ? uid = " + uid ) ;
                        break ;
                    }

                    if ( state == ePlayerNetState.eState_Online )
                    {
                        p.sessionID = sessionID ;
                    }

                    if ( state == ePlayerNetState.eState_WaitingReconnect )
                    {
                        p.sessionID = 0 ;
                    }
                    
                    if ( p.sessionID != 0 && state == ePlayerNetState.eState_Disconnected )
                    {
                        XLogger.error( "state error , not wait reconnect , direct disconnected ? " ) ;
                        break ;
                    }

                    if ( state == ePlayerNetState.eState_Disconnected )
                    {
                        if ( p.state == eRobotState.eIdle )
                        {
                            remove(this.mIdles,(pi)=>pi.uid==uid ) ;
                        }
                        else if ( p.state == eRobotState.eWorking )
                        {
                            this.mWorkings.delete(uid) ;
                        }
                        else if ( p.state == eRobotState.eOnTheWay )
                        {
                            this.mOnTheWays.delete(uid) ;
                        }
                        else
                        {
                            XLogger.error( "robot known state = " + p.state ) ;
                        }
                        this.mAllRobots.delete(uid) ;
                    }

                    XLogger.debug( "robot net state changed uid = " + uid  +  " state = " + ePlayerNetState[state] + "robot cnt = " + this.mAllRobots.count() ) ;
                    if ( this.mAllRobots.count() % 100 == 0 )
                    {
                        XLogger.info( "1 current robotCnt = " + this.mAllRobots.count() );
                    }
                    this.logState();
                }
                break ;
            case eRpcFuncID.Func_OnRobotLogin:
                {
                    let uid = arg[key.uid] ;
                    let sessionID = arg[key.sessionID] ;
                    let p = this.mAllRobots.get(uid) ;
                    if ( p != null )
                    {
                        if ( p.sessionID != 0 )
                        {
                            XLogger.error( "robot already in the queue , why join again ? uid = " + uid ) ;
                        }
                        else
                        {
                            XLogger.debug( "robot reconnected uid = " + uid ) ;
                        }
                        p.sessionID = sessionID ;
                        break ;
                    }

                    let R = new Robot();
                    R.sessionID = sessionID ;
                    R.uid = uid ;
                    R.state = eRobotState.eIdle ;
                    this.mAllRobots.set(uid, R ) ;
                    this.mIdles.push(R) ;
                    XLogger.debug( "a robot joined uid = " + uid + " robotCnt = " + this.mAllRobots.count() ) ;
                    if ( this.mAllRobots.count() % 100 == 0 )
                    {
                        XLogger.info( "current robotCnt = " + this.mAllRobots.count() );
                    }
                    this.logState();
                }
                break ;
            case eRpcFuncID.Func_RobotWorkingState:
                {
                    let isWorking = arg["isJoin"] ;
                    let uid = arg[key.uid] ;
                    if ( isWorking )
                    {
                        let onThe = this.mOnTheWays.get(uid) ;
                        if ( onThe == null )
                        {
                            XLogger.error( "why robot not in onther way ? uid = " + uid ) ;
                            break ;
                        }
                        this.mOnTheWays.delete(uid) ;
                        this.mWorkings.set(uid, onThe ) ;
                        onThe.state = eRobotState.eWorking ;
                        XLogger.debug( "robot put to working, uid = " + uid ) ;
                    }
                    else
                    {
                        let pw = this.mWorkings.get(uid) ;
                        if ( pw == null )
                        {
                            XLogger.warn( "why robot not in working ? uid = " + uid ) ;
                            break ;
                        }
                        this.mWorkings.delete(uid) ;
                        this.mIdles.push(pw) ;
                        pw.state = eRobotState.eIdle ;
                        XLogger.debug( "robot put to idle, uid = " + uid ) ;
                    }
                    this.logState();
                }
                break;
            case eRpcFuncID.Func_ReqRobot:
                {
                    let matchID = arg[key.matchID] ;
                    let lawIdx = arg[key.lawIdx] ;
                    let cnt = arg[key.cnt] ;
                    let vJoinIDs : number[] = [] ;
                    for ( let idx = 0 ; idx < this.mIdles.length && cnt > 0  ; ++idx )
                    {
                        let p = this.mIdles[idx] ;
                        if ( p.sessionID == 0 )
                        {
                            continue ;
                        } 
                        vJoinIDs.push( p.uid ) ;
                        this.mOnTheWays.set(p.uid, p ) ;
                        p.state = eRobotState.eOnTheWay;
                        --cnt ;
                        // tell robot to go to match ;
                        let msg = {} ;
                        msg[key.matchID] = matchID ;
                        msg[key.lawIdx] = lawIdx ;
                        this.sendMsg( eMsgType.MSG_R_ORDER_JOIN, msg, eMsgPort.ID_MSG_PORT_CLIENT, p.sessionID, 0 ) ;
                    }

                    // remove from on the way ;
                    remove(this.mIdles,( p )=>{ return vJoinIDs.indexOf(p.uid) != -1 ;} ) ;

                    outResult["lackCnt"] = cnt;
                    XLogger.debug( "respone robot req cnt ,lack cnt = " + cnt ) ;
                    this.logState();
                }
                break;
            default:
                return false ;
        }
        return true ;
    }

    logState()
    {
        XLogger.debug( "robot totalCnt = " + this.mAllRobots.count() + " working cnt = " + this.mWorkings.count() + " onTheWayCnt = " + this.mOnTheWays.count() + " idleCnt = " + this.mIdles.length ) ;
    }
}