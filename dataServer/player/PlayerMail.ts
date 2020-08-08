import { IItem } from './../../shared/IMoney';
import { eItemType } from './../../shared/SharedDefine';
import { key } from './../../shared/KeyDefine';
import { XLogger } from './../../common/Logger';
import { random, remove } from 'lodash';
import { Player } from './Player';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { ePlayerNetState } from './../../common/commonDefine';
import { IPlayerCompent } from './IPlayerCompent';
import { PlayerMailData, MailData, eMailState } from './../../shared/playerData/PlayerMailData';
import { eRpcFuncID } from '../../common/Rpc/RpcFuncID';
import { eMailType } from '../../shared/SharedDefine';
import { MailModule } from '../MailModule';
export class PlayerMail extends PlayerMailData implements IPlayerCompent
{
    static NAME : string = "PlayerMail" ;
    protected mPlayer : Player = null ;
    static PAGE_CNT : number = 20 ;
    static PAGE_CLIENT_CNT : number = 10 ;
    protected mMaxMailID : number = 0 ;
    protected mCheckGlobalMailsTimer : NodeJS.Timeout = null ;
    protected mIsLoadedData : boolean = false ;
    init( player : Player , ip : string ) : void 
    {
        this.mPlayer = player ;
    }

    getCompentName() : string 
    {
        return PlayerMail.NAME ;
    }

    onReactive( sessionID : number , ip : string ) : void 
    {
        if ( this.mIsLoadedData == false )
        {
            XLogger.error("will never come to here already reactive , must load data ok  uid = " + this.mPlayer.uid ) ;
            if ( this.mPlayer.getBaseInfo().isLoaded )
            {
                this.loadMailData();
            }
        }
        else
        {
            this.sysAutoProcessOfflineEvent();
            this.sendMaxMailID();
            XLogger.debug( "player reactive try start check global mail uid = " + this.mPlayer.uid ) ;
            this.startTimerCheckGlobalMail();
        }
    }

