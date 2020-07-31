import { merge } from 'lodash';
import { XLogger } from './Logger';
import { eMsgPort } from './../shared/MessageIdentifer';
import request from 'request';
export interface IServer
{
    init( cfg : Object ) : void ;
    getLocalPortType() : eMsgPort ;
}

let jsCfg = 
{
    isDebug : false ,
    center : 
    {
        port : 3000,
        gateCnt : 200,
        dataCnt : 200,
        dbCnt : 200,
    } ,

    gate :
    {
        centerIP : "ws://localhost:3000",
        port : 3001,
    },

    data : 
    {
        centerIP : "ws://localhost:3000",
    },

    match : 
    {
        centerIP : "ws://localhost:3000",
    },

    shmj : 
    {
        centerIP : "ws://localhost:3000",
    },

    db : 
    {
        centerIP : "ws://localhost:3000",
        dbhost : "localhost",
        user : "root",
        pwd : "realbull",
        db : "game",
    },
}

export class Application
{
    protected mSvr : IServer = null ;
    init( svr : IServer )
    {
        XLogger.info( "start svr " ) ;
        process.on('uncaughtException',( err : Error )=>{
            XLogger.error( "message : " + err.message ) ;
            XLogger.error( "exception : " + err.stack ) ;
        } ) ;

        this.mSvr = svr ;
        // request confg 
        let cfgUrl = "http://cfg.com/cfg.php" ;
        XLogger.info( "request confg url = " + cfgUrl ) ;
        request.get( cfgUrl,{ timeout : 2000 },this.cfgResult.bind(this) ) ;
    }

    protected cfgResult( error: any, response: request.Response, body: any )
    {
        let cfg = {} ;
        if (!error && response.statusCode == 200) {
            XLogger.info("recivedCfg = " + body ) ;
            let c = null ;
            try {
                c = JSON.parse(body);
            } catch (error) {
                XLogger.error( "invalid json type , just use default" ) ;
            }
            if ( c != null )
            {
                cfg = c ;
            }
        }
        else
        {
            XLogger.error( "rquest cfg failed , net work issue" ) ;
        }
        merge(jsCfg,cfg );
        let svrCfgName = this.getCfgForSvr(this.mSvr.getLocalPortType()) ;
        if ( svrCfgName == null )
        {
            XLogger.error( "invalid port type can not start up port = " + this.mSvr.getLocalPortType() ) ;
            return ;
        }

        let svrCfg = jsCfg[svrCfgName] ;
        if ( svrCfg == null )
        {
            XLogger.error( "cfg file do not have config for port = " + this.mSvr.getLocalPortType() ) ;
            return ;
        } 
        XLogger.info( "effect cfg = " + JSON.stringify(svrCfg) ) ;
        this.mSvr.init(svrCfg) ;
        //XLogger.info( "svr started" ) ;
    }

   protected getCfgForSvr( port : eMsgPort ) : string 
    {
        switch ( port )
        {
            case eMsgPort.ID_MSG_PORT_CENTER:
                return "center" ;
            case eMsgPort.ID_MSG_PORT_GATE:
                return "gate" ;
            case eMsgPort.ID_MSG_PORT_DATA:
                return "data" ;
            case eMsgPort.ID_MSG_PORT_DB:
                return "db" ;
            case eMsgPort.ID_MSG_PORT_MATCH:
                return "match" ;
            case eMsgPort.ID_MSG_PORT_MJSH:
                return "shmj";
            default:
                XLogger.error( "unknown svr type to get cfg port = " + eMsgPort[port] + " use data svr" );
                return "data" ;
        }
    }
}