import { MatchCfg } from './../shared/MatchConfigData';
import { XLogger } from './../common/Logger';
import request from 'request';
export class MatchConfigLoader
{
    mConfigs : MatchCfg[] = [] ;
    callBack : ( cfgs : MatchCfg[], loader : MatchConfigLoader )=>void  = null ;
    loadConfig( url? : string , callBack? : ( cfgs : MatchCfg[], loader : MatchConfigLoader )=>void )
    {
        this.callBack = callBack ;
        // request confg 
        if ( url != null )
        {
            XLogger.info( "request confg url = " + url ) ;
            request.get( url,{ timeout : 2000 },this.cfgResult.bind(this) ) ;
        }
        else
        {
            this.callBack(this.mConfigs,this ) ;
        }
    }

    getConfigByID( cfgID : number ) : MatchCfg
    {
        for ( let cfg of this.mConfigs )
        {
            if ( cfgID == cfg.cfgID )
            {
                return cfg ;
            }
        }
        return null ;
    }

    getConfigs() : MatchCfg[]
    {
        return this.mConfigs ;
    }

    protected cfgResult( error: any, response: request.Response, body: any )
    {
        if (!error && response.statusCode == 200) {
            XLogger.info("recivedCfg = " + body ) ;
            let c = null ;
            try {
                c = JSON.parse(body);
            } catch (error) {
                XLogger.error( "invalid json type , just use default" ) ;
            }
            if ( c == null )
            {
                XLogger.error( "match config is null" ) ;
            }
            else
            {
                let vCs : Object[] = c["list"] ;
                for ( let m of vCs )
                {
                    let pm = new MatchCfg();
                    pm.parse(m) ;
                    this.mConfigs.push(pm);
                }
            }
        }
        else
        {
            XLogger.error( "rquest match cfg failed , net work issue" ) ;
        }

        this.callBack(this.mConfigs,this ) ;
    }
}