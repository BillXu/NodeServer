import { key } from './../shared/KeyDefine';
import { eMatchType } from './../shared/SharedDefine';
import HashMap  from 'hashmap';
import { IMatch } from './Match/IMatch';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IModule } from "../common/IModule";

export class MatchMgr extends IModule
{
    static MODULE_NAME : string = "MatchMgr";
    protected mMatchs : HashMap<number,IMatch> = new HashMap<number,IMatch>();
    protected mTypeMatchs : HashMap<eMatchType,Array<IMatch> > = new HashMap<eMatchType,Array<IMatch> >(); 
    getModuleType() : string
    {
        return MatchMgr.MODULE_NAME ;
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort, targetID : number ) : boolean 
    {
        if ( eMsgType.MSG_PLAYER_REQ_MATCH_LIST == msgID )
        {
            let type = msg[key.type] ;
            let v = this.mTypeMatchs.get(type) ;
            let vm = [] ;
            if ( v != null )
            {
                for ( let m of v )
                {
                    if ( m.isClosed() )
                    {
                        continue ;
                    }

                    let jsm = {};
                    m.onVisitInfo(jsm) ;
                    vm.push(jsm) ;
                }
            }

            msg[key.matchs] = vm;
            this.sendMsg(msgID, msg, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
            return true ;
        }

        let m = this.mMatchs.get(targetID) ;
        if ( m == null )
        {
            msg[key.ret] = 200 ;
            msg["err"] = "can not find math with ID = " + targetID ;
            this.sendMsg(msgID, msg, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
            return false ;
        }
        return m.onLogicMsg(msgID, msg, orgID ) ;
    }

    onRegistedToCenter( svrIdx : number , svrMaxCnt : number ) : void 
    {

    }
}