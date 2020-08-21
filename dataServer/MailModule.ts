import { IItem, Item } from './../shared/IMoney';
import { eItemType, eMailType } from './../shared/SharedDefine';
import { DataSvr } from './DataSvr';
import { XLogger } from './../common/Logger';
import HashMap  from 'hashmap';
import { eRpcFuncID } from './../common/Rpc/RpcFuncID';
import { random } from 'lodash';
import { key } from './../shared/KeyDefine';
import { MailData, eMailState } from './../shared/playerData/PlayerMailData';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IModule } from "../common/IModule";
import { IServerApp } from '../common/IServerApp';
import { PlayerMail } from './player/PlayerMail';

export class MailModule extends IModule
{
    static MODULE_NAME : string = "MailModule" ;
    static s_Mail : MailModule = null ;
    protected mails = new HashMap<number,MailData>() ;
    protected  mMaxMailID : number = -1 ;
    static getInstance() : MailModule
    {
        return MailModule.s_Mail ;
    }

    onRegisterToSvrApp( svrApp : IServerApp ) : void 
    {
        super.onRegisterToSvrApp(svrApp);
        MailModule.s_Mail = this ;
    }

    getModuleType() : string
    {
        return MailModule.MODULE_NAME ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort, targetID : number ) : boolean
    {
        return false ;
    }

