import { eAccountType, eSex } from './../shared/SharedDefine';
import { key } from './../shared/KeyDefine';
import { XLogger } from './../common/Logger';
 import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IClientModule } from "./IClientModule";
 
export class LoginModule extends IClientModule
{
    static MODULE_NAME = "LOGIN MODULE" ;
    protected mAccount : string = "" ;
    getModuleName() : string 
    {
        return LoginModule.MODULE_NAME ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object ) : boolean 
    {
        switch ( msgID )
        {
            case eMsgType.MSG_PLAYER_LOGIN:
                {
                    let ret = msg[key.ret] ;
                    if ( ret == 0 )
                    {
                        XLogger.debug( "player login success , acc = " + this.mAccount ) ;
                    }   
                    else
                    {
                        XLogger.debug( "player login failed , acc = " + this.mAccount ) ;
                        this.register();
                    }
                }
                break ;
            case eMsgType.MSG_PLAYER_REGISTER:
                {
                    let ret = msg[key.ret] ;
                    if ( 0 == ret )
                    {
                        XLogger.debug( "player register success , acc = " + this.mAccount ) ;
                        this.login();
                    }
                    else
                    {
                        XLogger.error("player register error ret = " + ret + " acc = " + this.mAccount ) ;
                    }
                }
                break ;
            default :
                return false ;
        }
        return true ;
    }

    onConnectResult( isOK : boolean ) : void
    {
        if ( isOK )
        {
            XLogger.debug( "connect ok do login acc = " + this.mAccount ) ;
            this.login();
        }
    }

    onReconectedResult( isOk : boolean ) : void
    {
        if ( false == isOk )
        {
            XLogger.debug( "reconnect failed must login agian acc = " + this.mAccount ) ;
            this.login();
        }
    } 

    // self function 
    setAccount( acc : string )
    {
        this.mAccount = acc ;
    }

    login()
    {
        let msg = {} ;
        msg[key.account] = this.mAccount ;
        msg[key.type] = eAccountType.eAccount_Wechat ;
        this.sendMsg( eMsgType.MSG_PLAYER_LOGIN, msg, eMsgPort.ID_MSG_PORT_GATE, 0 ) ;
    }

    register()
    {
        let msg = {} ;
        msg[key.account] = this.mAccount ;
        msg[key.type] = eAccountType.eAccount_Wechat ;
        msg[key.nickeName] = this.mAccount ;
        msg[key.headIconUrl] = "defaultIcon" ;
        msg[key.sex] = eSex.eSex_Female ;
        this.sendMsg( eMsgType.MSG_PLAYER_REGISTER, msg, eMsgPort.ID_MSG_PORT_GATE, 0 ) ;
    }
}