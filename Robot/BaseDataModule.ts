import { XLogger } from './../common/Logger';
import { PlayerBaseData } from './../shared/playerData/PlayerBaseData';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
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
            
            this.tellRobot();
            this.onLoginOk();
            return true ;
        }

        return false ;
    }

    tellRobot()
    {
        this.sendMsg(eMsgType.MSG_R_TELL, {}, eMsgPort.ID_MSG_PORT_DATA, this.uid ) ;
    }

    onLoginOk()
    {
        XLogger.debug("join a room ") ;
        
    }
}