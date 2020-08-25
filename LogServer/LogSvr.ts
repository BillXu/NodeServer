import { key } from './../shared/KeyDefine';
import { eMsgPort } from './../shared/MessageIdentifer';
import { XLogger } from './../common/Logger';
import { eRpcFuncID } from './../common/Rpc/RpcFuncID';
import { IServerApp } from './../common/IServerApp';
import { Pool, createPool, PoolConfig, MysqlError } from 'mysql';
export class LogSvr extends IServerApp
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
        }
    }

    getLocalPortType() : eMsgPort 
    {
        return eMsgPort.ID_MSG_PORT_LOG_DB ;
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
                XLogger.error( "failed sql : " + err.sql + " msg = " + err.sqlMessage ) ;
                return ;
            }

            let js = {} ;
            js["ret"] = 0 ;
            js["result"] = result ;
            self.getRpc().pushDelayResult(reqSieralNum, js ) ;
        } ) ;
        return null ;
    }
}
