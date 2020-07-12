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
    protected mSvrs : HashMap<number,ServerInfo> = new HashMap<number,ServerInfo>() ;
    protected mPortType : eMsgPort = eMsgPort.ID_MSG_PORT_MAX ;
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
            let vk = Object.keys(this.mSvrs) ;
            for ( let s of vk )
            {
                v.push( this.mSvrs[s].sessionID ) ;
            }
            return v ;
        }

        let idx = targetID % this.mMaxCnt ;
        if ( this.mSvrs[idx] == null )
        {
            XLogger.warn("target svr idx is null , id = " + targetID + " max cnt = " + this.mMaxCnt ) ;
            idx = -1 ; // sign not find a proper target ; 
            for ( let i = 0 ; i < this.mMaxCnt ; ++i )
            {
                if ( this.mSvrs[i] != null && this.mSvrs[i].isWaitingReconnect == false )
                {
                    idx = i ;
                    break ;
                }
            }
        }

        if ( idx != -1 )
        {
            return [ this.mSvrs[idx].sessionID ] ;
        }
        return null ;
    }

    isSvrEmpty( idx : number )
    {
        return this.mSvrs[idx] == null ;
    }

    getSvrIdxBySessionID( sessionID : number ) : number
    {
        let vk = Object.keys(this.mSvrs) ;
        for ( let v of vk )
        {
            if ( this.mSvrs[v] != null && this.mSvrs[v].sessionID == sessionID )
            {
                delete this.mSvrs[v] ;
                XLogger.debug( "do remove svr session id = " + sessionID + " portType = " + this.mPortType ) ;
                return v;
            }
        }

        return -1 ;
    }

    addSvr( sessionID : number , sugustIdx : number ) : number 
    {
        if ( this.mSvrs[ sugustIdx ] == null )
        {
            this.mSvrs[sugustIdx] = new ServerInfo(sessionID,sugustIdx) ;
            return sugustIdx ;
        }

        for ( let idx = 0 ; idx < this.mMaxCnt ; ++idx )
        {
            if ( this.mSvrs[idx] == null )
            {
                this.mSvrs[idx] = new ServerInfo( sessionID , idx );
                return idx ;
            }
        }

        XLogger.warn("overflow max svr cnt , porttype = " + this.mPortType ) ;
        return -1 ;
    }

    removeSvr( sessionID : number ) : boolean 
    {
        let vk = Object.keys(this.mSvrs) ;
        for ( let v of vk )
        {
            if ( this.mSvrs[v] != null && this.mSvrs[v].sessionID == sessionID )
            {
                delete this.mSvrs[v] ;
                XLogger.debug( "do remove svr session id = " + sessionID + " portType = " + this.mPortType ) ;
                return true;
            }
        }

        return false ;
    }

    onSvrWaittingReconnectState( sessionID : number , isWaiting : boolean ) : boolean
    {
        let vk = Object.keys(this.mSvrs) ;
        for ( let v of vk )
        {
            if ( this.mSvrs[v] != null && this.mSvrs[v].sessionID == sessionID )
            {
                this.mSvrs[v].isWaitingReconnect = isWaiting ;
                XLogger.debug( "refresh reconnect state svr session id = " + sessionID + " portType = " + this.mPortType ) ;
                return true;
            }
        }

        return false ;
    }
}