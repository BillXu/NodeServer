import { XLogger } from './../common/Logger';
import { IMatchConfig } from './Match/IMatch';
import request from 'request';
let cfg = [
    {
        id : 1 ,
        matchName : "quick match test " ,
        matchType : 0 ,
        gamePort : 7,  // game type ;
        startSignTime : "0" ,  // 1995-12-17T03:24:00 ; // must this format ; // fixTime match type used key 
        startTime : "0" ,  // 1995-12-17T03:24:00 ; // must this format ;     // fixTime match type used key 
        repeatTime : 0 , // by minites ;           // repeatTime match type used key 
        repeatTimeMatchOpenDuration : [0], // hour , by 24 type  eg : 18 means 6 pm ; two value [] , 26 means next day 2 : 00 am ;  // repeatTime match type used key 
        signUpFee : { moneyType : 0 , cnt : 10 } ,
        playerCntLimt : [10,100] , // low limit , and up limit ;
        reward: [ { startIdx : 1 , endEndIdx : 1 , money : [{ type: 0, cnt :10 }], desc : "第一名10个钻石" } ,
        { startIdx : 2 , endEndIdx : 2 , money : [{ type: 0, cnt :5 }], desc : "第二名5个钻石" } ,
        { startIdx : 3 , endEndIdx : 6 , money : [{ type: 0, cnt :1 }], desc : "第3-6名1个钻石" } ],
        playerCntPerDesk : 3 , 
        guaFenPlayerCnt : 0 ,
        initScore : 0 ,
        laws : [ { roundIdx : 0, upgradeCnt : 9 , gameRoundCnt : 2, diFen : 1 } , 
            { roundIdx : 1, upgradeCnt : 6 , gameRoundCnt : 2, diFen : 1 } , 
            { roundIdx : 2, upgradeCnt : 3 , gameRoundCnt : 2, diFen : 1 } ] 
    },

    {
        id : 2 ,
        matchName : "fixTime match test " ,
        matchType : 1 ,  // 0 quick mode , 1 fixtime , 2 repeat mode ;
        gamePort : 7,  // game type ;
        startSignTime : "2020-7-27T00:00:00" ,  // 1995-12-17T03:24:00 ; // must this format ; // fixTime match type used key 
        startTime : "2020-8-5T13:00:00" ,  // 1995-12-17T03:24:00 ; // must this format ;     // fixTime match type used key 
        repeatTime : 0 , // by minites ;           // repeatTime match type used key 
        repeatTimeMatchOpenDuration : [0], // hour , by 24 type  eg : 18 means 6 pm ; two value [] , 26 means next day 2 : 00 am ;  // repeatTime match type used key 
        signUpFee : { moneyType : 0 , cnt : 10 } ,
        playerCntLimt : [20,100] , // low limit , and up limit ;
        reward: [ { startIdx : 1 , endEndIdx : 1 , money : [{ type: 0, cnt :10 }], desc : "第一名10个钻石" } ,
        { startIdx : 2 , endEndIdx : 2 , money : [{ type: 0, cnt :5 }], desc : "第二名5个钻石" } ,
        { startIdx : 3 , endEndIdx : 6 , money : [{ type: 0, cnt :1 }], desc : "第3-6名1个钻石" } ],
        playerCntPerDesk : 3 , 
        guaFenPlayerCnt : 10 ,
        initScore : 0 ,
        laws : [ { roundIdx : 0, upgradeCnt : 20 , gameRoundCnt : 2, diFen : 1 } , 
            { roundIdx : 1, upgradeCnt : 16 , gameRoundCnt : 2, diFen : 1 } , 
            { roundIdx : 2, upgradeCnt : 15 , gameRoundCnt : 2, diFen : 1 } ] 
    },

    {
        id : 3 ,
        matchName : "repeat time match test " ,
        matchType : 2 ,  // 0 quick mode , 1 fixtime , 2 repeat mode ;
        gamePort : 7,  // game type ;
        startSignTime : "2020-7-27T00:00:00" ,  // 1995-12-17T03:24:00 ; // must this format ; // fixTime match type used key 
        startTime : "2020-8-5T13:00:00" ,  // 1995-12-17T03:24:00 ; // must this format ;     // fixTime match type used key 
        repeatTime : 20 , // by minites ;           // repeatTime match type used key 
        repeatTimeMatchOpenDuration : [8,23], // hour , by 24 type  eg : 18 means 6 pm ; two value [] , 26 means next day 2 : 00 am ;  // repeatTime match type used key 
        signUpFee : { moneyType : 0 , cnt : 10 } ,
        playerCntLimt : [20,100] , // low limit , and up limit ;
        reward: [ { startIdx : 1 , endEndIdx : 1 , money : [{ type: 0, cnt :10 }], desc : "第一名10个钻石" } ,
        { startIdx : 2 , endEndIdx : 2 , money : [{ type: 0, cnt :5 }], desc : "第二名5个钻石" } ,
        { startIdx : 3 , endEndIdx : 6 , money : [{ type: 0, cnt :1 }], desc : "第3-6名1个钻石" } ],
        playerCntPerDesk : 3 , 
        guaFenPlayerCnt : 0 ,
        initScore : 0 ,
        laws : [ { roundIdx : 0, upgradeCnt : 20 , gameRoundCnt : 2, diFen : 1 } , 
            { roundIdx : 1, upgradeCnt : 16 , gameRoundCnt : 2, diFen : 1 } , 
            { roundIdx : 2, upgradeCnt : 15 , gameRoundCnt : 2, diFen : 1 } ] 
    },
]
;
export class MatchConfigLoader
{
    mConfigs : IMatchConfig[] = cfg ;
    callBack : ( cfgs : IMatchConfig[], loader : MatchConfigLoader )=>void  = null ;
    loadConfig( url? : string , callBack? : ( cfgs : IMatchConfig[], loader : MatchConfigLoader )=>void )
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

    getConfigByID( cfgID : number ) : IMatchConfig
    {
        for ( let cfg of this.mConfigs )
        {
            if ( cfgID == cfg.id )
            {
                return cfg ;
            }
        }
        return null ;
    }

    getConfigs() : IMatchConfig[]
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
            if ( c != null )
            {
                this.mConfigs = c ;
            }
            else
            {
                XLogger.error( "match config is null" ) ;
            }
        }
        else
        {
            XLogger.error( "rquest match cfg failed , net work issue" ) ;
        }

        this.callBack(this.mConfigs,this ) ;
    }
}