import { key } from './../shared/KeyDefine';
import { eMsgPort } from './../shared/MessageIdentifer';
import { XLogger } from './../common/Logger';
import { eRpcFuncID } from './../common/Rpc/RpcFuncID';
import { IServerApp } from './../common/IServerApp';
import { Pool, createPool, PoolConfig, MysqlError } from 'mysql';
export class DBSvr extends IServerApp
{
    protected mMysqlPool : Pool = null ;
    protected mPoolConfig : PoolConfig = null ;
    init( jsCfg : Object )
    {
        super.init(jsCfg) ;
        this.mPoolConfig = {} ;
        this.mPoolConfig.host = jsCfg["dbhost"] ;
        this.mPoolConfig.user = jsCfg["user"] ;
        this.mPoolConfig.password = jsCfg["pwd"] ;
        this.mPoolConfig.database = jsCfg["db"] ;
    }

    onRegistedToCenter( svrIdx : number , svrMaxCnt : number )
    {
        super.onRegistedToCenter(svrIdx, svrMaxCnt) ;
        if ( null == this.mMysqlPool )
        {
            this.mMysqlPool = createPool( this.mPoolConfig ) ;
            this.getRpc().registerRPC( eRpcFuncID.Func_ExcuteSql, this.rpcExcuteSql.bind(this) ) ;
            this.rpcTask();
        }
    }

    getLocalPortType() : eMsgPort 
    {
        return eMsgPort.ID_MSG_PORT_DB ;
    }

    rpcExcuteSql( reqSieralNum : number , reqArg : Object ) : Object
    {
        let self = this ;
        this.mMysqlPool.query( reqArg["sql"] ,(err : MysqlError ,result : any )=>{
            if ( err != null )
            {
                let js = {} ;
                js["ret"] = 1 + err.errno;
                js["errMsg"] = err.sqlMessage ;
                self.getRpc().pushDelayResult(reqSieralNum, js ) ;
                XLogger.error( "failed sql : " + err.sql ) ;
                return ;
            }

            let js = {} ;
            js["ret"] = 0 ;
            js["result"] = result ;
            self.getRpc().pushDelayResult(reqSieralNum, js ) ;
        } ) ;
        return null ;
    }

    rpcTask()
    {
        let rpc = this.getRpc();
        let mysql = this.mMysqlPool;
        rpc.registerRPC( eRpcFuncID.Func_Register, ( reqSieralNum : number , arg : Object )=>{
            // arg : { account : "dfagadf" , type : eAccountType , nickeName : "name" , headIconUrl : "http://www.baidu.com" ,sex : eSex , ip : "192.168.1.23" }
            mysql.query( "call register(?,?,?,?,?,?);",[arg[key.account],arg[key.type],arg[key.nickeName],arg[key.headIcon],arg[key.sex],arg[key.ip]],(err : MysqlError ,result : any )=>{
                if ( err != null )
                {
                    let js = {} ;
                    js[key.ret] = 1;
                    rpc.pushDelayResult(reqSieralNum, js ) ;
                    XLogger.error( "failed sql : " + err.sql ) ;
                    return ;
                }
    
                let js = {} ;
                js[key.ret] = 0 ;
                js["result"] = result[0][0]["curMaxUID"] ;
                rpc.pushDelayResult(reqSieralNum, js ) ;
                XLogger.debug( "register ok js = " + JSON.stringify(js) ) ;
            } ) ;
            return null ;
        } ) ;

        rpc.registerRPC( eRpcFuncID.Func_Login, ( reqSieralNum : number , arg : Object )=>{
            // arg : { account : "dfagadf" , type : eAccountType } 
            mysql.query( "call login(?,?);", [ arg[key.account] , arg[key.type] ] ,(err : MysqlError ,result : any )=>{
                if ( err != null )
                {
                    let js = {} ;
                    js["ret"] = 1;
                    rpc.pushDelayResult(reqSieralNum, js ) ;
                    XLogger.error( "failed sql : " + err.sql + " error : " + err.message ) ;
                    return ;
                }
    
                let js = {} ;
                js[key.ret] = 0;
                js[key.uid] = result[0][0][key.uid];
                js[key.state] = result[0][0][key.state];
                if ( js[key.uid] == 0 )
                {
                    js[key.ret] = 1 ;
                }
                else if ( js[key.state] != 0 )
                {
                    js[key.ret] = 2 ;
                }
                rpc.pushDelayResult(reqSieralNum, js ) ;
                XLogger.debug("login finish = " + js[key.uid] + " " + JSON.stringify(result)) ;
            } ) ;
            return null ;
        } ) ;

        rpc.registerRPC( eRpcFuncID.Func_LoadPlayerInfo ,( reqSieralNum : number , arg : Object  )=>{
            let uid = arg[key.uid] ;
            mysql.query( "select * from playerData where uid = " + uid, ( err : MysqlError ,result : any )=>{
                if ( err != null )
                {
                    rpc.pushDelayResult(reqSieralNum, {} ) ;
                    XLogger.error( "failed sql : " + err.sql + " error : " + err.sqlMessage ) ;
                    return ;
                }

                XLogger.debug( "finish load player data = " + JSON.stringify( result[0] ) ) ;
                rpc.pushDelayResult(reqSieralNum, result[0] ) ;
            } );
            return null ;
        }  ) ;
    }
}