    onRegistedToCenter( svrIdx : number , svrMaxCnt : number ) : void 
    {
        super.onRegistedToCenter(svrIdx, svrMaxCnt) ;
        if ( this.mMaxMailID != -1 )
        {
            XLogger.debug( "maxMailID already ready load from db maxMailID = " + this.mMaxMailID ) ;
            return ;
        } 

        let arg = { sql : "select max(id) as maxID from playerMail " } ;
        let self = this ;
        this.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false ), eRpcFuncID.Func_ExcuteSql, arg ,( result : Object )=>{
            if ( result[key.ret] )
            {
                XLogger.warn( "load max mailID failed err = " + result["errMsg"] ) ;
                this.mMaxMailID = 0 ;
                return ;
            }

            self.mMaxMailID = 0 ;
            if ( result["result"][0]["maxID"] != null )
            {
                self.mMaxMailID = result["result"][0]["maxID"];
            }
            XLogger.debug( "load max mailID = " + self.mMaxMailID ) ;
        })  ;

        XLogger.debug( "start load global mails" ) ;
        this.loadMails();
    }

    checkNewMails( ncurMaxMailID : number ) : MailData[]
    {
        let out = [] ;
        this.mails.forEach( ( v : MailData, key : number )=>{ if ( key > ncurMaxMailID ){ out.push(v) ; } } ) ;
        return out ;
    }

    getMailByMailID( mailID : number ) : MailData
    {
        let m = this.mails.get(mailID) ;
        return m ;
    }

    generateMailID() : number
    {
        if ( this.mMaxMailID == -1 )
        {
            this.mMaxMailID = 0 ;
            XLogger.debug( "why max mailID = -1 , not load from db ? " ) ;
        } 

        let cnt = this.getSvrApp().getCurPortMaxCnt() ;
        if ( this.mMaxMailID % cnt != this.getSvrApp().getCurSvrIdx() )
        {
            this.mMaxMailID += cnt ;
            this.mMaxMailID -= (this.mMaxMailID % cnt );
            this.mMaxMailID += this.getSvrApp().getCurSvrIdx();
        }

        this.mMaxMailID += cnt ;
        return this.mMaxMailID ;
    }

    onRpcCall(funcID : eRpcFuncID, arg : Object, sieral : number , outResult : Object ) : boolean
    {
        switch ( funcID )
        {
            case eRpcFuncID.Http_SendMail:
                {
                    outResult[key.ret] = 0 ;
                    // arg : { uid : 23 , notice : "232" , items: Item[] }
                    XLogger.debug( "http send mail = " + JSON.stringify(arg) ) ;
                    let vItems = null ;
                    if ( arg["items"] != null )
                    {
                        vItems = [] ;
                        let vI : Object[] = arg["items"];
                        for ( let v of vI )
                        {
                            let p = new Item();
                            p.parse(v) ;
                            vItems.push(p);
                        }
                    }
                    MailModule.sendNormalMail(arg[key.uid], "", arg[key.notice] , vItems );
                }
                break ;
            default:
                return super.onRpcCall(funcID, arg, sieral, outResult) ;
        }
        return true ;
    }

    protected loadMails()
    {
        XLogger.debug( "load mails for mailModule" ) ;
        let t = Date.now() - 1000 * 60 * 60 * 24 * 7 ;
        let arg = { sql : "select * from playerMail where uid = 0 and " + key.time + " > " + t + " limit " + this.mails.count() + " , "+ PlayerMail.PAGE_CNT + ";" } ;
        let self = this ;
        this.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false), eRpcFuncID.Func_ExcuteSql, arg ,( result : Object )=>{
            if ( result[key.ret] == 1 )
            {
                XLogger.error( "load mail data error for mailModule, already mails = " + self.mails.count() + " errMsg : " + result["errMsg"] ) ;
                self.finishLoadMailData();
                return ;
            }
            let r : Object[] = result["result"];
            for ( let m of r )
            {
                let mail = new MailData();
                mail.parse(m) ;
                self.mails.set(mail.id, mail ) ;
            }
            if ( r.length < PlayerMail.PAGE_CNT )
            {
                XLogger.debug("load mail cnt < pageCnt finished loading mails for mailModule curCnt = " + r.length + " totalCnt = " + self.mails.count() ) ;
                self.finishLoadMailData();
                return ;
             } 
             else
             {
                 self.loadMails() ;
             }   
        } );
    }

    protected finishLoadMailData()
    {
        XLogger.debug( "finish load mailModule mails cnt = " + this.mails.count() ) ;
    }

    static sendNormalMail( targetID : number , titile : string , content : string , mails? : IItem [] )
    {
        let pmail = new MailData();
        pmail.id = this.s_Mail.generateMailID();
        pmail.content = content ;
        pmail.items = mails;
        pmail.recivedTime = Date.now();
        pmail.senderID = 0 ;
        pmail.state = eMailState.eState_Unread ;
        pmail.title = titile ;
        pmail.type = eMailType.eMial_Normal ;
        
        MailModule.sendMail(targetID, pmail ) ;
    }

    static sendOfflineEventMail( targetID : number , type : eMailType , js : Object )
    {
        let pmail = new MailData();
        pmail.id = this.s_Mail.generateMailID();
        pmail.content = JSON.stringify(js||{}) ;
        pmail.items = null;
        pmail.recivedTime = Date.now();
        pmail.senderID = 0 ;
        pmail.state = eMailState.eState_Unread ;
        pmail.title = "offline" ;
        pmail.type = type ;
        
        MailModule.sendMail(targetID, pmail ) ;
    }

    static sendNoticeMail( targetID : number , notice : string )
    {
        let pmail = new MailData();
        pmail.id = this.s_Mail.generateMailID();
        pmail.content = notice ;
        pmail.items = null;
        pmail.recivedTime = Date.now();
        pmail.senderID = 0 ;
        pmail.state = eMailState.eState_Unread ;
        pmail.title = "通知" ;
        pmail.type = eMailType.eMail_DlgNotice ;
        
        MailModule.sendMail(targetID, pmail ) ;
    }

    static sendMail( targetID : number , mail : MailData )
    {
        MailModule.saveMailToDB(targetID, mail ) ;
        if ( 0 == targetID )
        {
            this.s_Mail.mails.set(mail.id, mail ) ;
            XLogger.debug( "recieved glob mail id = " + mail.id ) ;
            return ;
        }

        let p = (this.getInstance().getSvrApp() as DataSvr).getPlayerMgr().getPlayerByUID(targetID, true );
        if ( p )
        {
            p.onRecivedMail(mail) ;
        }
    }

    static saveMailToDB( ownerUID : number , mail : MailData )
    {
        let arg = { sql : "insert into playerMail set " 
        + key.id + " = " + mail.id + ", "
        + key.uid + " = " + ownerUID + ", "
        + key.type + " = " + mail.type + " ,"
        + key.content + " = '" + mail.content + "', "
        + key.items + " = '" + ( (mail.items == null || mail.items.length  <= 0 ) ? "" : JSON.stringify(mail.items) ) + "', "
        + key.senderID + " = " + mail.senderID + ", "
        + key.state + " = " + mail.state + ", "
        + key.title + " = '" + mail.title + "', "
        + key.time + " = " + mail.recivedTime + " ;"  } ;
        this.s_Mail.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;
    }
}
