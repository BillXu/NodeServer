import { eRpcFuncID } from './../common/Rpc/RpcFuncID';
import { random } from 'lodash';
import { SVR_ARG } from './../common/ServerDefine';
import { G_ARG, eItemType } from './../shared/SharedDefine';
import { PlayerMgr } from './PlayerMgr';
import { XLogger } from './../common/Logger';
import { key } from './../shared/KeyDefine';
import { Item } from './../shared/IMoney';
import { eMsgType, eMsgPort } from './../shared/MessageIdentifer';
import { IModule } from "../common/IModule";
import { Player } from './player/Player';
import request from 'request';
class WheelItem
{
    pos : number = 0 ;
    item : Item = new Item();
    rate : number[] = [] ;
    maxCnt : number = 0 ;
    parse( js : Object )
    {
        this.pos = js["pos"] ;
        this.maxCnt = js["max"] ;
        this.item.parse(js["item"]) ;
        let cnt = 0 ;
        while(++cnt<=3)
        {
            this.rate.push(js["random"+cnt]) ;
        }
    }
}

export class PrizeWheel extends IModule
{
    protected mWheelItems : WheelItem[] = [] ;
    protected mRateTotals : number[] = [] ;
    protected mRanks : { name : string , pos : number }[] = [] ;
    protected mlimitPosCnt : { pos : number , cnt : number }[] = [] ;
    protected mInvertal : NodeJS.Timeout = null ;
    onRegistedToCenter( svrIdx : number , svrMaxCnt : number ) : void 
    {
        super.onRegistedToCenter(svrIdx, svrMaxCnt);
        this.loadConfig();
    }

    getModuleType() : string
    {
        return "PRIZE_WHELL" ;
    }

    loadConfig()
    {
        request.get( SVR_ARG.prizeWheelCfgUrl,{ timeout : 2000 },this.cfgResult.bind(this) ) ;
    }

    protected cfgResult( error: any, response: request.Response, body: any )
    {
        if (!error && response.statusCode == 200) {
            XLogger.info("recived wheel Cfg = " + body ) ;
            let c = null ;
            try {
                c = JSON.parse(body);
            } catch (error) {
                XLogger.error( "invalid json type , just use default" ) ;
            }
            if ( c == null )
            {
                XLogger.error( "prize wheel config is null" ) ;
            }
            else
            {
                this.mWheelItems.length = 0 ;
                this.mRateTotals.length = 0 ;
                let vCs : Object[] = c["list"] ;
                for ( let m of vCs )
                {
                    let pm = new WheelItem();
                    pm.parse(m) ;
                    this.mWheelItems.push(pm);
                    if ( this.mRateTotals.length == 0 )
                    {
                        for ( let v of pm.rate )
                        {
                            this.mRateTotals.push(v) ;
                        } 
                    }
                    else
                    {
                        for ( let idx = 0 ; idx < pm.rate.length ; ++idx )
                        {
                            this.mRateTotals[idx] += pm.rate[idx] ;
                        }
                    }

                    let idx = this.mlimitPosCnt.findIndex(v=>v.pos == pm.pos ) ;
                    if ( idx == -1 && pm.maxCnt > 0 )
                    {
                        this.mlimitPosCnt.push( { pos : pm.pos , cnt : pm.maxCnt } ) ;
                        XLogger.debug( "add limitCnt pos = " + pm.pos + " itemType = " + eItemType[pm.item.type] + " cnt = " + pm.item.cnt ) ;
                    }

                    if ( idx != -1 && pm.maxCnt == 0 )
                    {
                        this.mlimitPosCnt.splice(idx,1) ;
                    }
                }

                if ( this.mInvertal != null )
                {
                    clearInterval(this.mInvertal) ;
                    this.mInvertal = null ;
                }

                XLogger.debug( "set up interval for refresh limit cnt " ) ;
                let self = this ;
                this.mInvertal = setInterval(()=>{ self.refreshLimitCnt() ;}, 1000*60*60*24 ) ;
            }
        }
        else
        {
            XLogger.error( "rquest match cfg failed , net work issue" ) ;
        }
    }

