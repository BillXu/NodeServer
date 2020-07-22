import UnitBezier  from '@mapbox/unitbezier';
import { eRpcFuncID } from './../../common/Rpc/RpcFuncID';
import { XLogger } from './../../common/Logger';
import { key } from './../../shared/KeyDefine';
import { ePlayerNetState } from './../../common/commonDefine';
import { eMsgType, eMsgPort } from './../../shared/MessageIdentifer';
import { Player } from './Player';
import { IPlayerCompent } from './IPlayerCompent';
import { max, random } from 'lodash';
interface TreeLevelCfgItem
{
    level : number , fertilizer : number , diamond : number[], cd : number
}

let jscfg : TreeLevelCfgItem[]= [
    { level : 1, fertilizer : 3 , diamond : [100,200 ] , cd : 0 },
    { level : 2, fertilizer : 4 , diamond : [200,400 ] , cd : 20 },
    { level : 3, fertilizer : 5 , diamond : [100,200 ] , cd : 70 },
    { level : 4, fertilizer : 6 , diamond : [100,200 ] , cd : 80 },
    { level : 5, fertilizer : 7 , diamond : [100,200 ], cd : 90 }
]

export class PlayerDiamondTree implements IPlayerCompent
{
    static NAME : string = "PlayerDiamondTree" ;
    protected mPlayer: Player = null ;
    protected mLastDecreaseCD : number = 0 ;
    protected mCDEndTime : number = 0 ;
    init( player : Player , ip : string ) : void 
    {
        this.mPlayer = player ;
    }

    getCompentName() : string 
    {
        return PlayerDiamondTree.NAME ;
    }
    
    onReactive( sessionID : number , ip : string ) : void {}
    onLogicMsg( msgID : eMsgType , msg : Object ) : boolean
    {
        switch ( msgID )
        {
            case eMsgType.MSG_PLAYER__DIAMOND_TREE_REQ_INFO:
            {
                // client : null ;
                // svr : { level : 0 , diamond : [ 100,200 ], leftCD : 100, nextFertilizer : 2 , nextDiamond : [ 100,200 ] }
                // nextFertilizer : level up need Fertilizer cnt .  nextDiamonds: next level tree will produce diamon cnt ;
                let cfg = this.getLevelCfg(this.level);
                if ( cfg == null )
                {
                    XLogger.error( "invalid diamond tree level = " + this.level ) ;
                    break ;
                }

                msg[key.level] = this.level;
                msg[key.diamond] = cfg.diamond ;
                msg[key.leftCD] = max([this.CDEndTime - Date.now() , 0 ] ) ;
                
                let nextCfg = this.getLevelCfg(this.level + 1 );
                if ( nextCfg == null )
                {
                    XLogger.warn( "next level cfg of diamond tree is null level = " + ( this.level + 1 )) ;
                }
                msg[key.nextFertilizer] = ( null == nextCfg ) ? 999999 : nextCfg.fertilizer ;
                msg[key.nextDiamond] = ( null == nextCfg ) ? [99999,9999999] : nextCfg.diamond ;
                this.mPlayer.sendMsgToClient(msgID, msg) ;
                XLogger.debug( "send tree info msg to player uid = " + this.mPlayer.uid + " msg = " + JSON.stringify(msg) ) ;
            }
            break ;
            case eMsgType.MSG_PLAYER__DIAMOND_TREE_LEVEL_UP:
            {
                // client : null 
                // svr :  {  ret : 0 , curFertilizer : 100 , level : 0 , diamonds : [ 100,200 ], nextFertilizer : 2 , nextDiamonds : [ 100,200 ] }
                // ret : 0 level up success , 1 lack of fertilizer ;
                let cfg = this.getLevelCfg(this.level + 1 ) ;
                if ( null == cfg )
                {
                    XLogger.error( "MSG_PLAYER__DIAMOND_TREE_LEVEL_UP invalid diamond tree level = " + this.level ) ;
                    break ;
                }

                let ret = 0 ;
                if ( cfg.fertilizer > this.fertilizer )
                {
                    ret = 1 ;
                    msg[key.ret] = ret;
                    msg[key.level] = this.level;
                    msg[key.curFertilizer] = this.fertilizer;
                    msg[key.diamond] = this.getLevelCfg(this.level).diamond;
                    msg[key.nextFertilizer] = cfg == null ? 99999 : cfg.fertilizer;
                    msg[key.nextDiamond] = cfg == null ? [9999,99999] : cfg.diamond ;
                    this.mPlayer.sendMsgToClient(msgID, msg ) ;
                    break ;
                }

                this.fertilizer -= cfg.fertilizer ;
                this.level += 1 ;
                this.CDEndTime = 0 ;

                let nextCfg = this.getLevelCfg(this.level + 1 ) ;
                if ( null == nextCfg )
                {
                    XLogger.error( "MSG_PLAYER__DIAMOND_TREE_LEVEL_UP invalid diamond tree next level = " + (this.level + 1) ) ;
                }

                msg[key.ret] = ret;
                msg[key.level] = this.level;
                msg[key.curFertilizer] = this.fertilizer;
                msg[key.diamond] = cfg.diamond;
                msg[key.nextFertilizer] = nextCfg == null ? 99999 : nextCfg.fertilizer;
                msg[key.nextDiamond] = nextCfg == null ? [9999,99999] : nextCfg.diamond ;
                this.mPlayer.sendMsgToClient(msgID, msg ) ;
            } 
            break ;
            case eMsgType.MSG_PLAYER__DIAMOND_TREE_GET_DIAMOND:
            {
                // client : null ;
                // svr : { ret : 0 , letfCD : 0 ,recivedDiamond : 23 , finalDiamond : 235 }
                // ret : 0 success , 1 CDing , please wait a while ;
                let nleft = this.CDEndTime - Date.now(); 
                if ( nleft <= 0  ) // 0k
                {
                    msg[key.ret] = 0 ;
                    msg[key.leftCD] = this.getLevelCfg(this.level).cd ;
                    msg[key.recivedDiamond] = this.randDiamonds();
                    this.mPlayer.getBaseInfo().diamond += msg[key.recivedDiamond] ;
                    this.mPlayer.getBaseInfo().onMoneyChanged(false) ;
                    msg[key.finalDiamond] = this.mPlayer.getBaseInfo().diamond;
                    this.CDEndTime = msg[key.leftCD] + Date.now();
                }
                else
                {
                    msg[key.ret] = 1 ;
                    msg[key.leftCD] = nleft;
                    msg[key.recivedDiamond] = 0;
                    msg[key.finalDiamond] = this.mPlayer.getBaseInfo().diamond;
                }
                this.mPlayer.sendMsgToClient(msgID, msg) ;
            }
            break;
            case eMsgType.MSG_PLAYER__DIAMOND_TREE_DECREASE_CD:
            {
                // client : { adTime : 10 } ;
                // svr : { ret : 0 , letfCD : 10 } 
                // ret: 0 success , 1 invalid action ; 
                XLogger.debug( "player see vidio ad uid = " + this.mPlayer.uid + " vidio time = " + msg["adTime"] )
                let nleft = this.CDEndTime - Date.now(); 
                if ( Date.now() - this.mLastDecreaseCD < 65000 && nleft > 0 )
                {
                    msg[key.ret] = 1 ;
                    msg[key.leftCD] = nleft;
                    XLogger.warn( "decrase cd too offen , uid = " + this.mPlayer.uid + " elaps = " + (Date.now() - this.mLastDecreaseCD )) ;
                }
                else
                {
                    this.CDEndTime = 0 ;
                    msg[key.ret] = 0 ;
                    msg[key.leftCD] = 0 ;
                    this.mLastDecreaseCD = Date.now()
                }
                this.mPlayer.sendMsgToClient(msgID, msg) ;
            }
            break;
            default:
                return false ;
        }
        return true ;
    }

