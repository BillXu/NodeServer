import { eItemType } from './SharedDefine';
export interface IItem
{
    type : eItemType ;
    cnt : number ;
}

export class Item implements IItem
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

    static createItem( type : eItemType , cnt : number ) : Item
    {
        let it =new Item();
        it.type = type ;
        it.cnt = cnt ;
        return it ;
    }
}