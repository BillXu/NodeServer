import { eItemType } from './SharedDefine';
export class IMoney
{
    type : eItemType ;
    cnt : number ;
    parse( js : Object )
    {
        this.type = js["type"] ;
        this.cnt = js["cnt"] ;
    }

    toJs() : Object
    {
        let js = {} ;
        js["type"] = this.type ;
        js["cnt"] = this.cnt;
        return js ;
    }
}