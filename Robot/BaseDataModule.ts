import { XLogger } from './../common/Logger';
import { PlayerBaseData } from './../shared/playerData/PlayerBaseData';
import { eMsgType } from './../shared/MessageIdentifer';
import { IClientModule } from "./IClientModule";

export class BaseDataModule extends IClientModule
{
    static MODULE_NAME = "baseDataModule" ;
    static EVENT_RECIVED_BASE_DATA = "RECIEVED_base_data" ;
    mData : PlayerBaseData = null ;

    get uid () : number
    {
        return this.mData.uid ;
    }

    getModuleName() : string 
    {
        return BaseDataModule.MODULE_NAME ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object ) : boolean 
    {
        if ( msgID == eMsgType.MSG_PLAYER_BASE_DATA )
        {
            if ( this.mData == null )
            {
                this.mData = new PlayerBaseData();
            }
            this.mData.parse(msg) ;
            XLogger.debug( "player recieved base data uid = " + this.mData.uid ) ;
            this.getClient().emit(BaseDataModule.EVENT_RECIVED_BASE_DATA) ;
            return true ;
        }

        return false ;
    }
}