    onOtherLogin( nNewSessionID : number , ip : string ) : void{}
    onUpdateNetState( state : ePlayerNetState , ip? : string ) : void {}
    onLoadBaseInfoFinished() : void {}

    // self funcion 
    get level() : number
    {
        return this.mPlayer.getBaseInfo().treeLevel ;
    }

    set level( lel : number )
    {
        if ( lel == this.level )
        {
            return ;
        }

        this.mPlayer.getBaseInfo().treeLevel = lel ;
        let arg = { sql : "update playerData set treeLevel = " + lel + " where uid = " + this.mPlayer.uid + " limit 1 ;" } ;
        this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;
    } 

    get fertilizer() : number
    {
        return this.mPlayer.getBaseInfo().fertilizer ;
    }

    set fertilizer( cnt : number )
    {
        if ( cnt == this.fertilizer )
        {
            return ;
        }

        this.mPlayer.getBaseInfo().fertilizer = cnt ;
        this.mPlayer.getBaseInfo().onMoneyChanged(false) ;
    }

    get CDEndTime() : number
    {
        return this.mPlayer.getBaseInfo().treeCDEndTime ;
    }

    set CDEndTime( t : number )
    {
        if ( t == this.CDEndTime )
        {
            return ;
        }

        this.mPlayer.getBaseInfo().treeCDEndTime = t ;
        let arg = { sql : "update playerData set treeCDEndTime = " + Math.floor(t/1000) + " where uid = " + this.mPlayer.uid + " limit 1 ;" } ;
        this.mPlayer.getRpc().invokeRpc(eMsgPort.ID_MSG_PORT_DB, random( 100,false ), eRpcFuncID.Func_ExcuteSql, arg ) ;
    }

    protected randDiamonds() : number
    {
        //https://cubic-bezier.com/#1,.15,1,-0.09
        let cfgDiamond = this.getLevelCfg(this.level).diamond ;
        let r = Math.random();
        let f = (new UnitBezier(1,0.06,1,-0.21)).sampleCurveY( r ) ;
        let a =  f * ( cfgDiamond[1] - cfgDiamond[0] ) + cfgDiamond[0] ;
        console.log( "r = " + r + " f = " + f + " a = " + a ) ;
        return Math.floor(a) ;
    }

    protected getLevelCfg( level : number ) : TreeLevelCfgItem
    {
        for ( let v of jscfg )
        {
            if ( v.level == level )
            {
                return v ;
            }
        }
        return null ;
    }
}