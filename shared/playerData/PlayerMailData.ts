import { eMailType } from './../SharedDefine';
import { IShareData } from './../IShareData';

export class MailData
{
    ID : number  = 0;
    type : eMailType = eMailType.eMail_Max;
    recivedTime : number = Date.now();
    content : Object = null;
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
            jsm["id"] = mail.ID ;
            jsm["type"] = mail.type ;
            jsm["time"] = mail.recivedTime ;
            jsm["content"] = mail.content ;
            js.push(jsm) ;
        }) ;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        let v = js as Array<Object> ;
        let mails = this.mails;
        v.forEach( ( jsObj : Object )=>{
            let m = new MailData();
            m.ID = jsObj["id"] ;
            m.content = jsObj["content"] ;
            m.recivedTime = jsObj["time"] ;
            m.type = jsObj["type"] ;
            mails.push(m) ;
        } ) ;
    }
}