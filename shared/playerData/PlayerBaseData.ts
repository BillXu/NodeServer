import { PlayerSimpleInfo } from './PlayerSimpleInfo';
import { key } from './../KeyDefine';
export class PlayerBaseData extends PlayerSimpleInfo
{
    diamond : number = 0 ;
    inviter : number = 0 ;
    ip : string = "" ;
    treeLevel : number = 1 ;
    fertilizer : number = 0 ;
    // share Data func ;
    toJson() : Object 
    {
        let js = super.toJson();
        js[key.diamond] = this.diamond ;
        js[key.inviterUID] = this.inviter;
        js[key.ip] = this.ip ;
        js[key.treeLevel] = this.treeLevel ;
        js[key.fertilizer] = this.fertilizer ;
        return js ;
    }

    parse( js : Object  ) : void 
    {
        super.parse(js) ;
        this.diamond = js[key.diamond];
        this.inviter = js[key.inviterUID];
        this.ip = js[key.ip] ;
        this.treeLevel = js[key.treeLevel] ;
        this.fertilizer = js[key.fertilizer] ;
    }
}