    onLogicMsg( msgID : eMsgType , msg : Object ) : boolean
    {
        if ( eMsgType.MSG_PLAYER_REQ_MAIL == msgID )
        {
            let maxMailID : number = msg["maxID"] ;
            let sms = [] ;
            for ( let m of this.mails )
            {
                if ( m.id <= maxMailID )
                {
                    continue ;
                }
                sms.push( m ) ;
            }
            XLogger.debug( "send back mails to player uid = " + this.mPlayer.uid + " mailCnt = " + sms.length ) ;
            let msgBack = {} ;
            let vMails : Object[] = [] ;
            for ( let idx = 0 ; idx < sms.length ; ++idx )
            {
                let m : MailData = sms[idx] ;
                if ( m.type == eMailType.eMail_SysRefForState )
                {
                    let gid = parseInt(m.content) ;
                    let sm = MailModule.getInstance().getMailByMailID( gid ) ;
                    if ( sm == null )
                    {
                        XLogger.debug( "global mail is null with mialID = " + gid + " playerUID = " + this.mPlayer.uid ) ;
                        continue ;
                    }
                    let jsg = sm.toJson();
                    jsg[key.id] = m.id ;
                    vMails.push( jsg ) ;
                }
                else
                {
                    vMails.push( m.toJson() ) ;
                }
                
                if ( vMails.length == PlayerMail.PAGE_CLIENT_CNT )
                {
                    let isFinal = ( idx == sms.length - 1 );
                    msgBack["mails"] = vMails ;
                    msgBack["isFinal"] = isFinal ? 1 : 0 ;
                    this.mPlayer.sendMsgToClient(msgID, msgBack ) ;
                    vMails.length = 0 ;
                    if ( isFinal )
                    {
                        return true;
                    }
                }
            }

            msgBack["mails"] = vMails ;
            msgBack["isFinal"] = 1 ;
            this.mPlayer.sendMsgToClient(msgID, msgBack ) ;
            return true;
        }
        else if ( eMsgType.MSG_PLAYER_PROCESS_MAIL == msgID )
        {
            let mailID = msg[key.id] ;
            let state : eMailState = msg[key.state] ;
            
            let mls : MailData = null ;
            for ( let v of this.mails )
            {
                if ( v.id == mailID )
                {
                    mls = v ;
                    break;
                }
            }

            let ret = 0 ;
            do
            {
                if ( null == mls )
                {
                    ret = 1 ;
                    break ;
                }

                if ( state == mls.state )
                {
                    XLogger.debug( "req do set same state for mailID = " + mls.id ) ;
                    ret = 2 ;
                    break ;
                }

                switch ( state )
                {
                    case eMailState.eState_Delete:
                        {
                            this.setMailStateToDB(mls.id, state ) ;
                            remove(this.mails,( m : MailData )=>{ return m.id == mls.id }) ;
                        }
                        break ;
                    case eMailState.eState_GotItems :
                        {
                            mls.state = state ;
                            this.setMailStateToDB(mls.id, state ) ;
                            let items = mls.items ;
                            if ( mls.type == eMailType.eMail_SysRefForState )
                            {
                                let symailID = parseInt(mls.content) ;
                                let msys = MailModule.getInstance().getMailByMailID(symailID);
                                if ( msys == null )
                                {
                                    XLogger.debug( "can not find global mail to get items , global mailID = " + symailID  ) ;
                                    ret = 4 ;
                                    break ;
                                }
                                items = msys.items ;
                            }
                            if ( items == null || items.length == 0 )
                            {
                                XLogger.debug( "why mail do not contain items , can not withdraw items mailID = " + mls.id ) ;
                                ret = 3 ;
                                break ;
                            }
                            this.gotItemsInMail(items) ;
                        }
                        break ;
                    case eMailState.eState_Read:
                        {
                            mls.state = state ;
                            this.setMailStateToDB(mls.id, state ) ;
                        }
                        break ;
                    default:
                        XLogger.warn( "unknown act type for mail actState = " + state + " mailID = " + mls.id ) ;
                        ret = 2 ;
                        break ;
                }

            }while(0) ;

            msg[key.ret] = ret ;
            this.mPlayer.sendMsgToClient(msgID, msg ) ;
            return true  ;
        }
        return false ;
    }

    onOtherLogin( nNewSessionID : number , ip : string ) : void
    {
        this.sendMaxMailID();
    }

    onUpdateNetState( state : ePlayerNetState , ip? : string ) : void
    {
        if ( state == ePlayerNetState.eState_Disconnected )
        {
            if ( this.mCheckGlobalMailsTimer )
            {
                XLogger.debug( "player disconnected stop check global mails uid = " + this.mPlayer.uid ) ;
                clearInterval(this.mCheckGlobalMailsTimer) ;
                this.mCheckGlobalMailsTimer = null ;
            }
        }
        else if ( state == ePlayerNetState.eState_Online )
        {
            if ( this.mIsLoadedData )
            {
                this.sysAutoProcessOfflineEvent();
                this.sendMaxMailID() ;
            }
        }
    }

    onLoadBaseInfoFinished() : void
    {
        XLogger.debug( " base data load ok , start load mailData uid = " + this.mPlayer.uid ) ;
        this.loadMailData();
    }

    // self function 
    protected gotItemsInMail( mails : IItem [] )
    {
        for ( let m of mails )
        {
            switch ( m.type )
            {
                case eItemType.eItem_Diamond:
                    {
                        if ( m.cnt <= 0 )
                        {
                            m.cnt = 0 ;
                            XLogger.warn( "why give a item diamon cnt = " + m.cnt ) ;
                        }

                        this.mPlayer.getBaseInfo().diamond += m.cnt ;
                        this.mPlayer.getBaseInfo().onMoneyChanged(true);
                        XLogger.debug( "player a item from mail diamon cnt = " + m.cnt + " uid = " + this.mPlayer.uid ) ;
                    }
                    break ;
            }
        }
        
    }

