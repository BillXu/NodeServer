import { key } from './../KeyDefine';
import { eMailType, eItemType } from './../SharedDefine';
import { IShareData } from './../IShareData';
export enum eMailState
{
    eState_Unread,
    eState_Read,
    eState_GotItems,
    eState_Delete,
    eState_Max,
}

export class MailData
{
    id : number  = 0;
    type : eMailType = eMailType.eMail_Max;
    recivedTime : number = Date.now();
    senderID : number = 0 ;
    title : string = "" ;
    content : string = "";
    state : eMailState = eMailState.eState_Unread;
    items : { type : eItemType , cnt : number } [] = null ;
}

export class PlayerMailData implements IShareData
{
    mails : MailData[] = [] ;
    // IShareData
    toJson() : Object 
    {
        let js = [] ;
        this.mails.forEach(( mail : MailData )=>{
            let jsm = {} ;
            jsm[key.id] = mail.id ;
            jsm[key.type] = mail.type ;
            jsm[key.time] = mail.recivedTime ;
            jsm[key.title] = mail.title ;
            jsm[key.content] = mail.content ;
            jsm[key.state] = mail.state ;
            jsm[key.state] = mail.senderID;
            jsm[key.items] = mail.items != null ? JSON.stringify(mail.items) : "";
            js.push(jsm) ;
        }) ;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        let v = js as Array<Object> ;
        let mails = this.mails;
        v.forEach( ( jsm : Object )=>{
            let mail = new MailData();
            mail.id = jsm[key.id];
            mail.type = jsm[key.type];
            mail.recivedTime = jsm[key.time];
            mail.title = jsm[key.title];
            mail.content = jsm[key.content];
            mail.state = jsm[key.state];
            mail.senderID = jsm[key.senderID] ;
            if ( jsm[key.items] != null && jsm[key.items].length > 3 )
            {
                mail.items = JSON.parse( jsm[key.items] ) ;
            }
            else
            {
                mail.items = null ;
            }
            mails.push(mail) ;
        } ) ;
    }
}