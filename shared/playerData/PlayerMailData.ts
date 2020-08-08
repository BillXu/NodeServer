import { IItem } from './../IMoney';
import { key } from './../KeyDefine';
import { eMailType } from './../SharedDefine';
import { IShareData } from './../IShareData';
export enum eMailState
{
    eState_Unread,
    eState_Read,
    eState_GotItems,
    eState_Delete,
    eState_Max,
}

export class MailData implements IShareData
{
    id : number  = 0;
    type : eMailType = eMailType.eMail_Max;
    recivedTime : number = 0;
    senderID : number = 0 ;
    title : string = "" ;
    content : string = "";
    state : eMailState = eMailState.eState_Unread;
    items : IItem [] = null ;

    toJson() : Object 
    {
        let jsm = {} ;
        jsm[key.id] = this.id ;
        jsm[key.type] = this.type ;
        jsm[key.time] = this.recivedTime ;
        jsm[key.title] = this.title ;
        jsm[key.content] = this.content ;
        jsm[key.state] = this.state ;
        jsm[key.senderID] = this.senderID;
        if ( this.items != null )
        {
            jsm[key.items] = JSON.stringify(this.items);
        }
        else
        {
            jsm[key.items] = "";
        }
        return jsm ;
    }

    parse( jsm : Object  ) : void 
    {
        this.id = jsm[key.id];
        this.type = jsm[key.type];
        this.recivedTime = jsm[key.time];
        this.title = jsm[key.title];
        this.content = jsm[key.content];
        this.state = jsm[key.state];
        this.senderID = jsm[key.senderID] ;
        if ( jsm[key.items] != null && jsm[key.items].length > 3 )
        {
            this.items = JSON.parse( jsm[key.items] ) ;
        }
        else
        {
            this.items = null ;
        }
    }

}

export class PlayerMailData implements IShareData
{
    mails : MailData[] = [] ;
    // IShareData
    toJson() : Object 
    {
        let js = [] ;
        this.mails.forEach(( mail : MailData )=>{
            js.push( mail.toJson() ) ;
        }) ;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        let v = js as Array<Object> ;
        let mails = this.mails;
        v.forEach( ( jsm : Object )=>{
            let mail = new MailData();
            mail.parse(jsm) ;
            mails.push(mail) ;
        } ) ;
    }
}