    onLogicMsg( msgID : eMsgType , msg : Object, orgID : number , orgPort : eMsgPort, targetID : number ) : boolean
    {
        switch ( msgID )
        {
            case eMsgType.MSG_PRIZE_WHEEL_SPIN:
                {
                    let type = msg[key.type] ;
                    if ( null == type )
                    {
                        XLogger.error( "sping wheel type key can not be null " ) ;
                        msg[key.ret] = 2 ;
                        this.sendMsg(msgID, msg, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
                        break ;
                    }

                    if ( type < 0 || type >= this.mRateTotals.length )
                    {
                        XLogger.error( "invalid type = " + type ) ;
                        msg[key.ret] = 4 ;
                        this.sendMsg(msgID, msg, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
                        break ;
                    }

                    let playerMgr = this.getSvrApp().getModule( PlayerMgr.MODUEL_NAME ) as PlayerMgr;
                    let player = playerMgr.getPlayerByUID( targetID, false ) ;
                    if ( null == player )
                    {
                        XLogger.debug( "target player is null targetID = " + targetID ) ;
                        msg[key.ret] = 3 ;
                        this.sendMsg(msgID, msg, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
                        break ;
                    }

                    if ( 0 == type ) // diamond 
                    {
                        if ( player.getBaseInfo().diamond < G_ARG.WHEEL_SPIN_DIAMOND )
                        {
                            XLogger.debug( "you diamond is not enough , uid = " + targetID ) ;
                            msg[key.ret] = 1 ;
                            this.sendMsg(msgID, msg, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
                            break ;
                        }
                    }
                    else if ( 1 == type ) // free
                    {
                        if ( player.getBaseInfo().freePrizeWheelTime * 1000 - Date.now() > 0 )
                        {
                            XLogger.debug( "wheel time not reach , uid = " + targetID  ) ;
                            msg[key.ret] = 3 ;
                            this.sendMsg(msgID, msg, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
                            break ;
                        }
                    }
                    else if ( 2 == type ) // video 
                    {
                        XLogger.debug("playr saw vidio uid = " + targetID ) ;
                    }
                    this.onSpin(type,player) ;
                }
                break;
            case eMsgType.MSG_PRIZE_WHEEL_RANK:
                {
                    XLogger.debug( "send rankInfo to player uid = " + targetID ) ;
                    msg["rank"] = this.mRanks;
                    this.sendMsg(msgID, msg, orgPort, orgID, this.getSvrApp().getCurSvrIdx() ) ;
                }
                break;
            default:
                return false ;
        }
        return true ;
    }

    onSpin( nType : number , player : Player )
    {
        let rate = random(this.mRateTotals[nType],false ) ;
        let rv = 0 ;
        let witem : WheelItem = null ;
        for ( let item of this.mWheelItems )
        {
            if ( rate <= ( rv + item.rate[nType] ) )
            {
                witem = item ;
                break ;
            }
            rv += item.rate[nType] ;
        }

        if ( witem == null )
        {
            XLogger.error( "why rand a null item ? value = " + rate + " go on try") ;
            this.onSpin(nType, player) ;
            return ;
        }

        for ( let limit of this.mlimitPosCnt )
        {
            if ( limit.pos != witem.pos )
            {
                continue ;
            }

            if ( limit.cnt <= 0 )
            {
                XLogger.debug( "go on try next , this item reached max cnt , can not give player pos = " + limit.pos + " itemType = " + eItemType[witem.item.type] + " uid = " + player.uid ) ;
                this.onSpin(nType, player) ;
                return ;
            }
            --limit.cnt;
            break ;
        }

        if ( witem.item.type == eItemType.eItem_RedBag )
        {
            XLogger.debug( "prize wheel put result to rank" ) ;
            this.mRanks.push( { name : player.getBaseInfo().nickName, pos : witem.pos } ) ;
            if ( this.mRanks.length > 10 )
            {
                XLogger.debug( "shit rank result , too long , prizeWheel" ) ;
                this.mRanks.shift();
            }
        }
        XLogger.debug( "player get wheel item = " + JSON.stringify(witem) + " uid = " + player.uid );
        if ( nType == 2 ) // diamond 
        {
            XLogger.debug( "decrease diamond for spin wheel uid = " + player.uid ) ;
            let it = new Item();
            it.type = eItemType.eItem_Diamond ;
            it.cnt = -1 * G_ARG.WHEEL_SPIN_DIAMOND ;
            player.getBaseInfo().onModifyMoney(it,false );
        }
        else if ( 1 == nType )
        {
            player.getBaseInfo().freePrizeWheelTime = Math.floor( Date.now() / 1000 ) + G_ARG.WHEEL_FREE_TIME_INTERVAL ;
            let arg = { sql : "update playerData set freeWheelTime = " + player.getBaseInfo().freePrizeWheelTime + " where uid = " + player.uid + " limit 1 ;" } ;
            this.getSvrApp().getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;
        }
        // do give item to player ;
        player.getBaseInfo().onModifyMoney( witem.item,true );
        let msg = {} ;
        msg[key.ret] = 0 ;
        msg["pos"] = witem.pos;
        msg[key.freeWheelTime] = player.getBaseInfo().freePrizeWheelTime;
        this.sendMsg(eMsgType.MSG_PRIZE_WHEEL_SPIN, msg, eMsgPort.ID_MSG_PORT_CLIENT, player.sessionID, this.getSvrApp().getCurSvrIdx() ) ;
    }

    protected refreshLimitCnt()
    {
        XLogger.debug( "refresh wheel item limit" ) ;
        for ( let pm of this.mWheelItems )
        {
            if ( pm.maxCnt == 0 )
            {
                continue ;
            }

            let pli = this.mlimitPosCnt.find(v=>v.pos == pm.pos ) ;
            if ( pli == null )
            {
                XLogger.debug( "why limit pos is null ? pos = " + pm.pos + " maxCnt = " + pm.maxCnt ) ;
                continue ;
            }

            XLogger.debug( "limit pos used cnt = " + (pm.maxCnt - pli.cnt ) + " pos = " + pm.pos );
            pli.cnt = pm.maxCnt ;
        }
    }

    onRpcCall(funcID : eRpcFuncID, arg : Object, sieral : number , outResult : Object ) : boolean
    {
        switch ( funcID )
        {
            case eRpcFuncID.Http_ReloadPrizeWheelCfg:
                {
                    outResult["ret"] = 0 ;
                    XLogger.debug( "http cmd reload prizeWheel config ")
                    this.loadConfig();
                }
                break;
            default:
                return super.onRpcCall(funcID, arg, sieral, outResult) ;
        }
        return true ;
    }
}