    protected setMailStateToDB( mialID : number  , state : eMailState )
    {
        switch ( state )
        {
            case eMailState.eState_Delete:
                {
                    let arg = { sql : "update playerMail set isDelete = 1 where id = " + mialID } ;
                    this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false ), eRpcFuncID.Func_ExcuteSql , arg ) ;
                }
                break ;
            case eMailState.eState_GotItems :
            case eMailState.eState_Read:
                {
                    let arg = { sql : "update playerMail set state = " + state + " where id = " + mialID } ;
                    this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false ), eRpcFuncID.Func_ExcuteSql , arg ) ;
                }
                break ;
            default:
                XLogger.warn( "unknown state for mail actState to DB = " + state + " mailID = " + mialID ) ;
                break ;
        }
    }

    protected startTimerCheckGlobalMail()
    {
        if ( this.mPlayer.getBaseInfo().isLoaded == false || false == this.mIsLoadedData )
        {
            XLogger.debug( "loaded data not finish, can not start checkGlobalMail baseData = " + this.mPlayer.getBaseInfo().isLoaded + " mailData = " + this.mIsLoadedData + " uid = " + this.mPlayer.uid  ) ;
            return ;
        }

        if ( null != this.mCheckGlobalMailsTimer )
        {
            clearInterval(this.mCheckGlobalMailsTimer) ;
            this.mCheckGlobalMailsTimer = null ;
        }

        XLogger.debug("load data finished start interval check global mails uid = " + this.mPlayer.uid ) ;
        this.mCheckGlobalMailsTimer = setInterval(this.checkGlobalMails.bind(this),60000);
        this.checkGlobalMails();
    }

    protected loadMailData()
    {
        XLogger.debug( "load mail data for uid = " + this.mPlayer.uid + " offset = " + this.mails.length ) ;
        // let d = new Date();
        // d.setDate(d.getDate() - 7 ) ; // only read 7 day mails ;
        let t = Date.now() - 1000 * 60 * 60 * 24 * 7 ;
        let arg = { sql : "select * from playerMail where uid = " + this.mPlayer.uid + " and " + key.time + " > " + t + " and isDelete = 0 " +  " limit " + this.mails.length + " , "+ PlayerMail.PAGE_CNT + ";" } ;
        let self = this ;
        this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false), eRpcFuncID.Func_ExcuteSql, arg ,( result : Object )=>{
            if ( result[key.ret] == 1 )
            {
                XLogger.error( "load mail data error uid = " + self.mPlayer.uid + " already mails = " + self.mails.length + " errMsg : " + result["errMsg"] ) ;
                self.finishLoadMailData();
                return ;
            }
            let r : Object[] = result["result"];
            let len = self.mails.length ;
            self.parse(r) ;
            if ( len >= self.mails.length && r.length > 0 )
            {
                XLogger.error( "parse occoured a error must finish loadmail r = " + JSON.stringify(r) + " uid = " + self.mPlayer.uid ) ;
                self.finishLoadMailData();
                return ;
            }

            if ( r.length < PlayerMail.PAGE_CNT )
            {
                XLogger.debug("load mail cnt < pageCnt finished loading mails , uid = " + self.mPlayer.uid + " curCnt = " + r.length + " totalCnt = " + self.mails.length ) ;
                self.finishLoadMailData();
                return ;
             } 
             else
             {
                 self.loadMailData() ;
             }   
        } );
    }

    protected finishLoadMailData()
    {
        this.mIsLoadedData = true ;
        this.sysAutoProcessOfflineEvent();
        let self = this ;
        this.mails.forEach(( m : MailData )=>{ if ( m.id > self.mMaxMailID ){ self.mMaxMailID = m.id ; } }) ;
        this.startTimerCheckGlobalMail();
        this.sendMaxMailID();
    }

    protected sysAutoProcessOfflineEvent()
    {
        // delete processed mails ;
        let vOfflineEventMail = remove(this.mails,( m : MailData )=>{ return m.type < eMailType.eMial_Normal ;}) ;
        vOfflineEventMail.sort( ( a : MailData, b : MailData  )=> a.recivedTime - b.recivedTime ) ;
        XLogger.debug( "begin process offline event mail uid = " + this.mPlayer.uid ) ;
        for ( let om of vOfflineEventMail )
        {
            // do process ;
            this.doProcessOfflineEventMail(om) ;
        }
        XLogger.debug( "end process offline event mail uid = " + this.mPlayer.uid ) ;
        let arg = { sql : "update playerMail set isDelete = 1 where uid = " + this.mPlayer.uid + " and isDelete = 0 and type < " + eMailType.eMial_Normal } ;
        this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false ), eRpcFuncID.Func_ExcuteSql , arg ) ;
    }

    protected doProcessOfflineEventMail( mail : MailData )
    {
        switch ( mail.type )
        {
            case eMailType.eMail_RpcCall:
                {
                    let js = JSON.parse(mail.content) ;
                    this.mPlayer.onRPCCall(js["funcID"], js["arg"] ) ; 
                }
                break ;
            case eMailType.eMail_DlgNotice:
                {
                    this.mPlayer.onRecivedNotice( mail.content,mail.recivedTime ) ;
                }
                break;
            default:
                XLogger.warn( "unknown offline event mail type = " + mail.type + " mailID = " + mail.id ) ;
        }
    }

    protected sendMaxMailID()
    {
        if ( this.mPlayer.netState == ePlayerNetState.eState_Online )
        {
            this.mPlayer.sendMsgToClient(eMsgType.MSG_PlAYER_INFORM_MAX_MAIL_ID, { maxID : this.mMaxMailID } ) ;
        }
        else
        {
            XLogger.warn( "player not online why send max mailID uid = " + this.mPlayer.uid ) ;
        }
    }

    protected checkGlobalMails()
    {
        let lastID = this.mPlayer.getBaseInfo().lastCheckGlobalMailID ;
        if ( -1 == lastID )
        {
            XLogger.error( "checkGlobalMails last id = -1  uid = " + this.mPlayer.uid ) ;
            return ;
        }

        XLogger.debug( "checkGlobalMails last id = " + lastID + " uid = " + this.mPlayer.uid ) ;

        if ( lastID == 0 ) // when new register player ;
        {
            lastID = MailModule.getInstance().generateMailID();
            this.mPlayer.getBaseInfo().lastCheckGlobalMailID = lastID; // invoke save to db ;
        }

        let gmails = MailModule.getInstance().checkNewMails( lastID ) ;
        XLogger.debug( "player check global mails cnt = " + gmails.length + " uid = " + this.mPlayer.uid ) ;
        if ( gmails.length == 0 )
        {
            return ;
        }
        
        for ( let g of gmails )
        {
            let mail = new MailData();
            mail.id = MailModule.getInstance().generateMailID();
            mail.content = g.id + "" ;
            mail.type = eMailType.eMail_SysRefForState ;
            mail.recivedTime = g.recivedTime ;
            this.mails.push(mail) ;
            this.mMaxMailID = mail.id ;
            MailModule.saveMailToDB(this.mPlayer.uid, mail ) ;

            if ( g.id > lastID )
            {
                lastID = g.id;
            }
        }

        if ( lastID != this.mPlayer.getBaseInfo().lastCheckGlobalMailID )
        {
            this.mPlayer.getBaseInfo().lastCheckGlobalMailID = lastID ; // = invoke save new max last checkMailID ;
        }

        this.sendMaxMailID();
    }

    onRecivedMail( mail : MailData )
    {
        this.mails.push(mail) ;
        if ( mail.id > this.mMaxMailID )
        {
            this.mMaxMailID = mail.id ;
            this.sendMaxMailID();
        }
        else
        {
            XLogger.debug("why new recieved mail id < curMaxMailID  id = " + mail.id + " curMaxMailID = " + this.mMaxMailID ) ;
            return ;
        }
    }
}