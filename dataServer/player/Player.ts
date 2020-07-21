import { MailData } from './../../shared/playerData/PlayerMailData';
import { PlayerMail } from './PlayerMail';
import { PlayerSimpleInfo } from './../../shared/playerData/PlayerSimpleInfo';
import { XLogger } from './../../common/Logger';
import { ePlayerNetState } from './../../common/commonDefine';
import { PlayerBaseInfo } from './PlayerBaseInfo';
import { RpcModule } from './../../common/Rpc/RpcModule';
import { IPlayerCompent } from './IPlayerCompent';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { IPlayerMgr } from './../IPlayerMgr';
import { merge } from 'lodash';
export class Player
{
    protected mMgr : IPlayerMgr = null ;
    protected mSessionID : number = 0 ;
    protected mUID : number = 0 ;
    protected mCompents : IPlayerCompent[] = [] ;
    
    get uid() : number
    {
        return this.mUID ;
    }

    get ip() : string 
    {
       return this.getBaseInfo().ip;
    }

    get sessionID() : number
    {
        return this.mSessionID ;
    }

    get netState() : ePlayerNetState
    {
        return this.getBaseInfo().netState;
    }

    init( uid : number , sessionID : number , ip : string , mgr : IPlayerMgr )
    {
        this.mUID = uid ;
        this.mSessionID = sessionID ;
        this.mMgr = mgr ;
        this.installCompents();
        let self = this ;
        this.mCompents.forEach( ( cp : IPlayerCompent )=>{ cp.init(self,ip )} ) ;
    }

    onReactive( sessionID : number , ip : string )
    {
        this.mSessionID = sessionID ;
        this.mCompents.forEach( ( cp : IPlayerCompent )=>{ cp.onReactive(sessionID,ip );} ) ;
    }

    protected installCompents()
    {
        this.mCompents.push( new PlayerBaseInfo() ) ;
        this.mCompents.push( new PlayerMail() )
    }

    onLogicMsg( msgID : eMsgType , msg : Object ) : boolean
    {
        for ( let c of this.mCompents )
        {
            if ( c.onLogicMsg(msgID, msg) )
            {
                return true ;
            }
        }

        XLogger.warn( "player do not process msg id = " + eMsgType[msgID] + " sessionID " + this.sessionID + " uid = " + this.uid + " msg = " + JSON.stringify(msg) ) ;
        return false ;
    }

    onOtherLogin( nNewSessionID : number , ip : string )
    {
        this.sendMsgToClient(eMsgType.MSG_PLAYER_OTHER_LOGIN, { ip : this.ip } ) ;

        this.mSessionID = nNewSessionID ;
        this.mCompents.forEach( ( cp : IPlayerCompent )=>{ cp.onOtherLogin(nNewSessionID,ip );} ) ;
        if ( ePlayerNetState.eState_Online != this.netState )
        {
            this.onUpdateNetState( ePlayerNetState.eState_Online,ip );
        }
    }

    onUpdateNetState( state : ePlayerNetState , ip? : string )
    {
        this.mCompents.forEach( ( cp : IPlayerCompent )=>{ cp.onUpdateNetState( state,ip );} ) ;
    }

    sendMsgToClient( msgID : eMsgType, msg : Object )
    {
        this.mMgr.sendMsg(msgID, msg, eMsgPort.ID_MSG_PORT_CLIENT, this.mSessionID, this.uid ) ;
    }

    getRpc() : RpcModule
    {
        return this.mMgr.getSvrApp().getRpc();
    }

    getBaseInfo() : PlayerBaseInfo
    {
        for ( let v of this.mCompents )
        {
            if ( v.getCompentName() == PlayerBaseInfo.s_Name )
            {
                return v as PlayerBaseInfo ;
            }
        }

        return null ;
    }

    getMail() : PlayerMail
    {
        for ( let v of this.mCompents )
        {
            if ( v.getCompentName() == PlayerMail.NAME )
            {
                return v as PlayerMail ;
            }
        }

        return null ;
    }

    visitPlayerSimpleInfo( info : Object ) : void
    {
        let p = PlayerSimpleInfo.prototype.toJson.call(this.getBaseInfo());
        merge(info, p ) ;
        XLogger.debug( "visit player info = " + JSON.stringify(info) ) ;
    }

    onLoadBaseInfoFinished() : void
    {
        XLogger.debug("player load base info finished inform compoents uid = " + this.uid ) ;
        this.mCompents.forEach( ( cp : IPlayerCompent )=>{ cp.onLoadBaseInfoFinished();} ) ;
    }

    state()
    {
        XLogger.debug( "state : player uid = " + this.uid + " sessionID = " + this.sessionID + "netState = " + this.netState + " ip = " + this.ip ) ;
    }

    onRecivedMail( mail : MailData )
    {
        this.getMail().onRecivedMail(mail) ;
    }
}