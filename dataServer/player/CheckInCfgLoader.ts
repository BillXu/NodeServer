import { XLogger } from './../../common/Logger';
import { SVR_ARG } from './../../common/ServerDefine';
import HashMap  from 'hashmap';
import request from 'request';
import { Item } from '../../shared/IMoney';
export class CheckInCfgLoader
{
    static s_instance : CheckInCfgLoader = null ;

    mConfigs : HashMap<number,Array<Item>> = new HashMap<number,Array<Item>>();
    
    static getInstance() : CheckInCfgLoader
    {
        if ( this.s_instance == null )
        {
            this.s_instance = new CheckInCfgLoader();
        }
        return this.s_instance;
    }

    loadConfig( url : string = SVR_ARG.checkCfgUrl )
    {
        // request confg 
        if ( url != null )
        {
            XLogger.info( "request check in confg url = " + url ) ;
            request.get( url,{ timeout : 2000 },this.cfgResult.bind(this) ) ;
        }
        else
        {
            XLogger.error("load checkin cfg url is null");
        }
    }

    getRewardForDayIdx( dayIdx : number ) : Array<Item>
    {
        if ( this.mConfigs.has(dayIdx) == false )
        {
            return null;
        }
        return this.mConfigs.get(dayIdx) ;
    }

    getCfgItemCnt() : number
    {
        return this.mConfigs.count();
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
                XLogger.error( "check in config is null" ) ;
            }
            else
            {
                this.mConfigs.clear() ;
                let vCs : Object[] = c["list"] ;
                for ( let m of vCs )
                {
                    let dayIdx = m["day"] ;
                    if ( dayIdx == null || this.mConfigs.has(dayIdx) )
                    {
                        XLogger.error( "invalid day idx = " + dayIdx ) ;
                        continue ;
                    }

                    let vReward : Object[] = m["reward"] ;
                    let vR : Array<Item> = Array<Item>() ;
                    for ( let r of vReward )
                    {
                        let i = new Item();
                        i.parse(r) ;
                        vR.push(i);
                    }
                    this.mConfigs.set(dayIdx, vR ) ;
                }
            }
        }
        else
        {
            XLogger.error( "rquest CheckIn cfg failed , net work issue" ) ;
        }
    }
}