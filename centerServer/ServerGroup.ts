import { XLogger } from './../common/Logger';
import { eMsgPort } from './../shared/MessageIdentifer';
import HashMap from "hashmap"
class ServerInfo
{
    sessionID : number = 0 ;
    svrIdx : number = 0 ;
    isWaitingReconnect : boolean = false ;
    constructor( sessionid : number , idx : number )
    {
        this.sessionID = sessionid ;
        this.svrIdx = idx ;
        this.isWaitingReconnect = false ;
    }
}

export class ServerGroup
{
    protected mSvrInfos : HashMap<number,ServerInfo> = new HashMap<number,ServerInfo>() ;
    mPortType : eMsgPort = eMsgPort.ID_MSG_PORT_MAX ;
    protected mMaxCnt : number = 1 ;
    init( portType : eMsgPort, maxCnt : number = 200  )
    {
        this.mPortType = portType ;
        this.mMaxCnt = maxCnt ;
    }

    getTargetSvrs( targetID : number ) : number[]
    {
        let v = [] ;
        if ( -1 == targetID ) // brocast all ;
        {
            let vk = this.mSvrInfos.values();
            for ( let s of vk )
            {
                v.push( s.sessionID ) ;
            }
            return v ;
        }

        let idx = targetID % this.mMaxCnt ;
        if ( this.mSvrInfos.has(idx) == false )
        {
            XLogger.warn("target svr idx is null , id = " + targetID + " max cnt = " + this.mMaxCnt ) ;
            idx = -1 ; // sign not find a proper target ; 
            for ( let i = 0 ; i < this.mMaxCnt ; ++i )
            {
                let tmp = this.mSvrInfos.get(i) ;
                if ( tmp != null && tmp.isWaitingReconnect == false )
                {
                    idx = i ;
                    break ;
                }
            }
        }

        if ( idx != -1 )
        {
            v.push( this.mSvrInfos.get( idx ).sessionID ) ;
        }
        return v ;
    }

    isSvrEmpty( idx : number )
    {
        return this.mSvrInfos.has(idx) == false ;
    }

    getSvrIdxBySessionID( sessionID : number ) : number
    {
        let vk = this.mSvrInfos.entries() ;
        for ( let v of vk )
        {
            if ( v[1].sessionID == sessionID )
            {
                //XLogger.debug( "do remove svr session id = " + sessionID + " portType = " + this.mPortType ) ;
                return v[0];
            }
        }

        return -1 ;
    }

    addSvr( sessionID : number , sugustIdx : number ) : number 
    {

        if ( this.mSvrInfos.has(sugustIdx) == false )
        {
            this.mSvrInfos.set( sugustIdx, new ServerInfo(sessionID,sugustIdx) )
            return sugustIdx ;
        }

        for ( let idx = 0 ; idx < this.mMaxCnt ; ++idx )
        {
            if ( this.mSvrInfos.has(idx) == false )
            {
                this.mSvrInfos.set( idx, new ServerInfo(sessionID,idx) )
                return idx ;
            }
        }

        XLogger.warn("overflow max svr cnt , porttype = " + this.mPortType ) ;
        return -1 ;
    }

    removeSvr( sessionID : number ) : boolean 
    {
        let vk = this.mSvrInfos.entries() ;
        for ( let v of vk )
        {
            if ( v[1].sessionID == sessionID )
            {
                XLogger.debug( "do remove svr session id = " + sessionID + " portType = " + this.mPortType ) ;
                this.mSvrInfos.delete(v[0]);
                return true ;
            }
        }

        return false ;
    }

    onSvrWaittingReconnectState( sessionID : number , isWaiting : boolean ) : boolean
    {
        let vk = this.mSvrInfos.values() ;
        for ( let v of vk )
        {
            if ( v.sessionID == sessionID )
            {
                v.isWaitingReconnect = isWaiting ;
                XLogger.debug( "refresh reconnect state svr session id = " + sessionID + " portType = " + this.mPortType ) ;
                return true;
            }
        }

        return false ;
    }
}