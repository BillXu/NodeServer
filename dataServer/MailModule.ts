import { XLogger } from './../common/Logger';
import HashMap  from 'hashmap';
import { eRpcFuncID } from './../common/Rpc/RpcFuncID';
import { random } from 'lodash';
import { key } from './../shared/KeyDefine';
import { MailData } from './../shared/playerData/PlayerMailData';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IModule } from "../common/IModule";
import { IServerApp } from '../common/IServerApp';

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
        if ( this.mMaxMailID != -1 )
        {
            XLogger.debug( "maxMailID already ready load from db maxMailID = " + this.mMaxMailID ) ;
            return ;
        } 

        super.onRegistedToCenter(svrIdx, svrMaxCnt) ;
        let arg = { sql : "select max(id) as maxID from playerMail " } ;
        let self = this ;
        this.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false ), eRpcFuncID.Func_ExcuteSql, arg ,( result : Object )=>{
            if ( result[key.ret] )
            {
                XLogger.warn( "load max mailID failed err = " + result["errMsg"] ) ;
                this.mMaxMailID = 0 ;
                return ;
            }

            self.mMaxMailID = result[0]["maxID"] ;
            XLogger.debug( "load max mailID = " + self.mMaxMailID ) ;
        })  ;
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

    static saveMailToDB( ownerUID : number , mail : MailData )
    {
        let arg = { sql : "insert into playerMail set " 
        + key.id + " = " + mail.id + ", "
        + key.uid + " = " + ownerUID + ", "
        + key.type + " = " + mail.type + " ,"
        + key.content + " = " + mail.content + ", "
        + key.items + " = " + ( (mail.items == null || mail.items.length ) <= 0 ? "" : JSON.stringify(mail.items) ) + ", "
        + key.senderID + " = " + mail.senderID + ", "
        + key.state + " = " + mail.state + ", "
        + key.title + " = " + mail.title + ", "
        + key.time + " = " + mail.recivedTime + ", "  } ;
        this.s_Mail.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random(100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;
    }
}