import { key } from './../KeyDefine';
import { eSex } from './../SharedDefine';
import { IShareData } from './../IShareData';
export class PlayerSimpleInfo implements IShareData
{
    uid : number = 0 ;
    nickName : string = "" ;
    headIconUrl : string = "" ;
    sex : eSex = eSex.eSex_Female ;

    toJson() : Object 
    {
        let js = {} ;
        js[key.uid] = this.uid ;
        js[key.nickeName] = this.nickName;
        js[key.headIconUrl] = this.headIconUrl;
        js[key.sex] = this.sex;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        this.uid = js[key.uid] ;
        this.nickName = js[key.nickeName] ;
        this.headIconUrl = js[key.headIconUrl];
        this.sex = js[key.sex];
    }
}