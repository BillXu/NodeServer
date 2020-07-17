import { eRpcFuncID } from './../common/Rpc/RpcFuncID';
import { random } from 'lodash';
import { DataSvr } from './DataSvr';
import { key } from './../shared/KeyDefine';
import { XLogger } from './../common/Logger';
import HashMap from 'hashmap';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { PlayerSimpleInfo } from './../shared/playerData/PlayerSimpleInfo';
import { IModule } from "../common/IModule";

export class PlayerSimpleInfoCacher extends IModule
{
    static MODULE_NAME : string = "PlayerSimpleInfoCacher" ;
    protected mSimpleInfos = new HashMap<number,PlayerSimpleInfo>();
    protected mRequestQueue = new HashMap<number,Set<number>>();
    getModuleType() : string
    {
        return PlayerSimpleInfoCacher.MODULE_NAME ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort, targetID : number ) : boolean
    {
        if ( msgID != eMsgType.MSG_REQUEST_PLAYER_SIMPLE_INFO )
        {
            return false ;
        }

        let reqID = msg[key.reqUID] ;
        let selfSessionID = msg[key.selfSessionID] ;
        if ( reqID % this.getSvrApp().getCurPortMaxCnt() != this.getSvrApp().getCurSvrIdx() )
        {
            XLogger.warn( "uid is never in this server , uid = " + reqID + " target uid = " + targetID + " target id should equal uid "  ) ;
            this.sendMsg(msgID, { ret : 1 } , eMsgPort.ID_MSG_PORT_CLIENT, selfSessionID, orgID ) ;
            return true;
        }

        // check mgr ;
        let simple = {} ;
        if ( ( this.getSvrApp() as DataSvr ).getPlayerMgr().visitPlayerSimpleInfo(reqID,  simple ) )
        {
            simple[key.ret] = 0 ;
            this.sendMsg(msgID, simple, eMsgPort.ID_MSG_PORT_CLIENT, selfSessionID, orgID ) ;
            return true ;
        }

        // check cacher
        let s = this.mSimpleInfos.get(reqID) ;
        if ( s != null )
        {
            simple = s.toJson();
            simple[key.ret] = 0 ;
            this.sendMsg(msgID, simple, eMsgPort.ID_MSG_PORT_CLIENT, selfSessionID, orgID ) ;
            return true ;
        }

        // put waiting queue ;
        let q = this.mRequestQueue.get(reqID) ;
        if ( q != null )
        {
            q.add(selfSessionID) ;
            XLogger.debug( "already request from db , just add wait queue session id = " + selfSessionID + " reqID = " + reqID  ) ;
            return true ;
        }
        q = new Set<number>();
        this.mRequestQueue.set(reqID,q ) ;
        q.add(selfSessionID) ;
        // req from db 
        XLogger.debug("req simple info rom db reqID =  " + reqID ) ;
        let self = this ;
        this.getSvrApp().getRpc().invokeRpc( eMsgPort.ID_MSG_PORT_DB , random(300,false), eRpcFuncID.Func_LoadPlayerInfo,{ uid : reqID} ,( result : Object )=>{
            let jsBack = {} ;
            if ( Object.keys(result).length == 0 )
            {
                XLogger.warn( "can not load simple info for req uid = " + reqID ) ;
                jsBack[key.ret] = 1 ;
            }
            else
            {
                XLogger.debug( "recieved simple info id = " + reqID + " result : " + JSON.stringify(result) ) ;
                let simple = new PlayerSimpleInfo() ;
                simple.parse(result) ;
                self.mSimpleInfos.set(simple.uid, simple ) ;
                jsBack = simple.toJson();
                jsBack[key.ret] = 0 ;
            }

            let q = self.mRequestQueue.get(reqID) ;
            q.forEach( ( s : number )=>{
                self.sendMsg(msgID, jsBack, eMsgPort.ID_MSG_PORT_CLIENT, s, orgID ) ;
                XLogger.debug( "respone player in request queue sessionID = " + s + " for reqID = " + reqID  ) ;
            } ) ;
            self.mRequestQueue.delete(reqID) ;
        } )  ;
    }

    onPlayerLogin( uid : number )
    {
        if ( this.mSimpleInfos.has(uid) )
        {
            this.mSimpleInfos.delete( uid ) ;
            XLogger.debug( "player login ,remove from simpleInfos uid = " +  uid ) ;
        }
    }
}